#!/usr/bin/env python3
"""Heuristic inventory of Modern/admin UI literals. Never rewrites D1 publications."""
from __future__ import annotations
import argparse
import hashlib
import json
import pathlib
import re
import sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
BASELINE=ROOT/"localization/text-surface-audit-baseline.v1.json"
ASSIGN=re.compile(r"""(?:\.|\b)(textContent|innerText|title|placeholder)\s*=\s*(['"])([^'"]{3,})\2""")
ATTR=re.compile(r"""setAttribute\(\s*(['"])(?:aria-label|aria-description|placeholder|title)\1\s*,\s*(['"])([^'"]{3,})\2""")
WIDGET=re.compile(r"""(?:element|tag)\(\s*(['"])(?:span|p|h[1-6]|button|label|summary)\1\s*,\s*(['"])[^'"]*\2\s*,\s*(['"])([^'"]{3,})\3""")
LANG=re.compile(r"""(?:getLocale\(\)|currentLocale|locale)\s*===?\s*['"](?:ru|en|jp|tw)['"]""")
REF=re.compile(r"""\b(?:i18n\.t|i18n\.bindText|i18n\.bindAttribute|localizeText)\(\s*['"]([a-z][a-zA-Z0-9._-]+)['"]""")

def fingerprint(path:str,kind:str,value:str)->str:
    return hashlib.sha256((path+"\x00"+kind+"\x00"+value).encode("utf8")).hexdigest()[:24]

def candidate(value:str)->bool:
    value=value.strip()
    return len(value)>=4 and any(c.isalpha() for c in value) and (
        " " in value or any("\u0400"<=c<="\u9fff" for c in value)
    )

def scan_source(path:pathlib.Path,root:pathlib.Path=ROOT)->list[dict]:
    relative=path.relative_to(root).as_posix()
    hits=[]
    for index,line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(),1):
        trimmed=line.strip()
        if trimmed.startswith(("//","*","/*")) or not trimmed: continue
        matches=[("literal_assignment",m.group(3)) for m in ASSIGN.finditer(line)]
        matches += [("literal_attribute",m.group(3)) for m in ATTR.finditer(line)]
        matches += [("literal_widget",m.group(4)) for m in WIDGET.finditer(line)]
        if LANG.search(line) and ("?" in line or "else " in line) and ("'" in line or '"' in line):
            matches.append(("locale_conditional",trimmed[:200]))
        for kind,text in matches:
            if kind!="locale_conditional" and not candidate(text):continue
            if kind=="locale_conditional" and "i18n.t(" in line:continue
            hits.append({"path":relative,"line":index,"kind":kind,
                         "text":text,"fingerprint":fingerprint(relative,kind,text),
                         "confidence":"medium" if kind=="locale_conditional" else "high"})
    return hits

def audit(root:pathlib.Path=ROOT)->dict:
    files=sorted(path for folder in ("modern","admin-api/public")
                 for path in (root/folder).glob("*.js") if path.is_file())
    hits=[record for path in files for record in scan_source(path,root)]
    en=root/"localization/ui.en.json"
    keys=set(json.loads(en.read_text(encoding="utf8"))) if en.exists() else set()
    missing=[]
    for path in files:
        for n,line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(),1):
            if line.strip().startswith("//"):continue
            for match in REF.finditer(line):
                if match.group(1) not in keys:
                    missing.append({"path":path.relative_to(root).as_posix(),
                                    "line":n,"key":match.group(1)})
    return {"schemaVersion":1,
            "scope":["modern/*.js","admin-api/public/*.js"],
            "excluded":["Legacy engine","generated pages","computed UI strings","D1 record values"],
            "scannedFiles":len(files),"candidateOccurrences":len(hits),
            "uniqueCandidateIds":len(set(row["fingerprint"] for row in hits)),
            "missingUiSourceKeys":missing,"candidates":hits}

def main(argv:list[str]|None=None)->int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    parser.add_argument("--json",action="store_true")
    parser.add_argument("--baseline",type=pathlib.Path,default=BASELINE)
    args=parser.parse_args(argv)
    data=audit()
    known=json.loads(args.baseline.read_text(encoding="utf8")) if args.baseline.exists() else {}
    allowed=set(known.get("fingerprints",[]))
    allowed.update(fingerprint(*entry) for entry in known.get("candidates",[]))
    fresh=[x for x in data["candidates"] if x["fingerprint"] not in allowed]
    data["newCandidates"]=fresh
    data["knownCandidates"]=data["candidateOccurrences"]-len(fresh)
    if args.json:print(json.dumps(data,indent=2,ensure_ascii=False))
    else:
        print(f"Localization inventory: {data['scannedFiles']} files, "
              f"{data['candidateOccurrences']} candidates, {len(fresh)} new, "
              f"{len(data['missingUiSourceKeys'])} unknown UI keys")
        for row in fresh[:20]:
            print(f"  {row['path']}:{row['line']} {row['kind']} {row['text'][:95]}")
    return 1 if args.check and (fresh or data["missingUiSourceKeys"]) else 0

if __name__=="__main__":
    sys.exit(main())
