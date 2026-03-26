"""
Normalize processed law chunk JSON files in-place.

- Splits oversized chunks that accidentally contain multiple article headings
  such as "Gecici Madde", "Ek Madde", or "Mukerrer Madde".
- Rebuilds chunk_id from the normalized article label.
- Optionally creates backups before overwriting files.

Usage:
    python scripts/normalize_law_chunks.py --dry-run
    python scripts/normalize_law_chunks.py --backup-dir data/processed_backup
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scrape_kanunlar import _slugify_madde_label, maddelere_bol


def _normalize_law_item(item: dict) -> list[dict]:
    metin = item.get("metin", "")
    kanun_no = str(item.get("kanun_no", "")).strip()
    if not metin or not kanun_no:
        return [item]

    parcalar = maddelere_bol(metin)
    if len(parcalar) <= 1:
        return [item]

    normalized: list[dict] = []
    for madde_str, parca_metin in parcalar:
        yeni = dict(item)
        yeni["madde_no"] = madde_str
        yeni["fikra_no"] = None
        yeni["chunk_id"] = f"kanun_{kanun_no}_{_slugify_madde_label(madde_str)}"
        yeni["metin"] = parca_metin
        normalized.append(yeni)
    return normalized


def _normalize_file(path: Path) -> tuple[int, int, int]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        return 0, 0, 0

    original_count = len(raw)
    split_chunks = 0
    normalized: list[dict] = []

    for item in raw:
        if not isinstance(item, dict):
            continue
        if item.get("kaynak_turu") != "kanun":
            normalized.append(item)
            continue

        pieces = _normalize_law_item(item)
        if len(pieces) > 1:
            split_chunks += 1
        normalized.extend(pieces)

    deduped: list[dict] = []
    seen: set[str] = set()
    for item in normalized:
        chunk_id = str(item.get("chunk_id", "")).strip()
        if chunk_id and chunk_id in seen:
            continue
        if chunk_id:
            seen.add(chunk_id)
        deduped.append(item)

    final_count = len(deduped)
    if deduped != raw:
        path.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")

    return original_count, final_count, split_chunks


def main():
    parser = argparse.ArgumentParser(description="Normalize processed kanun chunk files")
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "processed",
        help="Directory that contains *_chunks.json files",
    )
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=None,
        help="Optional directory to store original files before overwriting",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Analyze only, do not modify files",
    )
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"Input path not found: {args.input}")

    paths = sorted(args.input.glob("*_chunks.json"))
    if not paths:
        raise SystemExit(f"No *_chunks.json files found in {args.input}")

    if args.backup_dir and not args.dry_run:
        args.backup_dir.mkdir(parents=True, exist_ok=True)

    total_before = 0
    total_after = 0
    total_split_chunks = 0
    changed_files = 0

    for path in paths:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            continue

        preview_normalized: list[dict] = []
        preview_split_chunks = 0
        for item in raw:
            if not isinstance(item, dict) or item.get("kaynak_turu") != "kanun":
                preview_normalized.append(item)
                continue
            pieces = _normalize_law_item(item)
            if len(pieces) > 1:
                preview_split_chunks += 1
            preview_normalized.extend(pieces)

        preview_deduped: list[dict] = []
        seen: set[str] = set()
        for item in preview_normalized:
            chunk_id = str(item.get("chunk_id", "")).strip()
            if chunk_id and chunk_id in seen:
                continue
            if chunk_id:
                seen.add(chunk_id)
            preview_deduped.append(item)

        before = len(raw)
        after = len(preview_deduped)
        changed = preview_deduped != raw
        total_before += before
        total_after += after
        total_split_chunks += preview_split_chunks

        if changed:
            changed_files += 1
            if args.backup_dir and not args.dry_run:
                shutil.copy2(path, args.backup_dir / path.name)
            if not args.dry_run:
                _normalize_file(path)

        print(
            f"{path.name}: {before} -> {after} chunks"
            f" | split_sources={preview_split_chunks}"
            f" | changed={'yes' if changed else 'no'}"
        )

    print()
    print(f"Files changed: {changed_files}/{len(paths)}")
    print(f"Chunks total: {total_before} -> {total_after}")
    print(f"Source chunks split: {total_split_chunks}")
    if args.backup_dir and not args.dry_run:
        print(f"Backups written to: {args.backup_dir}")


if __name__ == "__main__":
    main()
