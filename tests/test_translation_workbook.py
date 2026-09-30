import pathlib
import shutil
import tempfile
import unittest
import zipfile
from xml.etree import ElementTree

from scripts.translation_workbook import MAIN_NS, load_translation_catalogs, read_rows


ROOT = pathlib.Path(__file__).resolve().parents[1]


def set_russian_cell(workbook: pathlib.Path, identifier: str, value: str) -> None:
    rows = read_rows(workbook)
    row_number = next(index for index, row in enumerate(rows, start=1) if row[1] == identifier)
    rewritten = workbook.with_suffix(".changed.xlsx")
    with zipfile.ZipFile(workbook) as source, zipfile.ZipFile(rewritten, "w") as target:
        for entry in source.infolist():
            payload = source.read(entry.filename)
            if entry.filename == "xl/worksheets/sheet1.xml":
                sheet = ElementTree.fromstring(payload)
                row = sheet.find(f".//{{{MAIN_NS}}}row[@r='{row_number}']")
                if row is None:
                    raise AssertionError(f"missing workbook row {row_number}")
                cell = row.find(f"{{{MAIN_NS}}}c[@r='H{row_number}']")
                if cell is None:
                    cell = ElementTree.SubElement(row, f"{{{MAIN_NS}}}c", {"r": f"H{row_number}"})
                cell.clear()
                cell.attrib.update({"r": f"H{row_number}", "t": "inlineStr"})
                inline = ElementTree.SubElement(cell, f"{{{MAIN_NS}}}is")
                ElementTree.SubElement(inline, f"{{{MAIN_NS}}}t").text = value
                payload = ElementTree.tostring(sheet, encoding="utf-8", xml_declaration=True)
            target.writestr(entry, payload)
    rewritten.replace(workbook)


class TranslationWorkbookTests(unittest.TestCase):
    def test_extended_workbook_keeps_one_filterable_table_and_frozen_source_ids(self):
        with zipfile.ZipFile(ROOT / "localization/translations.xlsx") as archive:
            tables = [name for name in archive.namelist() if name.startswith("xl/tables/") and name.endswith(".xml")]
            self.assertEqual(len(tables), 1)
            table = ElementTree.fromstring(archive.read(tables[0]))
            self.assertEqual(table.attrib["ref"], "A1:H2843")
            self.assertEqual(table.find(f"{{{MAIN_NS}}}autoFilter").attrib["ref"], "A1:H2843")
            sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))
            pane = sheet.find(f".//{{{MAIN_NS}}}pane")
            self.assertEqual(pane.attrib["state"], "frozen")
            self.assertEqual(pane.attrib["xSplit"], "2")
            self.assertEqual(pane.attrib["ySplit"], "1")

    def test_workbook_matches_every_ui_and_game_source_row(self):
        ui_russian, game_russian, total = load_translation_catalogs(ROOT)
        self.assertEqual(total, 2842)
        rows = read_rows(ROOT / "localization/translations.xlsx")[1:]
        self.assertEqual(ui_russian, {row[1]: row[7] for row in rows if row[0] == "Интерфейс" and row[7].strip()})
        self.assertEqual(game_russian, {row[1]: row[7].strip() for row in rows if row[0] == "Игра" and row[7].strip()})

    def test_changed_source_column_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = root / "localization"
            localization.mkdir()
            for name in ("ui.en.json", "game-terms.ru.json", "translations.xlsx"):
                shutil.copy2(ROOT / "localization" / name, localization / name)

            workbook = localization / "translations.xlsx"
            rewritten = localization / "translations.changed.xlsx"
            with zipfile.ZipFile(workbook) as source, zipfile.ZipFile(rewritten, "w") as target:
                for entry in source.infolist():
                    payload = source.read(entry.filename)
                    if entry.filename.endswith(".xml"):
                        payload = payload.replace(b"Interface language", b"Changed source text", 1)
                    target.writestr(entry, payload)
            rewritten.replace(workbook)

            with self.assertRaisesRegex(ValueError, "source columns changed"):
                load_translation_catalogs(root)

    def test_russian_game_name_entered_in_workbook_reaches_runtime_catalog(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = root / "localization"
            localization.mkdir()
            for name in ("ui.en.json", "game-terms.ru.json", "translations.xlsx"):
                shutil.copy2(ROOT / "localization" / name, localization / name)

            set_russian_cell(localization / "translations.xlsx", "equipment.0.1", "Проверочный предмет")

            _, game_russian, total = load_translation_catalogs(root)
            self.assertEqual(total, 2842)
            self.assertEqual(game_russian["equipment.0.1"], "Проверочный предмет")


if __name__ == "__main__":
    unittest.main()
