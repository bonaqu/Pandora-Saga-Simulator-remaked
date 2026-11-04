"""Modern item tooltip RU labels: safe additive D1 migration contract."""
import json
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "admin-api/migrations"
SQL = (MIGRATIONS / "0018_item_preview_ru_labels.sql").read_text(encoding="utf-8")
APPROVED = json.loads((ROOT / "localization/approved-translations.v1.json").read_text(encoding="utf-8"))
CURATED = json.loads((ROOT / "localization/curated-runtime-defaults.ru.v1.json").read_text(encoding="utf-8"))
ENGLISH = json.loads((ROOT / "localization/ui.en.json").read_text(encoding="utf-8"))
SLOTS = ["Weapon", "Shield", "Head", "Torso", "Arms", "Legs", "Boots", "Cloak"]
UI_KEYS = ["search.itemStatAttack", "search.itemStatDefense"] + [
    "adminShell.catalogSoulSlot" + name for name in SLOTS
]
CATEGORY = {
    key: value for key, value in APPROVED["game"]["ru"].items()
    if key.startswith("equipment_category.")
}
EXPECTED = {
    **{("game", key): value for key, value in CATEGORY.items()},
    **{("ui", key): CURATED["ru"]["ui"][key] for key in UI_KEYS},
}


def database():
    conn = sqlite3.connect(":memory:")
    for name in ["0007_unified_localization.sql", "0008_localization_workflow.sql"]:
        conn.executescript((MIGRATIONS / name).read_text(encoding="utf-8"))
    return conn


class ItemPreviewD1Tests(unittest.TestCase):
    def test_source_ids_and_approved_locale_values(self):
        self.assertEqual(len(CATEGORY), 25)
        self.assertEqual(len(UI_KEYS), 10)
        self.assertEqual(len(EXPECTED), 35)
        self.assertEqual(CATEGORY["equipment_category.32"], "Перчатки")
        self.assertEqual(CURATED["ru"]["ui"]["search.itemStatDefense"], "Защита")
        for key in UI_KEYS:
            self.assertIn(key, ENGLISH)
        self.assertNotIn("'job.0'", SQL)  # Original owner-published class names are retained.

    def test_seed_is_versioned_and_idempotent(self):
        conn = database()
        conn.executescript(SQL)
        rows = {
            (scope, term): (value, version) for scope, term, value, version in conn.execute(
                "SELECT scope,term_id,text,version FROM localization_overrides WHERE locale='ru'"
            )
        }
        self.assertEqual(rows, {key: (value, 1) for key, value in EXPECTED.items()})
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM localization_history").fetchone()[0], 35)
        conn.executescript(SQL)
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM localization_history").fetchone()[0], 35)
        self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        conn.close()

    def test_preserves_manual_published_text_tombstones_drafts_and_other_languages(self):
        conn = database()
        conn.execute("INSERT INTO localization_overrides VALUES ('game','equipment_category.32','ru','Свои перчатки',9,12)")
        conn.execute("INSERT INTO localization_overrides VALUES ('game','equipment_category.30','ru','',5,12)")
        conn.execute("INSERT INTO localization_overrides VALUES ('ui','search.itemStatAttack','en','Owner attack',3,12)")
        conn.execute("INSERT INTO localization_drafts "
                     "(scope,term_id,locale,text,version,source_version,source_text,updated_at) "
                     "VALUES ('ui','search.itemStatDefense','ru','Мой черновик',1,0,'Defense',12)")
        conn.executescript(SQL)
        stored = {
            (scope, term, locale): (value, version)
            for scope, term, locale, value, version in conn.execute(
                "SELECT scope,term_id,locale,text,version FROM localization_overrides"
            )
        }
        self.assertEqual(stored["game", "equipment_category.32", "ru"], ("Свои перчатки", 9))
        self.assertEqual(stored["game", "equipment_category.30", "ru"], ("", 5))
        self.assertEqual(stored["ui", "search.itemStatAttack", "en"], ("Owner attack", 3))
        self.assertNotIn(("ui", "search.itemStatDefense", "ru"), stored)
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM localization_drafts").fetchone()[0], 1)
        conn.close()


if __name__ == "__main__":
    unittest.main()
