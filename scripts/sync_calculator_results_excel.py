#!/usr/bin/env python3
"""One-time, conflict-safe transport of approved RU captions into translations.xlsx.

The approved workbook was authored and verified with artifact_tool. This script
only carries the exact 43-cell patch into the Git repository while preserving
the existing OpenXML package, styles, comments and all non-target cells.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import tempfile
import zipfile
from xml.sax.saxutils import escape

from translation_workbook import read_rows

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "localization" / "translations.xlsx"
LABELS = ROOT / "localization" / "calculator-results.ru.json"
SHEET_MEMBER = "xl/worksheets/sheet1.xml"
CELL = re.compile(r"(<(?P<prefix>[\w]+:)?c\b[^>]*\br=\"H(?P<row>\d+)\"[^>]*>)(?P<body>.*?)(</(?:[\w]+:)?c>)", re.DOTALL)
TEXT = re.compile(r"(<(?:[\w]+:)?t(?:\s[^>]*)?>)(.*?)(</(?:[\w]+:)?t>)", re.DOTALL)


def replacements():
    source = json.loads(LABELS.read_text(encoding="utf-8"))
    if source.get("schemaVersion") != 1 or source.get("locale") != "ru":
        raise ValueError("Unsupported result translation payload")
    targets, previous = source["labels"], source["previous"]
    if set(targets) != {f"calculator.status.{i}" for i in range(43)}:
        raise ValueError("Exactly 43 stable status IDs are required")
    if any(not isinstance(value, str) or not value.strip() or len(value) > 100 for value in targets.values()):
        raise ValueError("Invalid or empty translation")
    if set(previous) - set(targets):
        raise ValueError("Unknown previous translation IDs")
    table = read_rows(WORKBOOK)
    if len(table) < 2100 or table[0][1] != "ID (не менять)":
        raise ValueError("Unexpected workbook structure")
    cells = {}
    seen = set()
    for index, row in enumerate(table[1:], start=2):
        key = row[1]
        if key not in targets:
            continue
        if key in seen:
            raise ValueError("Repeated result ID " + key)
        seen.add(key)
        existing = row[7]
        target = targets[key]
        if existing not in {target, previous.get(key, target)}:
            raise ValueError("Conflict: manual Excel translation for " + key + " would be overwritten")
        if existing != target:
            cells[index] = target
    if seen != set(targets):
        raise ValueError("Workbook is missing result IDs: " + str(set(targets) - seen))
    return cells


def sync(*, check=False):
    replacements_by_row = replacements()
    if not replacements_by_row:
        print("Translations already synchronized.")
        return 0
    if check:
        print(f"Workbook out of sync: {len(replacements_by_row)} captions.", file=sys.stderr)
        return 1

    with zipfile.ZipFile(WORKBOOK, "r") as source:
        xml = source.read(SHEET_MEMBER).decode("utf-8")
        applied = set()

        def update(match):
            row = int(match.group("row"))
            if row not in replacements_by_row:
                return match.group(0)
            text = escape(replacements_by_row[row])
            old = match.group("body")
            new, count = TEXT.subn(lambda m: m.group(1) + text + m.group(3), old, count=1)
            if count != 1:
                raise ValueError(f"Cannot patch text for Excel row {row}")
            applied.add(row)
            return match.group(1) + new + match.group(5)

        # Keep every other ZIP member exactly as it was; only the one XML part
        # containing updated text must be recompressed. No new spreadsheet is
        # constructed and no data/style/schema member is touched.
        updated = CELL.sub(update, xml)
        if applied != set(replacements_by_row):
            raise ValueError("Excel cell mapping drift: " + str(set(replacements_by_row) - applied))
        temp = tempfile.NamedTemporaryFile(prefix="result-translations-", suffix=".xlsx", dir=WORKBOOK.parent, delete=False)
        temp.close()
        try:
            with zipfile.ZipFile(temp.name, "w") as output:
                for entry in source.infolist():
                    data = updated.encode("utf-8") if entry.filename == SHEET_MEMBER else source.read(entry.filename)
                    output.writestr(entry, data)
            pathlib.Path(temp.name).replace(WORKBOOK)
        finally:
            pathlib.Path(temp.name).unlink(missing_ok=True)

    if replacements():
        raise ValueError("Workbook did not persist all captions")
    print(f"Synchronized {len(applied)} exact translation cells; all other translations preserved.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    options = parser.parse_args()
    raise SystemExit(sync(check=options.check))
