"""Tests for script/build_release.py, the HACS and Marketplace release asset."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "script" / "build_release.py"
VERSION = "2026.10.5"
TAG = f"v{VERSION}"
COMMIT_EPOCH = 1793228372  # 2026-10-28T22:59:32Z (zip stores even seconds)

BASE_FILES = {
    "manifest.json": json.dumps({"domain": "unraid", "version": VERSION}),
    "__init__.py": "from .const import DOMAIN\nfrom . import const\n",
    "const.py": 'DOMAIN = "unraid"\n',
    "frontend.py": 'from typing import Final\n\nCARD_FILES: Final = ("cards.js",)\n',
    "frontend/cards.js": "export const card = 1;\n",
    "translations/en.json": "{}\n",
}


def _load_script() -> ModuleType:
    spec = importlib.util.spec_from_file_location("build_release", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


build_release = _load_script()


def _git_env(home: Path) -> dict[str, str]:
    """Return an environment that isolates Git from the user's configuration."""
    stamp = f"@{COMMIT_EPOCH} +0000"
    return {
        **os.environ,
        "GIT_CONFIG_GLOBAL": str(home / "gitconfig"),
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_AUTHOR_NAME": "Test",
        "GIT_AUTHOR_EMAIL": "test@example.com",
        "GIT_COMMITTER_NAME": "Test",
        "GIT_COMMITTER_EMAIL": "test@example.com",
        "GIT_AUTHOR_DATE": stamp,
        "GIT_COMMITTER_DATE": stamp,
    }


def _git(repo: Path, *args: str) -> None:
    subprocess.run(  # noqa: S603 - fixed Git executable and fixture arguments
        ["git", "-c", "commit.gpgsign=false", *args],  # noqa: S607
        cwd=repo,
        env=_git_env(repo.parent),
        check=True,
        capture_output=True,
    )


class FakeRepo:
    """A committed Git repository holding a minimal integration package."""

    def __init__(self, root: Path) -> None:
        """Point at the repository root and its package directory."""
        self.root = root
        self.package = root / "custom_components" / "unraid"

    def write(self, name: str, content: str) -> None:
        path = self.package / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def commit(self) -> None:
        _git(self.root, "add", "--all")
        _git(self.root, "commit", "-q", "--allow-empty", "-m", "update")

    def build(self, out: Path, tag: str = TAG, epoch: int | None = None) -> Path:
        environ = {} if epoch is None else {"SOURCE_DATE_EPOCH": str(epoch)}
        return build_release.build(self.root, out, tag, environ)


@pytest.fixture
def repo(tmp_path: Path) -> FakeRepo:
    """Create a fresh repository in a path with spaces."""
    fake = FakeRepo(tmp_path / "repo with spaces")
    fake.root.mkdir()
    _git(fake.root, "init", "-q")
    for name, content in BASE_FILES.items():
        fake.write(name, content)
    fake.commit()
    return fake


def _problems(repo: FakeRepo, tmp_path: Path, tag: str = TAG) -> str:
    with pytest.raises(build_release.BuildError) as err:
        repo.build(tmp_path / "out", tag)
    assert not (tmp_path / "out" / "unraid.zip").exists()
    return str(err.value)


def test_zip_has_package_files_at_its_root(repo: FakeRepo, tmp_path: Path) -> None:
    zip_path = repo.build(tmp_path / "out")
    with zipfile.ZipFile(zip_path) as archive:
        names = archive.namelist()
        infos = archive.infolist()
    assert names == sorted(BASE_FILES)
    assert "manifest.json" in names
    assert not any(name.startswith(("unraid/", "custom_components/")) for name in names)
    for info in infos:
        assert info.date_time == (2026, 10, 28, 22, 59, 32)
        assert info.external_attr >> 16 == 0o100644
        assert info.compress_type == zipfile.ZIP_DEFLATED
        assert info.extra == b""


def test_two_builds_are_byte_identical(repo: FakeRepo, tmp_path: Path) -> None:
    first = repo.build(tmp_path / "a").read_bytes()
    os.utime(repo.package / "const.py", (0, 0))  # mtimes must not leak in
    second = repo.build(tmp_path / "b").read_bytes()
    assert first == second
    assert (tmp_path / "a" / "SHA256SUMS").read_bytes() == (
        tmp_path / "b" / "SHA256SUMS"
    ).read_bytes()


def test_source_date_epoch_only_changes_timestamps(
    repo: FakeRepo, tmp_path: Path
) -> None:
    default = repo.build(tmp_path / "a")
    other = repo.build(tmp_path / "b", epoch=COMMIT_EPOCH + 86400)
    with zipfile.ZipFile(default) as a, zipfile.ZipFile(other) as b:
        assert a.namelist() == b.namelist()
        for left, right in zip(a.infolist(), b.infolist(), strict=True):
            assert left.date_time != right.date_time
            assert a.read(left) == b.read(right)
            assert left.external_attr == right.external_attr


