#!/usr/bin/env python3
from __future__ import annotations
import copy, json, pathlib, tempfile, zipfile
from xml.etree import ElementTree

ROOT = pathlib.Path(__file__).resolve().parents[1]
BOOK = ROOT / "localization" / "translations.xlsx"
PATCH = ROOT / "localization" / "ru-calculator-translations.patch.json"
MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
DOCREL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKGREL = "http://schemas.openxmlformats.org/package/2006/relationships"
XML = "http://www.w3.org/XML/1998/namespace"
SHEET = "Переводы"
ElementTree.register_namespace("", MAIN)

def col_index(ref):
    n=0
    for ch in ''.join(c for c in ref if c.isalpha()).upper():
        n=n*26+ord(ch)-64
    return n

def cell_value(cell, shared):
    kind=cell.attrib.get("t")
    if kind=="inlineStr":
        return ''.join(n.text or '' for n in cell.findall(f".//{{{MAIN}}}t"))
    node=cell.find(f"{{{MAIN}}}v")
    value=node.text if node is not None and node.text is not None else ""
    return shared[int(value)] if kind=="s" and value else value

def set_cell(row, ref, value):
    existing=next((c for c in row.findall(f"{{{MAIN}}}c") if c.attrib.get("r")==ref),None)
    style=existing.attrib.get("s") if existing is not None else None
    if existing is not None: row.remove(existing)
    attrs={"r":ref,"t":"inlineStr"}
    if style: attrs["s"]=style
    cell=ElementTree.Element(f"{{{MAIN}}}c",attrs)
    inline=ElementTree.SubElement(cell,f"{{{MAIN}}}is")
    text=ElementTree.SubElement(inline,f"{{{MAIN}}}t")
    if value[:1].isspace() or value[-1:].isspace(): text.set(f"{{{XML}}}space","preserve")
    text.text=value
    row.append(cell)
    row[:]=sorted(row,key=lambda c:col_index(c.attrib.get("r","A1")))

def main():
    patch=json.loads(PATCH.read_text(encoding="utf-8"))
    with zipfile.ZipFile(BOOK) as source:
        wb=ElementTree.fromstring(source.read("xl/workbook.xml"))
        rels=ElementTree.fromstring(source.read("xl/_rels/workbook.xml.rels"))
        targets={r.attrib["Id"]:r.attrib["Target"] for r in rels.findall(f"{{{PKGREL}}}Relationship")}
        target=None
        for sh in wb.findall(f".//{{{MAIN}}}sheet"):
            if sh.attrib.get("name")==SHEET:
                target=targets[sh.attrib[f"{{{DOCREL}}}id"]]; break
        if not target: raise ValueError("translation sheet missing")
        sheet_path="xl/"+target.lstrip("/").removeprefix("xl/")
        sheet=ElementTree.fromstring(source.read(sheet_path))
        data=sheet.find(f"{{{MAIN}}}sheetData")
        shared=[]
        try:
            root=ElementTree.fromstring(source.read("xl/sharedStrings.xml"))
            shared=[''.join(n.text or '' for n in si.findall(f".//{{{MAIN}}}t")) for si in root.findall(f"{{{MAIN}}}si")]
        except KeyError: pass
        rows=list(data.findall(f"{{{MAIN}}}row"))
        by_id={}
        for row in rows:
            for cell in row.findall(f"{{{MAIN}}}c"):
                if ''.join(c for c in cell.attrib.get("r","") if c.isalpha()).upper()=="B":
                    value=cell_value(cell,shared)
                    if value: by_id[value]=row
        for ident,value in {**patch["labels"],**patch["hints"]}.items():
            if ident not in by_id:
                if any(new[1]==ident for new in patch["newRows"]): continue
                raise ValueError(f"missing translation row {ident}")
            number=by_id[ident].attrib["r"]
            set_cell(by_id[ident],f"H{number}",value)
        for ident,updates in patch["sourceUpdates"].items():
            row=by_id[ident]; number=row.attrib["r"]
            for column,value in updates.items(): set_cell(row,f"{column}{number}",value)
        template=by_id["calculator.status.3.hint"]
        max_row=max(int(row.attrib["r"]) for row in rows)
        for values in patch["newRows"]:
            if values[1] in by_id: continue
            max_row+=1
            row=copy.deepcopy(template); row.attrib["r"]=str(max_row)
            for cell in row.findall(f"{{{MAIN}}}c"):
                letters=''.join(c for c in cell.attrib.get("r","") if c.isalpha()).upper()
                cell.attrib["r"]=f"{letters}{max_row}"
            for offset,value in enumerate(values):
                set_cell(row,f"{chr(65+offset)}{max_row}",value)
            data.append(row); by_id[values[1]]=row
        dim=sheet.find(f"{{{MAIN}}}dimension")
        if dim is not None: dim.attrib["ref"]=f"A1:I{max_row}"
        replacements={sheet_path:ElementTree.tostring(sheet,encoding="utf-8",xml_declaration=True)}
        for name in source.namelist():
            if name.startswith("xl/tables/") and name.endswith(".xml"):
                table=ElementTree.fromstring(source.read(name)); table.attrib["ref"]=f"A1:I{max_row}"
                af=table.find(f"{{{MAIN}}}autoFilter")
                if af is not None: af.attrib["ref"]=f"A1:I{max_row}"
                replacements[name]=ElementTree.tostring(table,encoding="utf-8",xml_declaration=True)
        with tempfile.NamedTemporaryFile(suffix=".xlsx",delete=False,dir=BOOK.parent) as h: tmp=pathlib.Path(h.name)
        try:
            with zipfile.ZipFile(tmp,"w") as out:
                for info in source.infolist(): out.writestr(info,replacements.get(info.filename,source.read(info.filename)))
            with zipfile.ZipFile(tmp) as check:
                broken=check.testzip()
                if broken: raise ValueError(f"broken workbook member: {broken}")
            tmp.replace(BOOK)
        finally:
            tmp.unlink(missing_ok=True)
    print(f"Applied {len(patch['labels'])} labels, {len(patch['hints'])} hints; workbook rows={max_row}")

if __name__=="__main__": main()
