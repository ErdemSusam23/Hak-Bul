#!/usr/bin/env python3
"""
evaluate_retrieval.py — Hak-Bul RAG retrieval@5 degerlendirme scripti.

sorular.json (beklenen_kanunlar/beklenen_maddeler alanlariyla)
ve test_sonuclari_*.json cifti uzerinden:
  - retrieval@5_kanun        : beklenen kanunlarin en az biri top-5 icinde mi?
  - retrieval@5_kanun_madde  : beklenen kanun + madde ayni kaynakta mi?
metriklerini hesaplar.

Kullanim:
    python scripts/evaluate_retrieval.py --kategori 01_is_hukuku
    python scripts/evaluate_retrieval.py --all --out test_results/baseline_retrieval.md
    python scripts/evaluate_retrieval.py \
        --sorular test_sorular/01_is_hukuku/sorular.json \
        --sonuclar test_results/01_is_hukuku/test_sonuclari_20260415_093430.json

Script post-hoc calisir — API veya pytest calistirmaz.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

TARGET_CATEGORIES = [
    "01_is_hukuku",
    "03_ceza_hukuku",
    "13_usul_hukuku",
    "14_genel_hukuk",
]

KANUN_RE = re.compile(r"^\s*(\d{3,4})\s+Say[ıi]l[ıi]", re.IGNORECASE)
MADDE_RE = re.compile(r"Madde\s+(\d+)", re.IGNORECASE)


def extract_kanun_no(baslik: str) -> str:
    m = KANUN_RE.match(baslik or "")
    return m.group(1) if m else ""


def extract_madde_no(baslik: str) -> str:
    m = MADDE_RE.search(baslik or "")
    return m.group(1) if m else ""


def load_sorular(path: Path) -> tuple[str, list[dict]]:
    """sorular.json'u oku. Eski (str listesi) ve yeni (dict listesi) formatini destekler."""
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or len(data) != 1:
        raise ValueError(f"{path}: tek kategorili {{kategori: [...]}} formati bekleniyor")

    kategori, items = next(iter(data.items()))
    out: list[dict] = []
    for item in items:
        if isinstance(item, str):
            out.append(
                {
                    "soru": item,
                    "beklenen_kanunlar": [],
                    "beklenen_maddeler": [],
                    "notlar": "",
                }
            )
        elif isinstance(item, dict) and "soru" in item:
            out.append(
                {
                    "soru": item["soru"],
                    "beklenen_kanunlar": [str(k) for k in item.get("beklenen_kanunlar", [])],
                    "beklenen_maddeler": [str(m) for m in item.get("beklenen_maddeler", [])],
                    "notlar": item.get("notlar", ""),
                }
            )
        else:
            raise ValueError(f"{path}: tanimsiz soru formati: {item!r}")
    return kategori, out


def find_latest_sonuc(kategori_dir: Path) -> Path | None:
    if not kategori_dir.exists():
        return None
    candidates = sorted(kategori_dir.glob("test_sonuclari_*.json"), reverse=True)
    return candidates[0] if candidates else None


@dataclass
class QuestionEval:
    sira: int
    soru: str
    beklenen_kanunlar: list[str]
    beklenen_maddeler: list[str]
    gelen_kanun_madde: list[tuple[str, str]]
    kanun_hit: bool
    madde_hit: bool
    skor_ortalama: float


def evaluate_pair(sorular: list[dict], sonuclar_data: dict) -> list[QuestionEval]:
    sonuc_list = sonuclar_data.get("sonuclar", [])
    results: list[QuestionEval] = []

    for idx, sor in enumerate(sorular, 1):
        sonuc = next((s for s in sonuc_list if s.get("sira") == idx), None)
        if sonuc is None and idx - 1 < len(sonuc_list):
            sonuc = sonuc_list[idx - 1]
        if sonuc is None:
            sonuc = {}

        exp_kanunlar = set(sor["beklenen_kanunlar"])
        exp_maddeler = set(sor["beklenen_maddeler"])

        gelen_pairs: list[tuple[str, str]] = []
        for kaynak in sonuc.get("kaynaklar", []):
            if kaynak.get("kaynak_turu") != "kanun":
                continue
            baslik = kaynak.get("baslik", "")
            kn = extract_kanun_no(baslik)
            md = extract_madde_no(baslik)
            if kn:
                gelen_pairs.append((kn, md))

        kanun_hit = bool(exp_kanunlar & {k for k, _ in gelen_pairs})
        madde_hit = False
        if exp_maddeler:
            madde_hit = any(
                k in exp_kanunlar and m in exp_maddeler for k, m in gelen_pairs
            )

        results.append(
            QuestionEval(
                sira=idx,
                soru=sor["soru"],
                beklenen_kanunlar=sorted(exp_kanunlar),
                beklenen_maddeler=sorted(exp_maddeler),
                gelen_kanun_madde=gelen_pairs,
                kanun_hit=kanun_hit,
                madde_hit=madde_hit,
                skor_ortalama=float(sonuc.get("ortalama_kaynak_skor", 0.0)),
            )
        )
    return results


