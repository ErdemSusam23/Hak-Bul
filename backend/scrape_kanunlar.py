"""
mevzuat.gov.tr'dan kanun PDF'lerini indirip madde madde chunk'a böler.
Qdrant'a yüklemez — sadece data/processed/ altına JSON kaydeder.

Kullanım:
    python scrape_kanunlar.py              # tüm kanunları çek
    python scrape_kanunlar.py 5237 4721   # sadece belirtilenleri çek
"""

import io
import json
import os
import re
import sys
import time
from pathlib import Path

import pdfplumber
import requests

# Windows terminal UTF-8
if sys.platform == "win32":
    import io as _io
    sys.stdout = _io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── Hedef kanunlar ────────────────────────────────────────────────────────────
KANUNLAR = [
    # (kanun_no, kısa_ad, hukuk_alani, yil)
    ("2709",  "Türkiye Cumhuriyeti Anayasası",              "anayasa_hukuku",     1982),
    ("4721",  "Türk Medeni Kanunu",                          "medeni_hukuk",       2001),
    ("5237",  "Türk Ceza Kanunu",                            "ceza_hukuku",        2004),
    ("6502",  "Tüketicinin Korunması Hakkında Kanun",        "tuketici_hukuku",    2013),
    ("657",   "Devlet Memurları Kanunu",                     "idare_hukuku",       1965),
    ("6331",  "İş Sağlığı ve Güvenliği Kanunu",             "is_hukuku",          2012),
    ("4447",  "İşsizlik Sigortası Kanunu",                   "sosyal_guvenlik",    1999),
    ("6356",  "Sendikalar ve Toplu İş Sözleşmesi Kanunu",   "is_hukuku",          2012),
    ("7036",  "İş Mahkemeleri Kanunu",                       "usul_hukuku",        2017),
    ("2918",  "Karayolları Trafik Kanunu",                   "trafik_hukuku",      1983),
    ("6100",  "Hukuk Muhakemeleri Kanunu",                   "usul_hukuku",        2011),
    ("2577",  "İdari Yargılama Usulü Kanunu",                "idare_hukuku",       1982),
    ("7201",  "Tebligat Kanunu",                             "usul_hukuku",        1959),
    ("3194",  "İmar Kanunu",                                 "idare_hukuku",       1985),
    ("2942",  "Kamulaştırma Kanunu",                         "idare_hukuku",       1983),
    ("5411",  "Bankacılık Kanunu",                           "ticaret_hukuku",     2005),
    ("6362",  "Sermaye Piyasası Kanunu",                     "ticaret_hukuku",     2012),
    ("6102",  "Türk Ticaret Kanunu",                         "ticaret_hukuku",     2011),
    ("4734",  "Kamu İhale Kanunu",                           "idare_hukuku",       2002),
    ("2911",  "Toplantı ve Gösteri Yürüyüşleri Kanunu",     "anayasa_hukuku",     1983),
    # --- Ek kanunlar ---
    ("6698",  "Kişisel Verilerin Korunması Kanunu",          "bilisim_hukuku",     2016),
    ("5651",  "İnternet Ortamında Yapılan Yayınların Düzenlenmesi Kanunu", "bilisim_hukuku", 2007),
    ("5846",  "Fikir ve Sanat Eserleri Kanunu",              "fikri_mulkiyet",     1951),
    ("2004",  "İcra ve İflas Kanunu",                        "usul_hukuku",        1932),
    ("6306",  "Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun", "idare_hukuku", 2012),
    ("3065",  "Katma Değer Vergisi Kanunu",                  "vergi_hukuku",       1984),
    ("193",   "Gelir Vergisi Kanunu",                        "vergi_hukuku",       1960),
    ("5520",  "Kurumlar Vergisi Kanunu",                     "vergi_hukuku",       2006),
    ("4904",  "Türkiye İş Kurumu Kanunu",                    "sosyal_guvenlik",    2003),
    ("2829",  "Sosyal Güvenlik Destek Primi Hakkında Kanun", "sosyal_guvenlik",    1983),
    ("3071",  "Dilekçe Hakkının Kullanılmasına Dair Kanun",  "anayasa_hukuku",     1984),
    ("4982",  "Bilgi Edinme Hakkı Kanunu",                   "idare_hukuku",       2003),
    ("5253",  "Dernekler Kanunu",                            "idare_hukuku",       2004),
    ("5070",  "Elektronik İmza Kanunu",                      "bilisim_hukuku",     2004),
    ("6284",  "Ailenin Korunması ve Kadına Karşı Şiddetin Önlenmesine Dair Kanun", "aile_hukuku", 2012),
]

