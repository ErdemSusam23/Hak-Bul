"""
categorizer.py
Gelen soruyu anahtar kelime eslemesiyle hukuki kategoriye ayirir.
"""

from __future__ import annotations

import re

KATEGORI_ANAHTAR_KELIMELERI: dict[str, list[str]] = {
    "Is Hukuku": [
        "isten cikarm", "isten cikaril", "kidem tazminat", "ihbar tazminat",
        "ihbar suresi", "is akdi", "is sozlesme", "is kanun", "fazla mesai",
        "ucret", "maas", "isci", "isveren", "sendika", "grev", "lokavt",
        "tazminat", "istifa", "fesih", "mobbing", "izin", "yillik izin",
        "dogum izni", "babalik izni", "hastalik izni", "is kazasi",
        "meslek hastaligi", "haksiz fesih", "kidem", "ihbar",
    ],
    "Kira Hukuku": [
        "kira", "kiraci", "kiralayan", "ev sahibi", "tahliye", "kirasiz",
        "kira artis", "kira bedel", "depozito", "konut", "kiralama",
        "kira sozlesme", "kira artisi", "kira tespit",
    ],
    "Tuketici Hukuku": [
        "tuketici", "ayipli mal", "ayipli urun", "iade", "garanti",
        "e-ticaret", "online alisveris", "satis sozlesme", "kampanya",
        "fatura", "haksiz sart", "mesafeli sozlesme", "cayma hakki",
    ],
    "Aile Hukuku": [
        "bosanma", "nafaka", "velayet", "evlilik", "nikah", "miras",
        "veraset", "miras paylas", "aile", "cocuk", "evlat edinme",
        "vesayet", "kayyum", "bosanma davasi", "mal rejimi",
    ],
    "Ceza Hukuku": [
        "suc", "ceza", "hapis", "para cezasi", "suclanim", "savcilik",
        "kovusturma", "beraat", "mahkumiyet", "sikayetci", "tutuklama",
        "gozalti", "hirsizlik", "dolandiricilik", "hakaret", "tehdit",
        "darp", "yaralama", "cinayet", "sahtecilik",
    ],
    "Idare Hukuku": [
        "devlet", "belediye", "kamu", "idare", "vergi", "vergi cezasi",
        "lisans", "ruhsat", "izin belgesi", "ihale", "kamulistirma",
        "idari islem", "iptal davasi", "yurütmeyi durdurma",
    ],
    "Ticaret Hukuku": [
        "sirket", "limited sirket", "anonim sirket", "ortaklik", "hisse",
        "konkordato", "iflas", "tasfiye", "ticaret sicil", "sozlesme ihlal",
        "alacak", "borclu", "senet", "cek", "kambiyo",
    ],
}

VARSAYILAN_KATEGORI = "Genel Hukuk"

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_TR_TABLE = str.maketrans(
    "çÇğĞıİöÖşŞüÜ",
    "cCgGiIoOsSuU",
)


def _normalize(text: str) -> str:
    return text.lower().translate(_TR_TABLE)


class SoruKategorilendiricisi:
    """Anahtar kelime frekansina gore soruyu hukuki kategoriye ayirir."""

    def kategorile(self, soru: str) -> str:
        norm = _normalize(soru)

        en_iyi = VARSAYILAN_KATEGORI
        en_yuksek = 0

        for kategori, kelimeler in KATEGORI_ANAHTAR_KELIMELERI.items():
            puan = sum(1 for k in kelimeler if k in norm)
            if puan > en_yuksek:
                en_yuksek = puan
                en_iyi = kategori

        return en_iyi


# Modul seviyesinde singleton — her import'ta yeniden olusturulmaz
_kategorilendirici: SoruKategorilendiricisi | None = None


def get_kategorilendirici() -> SoruKategorilendiricisi:
    global _kategorilendirici
    if _kategorilendirici is None:
        _kategorilendirici = SoruKategorilendiricisi()
    return _kategorilendirici
