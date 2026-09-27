#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import pathlib

LEGACY_ROOT_FILES = ("index.html", "readme.txt")
LEGACY_DIRS = ("css", "js", "image")


def collect_legacy_files(root: pathlib.Path) -> list[pathlib.Path]:
    root = root.resolve()
    files: list[pathlib.Path] = []
    for name in LEGACY_ROOT_FILES:
        path = root / name
        if path.is_file():
            files.append(path)
    for dirname in LEGACY_DIRS:
        directory = root / dirname
        if directory.is_dir():
            files.extend(path for path in directory.rglob("*") if path.is_file())
    return sorted(files, key=lambda p: p.relative_to(root).as_posix())


def fingerprint_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_target(root: pathlib.Path, relative: str) -> pathlib.Path:
    root = root.resolve()
    target = (root / relative).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"manifest path escapes repository root: {relative}") from exc
    return target


def verify_manifest(root: pathlib.Path, manifest: pathlib.Path) -> list[str]:
    errors: list[str] = []
    root = root.resolve()
    if not manifest.is_file():
        return [f"manifest missing: {manifest}"]
    for line_number, raw in enumerate(manifest.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(None, 1)
        if len(parts) != 2 or len(parts[0]) != 64:
            errors.append(f"invalid manifest line {line_number}: {raw}")
            continue
        expected, relative = parts[0].lower(), parts[1].strip()
        if relative.startswith("*"):
            relative = relative[1:]
        try:
            target = _safe_target(root, relative)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if not target.is_file():
            errors.append(f"missing legacy file: {relative}")
            continue
        actual = fingerprint_file(target)
        if actual != expected:
            errors.append(f"changed legacy file: {relative}")
    return errors


def write_manifest(root: pathlib.Path, manifest: pathlib.Path) -> None:
    root = root.resolve()
    manifest.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"{fingerprint_file(path)}  {path.relative_to(root).as_posix()}"
        for path in collect_legacy_files(root)
    ]
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        type=pathlib.Path,
        default=pathlib.Path(__file__).resolve().parents[1],
    )
    parser.add_argument("--write", type=pathlib.Path)
    parser.add_argument("--verify", type=pathlib.Path)
    args = parser.parse_args()

    if args.write:
        write_manifest(args.root, args.write)
        print(f"Wrote legacy manifest: {args.write}")
        return 0

    manifest = args.verify or (args.root / "preservation" / "legacy-files.sha256")
    errors = verify_manifest(args.root, manifest)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("Legacy fingerprint verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