PDF_URL  = "https://www.mevzuat.gov.tr/MevzuatMetin/1.5.{no}.pdf"
OUT_DIR  = Path(__file__).parent / "data" / "processed"
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)
HEADERS  = {"User-Agent": BROWSER_UA}

# ── PDF indir ─────────────────────────────────────────────────────────────────
def pdf_indir(kanun_no: str) -> bytes | None:
    """
    mevzuat.gov.tr HTTPS'i Python SSL üzerinden doğrudan reddediyor.
    WSL wget browser User-Agent ile 200 döndürüyor — bu yüzden WSL subprocess kullanıyoruz.
    WSL yoksa httpx ile de dener (VPN/proxy durumunda çalışabilir).
    """
    import subprocess, tempfile

    url = PDF_URL.format(no=kanun_no)

    # --- WSL yolu ---
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tf:
            tmp_path = tf.name

        # WSL içinde geçici bir yol kullan
        wsl_tmp = "/tmp/hakbul_" + kanun_no + ".pdf"
        result = subprocess.run(
            [
                "wsl", "wget", "-q", "--no-check-certificate",
                f"--user-agent={BROWSER_UA}",
                url, "-O", wsl_tmp,
            ],
            capture_output=True, timeout=60,
        )
        if result.returncode == 0:
            # WSL'den Windows'a oku
            read_result = subprocess.run(
                ["wsl", "cat", wsl_tmp],
                capture_output=True, timeout=30,
            )
            data = read_result.stdout
            if data[:4] == b"%PDF":
                print(f"  OK PDF indirildi via WSL ({len(data)//1024} KB)")
                subprocess.run(["wsl", "rm", "-f", wsl_tmp], capture_output=True)
                return data
            print(f"  HATA WSL wget basarili ama PDF degil: {data[:20]}")
            return None
        print(f"  HATA WSL wget: {result.stderr.decode(errors='replace')[:200]}")
    except FileNotFoundError:
        print("  WSL bulunamadi, httpx ile deneniyor...")
    except Exception as e:
        print(f"  HATA WSL: {e}")

    # --- httpx yedek yolu (VPN/proxy varsa) ---
    try:
        import httpx
        with httpx.Client(verify=False, timeout=30, follow_redirects=True,
                          headers=HEADERS) as client:
            r = client.get(url)
        if r.status_code == 200 and r.content[:4] == b"%PDF":
            print(f"  OK PDF indirildi via httpx ({len(r.content)//1024} KB)")
            return r.content
        print(f"  HATA httpx HTTP {r.status_code}")
        return None
    except Exception as e:
        print(f"  HATA httpx: {e}")
        return None

# ── PDF metni çıkar ───────────────────────────────────────────────────────────
def pdf_metin_cikart(pdf_bytes: bytes) -> str:
    satirlar = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for sayfa in pdf.pages:
            metin = sayfa.extract_text(x_tolerance=2, y_tolerance=3)
            if metin:
                satirlar.append(metin)
    return "\n".join(satirlar)

# ── Madde'lere böl ────────────────────────────────────────────────────────────
# "Madde 1 -", "Madde 1-", "MADDE 1 –", "Madde 1." biçimlerini yakala
MADDE_RE = re.compile(
    r"(?:^|\n)\s*(Madde|MADDE)\s+(\d+)\s*[-–—\.]\s*",
    re.MULTILINE,
)

