"""Test exact approved Honor translations and D1 conflict safety."""
import json
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / "admin-api"
SOURCE = BASE / "data/honor-ru-20261010.json"
MIGRATION = BASE / "migrations/0011_honor_ru.sql"


def setup_db():
    db = sqlite3.connect(":memory:")
    for name in ["0007_unified_localization.sql", "0008_localization_workflow.sql"]:
        db.executescript((BASE / "migrations" / name).read_text(encoding="utf-8"))
    return db


class HonorLocalizationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.entries = json.loads(SOURCE.read_text(encoding="utf-8"))["entries"]
        cls.script = MIGRATION.read_text(encoding="utf-8")

    def test_source_and_original_english_hints(self):
        originals = json.loads((ROOT / "localization/game-terms.ru.json").read_text(encoding="utf-8"))
        terms = {term["id"]: term for term in originals["terms"]}
        self.assertEqual([r["id"] for r in self.entries],
                         [f"calculator.honor.{i}" for i in range(13)])
        for row in self.entries:
            self.assertEqual(terms[row["id"] + ".hint"]["source_en"].strip(),
                             row["sourceEnHint"].strip())
            self.assertTrue(row["ruName"] and row["ruHint"])
        self.assertEqual(self.entries[12]["ruName"], "Мастер боя")
        self.assertIn("базовые характеристики персонажа", self.entries[6]["ruHint"])

    def test_migration_writes_exactly_26_approved_terms(self):
        db = setup_db()
        db.executescript(self.script)
        actual = dict(db.execute(
            "SELECT term_id,text FROM localization_overrides WHERE scope='game' AND locale='ru'"
        ).fetchall())
        expected = {key: value for row in self.entries for key, value in (
            (row["id"], row["ruName"]), (row["id"] + ".hint", row["ruHint"])
        )}
        self.assertEqual(actual, expected)
        self.assertEqual(db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 26)
        self.assertEqual(db.execute("PRAGMA integrity_check").fetchone()[0], "ok")

    def test_existing_admin_publication_is_not_overwritten(self):
        db = setup_db()
        db.execute("INSERT INTO localization_overrides "
                   "(scope,term_id,locale,text,version,updated_at) "
                   "VALUES ('game','calculator.honor.6','ru','Старый ручной текст',4,1)")
        with self.assertRaises(sqlite3.OperationalError):
            db.executescript(self.script)
        self.assertEqual(db.execute("SELECT count(*) FROM localization_overrides").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT text FROM localization_overrides").fetchone()[0],
                         "Старый ручной текст")

    def test_unpublished_admin_draft_blocks_the_migration(self):
        db = setup_db()
        db.execute("INSERT INTO localization_drafts "
                   "(scope,term_id,locale,text,version,source_version,source_text,updated_at) "
                   "VALUES ('game','calculator.honor.3.hint','ru','Незавершённый текст',1,0,'Original',1)")
        with self.assertRaises(sqlite3.OperationalError):
            db.executescript(self.script)
        self.assertEqual(db.execute("SELECT count(*) FROM localization_overrides").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
