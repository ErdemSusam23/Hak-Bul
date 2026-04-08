"""
convert_txt_to_jsonl.py
========================
Ham Yargıtay karar TXT dosyalarını load_jsonl_kararlar.py'nin beklediği
JSONL formatına dönüştürür. Her karar ~1200 char'lık chunk'lara bölünür.

Kullanım:
    python scripts/convert_txt_to_jsonl.py \
        --input "C:/path/to/txt_folder" \
        --output "data/kararlar_6098.jsonl" \
        --kanun-no 6098 \
        --hukuk-alani borclar_hukuku

Desteklenen --hukuk-alani değerleri:
    is_hukuku, borclar_hukuku, ceza_hukuku, ticaret_hukuku, medeni_hukuk, genel
"""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

CHUNK_SIZE = 1200    # karakter
CHUNK_OVERLAP = 150  # örtüşme

HUKUK_ALANI_MAP = {
    "4857": "is_hukuku",
    "6331": "is_hukuku",
    "6356": "is_hukuku",
    "7036": "is_hukuku",
    "5510": "is_hukuku",
    "6098": "borclar_hukuku",
    "5237": "ceza_hukuku",
    "6102": "ticaret_hukuku",
    "4721": "medeni_hukuk",
    "6502": "tuketici_hukuku",
    "2004": "icra_iflas_hukuku",
    "2577": "idare_hukuku",
    "6100": "usul_hukuku",
    "2709": "anayasa_hukuku",
    "193":  "vergi_hukuku",
    "3065": "vergi_hukuku",
    "5520": "vergi_hukuku",
    "6698": "kisisel_veri_hukuku",
    "2918": "trafik_hukuku",
}

DAIRE_RE = re.compile(
    r"^(.+?Dairesi|Hukuk Genel Kurulu|Ceza Genel Kurulu)\s+(\d{4}/\d+)\s+E\.\s*,?\s*(\d{4}/\d+)\s*K\.",
    re.MULTILINE | re.IGNORECASE,
)
YIL_RE = re.compile(r"(\d{4})/\d+\s+[EK]\.")


def _stable_id(chunk_id: str) -> int:
    digest = hashlib.blake2b(chunk_id.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, byteorder="big") & ((1 << 63) - 1)


def _parse_header(text: str):
    m = DAIRE_RE.search(text)
    if m:
        daire = m.group(1).strip()
        esas_no = m.group(2).strip()
        karar_no = m.group(3).strip()
    else:
        daire = ""
        esas_no = ""
        karar_no = ""

    yil = None
    for ym in YIL_RE.finditer(text[:200]):
        yil = int(ym.group(1))
        break

    return daire, esas_no, karar_no, yil


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def _karar_id_from_filename(fname: str) -> str:
    stem = Path(fname).stem   # yargitay_1112654800
    parts = stem.split("_")
    for p in parts:
        if p.isdigit():
            return p
    return stem


def convert_folder(
    input_dir: Path,
    output_path: Path,
    kanun_no: str,
    hukuk_alani: str,
):
    txt_files = sorted(input_dir.glob("*.txt"))
    if not txt_files:
        txt_files = []
        for sub in input_dir.iterdir():
            if sub.is_dir():
                txt_files.extend(sorted(sub.glob("*.txt")))

    print(f"Toplam {len(txt_files)} txt dosyası bulundu.")

    total_chunks = 0
    with open(output_path, "w", encoding="utf-8") as out:
        for txt_path in txt_files:
            try:
                text = txt_path.read_text(encoding="utf-8", errors="replace").strip()
            except Exception as e:
                print(f"UYARI: {txt_path.name} okunamadı: {e}")
                continue

            if not text:
                continue

            karar_id = _karar_id_from_filename(txt_path.name)
            daire, esas_no, karar_no, yil = _parse_header(text)

            url = f"https://karararama.yargitay.gov.tr/getDokuman?id={karar_id}"

            chunks = _chunk_text(text)
            for i, chunk_text in enumerate(chunks, start=1):
                chunk_id = f"yargitay_{karar_id}_tam_metin_{i}"
                record = {
                    "id": chunk_id,
                    "vector": None,
                    "payload": {
                        "kaynak_turu": "yargitay_karari",
                        "hukuk_alani": hukuk_alani,
                        "karar_id": karar_id,
                        "karar_no": karar_no,
                        "esas_no": esas_no,
                        "daire": daire,
                        "karar_bolumu": "tam_metin",
                        "tarih": None,
                        "yil": yil,
                        "metin": chunk_text,
                        "url": url,
                        "chunk_id": chunk_id,
                        "kanun_no": kanun_no,
                    },
                }
                out.write(json.dumps(record, ensure_ascii=False) + "\n")
                total_chunks += 1

    print(f"Toplam {total_chunks} chunk yazıldı → {output_path}")
    return total_chunks


def main():
    parser = argparse.ArgumentParser(description="Yargıtay txt → JSONL dönüştürücü")
    parser.add_argument("--input", required=True, help="TXT dosyalarının bulunduğu klasör")
    parser.add_argument("--output", required=True, help="Çıktı JSONL dosyası")
    parser.add_argument("--kanun-no", required=True, help="İlgili kanun numarası (ör: 6098)")
    parser.add_argument(
        "--hukuk-alani",
        default=None,
        help="Hukuk alanı (belirtilmezse kanun-no'dan otomatik belirlenir)",
    )
    args = parser.parse_args()

    input_dir = Path(args.input)
    if not input_dir.is_dir():
        print(f"HATA: {input_dir} bir klasör değil.")
        sys.exit(1)

    hukuk_alani = args.hukuk_alani or HUKUK_ALANI_MAP.get(args.kanun_no, "genel")
    print(f"Kanun: {args.kanun_no} | Hukuk alanı: {hukuk_alani}")

    convert_folder(
        input_dir=input_dir,
        output_path=Path(args.output),
        kanun_no=args.kanun_no,
        hukuk_alani=hukuk_alani,
    )


if __name__ == "__main__":
    main()
