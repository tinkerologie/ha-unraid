#!/usr/bin/env python3
"""
Match recent Home Assistant developer blog posts against the integration.

Home Assistant announces deprecations, removals and breaking changes on its
developer blog, usually weeks before the beta that ships them. ``scan`` reads
the blog's RSS feed, keeps the posts from the last ``--days`` days and, in each
post, the paragraphs and list items whose text announces a change ("deprecated",
"removed", "no longer", ...). It takes the API-like identifiers in the inline
``<code>`` those blocks name (snake_case, CamelCase or dotted; never code in
``<pre>`` examples) and searches the code of ``custom_components/unraid`` for
them, ignoring comments and strings. A post is ``matched`` when announced code
is used by the integration.

The feed may carry the post HTML in ``content:encoded``; when it does not, the
post page is fetched and its ``<article>`` is read. A post page that cannot be
fetched is reported with an ``error`` and does not stop the scan.

Prints one JSON document; the ``HA dev blog watch`` workflow opens one issue
per matched post from it. Standard library only.

Usage:
    python3 script/ha_blog_watch.py scan [--days 7]

Exit 0 = scanned, Exit 1 = the feed could not be read or had no posts.
"""

from __future__ import annotations

import argparse
import builtins
import email.utils
import io
import json
import keyword
import re
import sys
import tokenize
import urllib.request
import xml.etree.ElementTree as ET
from collections.abc import Callable, Iterable, Sequence
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_DIR = ROOT / "custom_components" / "unraid"
# The blog moved to contributors.home-assistant.io; urllib follows the redirect.
FEED_URL = "https://developers.home-assistant.io/blog/rss.xml"
CONTENT_ENCODED = "{http://purl.org/rss/1.0/modules/content/}encoded"
USER_AGENT = "ha-unraid-dev-blog-watch"
TIMEOUT = 30
MAX_MATCHES_PER_TOKEN = 5

ANNOUNCE_PHRASES = (
    "deprecated",
    "removed",
    "will be removed",
    "no longer",
    "breaking",
    "stops working",
    "must now",
)
BLOCK_TAGS = frozenset({"p", "li"})
ARTICLE = re.compile(r"<article\b.*?</article>", re.DOTALL | re.IGNORECASE)
IDENTIFIER = re.compile(r"[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*")
# Identifiers every integration uses, so a match says nothing about the
# announced change (``hass.config_entries`` is not ``DeviceEntry.config_entries``).
STOPLIST = frozenset(
    {
        "available",
        "config_entries",
        "config_entry",
        "device_id",
        "entity_id",
        "entry_id",
        "event",
        "hass",
        "key",
        "model",
        "name",
        "runtime_data",
        "self",
        "state",
        "unique_id",
        "update",
        *keyword.kwlist,
        *dir(builtins),
    }
)
# Python source parts that are not code.
NON_CODE_TOKENS = frozenset(
    {tokenize.COMMENT, tokenize.STRING}
    | {
        getattr(tokenize, name)
        for name in ("FSTRING_MIDDLE", "TSTRING_MIDDLE")
        if hasattr(tokenize, name)
    }
)

Fetch = Callable[[str], str]


@dataclass
class Match:
    """One place in the integration that uses an announced token."""

    token: str
    file: str
    line: int
    text: str


@dataclass
class Post:
    """One blog post in the window and what it shares with the integration."""

    title: str
    link: str
    pub_date: str
    tokens: list[str] = field(default_factory=list)
    matches: list[Match] = field(default_factory=list)
    error: str | None = None

    @property
    def status(self) -> str:
        """Return ``matched`` when announced code is used by the integration."""
        return "matched" if self.matches else "unmatched"


