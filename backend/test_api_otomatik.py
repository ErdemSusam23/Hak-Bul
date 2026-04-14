#!/usr/bin/env python3
"""
test_api_otomatik.py — Hak-Bul API otomatik test scripti

Çalıştırma (Docker):
    docker exec hak-bul-backend python test_api_otomatik.py
    docker exec hak-bul-backend python test_api_otomatik.py --bekleme 4 --cikti test_sonuclari.json

Çalıştırma (Local):
    cd backend
    python test_api_otomatik.py

Gereksinimler:
    httpx (Docker image'da zaten kurulu)

Soru Havuzu Formatı (backend/test_sorular.json):
    {
      "İş Hukuku": ["Soru 1?", "Soru 2?"],
      "Kira Hukuku": ["Soru 1?", "Soru 2?"],
      ...
    }
"""

import argparse
import httpx
import json
import time
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Varsayılanlar
# ---------------------------------------------------------------------------
API_URL = "http://127.0.0.1:8000"
SORULAR_DOSYASI = os.path.join(os.path.dirname(__file__), "test_sorular.json")
BEKLEME_SN = 4          # Sorular arası bekleme (saniye)
MAX_RETRY = 3           # 429 alındığında deneme sayısı
TIMEOUT_SN = 60.0       # Her istek için timeout
MAX_KAYNAK = 5          # /ask max_kaynak parametresi

_SLUG_CHAR_MAP = {
    "ş": "s",
    "ı": "i",
    "ğ": "g",
    "ü": "u",
    "ö": "o",
    "ç": "c",
    " ": "_",
}

_CATEGORY_ALIASES = {
    "diger": "Genel Hukuk",
    "genel_hukuk": "Genel Hukuk",
    "genel hukuk": "Genel Hukuk",
}


def _ascii_key(value: str) -> str:
    normalized = (value or "").strip().lower().replace("i̇", "i")
    for tr, en in _SLUG_CHAR_MAP.items():
        normalized = normalized.replace(tr, en)
    return normalized


def normalize_category_name(category: str) -> str:
    """Kategori adını kanonik forma getir."""
    stripped = (category or "").strip()
    if not stripped:
        return ""
    return _CATEGORY_ALIASES.get(_ascii_key(stripped), stripped)


def categories_match(expected: str, actual: str) -> bool:
    return normalize_category_name(expected) == normalize_category_name(actual)


def slugify_category_name(category: str) -> str:
    normalized = normalize_category_name(category)
    slug = _ascii_key(normalized)
    return slug or "genel_hukuk"


def normalize_test_folder_name(folder_name: str) -> str:
    """Numaralı test klasör adını kanonik kategori slug'ına çevir."""
    if not folder_name:
        return folder_name

    prefix, sep, suffix = folder_name.partition("_")
    if prefix.isdigit() and sep:
        return f"{prefix}_{slugify_category_name(suffix)}"
    return slugify_category_name(folder_name)


def cikti_yolu_belirle(sorular: dict, cikti_param: str | None = None, sorular_yolu: str | None = None) -> str:
    """
    Çıktı dosya yolunu belirle.

    Mantık:
    1. --cikti parametresi verilmişse → onu kullan
    2. sorular_yolu numaralı klasör içeriyorsa (ör. test_sorular/01_is_hukuku/sorular.json)
       → aynı numaralı klasörü test_results altında kullan: test_results/01_is_hukuku/
    3. Tek kategori varsa → kategori adından klasör türet
    4. Çok kategori varsa → test_results/ kök dizinine kaydet
    """
    if cikti_param:
        return cikti_param

    zaman_damgasi = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Sorular yolundan numaralı klasör adını çıkar (ör. "01_is_hukuku")
    if sorular_yolu:
        parts = Path(sorular_yolu).parts
        for part in parts:
            if part[:2].isdigit() and "_" in part:
                kanonik_klasor = normalize_test_folder_name(part)
                cikti_klasor = os.path.join(os.path.dirname(__file__), "test_results", kanonik_klasor)
                os.makedirs(cikti_klasor, exist_ok=True)
                return os.path.join(cikti_klasor, f"test_sonuclari_{zaman_damgasi}.json")

    # Fallback: tek kategori → adından klasör türet
    if len(sorular) == 1:
        kategori_adi = next(iter(sorular.keys()))
        klasor_adi = slugify_category_name(kategori_adi)

        cikti_klasor = os.path.join(os.path.dirname(__file__), "test_results", klasor_adi)
        os.makedirs(cikti_klasor, exist_ok=True)
        return os.path.join(cikti_klasor, f"test_sonuclari_{zaman_damgasi}.json")

    # Çoklu kategori → genel klasör
    return os.path.join(
        os.path.dirname(__file__),
        "test_results",
        f"test_sonuclari_{zaman_damgasi}.json",
    )


