"""Guard approved Honor fallback and an exact optimistic D1 correction."""
import json
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / "admin-api"
HONOR = json.loads((BASE / "data/honor-ru-20261010.json").read_text(encoding="utf-8"))["entries"]
APPROVED = json.loads((ROOT / "localization/approved-translations.v1.json").read_text(encoding="utf-8"))
MIGRATION = (BASE / "migrations/0015_lightning_resistance_plural_d1.sql").read_text(encoding="utf-8")


class Modern378LocalizationTests(unittest.TestCase):
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
            NEW.scope,NEW.term_id,NEW.locale,OLD.text,NEW.text,NEW.version);
        END;
        """)

    def add(self, term, text="Сопр. молнии", locale="ru", version=3):
        self.db.execute("INSERT INTO localization_overrides VALUES (?,?,?,?,?,?,?)",
                        ("game", term, locale, text, version, 1, None))

    def test_approved_honor_name_and_hint_are_available_without_d1(self):
        approved = APPROVED["game"]["ru"]
        self.assertEqual(len(HONOR), 13)
        for row in HONOR:
            self.assertEqual(approved[row["id"]], row["ruName"])
            self.assertEqual(approved[row["id"] + ".hint"], row["ruHint"])
        self.assertEqual(approved["calculator.honor.12"], "Мастер боя")
        self.assertEqual(approved["skill_entry.18.10"], "Сопр. молниям")
        self.assertEqual(approved["calculator.status.32"], "Сопр. молниям")
        for name in ("skill_entry.18.8", "skill_entry.18.9", "skill_entry.20.7", "skill_entry.21.7"):
            self.assertTrue(approved[name].startswith("Сопр."))

    def test_exact_rows_migrate_once_with_history_and_unmodified_languages(self):
        self.add("skill_entry.18.10")
        self.add("calculator.status.32", version=6)
        self.add("skill_entry.18.10", text="Resist Lightning", locale="en", version=7)
        self.db.executescript(MIGRATION)
        self.assertEqual(self.db.execute(
            "SELECT text,version FROM localization_overrides WHERE locale='ru' "
            "AND term_id='skill_entry.18.10'").fetchone(), ("Сопр. молниям", 4))
        self.assertEqual(self.db.execute(
            "SELECT text,version FROM localization_overrides WHERE locale='ru' "
            "AND term_id='calculator.status.32'").fetchone(), ("Сопр. молниям", 7))
        self.assertEqual(self.db.execute(
            "SELECT text,version FROM localization_overrides WHERE locale='en'").fetchone(),
            ("Resist Lightning", 7))
        self.assertEqual(self.db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 2)
        self.db.executescript(MIGRATION)
        self.assertEqual(self.db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 2)

    def test_draft_and_custom_translation_and_reset_tombstone_are_untouched(self):
        self.add("skill_entry.18.10", text="Своя формулировка")
        self.add("calculator.status.32", text="")
        self.db.executescript(MIGRATION)
        self.assertEqual(self.db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT text FROM localization_overrides WHERE term_id='calculator.status.32'").fetchone()[0], "")
        self.db.execute("DELETE FROM localization_overrides")
        self.add("skill_entry.18.10")
        self.db.execute("INSERT INTO localization_drafts VALUES (?,?,?,?)",
                        ("game", "skill_entry.18.10", "ru", "Собственный черновик"))
        self.db.executescript(MIGRATION)
        self.assertEqual(self.db.execute("SELECT text FROM localization_overrides").fetchone()[0], "Сопр. молнии")
        self.assertEqual(self.db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
