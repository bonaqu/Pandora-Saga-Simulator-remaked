#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import pathlib
import re
import zipfile
from dataclasses import dataclass
from xml.etree import ElementTree


SHEET_NAME = "Переводы"
HEADERS = (
    "Раздел",
    "ID (не менять)",
    "Тип",
    "Путь Legacy (не менять)",
    "English",
    "日本語",
    "繁體中文",
    "Русский — заполнять здесь",
    "English — редактировать здесь",
)
CATEGORY_NAMES = {
    "race": "Раса",
    "racial_skill": "Расовый навык",
    "job": "Класс",
    "skill": "Группа навыков",
    "skill_entry": "Навык",
    "equipment_category": "Категория экипировки",
    "equipment": "Предмет",
    "soul": "Soul",
    "calculator_label": "Подпись калькулятора",
    "calculator_hint": "Подсказка калькулятора",
    "skill_detail": "Описание навыка",
}
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
DOCUMENT_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
PLACEHOLDER = re.compile(r"\{([A-Za-z0-9_]+)\}")


def _column_index(reference: str) -> int:
    letters = "".join(character for character in reference if character.isalpha())
    value = 0
    for character in letters.upper():
        value = value * 26 + ord(character) - ord("A") + 1
    return value - 1


def _text_nodes(element: ElementTree.Element) -> str:
    return "".join(node.text or "" for node in element.findall(f".//{{{MAIN_NS}}}t"))


def read_rows(path: pathlib.Path) -> list[list[str]]:
    try:
        archive = zipfile.ZipFile(path)
    except (OSError, zipfile.BadZipFile) as exc:
        raise ValueError(f"translation workbook is not a readable .xlsx file: {path.as_posix()}") from exc

    with archive:
        try:
            workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
            relationships = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        except (KeyError, ElementTree.ParseError) as exc:
            raise ValueError("translation workbook is missing required Excel structures") from exc

        relation_targets = {
            relation.attrib["Id"]: relation.attrib["Target"]
            for relation in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
        }
        sheet_target = None
        for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet"):
            if sheet.attrib.get("name") == SHEET_NAME:
                relation_id = sheet.attrib.get(f"{{{DOCUMENT_REL_NS}}}id")
                sheet_target = relation_targets.get(relation_id)
                break
        if not sheet_target:
            raise ValueError(f'translation workbook must contain a sheet named "{SHEET_NAME}"')

        sheet_path = "xl/" + sheet_target.lstrip("/").removeprefix("xl/")
        try:
            sheet_xml = ElementTree.fromstring(archive.read(sheet_path))
        except (KeyError, ElementTree.ParseError) as exc:
            raise ValueError(f'translation sheet "{SHEET_NAME}" is unreadable') from exc

        shared_strings: list[str] = []
        try:
            shared_xml = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
        except KeyError:
            shared_xml = None
        except ElementTree.ParseError as exc:
            raise ValueError("translation workbook has invalid shared strings") from exc
        if shared_xml is not None:
            shared_strings = [_text_nodes(item) for item in shared_xml.findall(f"{{{MAIN_NS}}}si")]

        rows: list[list[str]] = []
        for row in sheet_xml.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row"):
            values = [""] * len(HEADERS)
            for cell in row.findall(f"{{{MAIN_NS}}}c"):
                if cell.find(f"{{{MAIN_NS}}}f") is not None:
                    raise ValueError(f"formulas are not allowed in translation cell {cell.attrib.get('r', '?')}")
                column = _column_index(cell.attrib.get("r", ""))
                if column < 0 or column >= len(HEADERS):
                    continue
                kind = cell.attrib.get("t")
                if kind == "inlineStr":
                    value = _text_nodes(cell)
                else:
                    value_node = cell.find(f"{{{MAIN_NS}}}v")
                    value = value_node.text if value_node is not None and value_node.text is not None else ""
                    if kind == "s" and value:
                        try:
                            value = shared_strings[int(value)]
                        except (IndexError, ValueError) as exc:
                            raise ValueError(f"invalid shared string in cell {cell.attrib.get('r', '?')}") from exc
                values[column] = value
            if any(value != "" for value in values):
                rows.append(values)
        return rows