def format_category_report(label: str, evals: list[QuestionEval]) -> str:
    lines: list[str] = []
    lines.append(f"=== {label} ===")
    with_exp = [e for e in evals if e.beklenen_kanunlar]
    lines.append(
        f"Toplam soru: {len(evals)} | beklenen_kanun atanmis: {len(with_exp)}/{len(evals)}"
    )
    lines.append("")

    for e in evals:
        if not e.beklenen_kanunlar:
            durum = "o beklenen_yok"
        else:
            kanun_mark = "+kanun" if e.kanun_hit else "-kanun"
            if e.beklenen_maddeler:
                madde_mark = "+madde" if e.madde_hit else "-madde"
                durum = f"{kanun_mark} {madde_mark}"
            else:
                durum = kanun_mark

        beklenen_str = "{" + ",".join(e.beklenen_kanunlar) + "}"
        if e.beklenen_maddeler:
            beklenen_str += " m." + "/".join(e.beklenen_maddeler)

        seen: list[str] = []
        for k, m in e.gelen_kanun_madde:
            etiket = f"{k}" + (f" m.{m}" if m else "")
            if etiket not in seen:
                seen.append(etiket)
        gelen_str = "[" + ", ".join(seen) + "]"

        lines.append(
            f"S{e.sira:<2} {durum:<16} beklenen={beklenen_str}  gelen={gelen_str}"
        )

    lines.append("")
    if with_exp:
        kanun_hits = sum(1 for e in with_exp if e.kanun_hit)
        lines.append(
            f"retrieval@5_kanun        : {kanun_hits}/{len(with_exp)} "
            f"({kanun_hits / len(with_exp) * 100:.1f}%)"
        )
        mad_exp = [e for e in with_exp if e.beklenen_maddeler]
        if mad_exp:
            mad_hits = sum(1 for e in mad_exp if e.madde_hit)
            lines.append(
                f"retrieval@5_kanun_madde  : {mad_hits}/{len(mad_exp)} "
                f"({mad_hits / len(mad_exp) * 100:.1f}%)"
            )

    skor_vals = [e.skor_ortalama for e in evals if e.skor_ortalama > 0]
    if skor_vals:
        lines.append(
            f"ortalama_gelen_skor      : {sum(skor_vals) / len(skor_vals):.4f}"
        )

    lines.append("")
    return "\n".join(lines)


def build_json_summary(
    slug: str,
    sonuc_path: Path,
    evals: list[QuestionEval],
) -> dict:
    with_exp = [e for e in evals if e.beklenen_kanunlar]
    mad_exp = [e for e in with_exp if e.beklenen_maddeler]
    return {
        "sonuc_dosyasi": str(sonuc_path),
        "toplam_soru": len(evals),
        "beklenen_atanmis": len(with_exp),
        "retrieval_kanun_hit": sum(1 for e in with_exp if e.kanun_hit),
        "retrieval_kanun_total": len(with_exp),
        "retrieval_kanun_madde_hit": sum(1 for e in mad_exp if e.madde_hit),
        "retrieval_kanun_madde_total": len(mad_exp),
        "ortalama_gelen_skor": (
            round(sum(e.skor_ortalama for e in evals) / len(evals), 4) if evals else 0.0
        ),
        "sorular": [
            {
                "sira": e.sira,
                "soru": e.soru,
                "beklenen_kanunlar": e.beklenen_kanunlar,
                "beklenen_maddeler": e.beklenen_maddeler,
                "gelen_kanun_madde": [[k, m] for k, m in e.gelen_kanun_madde],
                "kanun_hit": e.kanun_hit,
                "madde_hit": e.madde_hit,
            }
            for e in evals
        ],
    }


