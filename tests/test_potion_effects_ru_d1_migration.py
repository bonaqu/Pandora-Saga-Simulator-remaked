"""Validate additive D1-first RU Potion Effects translations without D1 owner data loss."""
import json
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / "admin-api"
SQL = (BASE / "migrations/0016_potion_effects_ru_d1.sql").read_text(encoding="utf-8")
APPROVED = json.loads((ROOT / "localization/approved-translations.v1.json").read_text(encoding="utf-8"))
TERMS = {row["id"] for row in json.loads(
    (ROOT / "localization/game-terms.ru.json").read_text(encoding="utf-8"))["terms"]}
KEYS = [key for key in APPROVED["game"]["ru"]
        if key.startswith("calculator.potion.")]


def db():
    conn = sqlite3.connect(":memory:")
    for name in ("0007_unified_localization.sql", "0008_localization_workflow.sql"):
        conn.executescript((BASE / "migrations" / name).read_text(encoding="utf-8"))
    return conn


class PotionEffectsD1Tests(unittest.TestCase):
    def test_all_fourteen_visible_labels_and_hints_have_source_ids(self):
        self.assertEqual(len(KEYS), 28)
        for i in range(14):
            for suffix in ("", ".hint"):
                key = f"calculator.potion.{i}{suffix}"
                self.assertIn(key, TERMS)
                self.assertIn(key, APPROVED["game"]["ru"])
                self.assertTrue(APPROVED["game"]["ru"][key].strip())
        for index in (4, 7, 12, 13):
            self.assertIn("не подтверждён",
                          APPROVED["game"]["ru"][f"calculator.potion.{index}.hint"])
        self.assertEqual(APPROVED["game"]["ru"]["calculator.potion.11"],
                         "Сильное исцеляющее зелье")
        self.assertEqual(APPROVED["game"]["ru"]["calculator.potion.6"],
                         "Подснежник")

    def test_migration_publishes_all_28_keys_to_D1_and_records_versioned_history(self):
        conn = db()
        conn.executescript(SQL)
        rows = dict(conn.execute(
            "SELECT term_id,text FROM localization_overrides "
            "WHERE scope='game' AND locale='ru'"))
        self.assertEqual(rows, {key: APPROVED["game"]["ru"][key] for key in KEYS})
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM localization_history").fetchone()[0], 28)
        self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        conn.executescript(SQL)
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM localization_history").fetchone()[0], 28)

    def test_manual_publication_reset_and_unpublished_draft_are_not_touched(self):
        conn = db()
        conn.execute("INSERT INTO localization_overrides "
                     "(scope,term_id,locale,text,version,updated_at,last_operation) "
                     "VALUES ('game','calculator.potion.11','ru','Мой вариант',9,1,NULL)")
        conn.execute("INSERT INTO localization_overrides "
                     "(scope,term_id,locale,text,version,updated_at,last_operation) "
                     "VALUES ('game','calculator.potion.12','ru','',5,1,NULL)")
        conn.execute("INSERT INTO localization_overrides "
                     "(scope,term_id,locale,text,version,updated_at,last_operation) "
                     "VALUES ('game','calculator.potion.11','en','Owner EN',7,1,NULL)")
        conn.execute("INSERT INTO localization_drafts "
                     "(scope,term_id,locale,text,version,source_version,source_text,updated_at) "
                     "VALUES ('game','calculator.potion.13','ru','Мой черновик',1,0,'(Rune)',1)")
        conn.executescript(SQL)
        def current(term, locale="ru"):
            return conn.execute(
                "SELECT text,version FROM localization_overrides "
                "WHERE scope='game' AND term_id=? AND locale=?", (term, locale)).fetchone()
        self.assertEqual(current("calculator.potion.11"), ("Мой вариант", 9))
        self.assertEqual(current("calculator.potion.12"), ("", 5))
        self.assertEqual(current("calculator.potion.11", "en"), ("Owner EN", 7))
        self.assertIsNone(current("calculator.potion.13"))
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM localization_history").fetchone()[0], 28)
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM localization_drafts").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main()
