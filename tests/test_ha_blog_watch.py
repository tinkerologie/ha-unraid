"""Tests for script/ha_blog_watch.py, the weekly developer blog watch."""

from __future__ import annotations

import importlib.util
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "script" / "ha_blog_watch.py"
NOW = datetime(2026, 10, 30, tzinfo=UTC)


def _load_script() -> ModuleType:
    spec = importlib.util.spec_from_file_location("ha_blog_watch", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


blog = _load_script()


def _feed(*items: str) -> str:
    return (
        '<?xml version="1.0"?><rss version="2.0" '
        'xmlns:content="http://purl.org/rss/1.0/modules/content/">'
        f"<channel><title>Blog</title>{''.join(items)}</channel></rss>"
    )


def _item(title: str, link: str, date: str, content: str | None = None) -> str:
    encoded = (
        f"<content:encoded><![CDATA[{content}]]></content:encoded>" if content else ""
    )
    return (
        f"<item><title>{title}</title><link>{link}</link><pubDate>{date}</pubDate>"
        f"<description>Short summary</description>{encoded}</item>"
    )


@pytest.fixture
def package(tmp_path: Path) -> Path:
    """Create a fake integration with a few known identifiers."""
    package_dir = tmp_path / "custom_components" / "unraid"
    package_dir.mkdir(parents=True)
    (package_dir / "__init__.py").write_text(
        '"""Uses async_old_helper in a docstring only."""\n'
        "from homeassistant.helpers import issue_registry as ir\n"
        "from homeassistant.helpers.restore_state import (\n"
        "    ExtraStoredData,\n"
        "    RestoreStateData,\n"
        ")\n"
        "# async_old_helper is mentioned in a comment\n"
        "ir.async_delete_issue(hass, DOMAIN, KEY)\n"
        "value = RestoreStateData.last_states\n"
        "label = 'async_old_helper'\n"
        "async_old_helperish = 1\n"
    )
    (package_dir / "entity.py").write_text(
        "class E:\n    async def async_added_to_hass(self) -> None:\n        pass\n"
    )
    return package_dir


@pytest.mark.parametrize(
    ("html", "expected"),
    [
        (
            "<p>The <code>async_old_helper</code> function is deprecated.</p>",
            ["async_old_helper"],
        ),
        ("<p>Use the new <code>async_new_helper</code> function.</p>", []),
        (
            "<ul><li>Calling <code>Foo.bar_baz()</code> no longer works</li></ul>",
            ["Foo.bar_baz"],
        ),
        (
            "<p>This is removed:</p><pre><code>async_in_example()</code></pre>",
            [],
        ),
        (
            (
                "<p>Breaking: <code>self.entity_id</code>, <code>None</code>, "
                "<code>button</code>, <code>RuntimeError</code> and "
                "<code>DeviceInfo</code></p>"
            ),
            ["DeviceInfo"],
        ),
        (
            "<ul><li>Will be removed:<ul><li><code>OldThing</code></li></ul></li></ul>",
            ["OldThing"],
        ),
        (
            (
                "<p>It stops working: <code>'quoted_name'</code> &amp; "
                "<code>call(arg_one=1)</code></p>"
            ),
            ["arg_one", "quoted_name"],
        ),
    ],
)
def test_announced_tokens(html: str, expected: list[str]) -> None:
    assert blog.announced_tokens(html) == expected


def test_code_only_blanks_comments_and_strings() -> None:
    source = '"""Doc async_x."""\nx = 1  # async_x\ny = "async_x"\nasync_x()\n'
    code = blog.code_only(source)
    assert code.count("\n") == source.count("\n")
    assert code.count("async_x") == 1
    assert code.splitlines()[3] == "async_x()"


def test_code_only_returns_unparsable_source_unchanged() -> None:
    source = 'x = """never closed\n'
    assert blog.code_only(source) == source


def test_find_matches(package: Path) -> None:
    matches = blog.find_matches(
        [
            "async_old_helper",
            "ir.async_delete_issue",
            "restore_state.RestoreStateData",
            "RestoreStateData.last_states",
            "async_added_to_hass",
            "NotUsedAnywhere",
        ],
        package,
    )
    found = {(m.token, Path(m.file).name, m.line) for m in matches}
    assert found == {
        ("ir.async_delete_issue", "__init__.py", 8),
        # multi-line from-import, then the bare last segment
        ("restore_state.RestoreStateData", "__init__.py", 3),
        ("restore_state.RestoreStateData", "__init__.py", 5),
        ("restore_state.RestoreStateData", "__init__.py", 9),
        ("RestoreStateData.last_states", "__init__.py", 9),
        ("async_added_to_hass", "entity.py", 2),
    }
    hook = "async_added_to_hass"
    first = next(m for m in matches if m.token == hook)
    assert first.file == "custom_components/unraid/entity.py"
    assert first.text == "async def async_added_to_hass(self) -> None:"


def test_bare_names_match_attribute_access(package: Path) -> None:
    """A post that names ``async_delete_issue`` matches ``ir.async_delete_issue``."""
    matches = blog.find_matches(["async_delete_issue", "last_states"], package)
    assert {(m.token, m.line) for m in matches} == {
        ("async_delete_issue", 8),
        ("last_states", 9),
    }


def test_find_matches_caps_locations_per_token(package: Path) -> None:
    (package / "many.py").write_text("async_many()\n" * 10)
    matches = blog.find_matches(["async_many"], package)
    assert len(matches) == blog.MAX_MATCHES_PER_TOKEN


def test_scan_uses_content_and_fetches_pages(package: Path) -> None:
    pages = {
        blog.FEED_URL: _feed(
            _item(
                "Helper removed",
                "https://blog/a",
                "Wed, 28 Oct 2026 00:00:00 GMT",
                "<p><code>ir.async_delete_issue</code> is deprecated.</p>",
            ),
            _item("New thing", "https://blog/b", "Mon, 26 Oct 2026 00:00:00 GMT"),
            _item("Broken page", "https://blog/c", "Sun, 25 Oct 2026 00:00:00 GMT"),
            _item("Too old", "https://blog/d", "Mon, 01 Jun 2026 00:00:00 GMT"),
        ),
        "https://blog/b": (
            "<nav><p><code>async_added_to_hass</code> no longer listed</p></nav>"
            "<article><p>Nothing announced for <code>async_added_to_hass</code>.</p>"
            "</article>"
        ),
    }

    def fetch(url: str) -> str:
        if url not in pages:
            raise OSError("404")
        return pages[url]

    posts = blog.scan(7, now=NOW, fetch=fetch, package_dir=package)
    assert [p.title for p in posts] == ["Helper removed", "New thing", "Broken page"]
    assert posts[0].status == "matched"
    assert posts[0].tokens == ["ir.async_delete_issue"]
    # The nav outside <article> is ignored, and the article announces nothing.
    assert posts[1].status == "unmatched"
    assert posts[1].tokens == []
    assert posts[2].error == "OSError: 404"
    assert posts[2].status == "unmatched"


@pytest.mark.parametrize(
    ("feed", "message"),
    [
        (_feed(), "has no posts"),
        ("<rss", "Cannot read"),
    ],
)
def test_scan_fails_on_unusable_feed(feed: str, message: str) -> None:
    with pytest.raises(blog.ScanError, match=message):
        blog.scan(7, now=NOW, fetch=lambda _url: feed)


def test_scan_fails_when_feed_is_unreachable() -> None:
    def fetch(_url: str) -> str:
        raise OSError("offline")

    with pytest.raises(blog.ScanError, match="offline"):
        blog.scan(7, now=NOW, fetch=fetch)


def test_main_prints_report(
    package: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(blog, "PACKAGE_DIR", package)
    feed = _feed(
        _item(
            "Helper removed",
            "https://blog/a",
            datetime.now(UTC).strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "<p><code>async_added_to_hass</code> must now be paired.</p>",
        )
    )
    assert blog.main(["scan", "--days", "3"], fetch=lambda _url: feed) == 0
    report = json.loads(capsys.readouterr().out)
    assert report["days"] == 3
    assert report["feed"] == blog.FEED_URL
    (post,) = report["posts"]
    assert post["status"] == "matched"
    assert post["matches"][0] == {
        "token": "async_added_to_hass",
        "file": "custom_components/unraid/entity.py",
        "line": 2,
        "text": "async def async_added_to_hass(self) -> None:",
    }


def test_main_fails_without_feed(capsys: pytest.CaptureFixture[str]) -> None:
    def fetch(_url: str) -> str:
        raise OSError("offline")

    assert blog.main(["scan"], fetch=fetch) == 1
    assert "Cannot read" in capsys.readouterr().err
