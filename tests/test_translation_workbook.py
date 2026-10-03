import pathlib
import shutil
import tempfile
import unittest
import zipfile
from xml.etree import ElementTree

from scripts.translation_workbook import MAIN_NS, load_translation_catalogs, read_rows


ROOT = pathlib.Path(__file__).resolve().parents[1]


def set_translation_cell(workbook: pathlib.Path, identifier: str, value: str, column: str = "H") -> None:
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
                cell = row.find(f"{{{MAIN_NS}}}c[@r='{column}{row_number}']")
                if cell is None:
                    cell = ElementTree.SubElement(row, f"{{{MAIN_NS}}}c", {"r": f"{column}{row_number}"})
                cell.clear()
                cell.attrib.update({"r": f"{column}{row_number}", "t": "inlineStr"})
                inline = ElementTree.SubElement(cell, f"{{{MAIN_NS}}}is")
                ElementTree.SubElement(inline, f"{{{MAIN_NS}}}t").text = value
                payload = ElementTree.tostring(sheet, encoding="utf-8", xml_declaration=True)
            target.writestr(entry, payload)
    rewritten.replace(workbook)


set_russian_cell = set_translation_cell


class TranslationWorkbookTests(unittest.TestCase):
    def copy_localization(self, root):
        localization = root / "localization"
        localization.mkdir()
        for name in ("ui.en.json", "game-terms.ru.json", "translations.xlsx"):
            shutil.copy2(ROOT / "localization" / name, localization / name)
        return localization

    def test_english_overrides_publish_separately_from_preserved_sources(self):
        from scripts.translation_workbook import load_editable_catalogs
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = self.copy_localization(root)
            workbook = localization / "translations.xlsx"
            before = read_rows(workbook)
            set_translation_cell(workbook, "header.project", "Community project", "I")
            set_translation_cell(workbook, "equipment.0.1", "Owner's custom weapon", "I")
            set_translation_cell(workbook, "equipment.0.1", "Оружие владельца")
            catalogs = load_editable_catalogs(root)
            self.assertEqual(catalogs.ui_english, {"header.project": "Community project"})
            self.assertEqual(catalogs.game_english, {"equipment.0.1": "Owner's custom weapon"})
            self.assertEqual(catalogs.game_russian["equipment.0.1"], "Оружие владельца")
            self.assertEqual([row[:7] for row in read_rows(workbook)], [row[:7] for row in before])

    def test_english_ui_placeholders_cannot_be_removed(self):
        from scripts.translation_workbook import load_editable_catalogs
        import json
        english = json.loads((ROOT / "localization/ui.en.json").read_text(encoding="utf-8"))
        identifier = next(key for key, value in english.items() if "{total}" in value)
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = self.copy_localization(root)
            set_translation_cell(localization / "translations.xlsx", identifier, "No placeholders", "I")
            with self.assertRaisesRegex(ValueError, "English translation placeholders"):
                load_editable_catalogs(root)

    def test_blank_english_override_falls_back_to_original(self):
        from scripts.translation_workbook import load_editable_catalogs
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = self.copy_localization(root)
            set_translation_cell(localization / "translations.xlsx", "equipment.0.1", "  ", "I")
            self.assertEqual(load_editable_catalogs(root).game_english, {})

    def test_extended_workbook_keeps_one_filterable_table_and_frozen_source_ids(self):
        with zipfile.ZipFile(ROOT / "localization/translations.xlsx") as archive:
            tables = [name for name in archive.namelist() if name.startswith("xl/tables/") and name.endswith(".xml")]
            self.assertEqual(len(tables), 1)
            table = ElementTree.fromstring(archive.read(tables[0]))
            self.assertEqual(table.attrib["ref"], "A1:I2894")
            self.assertEqual(table.find(f"{{{MAIN_NS}}}autoFilter").attrib["ref"], "A1:I2894")
            sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))
            pane = sheet.find(f".//{{{MAIN_NS}}}pane")
            self.assertEqual(pane.attrib["state"], "frozen")
            self.assertEqual(pane.attrib["xSplit"], "2")
            self.assertEqual(pane.attrib["ySplit"], "1")

    def test_workbook_matches_every_ui_and_game_source_row(self):
        ui_russian, game_russian, total = load_translation_catalogs(ROOT)
        self.assertEqual(total, 2893)
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
            self.assertEqual(total, 2893)
            self.assertEqual(game_russian["equipment.0.1"], "Проверочный предмет")

    def test_workbench_captions_keep_editable_languages_and_no_game_data_changes(self):
        from scripts.translation_workbook import load_editable_catalogs
        before = load_editable_catalogs(ROOT)
        self.assertEqual(before.ui_russian["workbench.character"], "Персонаж")
        self.assertEqual(before.ui_russian["workbench.results"], "Результаты расчёта")
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = self.copy_localization(root)
            set_translation_cell(localization / "translations.xlsx", "workbench.results", "Calculated results", "I")
            set_translation_cell(localization / "translations.xlsx", "workbench.results", "Итоги", "H")
            edited = load_editable_catalogs(root)
            self.assertEqual(edited.ui_english["workbench.results"], "Calculated results")
            self.assertEqual(edited.ui_russian["workbench.results"], "Итоги")
            self.assertEqual(edited.game_russian, before.game_russian)
            self.assertEqual(edited.game_english, before.game_english)
            self.assertEqual(edited.total, 2893)

    def test_new_skill_captions_have_editable_ru_and_en_without_affecting_source_catalog(self):
        from scripts.translation_workbook import load_editable_catalogs
        keys = {"skills." + key for key in ("catalog", "template", "learned", "notLearned",
                "bonusApplied", "bonusInactive", "metadataOnly", "bonusRequirements", "unarmed", "ridingRequired")}
        rows = {row[1]: row for row in read_rows(ROOT / "localization/translations.xlsx")[1:]}
        self.assertEqual(len(keys), 10)
        self.assertTrue(all(rows[key][0] == "Интерфейс" and rows[key][4] and rows[key][7] for key in keys))
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = self.copy_localization(root)
            set_translation_cell(localization / "translations.xlsx", "skills.template", "Source skill: {name}", "I")
            set_russian_cell(localization / "translations.xlsx", "skills.catalog", "Новые умения")
            catalog = load_editable_catalogs(root)
            self.assertEqual(catalog.ui_english["skills.template"], "Source skill: {name}")
            self.assertEqual(catalog.ui_russian["skills.catalog"], "Новые умения")
            self.assertEqual(catalog.game_english, {})
            self.assertEqual(catalog.game_russian, {})


if __name__ == "__main__":
    unittest.main()
