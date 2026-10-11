"""Ensure D1 localization migration is additive, draft-safe and multilingual."""
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SQL = (ROOT / "admin-api/migrations/0013_localized_build_statuses.sql").read_text(encoding="utf-8")


class BuildLocaleMigrationTests(unittest.TestCase):
    def test_no_user_translation_is_overwritten_and_four_locales_survive(self):
        db=sqlite3.connect(":memory:")
        db.executescript("""
        CREATE TABLE localization_overrides (
          scope TEXT NOT NULL, term_id TEXT NOT NULL, locale TEXT NOT NULL,
          text TEXT NOT NULL, version INTEGER NOT NULL, updated_at INTEGER NOT NULL,
          last_operation TEXT, PRIMARY KEY(scope,term_id,locale));
        CREATE TABLE localization_drafts (
          scope TEXT NOT NULL, term_id TEXT NOT NULL, locale TEXT NOT NULL,
          text TEXT NOT NULL, PRIMARY KEY(scope,term_id,locale));
        """)
        db.execute("INSERT INTO localization_overrides VALUES(?,?,?,?,?,?,?)",
                   ("ui","builds.live.catalogLine","ru","Моя версия {revision}",7,1,None))
        db.execute("INSERT INTO localization_drafts VALUES(?,?,?,?)",
                   ("ui","builds.live.autoApplied","jp","ユーザーの下書き"))
        db.executescript(SQL)
        def translation(term,locale):
            return db.execute("SELECT text,version FROM localization_overrides WHERE scope=? AND term_id=? AND locale=?",
                              ("ui",term,locale)).fetchone()
        self.assertEqual(translation("builds.live.catalogLine","ru"),("Моя версия {revision}",7))
        self.assertIsNone(translation("builds.live.autoApplied","jp"))
        self.assertEqual(translation("builds.live.catalogLine","tw")[0],
                         "遊戲資料：版本 {revision} · 自動更新")
        self.assertEqual(translation("builds.live.catalogLine","en")[0],
                         "Game data: version {revision} · updates automatically")
        self.assertEqual(translation("builds.migration.count","ru")[0],"Изменений в билде: {count}")
        total=db.execute("SELECT COUNT(*) FROM localization_overrides").fetchone()[0]
        db.executescript(SQL)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM localization_overrides").fetchone()[0],total)
        self.assertEqual(translation("builds.live.catalogLine","ru"),("Моя версия {revision}",7))
        db.close()


if __name__ == "__main__":
    unittest.main()