class AnnouncedCodeParser(HTMLParser):
    """Collect the inline code of ``<p>``/``<li>`` blocks that announce a change."""

    def __init__(self) -> None:
        """Start with no open blocks."""
        super().__init__(convert_charrefs=True)
        self.tokens: list[str] = []
        self._blocks: list[tuple[list[str], list[str]]] = []  # (text, codes)
        self._pre = 0
        self._code: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Open a block, a ``<pre>`` or an inline ``<code>``."""
        if tag in BLOCK_TAGS:
            self._blocks.append(([], []))
        elif tag == "pre":
            self._pre += 1
        elif tag == "code" and not self._pre and self._blocks:
            self._code = []

    def handle_endtag(self, tag: str) -> None:
        """Close the element; a closed block keeps its code if it announces."""
        if tag == "code" and self._code is not None:
            self._blocks[-1][1].append("".join(self._code))
            self._code = None
        elif tag == "pre" and self._pre:
            self._pre -= 1
        elif tag in BLOCK_TAGS and self._blocks:
            text, codes = self._blocks.pop()
            if self._blocks:  # a nested list item also belongs to its parent
                self._blocks[-1][0].extend(text)
                self._blocks[-1][1].extend(codes)
            lowered = " ".join("".join(text).split()).lower()
            if any(phrase in lowered for phrase in ANNOUNCE_PHRASES):
                self.tokens.extend(codes)

    def handle_data(self, data: str) -> None:
        """Add text to the open block and to the open inline code."""
        if self._blocks:
            self._blocks[-1][0].append(data)
        if self._code is not None:
            self._code.append(data)


def is_api_like(token: str) -> bool:
    """
    Return whether ``token`` looks like a Home Assistant API name.

    Dotted paths, snake_case and CamelCase names count; plain words such as
    ``button`` or ``list``, builtins and the stoplist do not.
    """
    last = token.rpartition(".")[2]
    if token in STOPLIST or last in STOPLIST or last.startswith("__"):
        return False
    return "." in token or "_" in last or sum(c.isupper() for c in last) >= 2  # noqa: PLR2004


def announced_tokens(html: str) -> list[str]:
    """Return the identifiers named as inline code next to an announced change."""
    parser = AnnouncedCodeParser()
    parser.feed(html)
    parser.close()
    tokens: set[str] = set()
    for code in parser.tokens:
        text = code.strip().strip("\"'`")
        for found in IDENTIFIER.findall(text):
            token = found.removeprefix("self.")
            if is_api_like(token):
                tokens.add(token)
    return sorted(tokens)


def code_only(source: str) -> str:
    """Blank out comments and strings, keeping every line and column in place."""
    lines = source.splitlines(keepends=True)
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(source).readline))
    except tokenize.TokenError, SyntaxError:
        return source
    for token in reversed(tokens):
        if token.type not in NON_CODE_TOKENS:
            continue
        (start_row, start_col), (end_row, end_col) = token.start, token.end
        for row in range(start_row, end_row + 1):
            line = lines[row - 1]
            begin = start_col if row == start_row else 0
            end = end_col if row == end_row else len(line.rstrip("\r\n"))
            lines[row - 1] = line[:begin] + " " * (end - begin) + line[end:]
    return "".join(lines)


def _token_patterns(token: str) -> list[re.Pattern[str]]:
    """Return the patterns that find ``token`` in source."""
    if "." not in token:
        # Bare names also match attribute access: ir.async_create_issue(...).
        return [re.compile(rf"\b{re.escape(token)}\b")]
    module, _, last = token.rpartition(".")
    patterns = [
        re.compile(rf"\b{re.escape(token)}\b"),
        # from [pkg.]a.b import (x, C), also across lines
        re.compile(
            rf"from\s+(?:[\w.]+\.)?{re.escape(module)}\s+import\s+\(?[^)]*?"
            rf"\b{re.escape(last)}\b",
            re.DOTALL,
        ),
    ]
    if last not in STOPLIST:
        patterns.append(re.compile(rf"\b{re.escape(last)}\b"))
    return patterns


def find_matches(tokens: Iterable[str], package_dir: Path | None = None) -> list[Match]:
    """Return where the integration uses each token, as ``file:line``."""
    package_dir = package_dir or PACKAGE_DIR
    files = sorted(
        path for path in package_dir.rglob("*.py") if "__pycache__" not in path.parts
    )
    sources = {path: path.read_text("utf-8", errors="replace") for path in files}
    codes = {path: code_only(source) for path, source in sources.items()}
    matches: list[Match] = []
    for token in tokens:
        found: list[Match] = []
        patterns = _token_patterns(token)
        for path, source in sources.items():
            lines = source.splitlines()
            code = codes[path]
            relative = path.relative_to(package_dir.parent.parent).as_posix()
            seen: set[int] = set()
            for pattern in patterns:
                for hit in pattern.finditer(code):
                    number = code.count("\n", 0, hit.start()) + 1
                    if number not in seen:
                        seen.add(number)
                        found.append(
                            Match(token, relative, number, lines[number - 1].strip())
                        )
        found.sort(key=lambda m: (m.file, m.line))
        matches.extend(found[:MAX_MATCHES_PER_TOKEN])
    return matches


def fetch_url(url: str) -> str:
    """Return the body of ``url`` as text, following redirects."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})  # noqa: S310 - fixed https URLs
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:  # noqa: S310
        return response.read().decode("utf-8", errors="replace")


