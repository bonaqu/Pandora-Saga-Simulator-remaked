#!/usr/bin/env python3
"""Generate both public locale-specific changelogs from one canonical source.

CHANGELOG.md contains explicit user and development blocks. This script
produces readable RU/EN archives; only user blocks may feed the on-site
What's New popup (scripts/build_pages.py enforces this separately).
"""
from __future__ import annotations

import argparse
import pathlib
import re

HEAD = re.compile(
    r"^## Modern (?P<version>\d+\.\d+) — (?P<title>.+?), (?P<date>\d{4}-\d{2}-\d{2})\s*$",
    re.MULTILINE,
)
LOCALES = {
    "ru": ("# История обновлений — Русский", "Для пользователей", "Разработка и технические изменения",
           "Архивная запись без разделения по аудитории. См. [исходный журнал](CHANGELOG.md)."),
    "en": ("# Release history — English", "For users", "Development and technical changes",
           "Legacy entry without audience classification. See the [source changelog](CHANGELOG.md)."),
}


def marker(section: str, kind: str, lang: str) -> str:
    expression = (
        r"<!-- " + re.escape(kind + ":" + lang)
        + r" -->(.*?)<!-- /" + re.escape(kind + ":" + lang) + r" -->"
    )
    found = re.search(expression, section, re.DOTALL)
    if not found:
        return ""
    # The previous changelog had misplaced audience subheadings
    # inside developer-only notes. Do not propagate misleading headings.
    lines = [line.rstrip() for line in found.group(1).strip().splitlines()
             if not line.lstrip().startswith("### ")]
    return "\n".join(lines).strip()


def render(source: str, lang: str) -> str:
    if lang not in LOCALES:
        raise ValueError("Unsupported changelog language")
    title, user_label, dev_label, legacy_label = LOCALES[lang]
    matches = list(HEAD.finditer(source))
    if not matches:
        raise ValueError("CHANGELOG.md has no dated Modern entries")
    lines = [title, "",
             "Один источник изменений: [CHANGELOG.md](CHANGELOG.md). Всплывающее окно сайта показывает только блоки «Для пользователей»."
             if lang == "ru" else
             "Canonical source: [CHANGELOG.md](CHANGELOG.md). The site's What's New panel displays user entries only.",
             ""]
    for i, match in enumerate(matches):
        section = source[match.end(): matches[i+1].start() if i+1 < len(matches) else len(source)]
        user = marker(section, "release-notes:user", lang)
        if not user:
            # Older releases keep their original markers; no history rewriting.
            user = marker(section, "release-notes:player", lang)
        if not user:
            user = marker(section, "release-notes", lang)
        dev = marker(section, "admin-notes", lang)
        lines.extend(["## Modern " + match.group("version") + " — " + match.group("date"), ""])
        if user:
            lines.extend(["### " + user_label, "", user, ""])
        if dev:
            lines.extend(["### " + dev_label, "", dev, ""])
        if not user and not dev:
            lines.extend([legacy_label, ""])
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="Fail if the checked-in localized changelogs are stale")
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parents[1]
    source = (root / "CHANGELOG.md").read_text(encoding="utf-8")
    changed = []
    for locale in LOCALES:
        target = root / ("CHANGELOG." + locale + ".md")
        expected = render(source, locale)
        if args.check:
            if not target.exists() or target.read_text(encoding="utf-8") != expected:
                changed.append(str(target.name))
        else:
            target.write_text(expected, encoding="utf-8")
            print("Generated", target.name)
    if changed:
        raise SystemExit("Outdated localized changelogs: " + ", ".join(changed)
                         + ". Run python3 scripts/sync_localized_changelogs.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
