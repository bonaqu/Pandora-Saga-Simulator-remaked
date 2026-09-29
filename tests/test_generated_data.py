import hashlib
import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
GENERATED = ROOT / "data" / "generated"
EXPECTED = {
    "equipment.v1.json": ("equipment", 1120, {"js/item.js"}),
    "souls.v1.json": ("souls", 184, {"js/item.js"}),
    "skills.v1.json": ("skills", 211, {"js/ini.js", "js/skill.js"}),
}
LANGUAGES = {"jp", "en", "tw"}


class GeneratedDataTests(unittest.TestCase):
    def read(self, name: str):
        return json.loads((GENERATED / name).read_text(encoding="utf-8"))

    def test_projection_metadata_and_source_fingerprints_are_current(self):
        for filename, (kind, count, source_paths) in EXPECTED.items():
            payload = self.read(filename)
            metadata = payload["metadata"]
            self.assertEqual(payload["kind"], kind)
            self.assertEqual(metadata["schema_version"], 1)
            self.assertEqual(metadata["projection_version"], "v1")
            self.assertEqual(metadata["legacy_engine"], "2.00")
            self.assertEqual(metadata["remaked_ui"], "2026.09.8")
            self.assertEqual(
                metadata["source_fingerprint"],
                "SHA-256 after CRLF-to-LF normalization",
            )
            self.assertEqual(payload["count"], count)
            self.assertEqual(len(payload["records"]), count)
            self.assertEqual({entry["path"] for entry in metadata["generated_from"]}, source_paths)
            for entry in metadata["generated_from"]:
                source = (ROOT / entry["path"]).read_bytes().replace(b"\r\n", b"\n")
                digest = hashlib.sha256(source).hexdigest()
                self.assertEqual(entry["sha256"], digest, entry["path"])

    def test_equipment_ids_are_exact_legacy_selector_values(self):
        payload = self.read("equipment.v1.json")
        self.assertEqual(payload["category_count"], 44)
        self.assertEqual(len(payload["categories"]), 44)
        ids = set()
        for record in payload["records"]:
            expected = record["legacy_category_id"] * 10000 + record["legacy_item_index"]
            self.assertEqual(record["legacy_id"], expected)
            self.assertEqual(record["id"], f"equipment.{record['legacy_category_id']}.{record['legacy_item_index']}")
            self.assertEqual(set(record["name"]), LANGUAGES)
            self.assertIsInstance(record["compatibility_flags"], list)
            ids.add(record["legacy_id"])
        self.assertEqual(len(ids), payload["count"])

    def test_soul_ids_and_skill_coordinates_are_unique_and_complete(self):
        souls = self.read("souls.v1.json")["records"]
        self.assertEqual([record["legacy_id"] for record in souls], list(range(1, 185)))
        self.assertTrue(all(record["id"] == f"soul.{record['legacy_id']}" for record in souls))
        self.assertTrue(all(set(record["name"]) == LANGUAGES for record in souls))

        skills_payload = self.read("skills.v1.json")
        self.assertEqual(skills_payload["category_count"], 25)
        coordinates = set()
        for record in skills_payload["records"]:
            coordinate = (record["legacy_category_id"], record["legacy_entry_index"])
            self.assertNotIn(coordinate, coordinates)
            coordinates.add(coordinate)
            self.assertEqual(record["id"], f"skill.{coordinate[0]}.{coordinate[1]}")
            self.assertEqual(set(record["name"]), LANGUAGES)
            self.assertIsInstance(record["is_active"], bool)
        self.assertEqual(len(coordinates), 211)


if __name__ == "__main__":
    unittest.main()