def main() -> int:
    p = argparse.ArgumentParser(
        description="Hak-Bul RAG retrieval@5 degerlendirme scripti",
    )
    p.add_argument("--sorular", type=Path, help="sorular.json yolu")
    p.add_argument("--sonuclar", type=Path, help="test_sonuclari_*.json yolu")
    p.add_argument(
        "--kategori",
        help="Kategori slug (orn. 01_is_hukuku). En yeni test_sonuclari ile otomatik eslenir.",
    )
    p.add_argument(
        "--all",
        action="store_true",
        help="Hedef 4 kategori (01_is, 03_ceza, 13_usul, 14_genel) icin birlesik rapor",
    )
    p.add_argument("--out", type=Path, help="Markdown raporu dosyaya yaz")
    p.add_argument("--json-out", type=Path, help="JSON ozeti dosyaya yaz")
    args = p.parse_args()

    jobs: list[tuple[str, Path, Path]] = []

    if args.all:
        for slug in TARGET_CATEGORIES:
            sorular_path = BASE_DIR / "test_sorular" / slug / "sorular.json"
            sonuclar_path = find_latest_sonuc(BASE_DIR / "test_results" / slug)
            if not sorular_path.exists():
                print(f"[WARN] {slug}: sorular.json yok, atlandi", file=sys.stderr)
                continue
            if not sonuclar_path:
                print(f"[WARN] {slug}: test_sonuclari bulunamadi, atlandi", file=sys.stderr)
                continue
            jobs.append((slug, sorular_path, sonuclar_path))
    elif args.kategori:
        sorular_path = BASE_DIR / "test_sorular" / args.kategori / "sorular.json"
        sonuclar_path = find_latest_sonuc(BASE_DIR / "test_results" / args.kategori)
        if not sorular_path.exists():
            print(f"sorular.json bulunamadi: {sorular_path}", file=sys.stderr)
            return 2
        if not sonuclar_path:
            print(f"Hic test_sonuclari yok: {args.kategori}", file=sys.stderr)
            return 2
        jobs.append((args.kategori, sorular_path, sonuclar_path))
    elif args.sorular and args.sonuclar:
        slug = args.sorular.parent.name
        jobs.append((slug, args.sorular, args.sonuclar))
    else:
        p.error("--kategori, --all veya --sorular+--sonuclar birlikte gerekli")

    report_parts: list[str] = []
    json_summary: dict = {"kategoriler": {}}
    all_with_exp: list[QuestionEval] = []

    for slug, sp, cp in jobs:
        _, sorular = load_sorular(sp)
        sonuclar_data = json.loads(cp.read_text(encoding="utf-8"))
        evals = evaluate_pair(sorular, sonuclar_data)
        report_parts.append(format_category_report(slug, evals))
        json_summary["kategoriler"][slug] = build_json_summary(slug, cp, evals)
        all_with_exp.extend(e for e in evals if e.beklenen_kanunlar)

    if args.all and all_with_exp:
        kanun_total = len(all_with_exp)
        kanun_hits = sum(1 for e in all_with_exp if e.kanun_hit)
        mad_with = [e for e in all_with_exp if e.beklenen_maddeler]
        mad_hits = sum(1 for e in mad_with if e.madde_hit)
        totals: list[str] = [
            "=== Toplam (4 kategori) ===",
            f"retrieval@5_kanun        : {kanun_hits}/{kanun_total} "
            f"({kanun_hits / kanun_total * 100:.1f}%)",
        ]
        if mad_with:
            totals.append(
                f"retrieval@5_kanun_madde  : {mad_hits}/{len(mad_with)} "
                f"({mad_hits / len(mad_with) * 100:.1f}%)"
            )
        totals.append("")
        report_parts.append("\n".join(totals))
        json_summary["toplam"] = {
            "retrieval_kanun_hit": kanun_hits,
            "retrieval_kanun_total": kanun_total,
            "retrieval_kanun_madde_hit": mad_hits,
            "retrieval_kanun_madde_total": len(mad_with),
        }

    full_report = "\n".join(report_parts)
    print(full_report)

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(full_report, encoding="utf-8")
        print(f"[INFO] Markdown rapor yazildi: {args.out}", file=sys.stderr)

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(json_summary, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"[INFO] JSON ozet yazildi: {args.json_out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
