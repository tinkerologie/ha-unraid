#!/usr/bin/env python3
"""
Build the reproducible release zip that HACS and the Marketplace install.

``unraid.zip`` holds the files Git tracks under ``custom_components/unraid/`` at
its root (``manifest.json`` at the top level), because HACS and the Marketplace
extract a release zip straight into ``config/custom_components/unraid/``.
``SHA256SUMS`` is written next to it in the format ``sha256sum -c`` reads.

Everything is checked before anything is written, and all problems are reported
together:

- ``manifest.json`` and ``__init__.py`` are present, and the manifest version
  matches the release tag.
- Every relative Python import resolves to a tracked module or package.
- Every bundle named in ``CARD_FILES`` (read from ``frontend.py`` with ``ast``;
  that module imports Home Assistant, so it cannot be imported here) is tracked.
- Every import specifier in the tracked frontend JavaScript resolves to a
  tracked file inside the package.

The same commit always gives byte-identical output: entries are sorted, every
timestamp comes from ``SOURCE_DATE_EPOCH`` (or the ``HEAD`` commit time), and
permissions and compression settings are fixed.

Usage:
    python3 script/build_release.py --tag v2026.10.5 [--output-dir build]

Exit 0 = built, Exit 1 = validation or build failure.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
import posixpath
import re
import stat
import subprocess
import sys
import time
import zipfile
from collections.abc import Iterable, Sequence
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = "custom_components/unraid"
ZIP_NAME = "unraid.zip"
CHECKSUMS_NAME = "SHA256SUMS"
REQUIRED_FILES = ("manifest.json", "__init__.py")
FRONTEND_MODULE = "frontend.py"
FRONTEND_DIR = "frontend"

# 1980-01-01T00:00:00Z, the earliest timestamp a zip entry can store.
ZIP_EPOCH = 315532800
FILE_MODE = stat.S_IFREG | 0o644
COMPRESS_LEVEL = 9
UNIX_SYSTEM = 3  # external_attr then carries the Unix file mode

# Static imports, side-effect imports, re-exports and dynamic import() calls.
# The leading look-behind skips method calls such as ``loader.import(...)``.
JS_SPECIFIER = re.compile(
    r"""(?<![.\w$])(?:from|import)\s*\(?\s*(?P<quote>["'`])(?P<spec>.*?)(?P=quote)""",
    re.DOTALL,
)
# import(expression) without a string literal cannot be resolved statically.
JS_DYNAMIC_EXPRESSION = re.compile(r"""(?<![.\w$])import\s*\(\s*(?!["'`])[^)\s]""")


class BuildError(Exception):
    """Raised when the release cannot be built."""


def _git(root: Path, *args: str) -> str:
    """Run Git in ``root`` and return its standard output."""
    try:
        result = subprocess.run(  # noqa: S603 - fixed Git arguments, no shell
            ["git", "-C", str(root), *args],  # noqa: S607 - Git from PATH, as in CI
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as err:
        raise BuildError(f"git {' '.join(args)} failed in {root}") from err
    return result.stdout


def tracked_files(root: Path) -> list[str]:
    """Return the package files Git tracks, relative to the package, sorted."""
    prefix = f"{PACKAGE}/"
    names = [
        name.removeprefix(prefix)
        for name in _git(root, "ls-files", "-z", "--", PACKAGE).split("\0")
        if name
    ]
    return sorted(names)


def source_date_epoch(root: Path, environ: dict[str, str] | None = None) -> int:
    """Return the entry timestamp: ``SOURCE_DATE_EPOCH`` or the HEAD commit time."""
    value = (os.environ if environ is None else environ).get("SOURCE_DATE_EPOCH")
    if not value:
        value = _git(root, "log", "-1", "--format=%ct", "HEAD").strip()
    try:
        epoch = int(value)
    except ValueError as err:
        raise BuildError(f"Invalid SOURCE_DATE_EPOCH: {value!r}") from err
    return max(epoch, ZIP_EPOCH)


def check_regular_files(package_dir: Path, names: Iterable[str]) -> list[str]:
    """Report tracked paths that are missing or are not regular files."""
    problems = []
    for name in names:
        try:
            mode = (package_dir / name).lstat().st_mode
        except FileNotFoundError:
            problems.append(f"{name} is tracked but missing from the checkout")
            continue
        if not stat.S_ISREG(mode):
            problems.append(f"{name} is not a regular file")
    return problems


def check_manifest(package_dir: Path, members: set[str], tag: str) -> list[str]:
    """Report missing required files and a manifest version that differs from tag."""
    problems = [
        f"{required} is missing from the package"
        for required in REQUIRED_FILES
        if required not in members
    ]
    if "manifest.json" not in members:
        return problems
    try:
        manifest = json.loads((package_dir / "manifest.json").read_text("utf-8"))
    except (OSError, ValueError) as err:
        return [*problems, f"manifest.json cannot be read: {err}"]
    version = manifest.get("version")
    expected = tag.removeprefix("v")
    if version != expected:
        problems.append(f"manifest.json version {version!r} does not match tag {tag!r}")
    return problems


def _module_exists(members: set[str], module: PurePosixPath) -> bool:
    """Return True when ``module`` is a tracked module or package."""
    return (
        f"{module.as_posix()}.py" in members
        or (module / "__init__.py").as_posix() in members
    )


def check_python_imports(package_dir: Path, members: set[str]) -> list[str]:
    """Report relative imports that do not resolve to a tracked module."""
    problems = []
    for name in sorted(m for m in members if m.endswith(".py")):
        try:
            tree = ast.parse((package_dir / name).read_text("utf-8"), filename=name)
        except (OSError, SyntaxError, ValueError) as err:
            problems.append(f"{name} cannot be parsed: {err}")
            continue
        package = PurePosixPath(name).parent
        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom) or node.level == 0:
                continue
            parts = package.parts
            if node.level - 1 > len(parts):
                problems.append(f"{name}:{node.lineno} imports beyond the package root")
                continue
            base = PurePosixPath(*parts[: len(parts) - (node.level - 1)])
            dots = "." * node.level
            if node.module:
                target = base.joinpath(*node.module.split("."))
                if not _module_exists(members, target):
                    problems.append(
                        f"{name}:{node.lineno} imports {dots}{node.module}, "
                        "which is not in the package"
                    )
                continue
            # ``from . import x``: x is a submodule, or a name in __init__.py.
            if (base / "__init__.py").as_posix() in members:
                continue
            for alias in node.names:
                if not _module_exists(members, base / alias.name):
                    problems.append(
                        f"{name}:{node.lineno} imports {alias.name} from {dots}, "
                        "which is not in the package"
                    )
    return problems


def card_files(package_dir: Path) -> tuple[str, ...]:
    """Return the literal ``CARD_FILES`` tuple from ``frontend.py``."""
    tree = ast.parse((package_dir / FRONTEND_MODULE).read_text("utf-8"))
    for node in tree.body:
        if isinstance(node, ast.AnnAssign):
            target, value = node.target, node.value
        elif isinstance(node, ast.Assign) and len(node.targets) == 1:
            target, value = node.targets[0], node.value
        else:
            continue
        if isinstance(target, ast.Name) and target.id == "CARD_FILES":
            try:
                files = ast.literal_eval(value) if value is not None else None
            except ValueError:
                files = None
            if isinstance(files, tuple) and all(isinstance(f, str) for f in files):
                return files
            break
    raise BuildError(f"{FRONTEND_MODULE} has no literal CARD_FILES tuple of strings")


def check_card_files(package_dir: Path, members: set[str]) -> list[str]:
    """Report bundles listed in ``CARD_FILES`` that are not tracked."""
    if FRONTEND_MODULE not in members:
        return []
    try:
        files = card_files(package_dir)
    except (BuildError, SyntaxError, ValueError) as err:
        return [str(err)]
    return [
        f"CARD_FILES names {FRONTEND_DIR}/{file}, which is not in the package"
        for file in files
        if f"{FRONTEND_DIR}/{file}" not in members
    ]


def check_js_imports(package_dir: Path, members: set[str]) -> list[str]:
    """Report frontend import specifiers that do not resolve inside the package."""
    problems = []
    for name in sorted(m for m in members if m.endswith(".js")):
        source = (package_dir / name).read_text("utf-8")
        for match in JS_SPECIFIER.finditer(source):
            spec = match["spec"]
            if match["quote"] == "`" and "${" in spec:
                problems.append(f"{name} has an interpolated import specifier {spec}")
                continue
            if not spec.startswith(("./", "../")):
                problems.append(f"{name} imports {spec}, which is not a relative path")
                continue
            target = posixpath.normpath(PurePosixPath(name).parent.joinpath(spec))
            if target not in members:
                problems.append(f"{name} imports {spec}, which is not in the package")
        problems.extend(
            f"{name} has a dynamic import() of an expression"
            for _ in JS_DYNAMIC_EXPRESSION.finditer(source)
        )
    return problems


def validate(package_dir: Path, names: Sequence[str], tag: str) -> list[str]:
    """Return every problem with the package; an empty list means it can ship."""
    members = set(names)
    problems = check_regular_files(package_dir, names)
    problems += check_manifest(package_dir, members, tag)
    # Content checks read the files, so only run them on regular files.
    readable = {
        name
        for name in members
        if (package_dir / name).is_file() and not (package_dir / name).is_symlink()
    }
    problems += check_python_imports(package_dir, readable)
    problems += check_card_files(package_dir, readable)
    problems += check_js_imports(package_dir, readable)
    return problems


def write_zip(package_dir: Path, names: Sequence[str], path: Path, epoch: int) -> None:
    """Write the zip with fixed metadata so the same input gives the same bytes."""
    date_time = time.gmtime(epoch)[:6]
    with zipfile.ZipFile(path, "w") as archive:
        for name in names:
            info = zipfile.ZipInfo(name, date_time=date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = UNIX_SYSTEM
            info.external_attr = FILE_MODE << 16
            archive.writestr(
                info, (package_dir / name).read_bytes(), compresslevel=COMPRESS_LEVEL
            )


def build(
    root: Path, output_dir: Path, tag: str, environ: dict[str, str] | None = None
) -> Path:
    """Validate the package and write ``unraid.zip`` and ``SHA256SUMS``."""
    package_dir = root / PACKAGE
    names = tracked_files(root)
    problems = validate(package_dir, names, tag)
    if problems:
        raise BuildError("\n".join(f"- {problem}" for problem in problems))
    epoch = source_date_epoch(root, environ)
    output_dir.mkdir(parents=True, exist_ok=True)
    zip_path = output_dir / ZIP_NAME
    write_zip(package_dir, names, zip_path, epoch)
    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    (output_dir / CHECKSUMS_NAME).write_text(f"{digest}  {ZIP_NAME}\n", "utf-8")
    return zip_path


def main(argv: Sequence[str] | None = None) -> int:
    """Run the command-line interface."""
    parser = argparse.ArgumentParser(description="Build the release zip.")
    parser.add_argument("--tag", required=True, help="Release tag, e.g. v2026.10.5")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("build"),
        help="Directory for unraid.zip and SHA256SUMS (default: build)",
    )
    parser.add_argument(
        "--root", type=Path, default=ROOT, help="Repository root (default: this repo)"
    )
    args = parser.parse_args(argv)

    try:
        zip_path = build(args.root, args.output_dir, args.tag)
    except BuildError as err:
        print(f"Cannot build {ZIP_NAME}:\n{err}", file=sys.stderr)
        return 1

    with zipfile.ZipFile(zip_path) as archive:
        count = len(archive.namelist())
    checksum = (zip_path.parent / CHECKSUMS_NAME).read_text("utf-8").split()[0]
    print(f"Built {zip_path} ({count} files, sha256 {checksum})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
