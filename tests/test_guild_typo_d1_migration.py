import json
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = json.loads((ROOT / "localization/guild-skills.v1.json").read_text(encoding="utf-8"))
SQL = (ROOT / "admin-api/migrations/0014_guild_hint_typo_d1.sql").read_text(encoding="utf-8")
TERM = "calculator.clan.9.level.1.hint"
NEW = SOURCE["skills"][9]["levels"][0]["ru"]
OLD = NEW.replace("Длительность действия:", "Длительнсть действия:")


class GuildHintTypoMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript("""
        CREATE TABLE localization_overrides(
          scope TEXT,term_id TEXT,locale TEXT,text TEXT,version INTEGER,
          updated_at INTEGER,last_operation TEXT,
          PRIMARY KEY(scope,term_id,locale)
        );
        CREATE TABLE localization_drafts(scope TEXT,term_id TEXT,locale TEXT,text TEXT);
        CREATE TABLE localization_history(
          scope TEXT,term_id TEXT,locale TEXT,old_text TEXT,new_text TEXT,version INTEGER
        );
        CREATE TRIGGER history_update AFTER UPDATE ON localization_overrides
        WHEN NEW.version != OLD.version BEGIN
          INSERT INTO localization_history VALUES(
            NEW.scope,NEW.term_id,NEW.locale,OLD.text,NEW.text,NEW.version
          );
        END;
        """)

    def add(self, scope="game", term=TERM, locale="ru", text=OLD, version=4):
        self.db.execute("INSERT INTO localization_overrides VALUES (?,?,?,?,?,?,?)",
                        (scope, term, locale, text, version, 123, None))

    def read(self, scope="game", term=TERM, locale="ru"):
        return self.db.execute(
            "SELECT text,version FROM localization_overrides "
            "WHERE scope=? AND term_id=? AND locale=?", (scope, term, locale)
        ).fetchone()

    def test_exact_published_typo_updates_once_and_records_history(self):
        self.assertIn("Длительность действия:", NEW)
        self.assertNotIn("Длительнсть", NEW)
        self.add()
        self.add(locale="en", text="English approved description", version=8)
        self.db.executescript(SQL)
        self.assertEqual(self.read(), (NEW, 5))
        self.assertEqual(self.read(locale="en"), ("English approved description", 8))
        self.assertEqual(self.db.execute("SELECT old_text,new_text,version FROM localization_history").fetchall(),
                         [(OLD, NEW, 5)])
        self.db.executescript(SQL)
        self.assertEqual(self.read(), (NEW, 5))
        self.assertEqual(self.db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 1)

    def test_preserve_custom_value_reset_and_other_identities(self):
        self.add(text="Собственный опубликованный текст", version=12)
        self.add(term="calculator.clan.9.level.2.hint", version=10)
        self.add(locale="jp", text="日本語", version=2)
        self.db.executescript(SQL)
        self.assertEqual(self.read(), ("Собственный опубликованный текст", 12))
        self.assertEqual(self.read(term="calculator.clan.9.level.2.hint"), (OLD, 10))
        self.assertEqual(self.read(locale="jp"), ("日本語", 2))
        self.assertEqual(self.db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 0)

    def test_unpublished_draft_and_reset_tombstone_are_not_overwritten(self):
        self.add()
        self.db.execute("INSERT INTO localization_drafts VALUES (?,?,?,?)",
                        ("game", TERM, "ru", "Мой черновик"))
        self.db.executescript(SQL)
        self.assertEqual(self.read(), (OLD, 4))
        self.db.execute("DELETE FROM localization_drafts")
        self.db.execute("UPDATE localization_overrides SET text='' WHERE term_id=?", (TERM,))
        self.db.execute("DELETE FROM localization_history")
        self.db.executescript(SQL)
        self.assertEqual(self.read(), ("", 4))
        self.assertEqual(self.db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 0)

    def test_no_override_remains_unpublished_and_revised_baseline_is_correct(self):
        self.db.executescript(SQL)
        self.assertIsNone(self.read())
        self.assertIn("+1 ко всем шести характеристикам", NEW)


if __name__ == "__main__":
    unittest.main()