@dataclass(frozen=True)
class TranslationCatalogs:
    ui_russian: dict[str, str]
    game_russian: dict[str, str]
    ui_english: dict[str, str]
    game_english: dict[str, str]
    total: int


def load_editable_catalogs(root: pathlib.Path) -> TranslationCatalogs:
    localization = root / "localization"
    rows = read_rows(localization / "translations.xlsx")
    if not rows or tuple(rows[0]) != HEADERS:
        raise ValueError("translation workbook headers were changed; restore the first row")

    english = json.loads((localization / "ui.en.json").read_text(encoding="utf-8"))
    game_export = json.loads((localization / "game-terms.ru.json").read_text(encoding="utf-8"))
    game_terms = game_export.get("terms", [])
    expected: dict[str, tuple[str, str, str, str, str, str, str]] = {}
    for identifier, source in english.items():
        expected[identifier] = ("Интерфейс", identifier, "Интерфейс сайта", "", source, "", "")
    for term in game_terms:
        expected[term["id"]] = (
            "Игра",
            term["id"],
            CATEGORY_NAMES.get(term["category"], term["category"]),
            term["legacy_path"],
            term["source_en"],
            term["source_jp"],
            term["source_tw"],
        )

    actual = rows[1:]
    if len(actual) != len(expected):
        raise ValueError(f"translation workbook must contain {len(expected)} rows; found {len(actual)}")

    ui_russian: dict[str, str] = {}
    game_russian: dict[str, str] = {}
    ui_english: dict[str, str] = {}
    game_english: dict[str, str] = {}
    seen: set[str] = set()
    for index, row in enumerate(actual, start=2):
        identifier = row[1]
        source = expected.get(identifier)
        if source is None:
            raise ValueError(f"unknown translation ID in row {index}: {identifier or 'missing ID'}")
        stable = tuple(row[:7])
        if stable != source:
            raise ValueError(f"source columns changed in translation row {index} ({row[1] or 'missing ID'})")
        if identifier in seen:
            raise ValueError(f"duplicate translation ID in row {index}: {identifier}")
        seen.add(identifier)
        russian = row[7] if row[7].strip() else ""
        english_override = row[8] if row[8].strip() else ""
        if row[0] == "Интерфейс":
            if russian and sorted(PLACEHOLDER.findall(row[4])) != sorted(PLACEHOLDER.findall(russian)):
                raise ValueError(f"translation placeholders do not match in row {index}: {identifier}")
            if russian:
                ui_russian[identifier] = russian
            if english_override:
                if sorted(PLACEHOLDER.findall(row[4])) != sorted(PLACEHOLDER.findall(english_override)):
                    raise ValueError(f"English translation placeholders do not match in row {index}: {identifier}")
                ui_english[identifier] = english_override
        elif russian:
            game_russian[identifier] = russian.strip()
        if row[0] == "Игра" and english_override:
            game_english[identifier] = english_override.strip()

    missing = sorted(set(expected) - seen)
    if missing:
        raise ValueError("translation workbook is missing IDs: " + ", ".join(missing[:5]))

    return TranslationCatalogs(ui_russian, game_russian, ui_english, game_english, len(actual))


def load_translation_catalogs(root: pathlib.Path) -> tuple[dict[str, str], dict[str, str], int]:
    """Retain the existing RU reader API for tools and older integration fixtures."""
    catalogs = load_editable_catalogs(root)
    return catalogs.ui_russian, catalogs.game_russian, catalogs.total


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path.cwd())
    args = parser.parse_args()
    catalogs = load_editable_catalogs(args.root.resolve())
    print(
        f"Verified {catalogs.total} translation rows: "
        f"{len(catalogs.ui_russian)} Russian UI strings and {len(catalogs.game_russian)} approved Russian game terms; "
        f"{len(catalogs.ui_english)} English UI overrides and {len(catalogs.game_english)} English game overrides."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
