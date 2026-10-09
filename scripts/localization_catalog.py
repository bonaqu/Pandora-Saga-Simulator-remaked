"""Runtime approved translation catalog, detached from the legacy Excel editor.

The JSON is an immutable recovery baseline exported before any D1 cutover.
Only admin Cloudflare D1 overrides are editable after migration. Keep a
All texts are edited using authenticated Cloudflare admin revisions.
"""
from __future__ import annotations
import json
import pathlib
from dataclasses import dataclass

@dataclass(frozen=True)
class TranslationCatalogs:
    ui_russian: dict[str, str]
    ui_japanese: dict[str, str]
    ui_traditional_chinese: dict[str, str]
    game_russian: dict[str, str]
    ui_english: dict[str, str]
    game_english: dict[str, str]
    total: int

def load_migrated_catalogs(root: pathlib.Path) -> TranslationCatalogs:
    source = root / "localization" / "approved-translations.v1.json"
    data = json.loads(source.read_text(encoding="utf-8"))
    if data.get("schemaVersion") != 1 or not isinstance(data.get("count"), int) or data["count"] < 2500:
        raise ValueError("Approved localization migration baseline is invalid")
    for scope in ("ui", "game"):
        if not isinstance(data.get(scope), dict) or set(data[scope]) != {"en", "ru", "jp", "tw"}:
            raise ValueError("Unsupported language catalog")
        for locale, rows in data[scope].items():
            if not isinstance(rows, dict) or any(
                not isinstance(key, str) or not isinstance(value, str) or not value
                for key, value in rows.items()
            ):
                raise ValueError("Invalid translation record")
    return TranslationCatalogs(
        ui_russian=data["ui"]["ru"],
        ui_japanese=data["ui"]["jp"],
        ui_traditional_chinese=data["ui"]["tw"],
        game_russian=data["game"]["ru"],
        ui_english=data["ui"]["en"],
        game_english=data["game"]["en"],
        total=data["count"],
    )
