import pathlib
import unittest

from scripts.sync_localized_changelogs import render

ROOT = pathlib.Path(__file__).resolve().parents[1]


class LocalizedChangelogTests(unittest.TestCase):
    def test_checked_in_languages_match_single_canonical_source(self):
        source = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        for locale in ("ru", "en"):
            with self.subTest(locale=locale):
                generated = (ROOT / f"CHANGELOG.{locale}.md").read_text(encoding="utf-8")
                self.assertEqual(generated, render(source, locale))
                self.assertIn("Modern 3.54", generated)
                self.assertIn("Modern 3.55", generated)

    def test_two_audiences_are_kept_separate_in_each_language(self):
        fixture = """# Changelog

## Modern 4.02 — Admin only, 2026-10-09

<!-- admin-notes:ru -->
- Служебное обновление.
<!-- /admin-notes:ru -->
<!-- admin-notes:en -->
- Internal update.
<!-- /admin-notes:en -->

## Modern 4.01 — User update, 2026-10-08

<!-- release-notes:user:ru -->
- Исправлен игровой расчёт.
<!-- /release-notes:user:ru -->
<!-- release-notes:user:en -->
- Fixed the calculator.
<!-- /release-notes:user:en -->
"""
        ru = render(fixture, "ru")
        en = render(fixture, "en")
        self.assertIn("### Для пользователей", ru)
        self.assertIn("### Разработка и технические изменения", ru)
        self.assertIn("Исправлен игровой расчёт", ru)
        self.assertNotIn("Internal update.", ru)
        self.assertIn("### For users", en)
        self.assertIn("### Development and technical changes", en)
        self.assertIn("Fixed the calculator.", en)
        self.assertNotIn("Служебное обновление", en)

    def test_technical_releases_get_public_neutral_summary_and_separate_details(self):
        fixture = """# Changelog

## Modern 3.67 — Admin only, 2026-10-10

<!-- admin-notes:ru -->
- Приватные детали обновления.
<!-- /admin-notes:ru -->
<!-- admin-notes:en -->
- Private admin details.
<!-- /admin-notes:en -->
"""
        ru = render(fixture, "ru")
        en = render(fixture, "en")
        self.assertIn("### Для пользователей\\n\\n- Выполнены внутренние технические улучшения.", ru)
        self.assertIn("### For users\\n\\n- Internal technical improvements.", en)
        self.assertIn("### Разработка и технические изменения\\n\\n- Приватные детали обновления.", ru)
        self.assertIn("### Development and technical changes\\n\\n- Private admin details.", en)
        self.assertLess(ru.index("### Для пользователей"), ru.index("### Разработка"))
        self.assertLess(en.index("### For users"), en.index("### Development"))

    def test_historical_player_markers_still_show_under_users(self):
        source = """# Changelog

## Modern 3.54 — Old release, 2026-10-08

<!-- release-notes:player:ru -->
- Старый пользовательский текст.
<!-- /release-notes:player:ru -->
<!-- release-notes:player:en -->
- Old user release.
<!-- /release-notes:player:en -->
"""
        self.assertIn("### Для пользователей", render(source, "ru"))
        self.assertIn("### For users", render(source, "en"))
        self.assertIn("Старый пользовательский текст", render(source, "ru"))

    def test_deterministic_and_archival_entries_are_explicit(self):
        source = """# Changelog

## Modern 4.05 — Untagged old record, 2026-10-09
- This historical note had no audience classification.
"""
        self.assertEqual(render(source, "ru"), render(source, "ru"))
        self.assertIn("Архивная запись без разделения", render(source, "ru"))
        with self.assertRaisesRegex(ValueError, "dated Modern"):
            render("just text", "ru")


if __name__ == "__main__":
    unittest.main()
