#!/usr/bin/env python3
"""One-time lossless migration manifest from the approved 4-language workbook.

Do not modify original source fields; only published editor values are exported.
The resulting JSON is a *read-only migration baseline*, never a second editor.
"""
from __future__ import annotations
import json
import pathlib
import sys
from scripts.translation_workbook import load_editable_catalogs

ROOT = pathlib.Path(__file__).resolve().parents[1]
catalog = load_editable_catalogs(ROOT)
out = ROOT / "localization" / "approved-translations.v1.json"
content = {
    "schemaVersion": 1,
    "count": catalog.total,
    "ui": {
        "ru": catalog.ui_russian,
        "en": catalog.ui_english,
        "jp": catalog.ui_japanese,
        "tw": catalog.ui_traditional_chinese,
    },
    "game": {
        "ru": catalog.game_russian,
        "en": catalog.game_english,
        "jp": {},
        "tw": {},
    },
}
assert catalog.total >= 2500, "Unexpectedly small translation corpus"
assert content["ui"]["ru"] and content["game"]["ru"], "Russian migration source empty"
out.write_text(json.dumps(content, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
print(json.dumps({
    "output": str(out.relative_to(ROOT)),
    "rows": catalog.total,
    "approved": {scope:{lang:len(values) for lang,values in content[scope].items()} for scope in ("ui","game")}
}, ensure_ascii=False))
