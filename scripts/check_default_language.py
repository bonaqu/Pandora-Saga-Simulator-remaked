#!/usr/bin/env python3
"""Fail if a built simulator page does not default to English.

The preserved source may remain historically faithful; this check is intended for
the GitHub Pages artifact after the deployment-only language patch is applied.
"""

from pathlib import Path
import sys

path = Path(sys.argv[1] if len(sys.argv) > 1 else "_site/index.html")
html = path.read_text(encoding="utf-8-sig")

assert "Flag = new Array(\n   1 // [ 0]" in html, (
    f"{path}: default language flag is not English (1)"
)
assert "tmp[i][1] == 'jp' || tmp[i][1] == 0" in html, (
    f"{path}: Japanese query override was lost"
)
assert "tmp[i][1] == 'tw' || tmp[i][1] == 2" in html, (
    f"{path}: Traditional Chinese query override was lost"
)

print(f"Default language check passed for {path}: EN default, JP/TW overrides preserved")
