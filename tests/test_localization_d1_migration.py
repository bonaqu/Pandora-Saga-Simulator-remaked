import json
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SQL = (ROOT / "admin-api/migrations/0012_localization_resistance_d1.sql").read_text(encoding="utf-8")


class LocalizationD1MigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript("""
        CREATE TABLE localization_overrides (
          scope TEXT,term_id TEXT,locale TEXT,text TEXT,version INTEGER,
          updated_at INTEGER,last_operation TEXT,
          PRIMARY KEY(scope,term_id,locale)
        );
        CREATE TABLE localization_drafts (scope TEXT,term_id TEXT,locale TEXT,text TEXT);
        CREATE TABLE catalog_head (id INTEGER PRIMARY KEY,snapshot_json TEXT NOT NULL);
        CREATE TABLE localization_history (
          term_id TEXT,locale TEXT,previous_text TEXT,published_text TEXT,version INTEGER
        );
        CREATE TRIGGER history_update AFTER UPDATE ON localization_overrides
        WHEN NEW.version != OLD.version BEGIN
          INSERT INTO localization_history VALUES(
            NEW.term_id,NEW.locale,OLD.text,NEW.text,NEW.version
          );
        END;
        """)
        self.db.execute("INSERT INTO catalog_head(id,snapshot_json) VALUES(1,'[]')")
        self.old = {
            "skill_entry.18.8": ("Сопротивляемость огню", "Сопр. огню"),
            "skill_entry.18.9": ("Сопротивляемость льду", "Сопр. льду"),
            "skill_entry.18.10": ("Сопротивляемость молниям", "Сопр. молнии"),
            "skill_entry.20.7": ("Сопротивляемость магии тьмы", "Сопр. тьме"),
            "skill_entry.21.7": ("Сопротивляемость чарам", "Сопр. чарам")
        }

    def test_only_exact_unedited_ru_values_change_with_history(self):
        for key, (old, new) in self.old.items():
            self.db.execute("INSERT INTO localization_overrides VALUES(?,?,?,?,?,?,?)",
                            ("game", key, "ru", old, 4, 100, None))
            self.db.execute("INSERT INTO localization_overrides VALUES(?,?,?,?,?,?,?)",
                            ("game", key, "en", "English custom", 9, 100, None))
        self.db.execute("UPDATE localization_overrides SET text=? WHERE term_id=? AND locale='ru'",
                        ("Особая стойкость к огню", "skill_entry.18.8"))
        self.db.execute("UPDATE localization_overrides SET text=? WHERE term_id=? AND locale='ru'",
                        ("", "skill_entry.18.9"))
        self.db.execute("INSERT INTO localization_drafts VALUES(?,?,?,?)",
                        ("game", "skill_entry.18.10", "ru", "Несохранённый текст"))
        self.db.executescript(SQL)
        for id,expected_ui in [('updates.latestForUsers','Последние изменения для пользователей: {version}'),
                               ('updates.technicalSummary','Выполнены внутренние технические улучшения.')]:
            value = self.db.execute('SELECT text,version FROM localization_overrides WHERE scope=? AND term_id=? AND locale=?',
                                     ('ui',id,'ru')).fetchone()
            self.assertEqual(value,(expected_ui,1))
        expected = {
            "skill_entry.18.8": "Особая стойкость к огню",
            "skill_entry.18.9": "",
            "skill_entry.18.10": "Сопротивляемость молниям",
            "skill_entry.20.7": "Сопр. тьме",
            "skill_entry.21.7": "Сопр. чарам"
        }
        for key, wanted in expected.items():
            ru = self.db.execute(
                "SELECT text,version FROM localization_overrides WHERE term_id=? AND locale='ru'", (key,)
            ).fetchone()
            self.assertEqual(ru[0], wanted, key)
            self.assertEqual(ru[1], 5 if key in ("skill_entry.20.7","skill_entry.21.7") else 4)
            en = self.db.execute(
                "SELECT text,version FROM localization_overrides WHERE term_id=? AND locale='en'", (key,)
            ).fetchone()
            self.assertEqual(en, ("English custom",9))
        history = self.db.execute("SELECT term_id,published_text FROM localization_history").fetchall()
        self.assertEqual(set(history), {("skill_entry.20.7", "Сопр. тьме"),
                                        ("skill_entry.21.7", "Сопр. чарам")})
        # Reapplying accidentally has no further effect or duplicate history.
        self.db.executescript(SQL)
        self.assertEqual(self.db.execute("SELECT count(*) FROM localization_history").fetchone()[0], 2)


    def test_catalog_only_legacy_names_become_versioned_localization_records(self):
        entries = [{
            'identity': {'id': term},
            'edit': {'names': {'ru': original}}
        } for term,(original,_) in self.old.items()]
        self.db.execute("UPDATE catalog_head SET snapshot_json=? WHERE id=1",
                        (json.dumps(entries,ensure_ascii=False),))
        # Previously edited and reset values cannot be shadowed by new rows.
        self.db.execute("INSERT INTO localization_overrides VALUES(?,?,?,?,?,?,?)",
                        ("game","skill_entry.18.8","ru","Собственное имя",3,100,None))
        self.db.execute("INSERT INTO localization_overrides VALUES(?,?,?,?,?,?,?)",
                        ("game","skill_entry.18.9","ru","",4,100,None))
        self.db.execute("INSERT INTO localization_drafts VALUES(?,?,?,?)",
                        ("game","skill_entry.18.10","ru","Черновик владельца"))
        self.db.executescript(SQL)
        expected = {
          "skill_entry.18.8": ("Собственное имя",3),
          "skill_entry.18.9": ("",4),
          "skill_entry.18.10": None,
          "skill_entry.20.7": ("Сопр. тьме",1),
          "skill_entry.21.7": ("Сопр. чарам",1)
        }
        for term,wanted in expected.items():
            actual=self.db.execute(
                "SELECT text,version FROM localization_overrides WHERE scope=? AND term_id=? AND locale=?",
                ("game",term,"ru")
            ).fetchone()
            self.assertEqual(actual,wanted,term)
        self.db.executescript(SQL)
        for term,wanted in expected.items():
            actual=self.db.execute(
                "SELECT text,version FROM localization_overrides WHERE scope=? AND term_id=? AND locale=?",
                ("game",term,"ru")
            ).fetchone()
            self.assertEqual(actual,wanted,term)
        # Catalog mechanics and original names never change.
        self.assertEqual(json.loads(self.db.execute(
            "SELECT snapshot_json FROM catalog_head WHERE id=1").fetchone()[0]),entries)


if __name__ == "__main__":
    unittest.main()
