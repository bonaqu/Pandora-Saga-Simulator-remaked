"""Regression checks for release-note audience and UI translation coverage."""
import json
import pathlib
import re
import unittest
from scripts.build_pages import _read_latest_release

ROOT = pathlib.Path(__file__).resolve().parents[1]


class PublicAudienceAndLocalizationTests(unittest.TestCase):
    def test_latest_release_matches_canonical_and_older_admin_notes_stay_private(self):
        canonical = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        release = _read_latest_release(ROOT)
        latest = re.search(r"^## Modern (\d+\.\d+)\b", canonical, re.MULTILINE)
        self.assertIsNotNone(latest)
        self.assertEqual(release["version"], latest.group(1))
        latest_section = canonical[latest.end():].split("\n## Modern ", 1)[0]
        latest_player = all(
            ("<!-- release-notes:user:" + locale + " -->") in latest_section
            for locale in ("ru", "en")
        )
        self.assertEqual(release["userVersion"], latest.group(1))
        self.assertEqual(release.get("technicalOnly", False), not latest_player)
        if latest_player:
            self.assertNotIn("lastContentVersion", release)
            for locale in ("ru", "en"):
                self.assertTrue(release["highlights"][locale])
                self.assertNotIn("D1", " ".join(release["highlights"][locale]))
                self.assertNotIn("Cloudflare", " ".join(release["highlights"][locale]))
        else:
            self.assertEqual(release["highlights"]["ru"], ["Выполнены внутренние технические улучшения."])
            self.assertEqual(release["highlights"]["en"], ["Internal technical improvements."])
            self.assertIn("lastContentVersion", release)

        # Historical releases with developer-only notes must remain hidden from
        # the player-facing stream, regardless of the latest version.
        for version in ("3.75", "3.74"):
            match = re.search(r"^## Modern " + version + r"\b.*?\n(?P<body>.*?)(?=^## Modern |\Z)",
                              canonical, re.MULTILINE | re.DOTALL)
            self.assertIsNotNone(match, version)
            self.assertIn("<!-- admin-notes:ru -->", match["body"])
            self.assertNotIn("<!-- release-notes:user:", match["body"])
            for locale, label in (("ru", "Для пользователей"), ("en", "For users")):
                translated = (ROOT / ("CHANGELOG." + locale + ".md")).read_text(encoding="utf-8")
                section = translated.split("## Modern " + version + " —", 1)[1].split("## Modern ", 1)[0]
                user = section.split("### " + label + "\n", 1)[1].split("\n### ", 1)[0]
                self.assertIn("Выполнены внутренние технические улучшения." if locale == "ru" else "Internal technical improvements.", user)
                self.assertNotIn("D1", user)
                self.assertNotIn("Cloudflare", user)

    def test_376_typo_correction_remains_player_facing(self):
        source = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        section = source.split("## Modern 3.76 —", 1)[1].split("\n## Modern ", 1)[0]
        self.assertIn("<!-- release-notes:user:ru -->", section)
        self.assertIn("<!-- release-notes:user:en -->", section)
        player = section.split("<!-- release-notes:user:ru -->", 1)[1].split("<!-- /release-notes:user:ru -->", 1)[0]
        self.assertIn("Магистр битвы", player)
        self.assertNotIn("D1", player)
        self.assertNotIn("Cloudflare", player)

    def test_registered_localization_keys_have_english_source_and_safe_templates(self):
        source = json.loads((ROOT / "localization/ui.en.json").read_text(encoding="utf-8"))
        for key in ("hero.uiBadge","hero.engineBadge","builds.live.catalogLine",
                    "builds.live.catalogCheckingLine","builds.migration.removed",
                    "builds.migration.count","adminEntry.close","adminEntry.hint"):
            self.assertIn(key,source)
        self.assertEqual(len(source),len(set(source)))
        self.assertGreaterEqual(len(source),630)
        self.assertIn('adminShell.catalogDraftSelectionCount',source)
        self.assertIn('adminShell.bulkEditProposalAria',source)
        self.assertEqual(sorted(re.findall(r"\{[A-Za-z0-9_]+\}",source["builds.live.catalogLine"])),["{revision}"])
        self.assertEqual(sorted(re.findall(r"\{[A-Za-z0-9_]+\}",source["builds.migration.removed"])),
                         ["{name}","{reason}"])


if __name__ == "__main__":
    unittest.main()
