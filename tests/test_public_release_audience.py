"""Regression checks for release-note audience and UI translation coverage."""
import json
import pathlib
import re
import unittest
from scripts.build_pages import _read_latest_release

ROOT = pathlib.Path(__file__).resolve().parents[1]


class PublicAudienceAndLocalizationTests(unittest.TestCase):
    def test_latest_player_release_and_older_admin_only_releases_keep_audiences_separate(self):
        canonical = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        release = _read_latest_release(ROOT)
        self.assertEqual(release["version"], "3.76")
        self.assertEqual(release["userVersion"], "3.76")
        self.assertEqual(release["lastContentVersion"], "3.76")
        self.assertFalse(release["technicalOnly"])
        self.assertEqual(release["highlights"]["ru"], ["Исправлена опечатка в описании 1-го уровня гильдейского навыка «Магистр битвы». Другие описания и характеристики не изменились."])
        self.assertEqual(release["highlights"]["en"], ["Fixed a typo in the level 1 tooltip for the Combat guild skill. Other descriptions and character stats are unchanged."])
        for version in ("3.75", "3.74"):
            match = re.search(r"^## Modern " + version + r"\b.*?\n(?P<body>.*?)(?=^## Modern |\Z)",
                              canonical, re.MULTILINE | re.DOTALL)
            self.assertIsNotNone(match, version)
            self.assertIn("<!-- admin-notes:ru -->", match["body"])
            self.assertNotIn("<!-- release-notes:user:", match["body"])
            for locale,label in (("ru","Для пользователей"),("en","For users")):
                translated = (ROOT / ("CHANGELOG." + locale + ".md")).read_text(encoding="utf-8")
                section = translated.split("## Modern " + version + " —",1)[1].split("## Modern ",1)[0]
                user = section.split("### " + label + "\n",1)[1].split("\n### ",1)[0]
                self.assertNotIn("D1",user)
                self.assertNotIn("админк",user.lower())
                self.assertNotIn("Cloudflare",user)

    def test_registered_localization_keys_have_english_source_and_safe_templates(self):
        source = json.loads((ROOT / "localization/ui.en.json").read_text(encoding="utf-8"))
        for key in ("hero.uiBadge","hero.engineBadge","builds.live.catalogLine",
                    "builds.live.catalogCheckingLine","builds.migration.removed",
                    "builds.migration.count","adminEntry.close","adminEntry.hint"):
            self.assertIn(key,source)
        self.assertEqual(len(source),len(set(source)))
        self.assertEqual(len(source),275)
        self.assertEqual(sorted(re.findall(r"\{[A-Za-z0-9_]+\}",source["builds.live.catalogLine"])),["{revision}"])
        self.assertEqual(sorted(re.findall(r"\{[A-Za-z0-9_]+\}",source["builds.migration.removed"])),
                         ["{name}","{reason}"])


if __name__ == "__main__":
    unittest.main()