def scan(
    days: int,
    *,
    now: datetime,
    fetch: Fetch = fetch_url,
    package_dir: Path | None = None,
) -> list[Post]:
    """Return the posts of the last ``days`` days, matched to the integration."""
    try:
        feed = ET.fromstring(fetch(FEED_URL))  # noqa: S314 - the HA developer blog feed
    except (OSError, ET.ParseError) as err:
        raise ScanError(f"Cannot read {FEED_URL}: {err}") from err
    items = feed.findall("./channel/item")
    if not items:
        raise ScanError(f"{FEED_URL} has no posts")
    cutoff = now - timedelta(days=days)
    posts = []
    for item in items:
        published = email.utils.parsedate_to_datetime(item.findtext("pubDate") or "")
        if published.astimezone(UTC) < cutoff:
            continue
        post = Post(
            title=(item.findtext("title") or "").strip(),
            link=(item.findtext("link") or "").strip(),
            pub_date=published.astimezone(UTC).isoformat(),
        )
        html = item.findtext(CONTENT_ENCODED)
        if not html:
            try:
                page = fetch(post.link)
            except OSError as err:
                post.error = f"{type(err).__name__}: {err}"
                posts.append(post)
                continue
            article = ARTICLE.search(page)
            html = article.group(0) if article else page
        post.tokens = announced_tokens(html)
        post.matches = find_matches(post.tokens, package_dir)
        posts.append(post)
    return posts


class ScanError(Exception):
    """Raised when the feed cannot be read."""


def report(posts: Sequence[Post], days: int, now: datetime) -> dict[str, object]:
    """Return the JSON report for the workflow."""
    return {
        "feed": FEED_URL,
        "days": days,
        "generated": now.isoformat(),
        "posts": [
            {**asdict(post), "status": post.status}
            for post in sorted(posts, key=lambda p: p.pub_date, reverse=True)
        ],
    }


def main(argv: Sequence[str] | None = None, *, fetch: Fetch = fetch_url) -> int:
    """Run the command-line interface."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    commands = parser.add_subparsers(dest="command", required=True)
    scan_parser = commands.add_parser("scan", help="scan the recent posts")
    scan_parser.add_argument("--days", type=int, default=7, help="Look-back window")
    args = parser.parse_args(argv)

    now = datetime.now(UTC)
    try:
        posts = scan(args.days, now=now, fetch=fetch)
    except ScanError as err:
        print(err, file=sys.stderr)
        return 1
    print(json.dumps(report(posts, args.days, now), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