def sorulari_yuk(dosya_yolu: str) -> dict[str, list[str]]:
    """Soru havuzunu JSON dosyasından yükle."""
    path = Path(dosya_yolu)
    if not path.exists():
        print(f"[HATA] Soru dosyası bulunamadı: {dosya_yolu}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        veri = json.load(f)

    if not isinstance(veri, dict):
        print("[HATA] Soru dosyası bir JSON objesi (dict) olmalı.")
        sys.exit(1)

    normalize_veri: dict[str, list[str]] = {}
    for kategori, sorular in veri.items():
        if not isinstance(sorular, list) or len(sorular) == 0:
            print(f"[HATA] Kategori '{kategori}' en az 1 soru içermeli.")
            sys.exit(1)
        kanonik_kategori = normalize_category_name(kategori)
        normalize_veri.setdefault(kanonik_kategori, []).extend(sorular)

    toplam = sum(len(s) for s in normalize_veri.values())
    print(f"[INFO] {len(normalize_veri)} kategori, toplam {toplam} soru yüklendi.\n")
    return normalize_veri


def soru_gonder(
    client: httpx.Client,
    soru: str,
    api_url: str,
    dil: str = "tr",
) -> tuple[dict | None, float, str | None]:
    """
    API'ye tek bir soru gönder.

    Dönenler:
        - response_json: Başarılı ise API yanıtı, değilse None
        - elapsed_ms: Geçen süre (saniye)
        - hata: Hata mesajı (varsa), yoksa None
    """
    try:
        start = time.time()
        resp = client.post(
            f"{api_url}/ask",
            json={"soru": soru, "max_kaynak": MAX_KAYNAK, "language": dil},
            timeout=TIMEOUT_SN,
        )
        elapsed = time.time() - start

        if resp.status_code == 200:
            return resp.json(), elapsed, None
        elif resp.status_code == 429:
            return None, elapsed, f"Rate limit 429: {resp.text[:100]}"
        else:
            return None, elapsed, f"HTTP {resp.status_code}: {resp.text[:200]}"

    except httpx.TimeoutException:
        return None, TIMEOUT_SN, "İstek zaman aşımına uğradı"
    except httpx.ConnectError:
        return None, 0, f"Bağlantı hatası: {api_url} erişilemiyor"
    except Exception as e:
        return None, 0, f"Beklenmeyen hata: {e}"


def test_calistir(
    sorular: dict[str, list[str]],
    api_url: str,
    bekleme_sn: float,
    cikti_yolu: str,
) -> dict:
    """Tüm soruları gönder, sonuçları topla ve kaydet."""

    # Soruları düz listeye çevir
    soru_listesi: list[tuple[str, str]] = []
    for kategori, soru_list in sorular.items():
        for s in soru_list:
            soru_listesi.append((kategori, s))

    toplam = len(soru_listesi)
    print(f"[INFO] {toplam} soru gönderilecek.\n")

    # Sonuç toplayıcılar
    sonuclar: list[dict] = []
    kategori_ozet: dict[str, dict] = {}
    basarili = 0
    basarisiz = 0
    toplam_sure = 0.0

    baslangic = time.time()

    with httpx.Client() as client:
        for idx, (kategori, soru) in enumerate(soru_listesi, 1):
            # Kategori özet başlat
            if kategori not in kategori_ozet:
                kategori_ozet[kategori] = {
                    "toplam": 0,
                    "basarili": 0,
                    "basarisiz": 0,
                    "sureler": [],
                }
            kategori_ozet[kategori]["toplam"] += 1

            # İstek gönder
            yanit, elapsed, hata = soru_gonder(client, soru, api_url)

            # 429 → retry + backoff
            retry = 0
            while hata and "429" in hata and retry < MAX_RETRY:
                retry += 1
                backoff = bekleme_sn * retry
                print(f"      ⏳ Rate limit, {backoff}s sonra tekrar denenecek ({retry}/{MAX_RETRY})")
                time.sleep(backoff)
                yanit, elapsed, hata = soru_gonder(client, soru, api_url)

            # Sonuç kaydet
            is_success = yanit is not None and hata is None
            if is_success:
                basarili += 1
                kategori_ozet[kategori]["basarili"] += 1
                kategori_ozet[kategori]["sureler"].append(elapsed)

                # --- Yeni metrikler ---
                cevap = yanit.get("yanit", "")
                kaynaklar = yanit.get("kaynaklar", [])
                kategori_tespit = yanit.get("kategori", "")

                # 1) Kategori doğruluğu
                kategori_dogru = categories_match(kategori, kategori_tespit)
                # 2) Cevap uzunluğu (karakter)
                cevap_uzunluk = len(cevap)

                # 3) Ortalama kaynak skoru
                ort_kaynak_skor = 0.0
                if kaynaklar:
                    skorlar = [k.get("skor", 0) for k in kaynaklar]
                    ort_kaynak_skor = round(sum(skorlar) / len(skorlar), 4)

                # Kategori özetine yeni metrikleri ekle
                kategori_ozet[kategori].setdefault("kategori_dogru", 0)
                kategori_ozet[kategori].setdefault("cevap_uzunluklar", [])
                kategori_ozet[kategori].setdefault("kaynak_skorlari", [])
                if kategori_dogru:
                    kategori_ozet[kategori]["kategori_dogru"] += 1
                kategori_ozet[kategori]["cevap_uzunluklar"].append(cevap_uzunluk)
                kategori_ozet[kategori]["kaynak_skorlari"].append(ort_kaynak_skor)

                sonuclar.append({
                    "sira": idx,
                    "kategori_beklenen": kategori,
                    "soru": soru,
                    "cevap": cevap,
                    "kaynaklar": kaynaklar,
                    "kategori_tespit": kategori_tespit,
                    "kategori_dogru": kategori_dogru,
                    "cevap_uzunluk": cevap_uzunluk,
                    "ortalama_kaynak_skor": ort_kaynak_skor,
                    "kaynak_sayisi": len(kaynaklar),
                    "message_id": yanit.get("message_id"),
                    "conversation_id": yanit.get("conversation_id"),
                    "uyari": yanit.get("uyari", ""),
                    "yanit_suresi_sn": round(elapsed, 2),
                    "basarili": True,
                    "hata": None,
                })
                print(f"[{idx:3d}/{toplam}] [{kategori:25s}] ✅ {elapsed:.1f}s | "
                      f"kat={'✅' if kategori_dogru else '❌'} "
                      f"cevap={cevap_uzunluk}chr "
                      f"skor={ort_kaynak_skor:.3f}")
            else:
                basarisiz += 1
                kategori_ozet[kategori]["basarisiz"] += 1

                sonuclar.append({
                    "sira": idx,
                    "kategori_beklenen": kategori,
                    "soru": soru,
                    "cevap": "",
                    "kaynaklar": [],
                    "kategori_tespit": "",
                    "message_id": None,
                    "conversation_id": None,
                    "uyari": "",
                    "yanit_suresi_sn": round(elapsed, 2),
                    "basarili": False,
                    "hata": hata,
                })
                print(f"[{idx:3d}/{toplam}] [{kategori:25s}] ❌ {hata}")

            # Rate limit beklemesi
            time.sleep(bekleme_sn)

    bitis = time.time()
    toplam_sure = bitis - baslangic

    # ------------------------------------------------------------------
    # Özet hesapla
    # ------------------------------------------------------------------
    ozet_kategori = {}
    for kat, veri in kategori_ozet.items():
        sureler = veri["sureler"]
        ortalama_sure = round(sum(sureler) / len(sureler), 2) if sureler else 0

        # Yeni metrikler
        cevap_uzunluklar = veri.get("cevap_uzunluklar", [])
        kaynak_skorlari = veri.get("kaynak_skorlari", [])
        kategori_dogru = veri.get("kategori_dogru", 0)

        ozet_kategori[kat] = {
            "toplam": veri["toplam"],
            "basarili": veri["basarili"],
            "basarisiz": veri["basarisiz"],
            "basari_orani": round(veri["basarili"] / veri["toplam"] * 100, 1) if veri["toplam"] else 0,
            "ortalama_sure_sn": ortalama_sure,
            "kategori_dogruluk_orani": round(kategori_dogru / veri["basarili"] * 100, 1) if veri["basarili"] else 0,
            "ortalama_cevap_uzunluk": round(sum(cevap_uzunluklar) / len(cevap_uzunluklar), 0) if cevap_uzunluklar else 0,
            "ortalama_kaynak_skor": round(sum(kaynak_skorlari) / len(kaynak_skorlari), 4) if kaynak_skorlari else 0,
        }

    sonuc_paket = {
        "test_meta": {
            "tarih": datetime.now(timezone.utc).isoformat(),
            "api_url": api_url,
            "toplam_soru": toplam,
            "kategori_sayisi": len(sorular),
            "rate_limit_bekleme_sn": bekleme_sn,
            "max_retry": MAX_RETRY,
            "cikti_dosyasi": cikti_yolu,
        },
        "ozet": {
            "toplam": toplam,
            "basarili": basarili,
            "basarisiz": basarisiz,
            "basari_orani": round(basarili / toplam * 100, 1) if toplam else 0,
            "toplam_sure_sn": round(toplam_sure, 1),
            "ortalama_sure_sn": round(toplam_sure / toplam, 2) if toplam else 0,
            "kategori_dagilimi": ozet_kategori,
        },
        "sonuclar": sonuclar,
    }

    # Dosyaya yaz
    with open(cikti_yolu, "w", encoding="utf-8") as f:
        json.dump(sonuc_paket, f, ensure_ascii=False, indent=2)

    return sonuc_paket


def ozet_yazdir(sonuc: dict) -> None:
    """Test sonucunu konsola yazdır."""
    ozet = sonuc["ozet"]
    meta = sonuc["test_meta"]

    print("\n" + "=" * 70)
    print("TEST SONUÇLARI")
    print("=" * 70)
    print(f"  Toplam Soru      : {ozet['toplam']}")
    print(f"  Başarılı         : {ozet['basarili']}")
    print(f"  Başarısız        : {ozet['basarisiz']}")
    print(f"  Başarı Oranı     : %{ozet['basari_orani']}")
    print(f"  Toplam Süre      : {ozet['toplam_sure_sn']:.0f}s ({ozet['toplam_sure_sn']/60:.1f} dk)")
    print(f"  Ortalama Soru    : {ozet['ortalama_sure_sn']}s")
    print()

    print("-" * 70)
    print("KATEGORİ DAĞILIMI")
    print("-" * 70)
    print(f"  {'Kategori':<25s} {'Toplam':>6s} {'Başarılı':>8s} {'Oran':>7s} "
          f"{'Kat.Doğru':>9s} {'Ort.Uzunluk':>11s} {'Ort.Skor':>8s} {'Ort.Süre':>8s}")
    print(f"  {'-'*25} {'-'*6} {'-'*8} {'-'*7} {'-'*9} {'-'*11} {'-'*8} {'-'*8}")

    for kat, veri in ozet["kategori_dagilimi"].items():
        print(
            f"  {kat:<25s} {veri['toplam']:>6d} {veri['basarili']:>8d} "
            f"%{veri['basari_orani']:>5.1f} "
            f"%{veri['kategori_dogruluk_orani']:>6.1f} "
            f"{veri['ortalama_cevap_uzunluk']:>9.0f}chr "
            f"{veri['ortalama_kaynak_skor']:>6.3f} "
            f"{veri['ortalama_sure_sn']:>6.1f}s"
        )

    print()
    print(f"📁 Sonuçlar kaydedildi: {sonuc['test_meta']['cikti_dosyasi']}")
    print("=" * 70)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Hak-Bul API otomatik test scripti")
    parser.add_argument(
        "--sorular",
        default=SORULAR_DOSYASI,
        help="Soru havuzu JSON dosya yolu (varsayılan: test_sorular.json)",
    )
    parser.add_argument(
        "--cikti",
        default=None,
        help="Çıktı JSON dosya yolu (belirtilmezse otomatik: test_results/{kategori}/)",
    )
    parser.add_argument(
        "--api-url",
        default=API_URL,
        help="API base URL (varsayılan: http://127.0.0.1:8000)",
    )
    parser.add_argument(
        "--bekleme",
        type=float,
        default=BEKLEME_SN,
        help="Sorular arası bekleme süresi (saniye, varsayılan: 4)",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("Hak-Bul API Otomatik Test")
    print("=" * 70)
    print(f"  API URL    : {args.api_url}")
    print(f"  Soru Dosyası: {args.sorular}")
    print(f"  Çıktı Dosyası: {args.cikti}")
    print(f"  Bekleme     : {args.bekleme}s")
    print()

    # Soruları yükle
    sorular = sorulari_yuk(args.sorular)

    # Çıktı yolunu belirle (numaralı klasör → otomatik kategori bazlı)
    cikti_yolu = cikti_yolu_belirle(sorular, args.cikti, args.sorular)

    # Testi çalıştır
    sonuc = test_calistir(sorular, args.api_url, args.bekleme, cikti_yolu)

    # Özet yazdır
    ozet_yazdir(sonuc)

    # Başarısız varsa exit code 1
    sys.exit(1 if sonuc["ozet"]["basarisiz"] > 0 else 0)


if __name__ == "__main__":
    main()
