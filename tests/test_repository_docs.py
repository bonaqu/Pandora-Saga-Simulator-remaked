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

    def test_latest_release_notes_do_not_expose_internal_data_sources(self):
        changelog = self.read("CHANGELOG.md")
        latest = changelog.split("\n## Modern ", 2)[1]
        blocked = (
            "Pandora Saga OS",
            "itemForth",
            "unison",
            "gamedata/",
            ".json",
        )
        for token in blocked:
            self.assertNotIn(token, latest, token)

    def test_changelog_has_first_modern_release(self):
        changelog = self.read("CHANGELOG.md")
        self.assertIn("2026.09.1", changelog)
        self.assertIn("Modern Mode", changelog)
        self.assertIn("Legacy Mode", changelog)

    def test_player_readmes_use_real_release_screenshots_with_provenance(self):
        provenance = self.read("docs/assets/screenshots/README.md")
        self.assertIn("2026.09.11", provenance)
        self.assertIn("scripts/build_pages.py", provenance)
        self.assertIn("scripts/serve_pages.mjs", provenance)
        self.assertIn("release candidate", provenance)
        self.assertIn("v2026.09.11", provenance)
        self.assertIn("after production verification", provenance)
        for name in ("equipment-search-desktop.png", "compare-builds-desktop.png", "build-manager-mobile.png"):
            relative = "docs/assets/screenshots/" + name
            for readme in ("README.md", "README.ru.md"):
                self.assertIn(relative, self.read(readme))
            self.assertTrue((ROOT / relative).is_file())

    def test_current_readmes_document_online_only_delivery_and_history_keeps_phase_four(self):
        english = self.read("README.md")
        russian = self.read("README.ru.md")
        changelog = self.read("CHANGELOG.md")

        self.assertIn("online-only", english.lower())
        self.assertIn("только онлайн", russian.lower())
        self.assertIn("без установки", russian.lower())
        self.assertIn("Legacy Mode", russian)
        self.assertIn("2026.09.4", changelog)
        self.assertIn("New version available — Reload", changelog)
        self.assertIn("PWA", changelog)

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

        for document in (changelog, roadmap):
            self.assertIn("2026.09.5", document)
        self.assertIn("game names await verification", english)
        self.assertIn("игровые названия ждут сверки", russian)
        self.assertIn("1,406", changelog)
        self.assertIn("user verification", roadmap)

    def test_phase_five_roadmap_records_verified_production_release(self):
        roadmap = self.read("docs/superpowers/plans/2026-09-27-modernization-roadmap.md")
        phase_plan = self.read("docs/superpowers/plans/2026-09-28-russian-localization-framework.md")

        self.assertIn("Shipped as Remaked UI `2026.09.5` in PR #7 (`58925ed`)", roadmap)
        self.assertIn("Production workflow `36394028338`", roadmap)
        self.assertIn("Shipped in PR #7 (`58925ed`)", phase_plan)

    def test_phase_six_release_documents_versioned_read_only_projections(self):
        english = self.read("README.md")
        russian = self.read("README.ru.md")
        changelog = self.read("CHANGELOG.md")
        architecture = self.read("docs/ARCHITECTURE.md")
        roadmap = self.read("docs/superpowers/plans/2026-09-27-modernization-roadmap.md")

        for document in (changelog, roadmap):
            self.assertIn("2026.09.6", document)
        for count in ("1,120", "184", "211", "1,617"):
            self.assertIn(count, changelog)
        self.assertIn("read-only", architecture)
        self.assertIn("Legacy JavaScript remains", architecture)
        phase_plan = self.read("docs/superpowers/plans/2026-09-28-structured-data-projections.md")
        self.assertIn("Shipped as Remaked UI `2026.09.6` in PR #9 (`eccdda4`)", roadmap)
        self.assertIn("Production workflow `36433459517`", roadmap)
        self.assertIn("Shipped in PR #9 (`eccdda4`)", phase_plan)

    def test_unified_translation_editor_is_documented_for_four_languages(self):
        english = self.read("README.md")
        russian = self.read("README.ru.md")
        changelog = self.read("CHANGELOG.md")
        architecture = self.read("docs/ARCHITECTURE.md")
        deployment = self.read("docs/DEPLOYMENT.md")
        plan = self.read("docs/superpowers/plans/2026-09-28-simple-translation-workflow.md")

        for document in (changelog, plan):
            self.assertIn("2026.09.7", document)
        latest_heading = next(line for line in changelog.splitlines() if line.startswith("## Modern "))
        latest_version = latest_heading.split()[2]
        self.assertIn(f"Modern **{latest_version}**", english)
        self.assertIn(f"Modern **{latest_version}**", russian)
        self.assertIn("## Modern 3.11", changelog)
        self.assertNotIn("LOCALIZATION_FOR_BEGINNERS.ru.md", russian)
        self.assertFalse((ROOT / "docs/LOCALIZATION_FOR_BEGINNERS.ru.md").exists())
        self.assertFalse((ROOT / "docs/ADMIN_EDITING_FOR_BEGINNERS.ru.md").exists())
        self.assertIn("approved-translations.v1.json", english)
        self.assertIn("RU / EN / JP / TW", russian)
        self.assertIn("private", deployment.lower())
        self.assertIn("game-term-display.js", architecture)
        self.assertIn("approved-translations.v1.json", architecture)
        self.assertIn("approved-translations.v1.json", deployment)

    def test_header_uses_single_dynamic_two_part_version_badge(self):
        shell = self.read("modern/app-shell.js")
        styles = self.read("modern/modern.css")

        self.assertIn("'REMAKED UI ' + version.ui", shell)
        self.assertIn("'Legacy Engine ' + version.legacyEngine", shell)
        self.assertIn("versionBadge.dataset.remakedVersionBadge", shell)
        self.assertNotIn("dataset.remakedVersion =", shell)
        self.assertNotIn("REMAKED UI 3.11", shell)
        self.assertIn(".remaked-version-badge-ui", styles)
        self.assertIn(".remaked-version-badge-legacy", styles)


if __name__ == "__main__":
    unittest.main()
