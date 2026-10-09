"""One-time, fingerprint-gated transfer of seven artifact-tool-verified cells.

Preserve the original XLSX member layout and every other cell. Delete this
temporary script and its workflow before merging the PR.
"""
import hashlib
import io
import pathlib
import re
import zipfile

PATH = pathlib.Path("localization/translations.xlsx")
ORIGINAL_SHA256 = "28b9848af3cf190d0afba0160c6cc46e91418a1a2eae7ae31bb3c0e99dd9f980"
EDITS = {
    1508: ("skill_entry.18.8", "Сопротивляемость огню", "Сопр. огню"),
    1509: ("skill_entry.18.9", "Сопротивляемость льду", "Сопр. льду"),
    1510: ("skill_entry.18.10", "Сопротивляемость молниям", "Сопр. молнии"),
    1534: ("skill_entry.20.7", "Сопротивляемость магии тьмы", "Сопр. тьме"),
    1546: ("skill_entry.21.7", "Сопротивляемость чарам", "Сопр. чарам"),
    2128: ("calculator.status.39", "Сопр. тьмы", "Сопр. тьме"),
    2169: ("calculator.text.25", None, "Честь"),
}
raw = PATH.read_bytes()
if hashlib.sha256(raw).hexdigest() != ORIGINAL_SHA256:
    raise SystemExit("Source workbook changed; refuse to overwrite it")

with zipfile.ZipFile(io.BytesIO(raw), "r") as source:
    content = source.read("xl/worksheets/sheet1.xml").decode("utf-8")
    for row_number, (stable_id, old, new) in EDITS.items():
        row_pattern = r'<ns0:row r="' + str(row_number) + r'"[^>]*>.*?</ns0:row>'
        row_match = re.search(row_pattern, content, flags=re.DOTALL)
        assert row_match, (row_number, "missing row")
        row = row_match.group(0)
        assert ('<ns0:c r="B' + str(row_number) + '" t="inlineStr"><ns0:is><ns0:t>' + stable_id) in row, stable_id
        before = '<ns0:c r="H' + str(row_number) + '" t="inlineStr"><ns0:is><ns0:t>'
        if old is None:
            assert before not in row, stable_id
            updated = row.replace('</ns0:row>', before + new + '</ns0:t></ns0:is></ns0:c></ns0:row>')
        else:
            original = before + old + '</ns0:t></ns0:is></ns0:c>'
            assert row.count(original) == 1, stable_id
            updated = row.replace(original, before + new + '</ns0:t></ns0:is></ns0:c>')
        content = content.replace(row, updated, 1)
    # Recreate ZIP with unchanged metadata for every XLSX member.
    destination = io.BytesIO()
    with zipfile.ZipFile(destination, "w") as out:
        for entry in source.infolist():
            data = content.encode("utf-8") if entry.filename == "xl/worksheets/sheet1.xml" else source.read(entry.filename)
            out.writestr(entry, data)
    updated = destination.getvalue()

with zipfile.ZipFile(io.BytesIO(updated)) as check:
    assert check.testzip() is None
    changed = check.read("xl/worksheets/sheet1.xml").decode("utf-8")
    for n, (_, _, new) in EDITS.items():
        assert '<ns0:c r="H' + str(n) + '" t="inlineStr"><ns0:is><ns0:t>' + new + '</ns0:t>' in changed

PATH.write_bytes(updated)
print("Safely transferred seven approved translation values; SHA256:", hashlib.sha256(updated).hexdigest())
