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
CIKTI_DOSYASI = os.path.join(
    os.path.dirname(__file__),
    "test_results",
    f"test_sonuclari_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
)
BEKLEME_SN = 4          # Sorular arası bekleme (saniye)
MAX_RETRY = 3           # 429 alındığında deneme sayısı
TIMEOUT_SN = 60.0       # Her istek için timeout
MAX_KAYNAK = 5          # /ask max_kaynak parametresi


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

    for kategori, sorular in veri.items():
        if not isinstance(sorular, list) or len(sorular) == 0:
            print(f"[HATA] Kategori '{kategori}' en az 1 soru içermeli.")
            sys.exit(1)

    toplam = sum(len(s) for s in veri.values())
    print(f"[INFO] {len(veri)} kategori, toplam {toplam} soru yüklendi.\n")
    return veri


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

                sonuclar.append({
                    "sira": idx,
                    "kategori_beklenen": kategori,
                    "soru": soru,
                    "cevap": yanit.get("yanit", ""),
                    "kaynaklar": yanit.get("kaynaklar", []),
                    "kategori_tespit": yanit.get("kategori", ""),
                    "message_id": yanit.get("message_id"),
                    "conversation_id": yanit.get("conversation_id"),
                    "uyari": yanit.get("uyari", ""),
                    "yanit_suresi_sn": round(elapsed, 2),
                    "basarili": True,
                    "hata": None,
                })
                print(f"[{idx:3d}/{toplam}] [{kategori:25s}] ✅ {elapsed:.1f}s")
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
        ozet_kategori[kat] = {
            "toplam": veri["toplam"],
            "basarili": veri["basarili"],
            "basarisiz": veri["basarisiz"],
            "basari_orani": round(veri["basarili"] / veri["toplam"] * 100, 1) if veri["toplam"] else 0,
            "ortalama_sure_sn": ortalama_sure,
        }

    sonuc_paket = {
        "test_meta": {
            "tarih": datetime.now(timezone.utc).isoformat(),
            "api_url": api_url,
            "toplam_soru": toplam,
            "kategori_sayisi": len(sorular),
            "rate_limit_bekleme_sn": bekleme_sn,
            "max_retry": MAX_RETRY,
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
    print(f"  {'Kategori':<25s} {'Toplam':>6s} {'Başarılı':>8s} {'Oran':>7s} {'Ort.Süre':>8s}")
    print(f"  {'-'*25} {'-'*6} {'-'*8} {'-'*7} {'-'*8}")

    for kat, veri in ozet["kategori_dagilimi"].items():
        print(
            f"  {kat:<25s} {veri['toplam']:>6d} {veri['basarili']:>8d} "
            f"%{veri['basari_orani']:>5.1f} {veri['ortalama_sure_sn']:>6.1f}s"
        )

    print()
    print(f"📁 Sonuçlar kaydedildi: {CIKTI_DOSYASI}")
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
        default=CIKTI_DOSYASI,
        help="Çıktı JSON dosya yolu",
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

    # Testi çalıştır
    sonuc = test_calistir(sorular, args.api_url, args.bekleme, args.cikti)

    # Özet yazdır
    ozet_yazdir(sonuc)

    # Başarısız varsa exit code 1
    sys.exit(1 if sonuc["ozet"]["basarisiz"] > 0 else 0)


if __name__ == "__main__":
    main()