def test_epoch_before_1980_is_clamped(repo: FakeRepo, tmp_path: Path) -> None:
    zip_path = repo.build(tmp_path / "out", epoch=0)
    with zipfile.ZipFile(zip_path) as archive:
        assert archive.infolist()[0].date_time == (1980, 1, 1, 0, 0, 0)


def test_invalid_source_date_epoch_fails(repo: FakeRepo, tmp_path: Path) -> None:
    with pytest.raises(build_release.BuildError, match="Invalid SOURCE_DATE_EPOCH"):
        build_release.build(
            repo.root, tmp_path / "out", TAG, {"SOURCE_DATE_EPOCH": "soon"}
        )


def test_untracked_files_are_excluded(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write("untracked.py", "")
    (repo.package / "__pycache__").mkdir()
    (repo.package / "__pycache__" / "const.cpython-314.pyc").write_bytes(b"\0")
    with zipfile.ZipFile(repo.build(tmp_path / "out")) as archive:
        names = archive.namelist()
    assert "untracked.py" not in names
    assert not any("__pycache__" in name for name in names)


def test_manifest_tag_mismatch_fails(repo: FakeRepo, tmp_path: Path) -> None:
    message = _problems(repo, tmp_path, tag="v2026.11.0")
    assert "manifest.json version '2026.10.5' does not match tag 'v2026.11.0'" in (
        message
    )


def test_tag_without_v_prefix_is_accepted(repo: FakeRepo, tmp_path: Path) -> None:
    assert repo.build(tmp_path / "out", tag=VERSION).is_file()


def test_unreadable_manifest_fails(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write("manifest.json", "{not json")
    repo.commit()
    assert "manifest.json cannot be read" in _problems(repo, tmp_path)


def test_missing_required_files_are_all_reported(
    repo: FakeRepo, tmp_path: Path
) -> None:
    _git(repo.root, "rm", "-q", "custom_components/unraid/manifest.json")
    _git(repo.root, "rm", "-q", "custom_components/unraid/__init__.py")
    repo.commit()
    message = _problems(repo, tmp_path)
    assert "manifest.json is missing from the package" in message
    assert "__init__.py is missing from the package" in message


def test_missing_relative_python_module_fails(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write("sensor.py", "from .missing import thing\nfrom . import gone\n")
    repo.commit()
    message = _problems(repo, tmp_path)
    assert "sensor.py:1 imports .missing, which is not in the package" in message


def test_relative_imports_in_subpackages_resolve(
    repo: FakeRepo, tmp_path: Path
) -> None:
    repo.write("sub/__init__.py", "")
    repo.write("sub/helper.py", "from ..const import DOMAIN\nfrom . import other\n")
    repo.write("sub/other.py", "from .. import const\n")
    repo.commit()
    assert repo.build(tmp_path / "out").is_file()


def test_from_dot_import_without_init_needs_a_module(
    repo: FakeRepo, tmp_path: Path
) -> None:
    repo.write("ns/helper.py", "from . import absent\n")
    repo.commit()
    assert "ns/helper.py:1 imports absent from ., which is not in the package" in (
        _problems(repo, tmp_path)
    )


def test_import_beyond_package_root_fails(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write("sensor.py", "from ... import elsewhere\n")
    repo.commit()
    assert "sensor.py:1 imports beyond the package root" in _problems(repo, tmp_path)


def test_unparsable_python_fails(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write("broken.py", "def (:\n")
    repo.commit()
    assert "broken.py cannot be parsed" in _problems(repo, tmp_path)


def test_missing_card_file_fails(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write(
        "frontend.py", 'CARD_FILES = ("cards.js", "extra.js")\n'
    )  # plain assignment is read too
    repo.commit()
    assert "CARD_FILES names frontend/extra.js, which is not in the package" in (
        _problems(repo, tmp_path)
    )


def test_non_literal_card_files_fails(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write("frontend.py", "CARD_FILES = tuple(sorted(['a.js']))\n")
    repo.commit()
    assert "CARD_FILES" in _problems(repo, tmp_path)


def test_frontend_module_without_card_files_fails(
    repo: FakeRepo, tmp_path: Path
) -> None:
    repo.write("frontend.py", "OTHER = 1\n")
    repo.commit()
    assert "no literal CARD_FILES tuple" in _problems(repo, tmp_path)


def test_imported_untracked_chunk_fails(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write("frontend/cards.js", "import{a}from'./chunk.js';export const c=a;")
    repo.commit()
    repo.write("frontend/chunk.js", "export const a=1;")  # present but untracked
    message = _problems(repo, tmp_path)
    assert "frontend/cards.js imports ./chunk.js, which is not in the package" in (
        message
    )


def test_imported_tracked_chunks_pass(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write(
        "frontend/cards.js",
        'import{a}from"./chunks/a.js";import"./side.js";'
        "export*from`./chunks/b.js`;const m=import('../frontend/chunks/a.js');",
    )
    repo.write("frontend/chunks/a.js", "export const a=1;")
    repo.write("frontend/chunks/b.js", "export const b=1;")
    repo.write("frontend/side.js", "")
    repo.commit()
    with zipfile.ZipFile(repo.build(tmp_path / "out")) as archive:
        assert "frontend/chunks/b.js" in archive.namelist()


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ('import{html}from"lit";', "imports lit, which is not a relative path"),
        (
            "import('https://cdn.example.com/x.js');",
            "imports https://cdn.example.com/x.js, which is not a relative path",
        ),
        ("import(`./${name}.js`);", "has an interpolated import specifier"),
        ("const m=import(name);", "has a dynamic import() of an expression"),
    ],
)
def test_external_or_unresolvable_js_specifier_fails(
    repo: FakeRepo, tmp_path: Path, source: str, expected: str
) -> None:
    repo.write("frontend/cards.js", source)
    repo.commit()
    assert expected in _problems(repo, tmp_path)


def test_method_named_import_is_not_a_specifier(repo: FakeRepo, tmp_path: Path) -> None:
    repo.write("frontend/cards.js", "loader.import('lit');x.from('y');")
    repo.commit()
    assert repo.build(tmp_path / "out").is_file()


def test_tracked_symlink_fails(repo: FakeRepo, tmp_path: Path) -> None:
    (repo.package / "link.py").symlink_to("const.py")
    repo.commit()
    assert "link.py is not a regular file" in _problems(repo, tmp_path)


def test_tracked_file_missing_from_checkout_fails(
    repo: FakeRepo, tmp_path: Path
) -> None:
    (repo.package / "const.py").unlink()
    message = _problems(repo, tmp_path)
    assert "const.py is tracked but missing from the checkout" in message
    assert "__init__.py:1 imports .const, which is not in the package" in message


def test_outside_git_work_tree_fails(tmp_path: Path) -> None:
    with pytest.raises(build_release.BuildError, match="git ls-files"):
        build_release.build(tmp_path, tmp_path / "out", TAG, {})


def test_sha256sums_matches_zip(repo: FakeRepo, tmp_path: Path) -> None:
    zip_path = repo.build(tmp_path / "out")
    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    checksums = (tmp_path / "out" / "SHA256SUMS").read_text()
    assert checksums == f"{digest}  unraid.zip\n"
    tool = shutil.which("sha256sum")
    if tool is None:  # macOS without coreutils
        pytest.skip("sha256sum is not installed")
    subprocess.run(  # noqa: S603 - fixed tool and arguments
        [tool, "-c", "SHA256SUMS"], cwd=tmp_path / "out", check=True
    )


def test_cli_reports_every_problem(
    repo: FakeRepo, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    repo.write("sensor.py", "from .missing import x\n")
    repo.commit()
    code = build_release.main(
        ["--tag", "v0.0.1", "--root", str(repo.root), "--output-dir", str(tmp_path)]
    )
    err = capsys.readouterr().err
    assert code == 1
    assert "does not match tag 'v0.0.1'" in err
    assert "imports .missing" in err


def test_cli_builds(
    repo: FakeRepo, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    code = build_release.main(
        ["--tag", TAG, "--root", str(repo.root), "--output-dir", str(tmp_path)]
    )
    assert code == 0
    assert f"({len(BASE_FILES)} files, sha256 " in capsys.readouterr().out


def test_real_repository_builds(tmp_path: Path) -> None:
    """The real package builds at its manifest version, with every tracked file."""
    manifest = REPO_ROOT / "custom_components" / "unraid" / "manifest.json"
    version = json.loads(manifest.read_text())["version"]
    zip_path = build_release.build(
        REPO_ROOT, tmp_path, f"v{version}", {"SOURCE_DATE_EPOCH": str(COMMIT_EPOCH)}
    )
    with zipfile.ZipFile(zip_path) as archive:
        names = set(archive.namelist())
    assert {"manifest.json", "__init__.py", "frontend/unraid-cards.js"} <= names
    assert names == set(build_release.tracked_files(REPO_ROOT))


def test_hacs_json_names_the_built_zip() -> None:
    """hacs.json must point HACS and the Marketplace at the asset we build."""
    hacs = json.loads((REPO_ROOT / "hacs.json").read_text())
    assert hacs["zip_release"] is True
    assert hacs["filename"] == build_release.ZIP_NAME
