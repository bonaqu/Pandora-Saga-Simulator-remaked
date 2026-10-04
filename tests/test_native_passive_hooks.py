import json
import pathlib
import tempfile
import unittest

from scripts.native_passive_hooks import GUARD, materialize_native_passives

ROOT = pathlib.Path(__file__).resolve().parents[1]


class NativePassiveHookTests(unittest.TestCase):
    def test_only_identified_conditions_change_and_all_formulas_round_trip(self):
        config = json.loads((ROOT / "data/native-passive-hooks.v1.json").read_text(encoding="utf-8"))
        original = (ROOT / "js/calc.js").read_text(encoding="utf-8-sig")
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory)
            (output / "js").mkdir()
            (output / "modern").mkdir()
            (output / "js/calc.js").write_text(original, encoding="utf-8")
            materialize_native_passives(ROOT, output)
            patched = (output / "js/calc.js").read_text(encoding="utf-8")
            self.assertTrue(patched.startswith(GUARD))
            reversed_source = patched.removeprefix(GUARD)
            for hook in reversed(config["hooks"]):
                self.assertEqual(reversed_source.count(hook["expression"]), hook["count"])
                reversed_source = reversed_source.replace(hook["expression"], hook["source"])
            self.assertEqual(reversed_source, original)
            self.assertEqual(len(config["definitions"]), 14)
            generated = (output / "modern/native-passives.js").read_text(encoding="utf-8")
            self.assertIn("skill_entry.13.3", generated)
            self.assertNotIn("expression", generated)

    def test_source_anchor_drift_fails_before_any_output_write(self):
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory)
            (output / "js").mkdir()
            (output / "modern").mkdir()
            calc = output / "js/calc.js"
            calc.write_text("function Calc() {}", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "source anchor changed"):
                materialize_native_passives(ROOT, output)
            self.assertEqual(calc.read_text(encoding="utf-8"), "function Calc() {}")
            self.assertFalse((output / "modern/native-passives.js").exists())
