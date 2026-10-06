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
            previous = load_editable_catalogs(root)
            set_translation_cell(workbook, "header.project", "Community project", "I")
            set_translation_cell(workbook, "equipment.0.1", "Owner's custom weapon", "I")
            set_translation_cell(workbook, "equipment.0.1", "Оружие владельца")
            catalogs = load_editable_catalogs(root)
            self.assertEqual(catalogs.ui_english, {"header.project": "Community project"})
            self.assertEqual(catalogs.game_english, {**previous.game_english, "equipment.0.1": "Owner's custom weapon"})
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
        baseline = load_editable_catalogs(ROOT)
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = self.copy_localization(root)
            set_translation_cell(localization / "translations.xlsx", "equipment.0.1", "  ", "I")
            edited = load_editable_catalogs(root)
            self.assertNotIn("equipment.0.1", edited.game_english)
            self.assertEqual(edited.game_english, baseline.game_english)

    def test_extended_workbook_keeps_one_filterable_table_and_frozen_source_ids(self):
        with zipfile.ZipFile(ROOT / "localization/translations.xlsx") as archive:
            tables = [name for name in archive.namelist() if name.startswith("xl/tables/") and name.endswith(".xml")]
            self.assertEqual(len(tables), 1)
            table = ElementTree.fromstring(archive.read(tables[0]))
            self.assertEqual(table.attrib["ref"], "A1:I2908")
            self.assertEqual(table.find(f"{{{MAIN_NS}}}autoFilter").attrib["ref"], "A1:I2908")
            sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))
            pane = sheet.find(f".//{{{MAIN_NS}}}pane")
            self.assertEqual(pane.attrib["state"], "frozen")
            self.assertEqual(pane.attrib["xSplit"], "2")
            self.assertEqual(pane.attrib["ySplit"], "1")

    def test_workbook_matches_every_ui_and_game_source_row(self):
        ui_russian, game_russian, total = load_translation_catalogs(ROOT)
        self.assertEqual(total, 2907)
        rows = read_rows(ROOT / "localization/translations.xlsx")[1:]
        self.assertEqual(ui_russian, {row[1]: row[7] for row in rows if row[0] == "Интерфейс" and row[7].strip()})
        self.assertEqual(game_russian, {row[1]: row[7].strip() for row in rows if row[0] == "Игра" and row[7].strip()})

    def test_requested_russian_calculator_labels_and_hints_are_exact(self):
        from scripts.translation_workbook import load_editable_catalogs
        catalog = load_editable_catalogs(ROOT)
        expected = {
            "calculator.text.10": "ВЫН", "calculator.text.11": "СИЛ", "calculator.text.12": "ПРВ",
            "calculator.text.13": "ЛВК", "calculator.text.14": "СД", "calculator.text.15": "ИНТ",
            "calculator.status.0": "ОЗ", "calculator.status.1": "ОМ", "calculator.status.2": "УВЕЛЗЕЛ",
            "calculator.status.3": "% исцеления ОЗ", "calculator.status.4": "Восст ОМ",
            "calculator.status.5": "МаксАТК", "calculator.status.6": "Фронт+", "calculator.status.7": "Спин+",
            "calculator.status.8": "МагАТК", "calculator.status.9": "ЗАЩИТА",
            "calculator.status.10": "ФРОНТ Сопр", "calculator.status.11": "СПИН Сопр",
            "calculator.status.12": "Физ СОПР", "calculator.status.13": "ФИЗ Сопр",
            "calculator.status.14": "МАГ Сопр", "calculator.status.15": "Точность",
            "calculator.status.16": "ТОЧН", "calculator.status.17": "ШК",
            "calculator.status.18": "Крит УРОН", "calculator.status.19": "Уклонение",
            "calculator.status.20": "КРИТ Сопр", "calculator.status.21": "КУРОН СОПР",
            "calculator.status.22": "Ближ УКЛОН", "calculator.status.23": "Дальн АТК УКЛОН",
            "calculator.status.24": "Маг УКЛОН", "calculator.status.25": "Дист ближ АТК",
            "calculator.status.26": "Дист дальн АТК", "calculator.status.27": "ОГН Сопр",
            "calculator.status.28": "СКР АТК", "calculator.status.29": "ЛЕД Сопр",
            "calculator.status.30": "СКР Каста", "calculator.status.31": "ВремяКаст",
            "calculator.status.32": "МОЛН Сопр", "calculator.status.33": "Перезарядка",
            "calculator.status.34": "ЯД Сопр", "calculator.status.35": "СКР Движ",
            "calculator.status.36": "ГородСКРП", "calculator.status.37": "ЧАР Сопр",
            "calculator.status.38": "СВЕТ Сопр", "calculator.status.39": "ТЬМ Сопр",
            "calculator.status.40": "АНМСОСТТЕЛ Сопр", "calculator.status.41": "АНМСОСТДУХ Сопр",
            "calculator.status.42": "МАГ Сопр",
            "skill.0": "Ближний бой", "skill.1": "Секущий удар", "skill.2": "Колющий удар",
            "skill.3": "Рубящий удар", "skill.4": "Тяжелый удар", "skill.5": "Оборона",
            "skill.6": "Тактика", "skill.7": "Стрельба", "skill.8": "Ремесло",
            "skill.9": "Убийства", "skill.10": "Ловушки", "skill.11": "Уклонение",
            "skill.12": "Молитва", "skill.13": "Исцеление", "skill.14": "Благословение",
            "skill.15": "Экзорцизм", "skill.16": "Песнопения", "skill.17": "Магия",
            "skill.18": "Магия стихий", "skill.19": "Воплощение", "skill.20": "Магия тьмы",
            "skill.21": "Чары", "skill.22": "Особые", "skill.23": "Расовые",
            "skill.24": "Верховая езда",
            "calculator.qualified_buff.5": "Усил МагАТК", "calculator.qualified_buff.6": "Усил Аура",
            "calculator.qualified_buff.9": "ПЕСН МагАТК",
            "calculator.qualified_buff.10": "ПЕСН Перезарядка",
        }
        hints = {
            "calculator.status.2.hint": "Восстанавливающее действие зелья",
            "calculator.status.3.hint": "% исцеленного ОЗ",
            "calculator.status.4.hint": "Восстановление ОМ",
            "calculator.status.6.hint": "АТК / Фронтальная атака",
            "calculator.status.7.hint": "АТК / Атака в спину",
            "calculator.status.8.hint": "Магическая атака",
            "calculator.status.10.hint": "Уменьшение получаемого урона от фронтальных атак",
            "calculator.status.11.hint": "Уменьшение получаемого урона от атак в спину",
            "calculator.status.12.hint": "Снижение получаемого физического урона",
            "calculator.status.13.hint": "Уменьшение получаемого физического урона",
            "calculator.status.14.hint": "Уменьшение получаемого магического урона",
            "calculator.status.16.hint": "Точность",
            "calculator.status.17.hint": "Шанс критической атаки",
            "calculator.status.18.hint": "Критический урон",
            "calculator.status.20.hint": "Шанс получить критический удар; 0 - стандарт",
            "calculator.status.21.hint": "Снижение получаемого критического урона",
            "calculator.status.22.hint": "Уклонение от атак ближнего боя",
            "calculator.status.23.hint": "Шанс уклониться от атаки дальнего боя",
            "calculator.status.24.hint": "Уклонение от магии",
            "calculator.status.25.hint": "Дальность атак ближнего боя",
            "calculator.status.26.hint": "Дальность атак дальнего боя",
            "calculator.status.27.hint": "Сопротивляемость огню",
            "calculator.status.28.hint": "Скорость атаки",
            "calculator.status.29.hint": "Сопротивляемость магии льда",
            "calculator.status.30.hint": "Скорость применения умений",
            "calculator.status.31.hint": "Уменьшение времени применения умений",
            "calculator.status.32.hint": "Сопротивляемость магии молнии",
            "calculator.status.34.hint": "Сопротивляемость магии яда",
            "calculator.status.35.hint": "Скорость передвижения",
            "calculator.status.36.hint": "Скорость передвижения по городу",
            "calculator.status.37.hint": "Сопротивляемость магии чар",
            "calculator.status.38.hint": "Сопротивляемость магии света",
            "calculator.status.39.hint": "Сопротивляемость тьме",
            "calculator.status.40.hint": "Сопротивляемость аномальных состояний тела",
            "calculator.status.41.hint": "Сопротивляемость аномальных состояний духа",
            "calculator.status.42.hint": "Сопротивляемость магии",
            "calculator.qualified_buff.5.hint": "Усиление урона магией",
            "calculator.qualified_buff.6.hint": "Усиление урона аурой",
            "calculator.qualified_buff.9.hint": "Усиление урона магией",
            "calculator.qualified_buff.10.hint": "Ускорение перезарядки умений",
        }
        for identifier, value in {**expected, **hints}.items():
            self.assertEqual(catalog.game_russian[identifier], value, identifier)

    def test_recent_modern_strings_publish_in_all_four_ui_locales(self):
        from scripts.translation_workbook import load_editable_catalogs
        catalog = load_editable_catalogs(ROOT)
        expected = {
            "search.resetFilter": ("Сбросить фильтр", "フィルターをリセット", "重設篩選條件"),
            "search.allTypes": ("Все типы", "すべての種類", "所有類型"),
            "search.typeFilter": ("Фильтр по типу", "種類で絞り込む", "依類型篩選"),
            "builds.autosaveEnabled": ("Автосохранение включено", "自動保存が有効です", "自動儲存已啟用"),
        }
        for key, (ru, jp, tw) in expected.items():
            self.assertEqual(catalog.ui_russian[key], ru)
            self.assertEqual(catalog.ui_japanese[key], jp)
            self.assertEqual(catalog.ui_traditional_chinese[key], tw)

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
            self.assertEqual(total, 2907)
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
            self.assertEqual(edited.total, 2907)

    def test_new_skill_captions_have_editable_ru_and_en_without_affecting_source_catalog(self):
        from scripts.translation_workbook import load_editable_catalogs
        baseline = load_editable_catalogs(ROOT)
        keys = {"skills." + key for key in ("catalog", "template", "learned", "notLearned",
                "bonusApplied", "bonusInactive", "metadataOnly", "bonusRequirements", "unarmed", "ridingRequired",
                "customLearning", "learningAnyClass", "learningClasses", "learningDescendants", "learningLevel", "learningBranch")}
        rows = {row[1]: row for row in read_rows(ROOT / "localization/translations.xlsx")[1:]}
        self.assertEqual(len(keys), 16)
        self.assertTrue(all(rows[key][0] == "Интерфейс" and rows[key][4] and rows[key][7] for key in keys))
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            localization = self.copy_localization(root)
            set_translation_cell(localization / "translations.xlsx", "skills.template", "Source skill: {name}", "I")
            set_russian_cell(localization / "translations.xlsx", "skills.catalog", "Новые умения")
            set_translation_cell(localization / "translations.xlsx", "skills.learningLevel", "Required level: {level}", "I")
            set_russian_cell(localization / "translations.xlsx", "skills.learningBranch", "{name}: нужно {points} очков")
            catalog = load_editable_catalogs(root)
            self.assertEqual(catalog.ui_english["skills.template"], "Source skill: {name}")
            self.assertEqual(catalog.ui_russian["skills.catalog"], "Новые умения")
            self.assertEqual(catalog.ui_english["skills.learningLevel"], "Required level: {level}")
            self.assertEqual(catalog.ui_russian["skills.learningBranch"], "{name}: нужно {points} очков")
            self.assertEqual(catalog.game_english, baseline.game_english)
            self.assertEqual(catalog.game_russian, baseline.game_russian)

    def test_supplied_skill_text_import_only_populates_names_and_descriptions(self):
        rows = {row[1]: row for row in read_rows(ROOT / "localization/translations.xlsx")[1:]}
        skill_names = [row for identifier, row in rows.items() if identifier.startswith("skill_entry.")]
        descriptions = [row for identifier, row in rows.items() if identifier.startswith("skill_detail.") and identifier.endswith(".3")]

        self.assertEqual(sum(bool(row[7].strip()) for row in skill_names), 205)
        self.assertEqual(sum(bool(row[8].strip()) for row in skill_names), 0)
        self.assertEqual(sum(bool(row[7].strip()) for row in descriptions), 205)
        self.assertEqual(sum(bool(row[8].strip()) for row in descriptions), 198)

        # Legacy uses "Resist Cold", while the supplied list names the same
        # レジストアイス skill "Resist Ice". Keep the English skill name intact,
        # but use the supplied RU name and EN/RU description.
        self.assertEqual(rows["skill_entry.18.9"][4], "Resist Cold")
        self.assertEqual(rows["skill_entry.18.9"][7], "Сопротивляемость льду")
        self.assertEqual(
            rows["skill_detail.18.9.3"][7],
            "Сопротивляемость цели к магии льда повышается, а к магии огня и молний - понижается.",
        )
        self.assertEqual(
            rows["skill_detail.18.9.3"][8],
            "Increases your target's Ice Resistance, but reduces their Fire and Lightning Resistance.",
        )

        untouched = (
            "skill_entry.0.14", "skill_entry.0.15", "skill_entry.0.16",
            "skill_entry.0.17", "skill_entry.12.3", "skill_entry.12.4",
        )
        self.assertTrue(all(not rows[identifier][7].strip() and not rows[identifier][8].strip() for identifier in untouched))

    def test_current_races_and_all_racial_names_have_exact_editable_ru_en_aliases(self):
        from scripts.translation_workbook import load_editable_catalogs
        catalog = load_editable_catalogs(ROOT)
        races = [("Человек", "Human"), ("Эльф", "Elf"), ("Цверг", "Dwarf"),
                 ("Мирина", "Myrine"), ("Энкиду", "Enkidu"), ("Кролль", "Lapin")]
        passives = [
            ("Бойцовский дух", "Fighting Spirit"), ("Приспособляемость", "Adaptability"), ("Знахарство", "Pharmaceutics"),
            ("Гармония", "Nature's Harmony"), ("Зоркость", "Eagle Eye"), ("Стойкость разума", "Steadfastness"),
            ("Упрямое сердце", "Stronghearted"), ("Дух цверга", "Dwarf Spirit"), ("Стальная воля", "Steel will"),
            ("Охотничье чутьё", "Acute Senses"), ("Подавление гнева", "Calmness"), ("Интуиция", "Sharpness"),
            ("Каменная кожа", "Stone Skin"), ("Сильные руки", "Strong Arm"), ("Дух энкиду", "Enkidu Spirit"),
            ("Антимагия", "Magic Resistance"), ("Всплеск магии", "Inner Light"), ("Дух кролля", "Lapin Spirit")]
        for index, names in enumerate(races):
            key = f"race.{index}"
            self.assertEqual((catalog.game_russian[key], catalog.game_english[key]), names)
        for index, names in enumerate(passives):
            key = f"racial_skill.{index // 3}.{index % 3}"
            self.assertEqual((catalog.game_russian[key], catalog.game_english[key]), names)


if __name__ == "__main__":
    unittest.main()
