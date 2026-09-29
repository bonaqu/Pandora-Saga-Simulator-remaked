import pathlib
import unittest

from scripts.recover_archived_javascript import recover_archived_javascript


ROOT = pathlib.Path(__file__).resolve().parents[1]


class ArchivedJavascriptTests(unittest.TestCase):
    def test_decodes_source_cells_without_navigation_or_line_numbers(self):
        source = '<html><nav>not source</nav><table class="code"><tr><th id="L1">1</th><td>if (a &lt; b) {</td></tr><tr><th id="L2">2</th><td>\u00a0 <span>return "A &amp; B";</span></td></tr><tr><th id="L3">3</th><td>}</td></tr></table></html>'
        self.assertEqual(recover_archived_javascript(source), 'if (a < b) {\n  return "A & B";\n}\n')

    def test_regular_javascript_is_unchanged(self):
        source = "window.fixture = '<html>';\n"
        self.assertEqual(recover_archived_javascript(source), source)

    def test_html_without_complete_numbered_source_is_rejected(self):
        for source in ('<html>404</html>', '<html><table class="code"><tr><th id="L2">2</th><td>x();</td></tr></table></html>'):
            with self.subTest(source=source), self.assertRaisesRegex(ValueError, "complete numbered"):
                recover_archived_javascript(source)

    def test_real_archives_recover_complete_original_code(self):
        for name, end in (("base64.js", "})();"), ("rawinflate.js", "})();"), ("rawdeflate.js", "})();")):
            with self.subTest(name=name):
                recovered = recover_archived_javascript((ROOT / "js" / name).read_text(encoding="utf-8-sig"))
                self.assertFalse(recovered.startswith("<!DOCTYPE"))
                self.assertEqual(recovered.strip().splitlines()[-1], end)


if __name__ == "__main__":
    unittest.main()
