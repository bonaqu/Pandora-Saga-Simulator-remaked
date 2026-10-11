"""Canonical immutable translation baseline.

Approved language data ships as reviewed JSON. All new changes are made via
the authenticated RU/EN/JP/TW Cloudflare admin editor, using D1 revisions.
No Excel file is required for builds, translations or routine maintenance.
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
    # Keep the frozen approved snapshot immutable. A handful of subsequently
    # reviewed Modern UI corrections are a *build fallback* only: the public
    # Cloudflare D1 publication still has higher priority on every locale.
    curated = json.loads((root / "localization/curated-runtime-defaults.ru.v1.json").read_text(encoding="utf-8"))
    english_source = json.loads((root / "localization/ui.en.json").read_text(encoding="utf-8"))
    ui_ru = dict(data["ui"]["ru"])
    for key, value in curated["ru"]["ui"].items():
        if key not in english_source or not isinstance(value, str) or not value.strip():
            raise ValueError(f"Curated UI fallback not in registered source: {key}")
        ui_ru[key] = value
    return TranslationCatalogs(
        ui_russian=ui_ru,
        ui_japanese=data["ui"]["jp"],
        ui_traditional_chinese=data["ui"]["tw"],
        game_russian=data["game"]["ru"],
        ui_english=data["ui"]["en"],
        game_english=data["game"]["en"],
        total=data["count"],
    )
