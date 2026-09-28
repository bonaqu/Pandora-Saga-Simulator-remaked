import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class RepositoryDocsTests(unittest.TestCase):
    def read(self, name: str) -> str:
        return (ROOT / name).read_text(encoding="utf-8")

    def test_english_readme_is_player_facing_and_links_russian(self):
        readme = self.read("README.md")
        self.assertIn("README.ru.md", readme)
        self.assertIn("https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/", readme)
        self.assertIn("Legacy Mode", readme)
        self.assertIn("Report", readme)
        self.assertNotIn("Does it need Cloudflare", readme)
        self.assertNotIn("## 🛠️ Local run", readme)
        self.assertNotIn("Repository map", readme)

    def test_russian_readme_is_player_facing_and_links_english(self):
        readme = self.read("README.ru.md")
        lowered = readme.lower()
        self.assertIn("README.md", readme)
        self.assertIn("https://bonaqu.github.io/Pandora-Saga-Simulator-remaked/", readme)
        self.assertIn("Старая версия", readme)
        self.assertIn("Сообщить", readme)
        self.assertIn("текущем браузере", lowered)
        self.assertNotIn("Cloudflare", readme)
        self.assertNotIn("## 🛠️ локальный запуск", lowered)
        self.assertNotIn("структура репозитория", lowered)

    def test_license_restricts_new_material_without_claiming_legacy(self):
        license_text = self.read("LICENSE")
        lowered = license_text.lower()
        self.assertIn("all rights reserved", lowered)
        self.assertIn("commercial", lowered)
        self.assertIn("redistribut", lowered)
        self.assertIn("modif", lowered)
        self.assertIn("legacy", lowered)
        self.assertIn("not covered", lowered)
        self.assertIn("pandora saga", lowered)

    def test_notice_preserves_original_author_and_permission(self):
        notice = self.read("NOTICE.md")
        self.assertIn("z_anthurium", notice)
        self.assertIn("Feel free to modify and redistribute", notice)
        self.assertIn("Remaked", notice)
        self.assertIn("LICENSE", notice)

    def test_changelog_has_first_modern_release(self):
        changelog = self.read("CHANGELOG.md")
        self.assertIn("2026.09.1", changelog)
        self.assertIn("Modern Mode", changelog)
        self.assertIn("Legacy Mode", changelog)

    def test_phase_four_release_is_documented_for_players(self):
        english = self.read("README.md")
        russian = self.read("README.ru.md")
        changelog = self.read("CHANGELOG.md")

        self.assertIn("install", english.lower())
        self.assertIn("offline", english.lower())
        self.assertIn("PWA", russian)
        self.assertIn("Legacy Mode", russian)
        self.assertIn("2026.09.4", changelog)
        self.assertIn("New version available — Reload", changelog)
        self.assertIn("local", changelog.lower())

    def test_phase_four_roadmap_records_verified_production_release(self):
        roadmap = self.read("docs/superpowers/plans/2026-09-27-modernization-roadmap.md")
        phase_plan = self.read("docs/superpowers/plans/2026-09-27-mobile-pwa.md")

        self.assertIn("Shipped as Remaked UI `2026.09.4` in PR #5 (`0e6cd1b`)", roadmap)
        self.assertIn("Production workflow `36390367797`", roadmap)
        self.assertIn("Shipped in PR #5 (`0e6cd1b`)", phase_plan)

    def test_phase_five_release_documents_ru_ui_without_claiming_game_terms(self):
        english = self.read("README.md")
        russian = self.read("README.ru.md")
        changelog = self.read("CHANGELOG.md")
        roadmap = self.read("docs/superpowers/plans/2026-09-27-modernization-roadmap.md")

        for document in (english, russian, changelog, roadmap):
            self.assertIn("2026.09.5", document)
        self.assertIn("game names await verification", english)
        self.assertIn("игровые названия ждут сверки", russian)
        self.assertIn("1,406", changelog)
        self.assertIn("user verification", roadmap)


if __name__ == "__main__":
    unittest.main()
