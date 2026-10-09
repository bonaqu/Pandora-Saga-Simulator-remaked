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
            self.assertEqual(table.attrib["ref"], "A1:I2921")
            self.assertEqual(table.find(f"{{{MAIN_NS}}}autoFilter").attrib["ref"], "A1:I2921")
            sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))
            pane = sheet.find(f".//{{{MAIN_NS}}}pane")
            self.assertEqual(pane.attrib["state"], "frozen")
            self.assertEqual(pane.attrib["xSplit"], "2")
            self.assertEqual(pane.attrib["ySplit"], "1")

    def test_workbook_matches_every_ui_and_game_source_row(self):
        ui_russian, game_russian, total = load_translation_catalogs(ROOT)
        self.assertEqual(total, 2920)
        rows = read_rows(ROOT / "localization/translations.xlsx")[1:]
        self.assertEqual(ui_russian, {row[1]: row[7] for row in rows if row[0] == "Интерфейс" and row[7].strip()})
        self.assertEqual(game_russian, {row[1]: row[7].strip() for row in rows if row[0] == "Игра" and row[7].strip()})


    def test_admin_result_label_baseline_matches_approved_excel(self):
        import json
        expected = json.loads((ROOT / "localization/calculator-results.ru.json").read_text(encoding="utf-8"))
        rows = read_rows(ROOT / "localization/translations.xlsx")[1:]
        actual = {row[1]: row[7] for row in rows if row[1] in expected["labels"]}
        self.assertEqual(len(actual), 43)
        self.assertEqual(actual, expected["labels"])

    def test_requested_russian_calculator_labels_and_hints_are_exact(self):
        from scripts.translation_workbook import load_editable_catalogs
        catalog = load_editable_catalogs(ROOT)
        expected = {
            "calculator.text.10": "ВЫН", "calculator.text.11": "СИЛ", "calculator.text.12": "ПРВ",
            "calculator.text.13": "ЛВК", "calculator.text.14": "СД", "calculator.text.15": "ИНТ",
            "calculator.status.0": "ОЗ", "calculator.status.1": "ОМ", "calculator.status.2": "Леч. зельями",
            "calculator.status.3": "Леч. умениями", "calculator.status.4": "Расход ОМ",
            "calculator.status.5": "АТК", "calculator.status.6": "АТК. спереди", "calculator.status.7": "АТК сзади",
            "calculator.status.8": "МАТК", "calculator.status.9": "Защита",
            "calculator.status.10": "Сопр. АТК спереди", "calculator.status.11": "Сопр. АТК сзади",
            "calculator.status.12": "Сопр. физ (ед.)", "calculator.status.13": "Сопр. физ (%)",
            "calculator.status.14": "Сопр. маг. урону", "calculator.status.15": "Точность",
            "calculator.status.16": "Точн. спереди", "calculator.status.17": "Шанс крита",
            "calculator.status.18": "Крит. урон", "calculator.status.19": "Уклонение",
            "calculator.status.20": "Сопр. криту", "calculator.status.21": "Получ. крит. урон",
            "calculator.status.22": "Укл. ближ. атак", "calculator.status.23": "Укл. дальн. атак",
            "calculator.status.24": "Укл. от магии", "calculator.status.25": "Дальн. АТК ближ. боя",
            "calculator.status.26": "Дальн. АТК дальн. боя", "calculator.status.27": "Сопр. огню",
            "calculator.status.28": "Скор. атаки", "calculator.status.29": "Сопр. льду",
            "calculator.status.30": "Скор. каста", "calculator.status.31": "Сокрщ. времени каста",
            "calculator.status.32": "Сопр. молнии", "calculator.status.33": "Откат",
            "calculator.status.34": "Сопр. яду", "calculator.status.35": "Скор. движения",
            "calculator.status.36": "Скор. в городе", "calculator.status.37": "Сопр. чарам",
            "calculator.status.38": "Сопр. свету", "calculator.status.39": "Сопр. тьме",
            "calculator.status.40": "Сопр. аном. тел.", "calculator.status.41": "Сопр. аном. дух.",
            "calculator.status.42": "Сопр. магии",
            "skill.0": "Ближний бой", "skill.1": "Секущий удар", "skill.2": "Колющий удар",
            "skill.3": "Рубящий удар", "skill.4": "Тяжелый удар", "skill.5": "Оборона",
            "skill.6": "Тактика", "skill.7": "Стрельба", "skill.8": "Ремесло",
            "skill.9": "Убийства", "skill.10": "Ловушки", "skill.11": "Уклонение",
            "skill.12": "Молитва", "skill.13": "Исцеление", "skill.14": "Благословение",
            "skill.15": "Экзорцизм", "skill.16": "Песнопения", "skill.17": "Магия",
            "skill.18": "Магия стихий", "skill.19": "Воплощение", "skill.20": "Магия тьмы",
            "skill.21": "Чары", "skill.22": "Особые", "skill.23": "Расовые",
            "skill.24": "Верховая езда",
            "calculator.qualified_buff.5": "Усил МАТК", "calculator.qualified_buff.6": "Усил АУР",
            "calculator.qualified_buff.9": "ПЕСН МАТК",
            "calculator.qualified_buff.10": "ПЕСН Откат",
        }
        hints = {
            "calculator.status.0.hint": "Очки Здоровья",
            "calculator.status.1.hint": "Очки Маны",
            "calculator.status.5.hint": "Текущий максимальный показатель атаки",
            "calculator.status.9.hint": "Очки Защиты; Уменьшение получаемого физического урона",
            "calculator.status.15.hint": "Очки Точности; Точность попадания по цели",
            "calculator.status.19.hint": "Очки Уклонения; Шанс уклониться от атаки",
            "calculator.status.33.hint": "Время перезарядки умений",
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

    def test_requested_russian_equipment_chrome_and_categories_are_exact(self):
        from scripts.translation_workbook import load_editable_catalogs
        catalog = load_editable_catalogs(ROOT)
        game_expected = {
            "calculator.slot.0": "Снаряжение",
            "calculator.text.0": "Раса", "calculator.text.1": "Пасивн", "calculator.text.2": "Класс",
            "calculator.tab.0": "КЛАСС", "calculator.tab.1": "УМЕНИЯ",
            "calculator.tab.2": "АТАКА", "calculator.tab.3": "ЗАЩИТА", "calculator.tab.4": "УСИЛЕНИЯ",
            "calculator.learn.0": "Умения",
            "calculator.slot.1": "Оружие", "calculator.slot.2": "Щит",
            "calculator.slot.3": "Шлем", "calculator.slot.4": "Броня",
            "calculator.slot.5": "Перчатки", "calculator.slot.6": "Штаны",
            "calculator.slot.7": "Обувь", "calculator.slot.8": "Плащ",
            "calculator.slot.9": "Серьга", "calculator.slot.10": "Амулет",
            "calculator.slot.11": "Пояс", "calculator.slot.12": "Кольцо",
            "calculator.gem.0.0": "Физ", "calculator.gem.0.1": "Маг",
            "calculator.gem.1.0": "Огонь", "calculator.gem.1.1": "Лед",
            "calculator.gem.1.2": "Молния", "calculator.gem.1.3": "Яд",
            "calculator.gem.1.4": "Свет", "calculator.gem.1.5": "Тьма",
            "calculator.gem.1.6": "Радуга", "soul.0": "Душа",
            "calculator.text.26": "Сброс",
            "equipment_category.0": "Одноручный меч", "equipment_category.1": "Двуручный меч",
            "equipment_category.2": "Одноручный топор", "equipment_category.3": "Двуручный топор",
            "equipment_category.4": "Одноручное копьё", "equipment_category.5": "Двуручное копьё",
            "equipment_category.6": "Кинжал", "equipment_category.7": "Кастеты",
            "equipment_category.8": "Лук", "equipment_category.9": "Арбалет",
            "equipment_category.10": "Одноручный молот", "equipment_category.11": "Двуручный молот",
            "equipment_category.12": "Одноручный жезл", "equipment_category.13": "Двуручный жезл",
            "equipment_category.20": "Щит", "equipment_category.30": "Шлем",
            "equipment_category.31": "Броня", "equipment_category.32": "Перчатки",
            "equipment_category.33": "Штаны", "equipment_category.34": "Обувь",
            "equipment_category.35": "Плащ", "equipment_category.40": "Серьга",
            "equipment_category.41": "Амулет", "equipment_category.42": "Пояс",
            "equipment_category.43": "Кольцо",
        }
        ui_expected = {
            "search.eyebrow.equipment": "Снаряжение",
            "search.equipment.title": "Найти снаряжение",
            "search.equipment.placeholder": "Поиск снаряжения…",
            "search.noEquipmentMatches": "Подходящее снаряжение не найдено",
            "search.noEquipmentSlots": "Нет доступных ячеек снаряжения",
            "tools.equipmentSearch": "Поиск снаряжения",
            "search.eyebrow.soul": "Душа",
            "search.soul.title": "Найти душу",
            "search.soul.placeholder": "Поиск души…",
            "search.noSoulMatches": "Подходящие души не найдены",
            "search.noSoulSockets": "Нет доступных слотов душ",
            "search.sockets": "Слоты душ: {count}",
            "search.soulSummary": "Подходящих душ: {total}",
            "tools.soulSearch": "Поиск душ",
            "equipment.reset": "Сброс",
        }
        for identifier, value in game_expected.items():
            self.assertEqual(catalog.game_russian[identifier], value, identifier)
        for identifier, value in ui_expected.items():
            self.assertEqual(catalog.ui_russian[identifier], value, identifier)

    def test_recent_modern_strings_publish_in_all_four_ui_locales(self):
        from scripts.translation_workbook import load_editable_catalogs
        catalog = load_editable_catalogs(ROOT)
        expected = {
            "search.resetFilter": ("Сбросить фильтр", "フィルターをリセット", "重設篩選條件"),
            "search.allTypes": ("Все типы", "すべての種類", "所有類型"),
            "search.typeFilter": ("Фильтр по типу", "種類で絞り込む", "依類型篩選"),
            "builds.autosaveEnabled": ("Автосохранение включено", "自動保存が有効です", "自動儲存已啟用"),
            "equipment.reset": ("Сброс", "リセット", "重設"),
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
            self.assertEqual(total, 2920)
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
            self.assertEqual(edited.total, 2920)

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
        self.assertEqual(rows["skill_entry.18.9"][7], "Сопр. льду")
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
