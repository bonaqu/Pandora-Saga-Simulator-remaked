#!/usr/bin/env python3
"""Remove obsolete FC2 hosting-only footer injection from the restored HTML.

The calculator logic/data is intentionally left untouched.
"""

from __future__ import annotations

import pathlib
import re
import sys


def strip_fc2_footer(text: str) -> tuple[str, int]:
    patterns = [
        re.compile(
            r"<script[^>]*>\s*<!--\s*var\s+fc2footerparam\b.*?</script>",
            flags=re.IGNORECASE | re.DOTALL,
        ),
        re.compile(
            r"<script[^>]*>.*?vip\.chps-api\.fc2\.com/apis/footer/.*?</script>",
            flags=re.IGNORECASE | re.DOTALL,
        ),
    ]

    removed = 0
    for pattern in patterns:
        text, count = pattern.subn(
            "<!-- FC2 hosting footer removed by preservation bootstrap. -->", text
        )
        removed += count

    return text, removed


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: strip_fc2_injection.py <html-file>", file=sys.stderr)
        return 2

    path = pathlib.Path(sys.argv[1])
    original = path.read_text(encoding="utf-8-sig")
    cleaned, removed = strip_fc2_footer(original)

    # Fail closed if the known runtime endpoint still remains in the entry point.
    forbidden = ("vip.chps-api.fc2.com", "static.fc2.com/fc2web")
    leftovers = [value for value in forbidden if value.lower() in cleaned.lower()]
    if leftovers:
        print(f"FC2 runtime injection still present: {', '.join(leftovers)}", file=sys.stderr)
        return 1

    path.write_text(cleaned, encoding="utf-8")
    print(f"FC2 hosting blocks removed: {removed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