def maddelere_bol(tam_metin: str) -> list[tuple[str, str]]:
    """[(madde_no_str, madde_metni), ...] döndürür."""
    parcalar = []
    eslesme = list(MADDE_RE.finditer(tam_metin))
    if not eslesme:
        return []

    for i, m in enumerate(eslesme):
        madde_no = m.group(2)
        baslangic = m.start()
        bitis = eslesme[i + 1].start() if i + 1 < len(eslesme) else len(tam_metin)
        icerik = tam_metin[baslangic:bitis].strip()
        # Çok kısa "madde" satırlarını atla (büyük ihtimal sayfa numarası vs.)
        if len(icerik) >= 30:
            parcalar.append((f"Madde {madde_no}", icerik))

    return parcalar

# ── Chunk listesi oluştur ─────────────────────────────────────────────────────
def chunk_olustur(kanun_no, kanun_adi, hukuk_alani, yil, madde_parcalari):
    chunks = []
    for madde_str, metin in madde_parcalari:
        # Fazla boşlukları/yeni satırları temizle
        metin_temiz = re.sub(r"\s{3,}", "  ", metin)
        chunks.append({
            "chunk_id":    f"kanun_{kanun_no}_{madde_str.lower().replace(' ', '')}",
            "kaynak_turu": "kanun",
            "hukuk_alani": hukuk_alani,
            "kanun_adi":   f"{kanun_no} Sayılı {kanun_adi}",
            "kanun_no":    kanun_no,
            "madde_no":    madde_str,
            "fikra_no":    None,
            "yil":         yil,
            "metin":       metin_temiz,
        })
    return chunks

# ── Ana fonksiyon ─────────────────────────────────────────────────────────────
def kanun_isle(kanun_no, kanun_adi, hukuk_alani, yil):
    print(f"\n{'='*60}")
    print(f"▶ {kanun_no} — {kanun_adi}")

    cikti_dosya = OUT_DIR / f"{kanun_no}_{kanun_adi[:30].replace(' ','_').lower()}_chunks.json"

    if cikti_dosya.exists():
        print(f"  ⏭ Zaten var, atlanıyor: {cikti_dosya.name}")
        return

    pdf_bytes = pdf_indir(kanun_no)
    if pdf_bytes is None:
        return

    print("  → Metin çıkarılıyor...")
    metin = pdf_metin_cikart(pdf_bytes)
    print(f"  → {len(metin):,} karakter çıkarıldı")

    madde_parcalari = maddelere_bol(metin)
    print(f"  → {len(madde_parcalari)} madde bulundu")

    if not madde_parcalari:
        print("  ✗ Madde bulunamadı — PDF yapısı farklı olabilir, atlanıyor.")
        return

    chunks = chunk_olustur(kanun_no, kanun_adi, hukuk_alani, yil, madde_parcalari)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cikti_dosya.write_text(json.dumps(chunks, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✅ {len(chunks)} chunk → {cikti_dosya.name}")


def main():
    hedef = sys.argv[1:] or None  # CLI'dan belirli kanun no'ları

    for kanun_no, kanun_adi, hukuk_alani, yil in KANUNLAR:
        if hedef and kanun_no not in hedef:
            continue
        kanun_isle(kanun_no, kanun_adi, hukuk_alani, yil)
        time.sleep(1)  # sunucuya nazik ol

    print("\n\n✅ Tamamlandı.")
    # Özet
    dosyalar = list(OUT_DIR.glob("*_chunks.json"))
    toplam = 0
    for d in sorted(dosyalar):
        try:
            n = len(json.loads(d.read_text(encoding="utf-8")))
            toplam += n
            print(f"  {d.name:55s} {n:>5} chunk")
        except Exception:
            pass
    print(f"\n  TOPLAM: {toplam} chunk ({len(dosyalar)} dosya)")


if __name__ == "__main__":
    main()
