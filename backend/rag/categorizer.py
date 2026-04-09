"""
categorizer.py
Gelen soruyu anahtar kelime eslemesiyle hukuki kategoriye ayirir.

14 kategori destekler:
İş, Medeni, Ceza, Ticaret, Tüketici, Taşınmaz Mülk, İdare,
Vergi, Sosyal Güvenlik, Fikri Mülkiyet, Bilişim, Anayasa, Usul, Genel
"""

from __future__ import annotations

import re

KATEGORI_ANAHTAR_KELIMELERI: dict[str, list[str]] = {
    "İş Hukuku": [
        "isten cikarm", "isten cikaril", "haksiz cikar", "haksiz cikaril",
        "kidem tazminat", "ihbar tazminat",
        "ihbar suresi", "is akdi", "is sozlesme", "is kanun", "fazla mesai",
        "ucret", "maas", "isci", "isveren", "sendika", "grev", "lokavt",
        "tazminat", "istifa", "fesih", "mobbing", "izin", "yillik izin",
        "dogum izni", "babalik izni", "hastalik izni", "is kazasi",
        "meslek hastaligi", "haksiz fesih", "kidem", "ihbar",
        "calisabilir", "calisma", "calisti", "calistiril",
        "maden", "madenci", "madende", "yeralt", "yerustu",
        "cocuk isci", "genc isci", "yas siniri", "kac yasinda",
        "engelli isci", "ozurlu", "kadinlarin calismasi",
        "gece calismasi", "haftalik calisma", "gunluk calisma",
        "is sagligi", "is guvenligi",
        "is mahkemesi",
        "denizci", "gazeteci", "tarim isci",
    ],
    "Medeni Hukuk": [
        "miras", "miras paylas", "veraset", "vasi", "vasilik", "vasilik müesses",
        "mal rejimi", "edinilmis mallar", "katilma alacagi",
        "evlilik birligi", "evlenme", "evlenme yasi", "nis",
        "miras reddi", "mirasci", "miras payi", "sakli pay", "tenkis",
        "vesayet", "vesayet davasi", "kayyum", "vasi atanmasi",
        "evlat edinme", "evlat", "soy bagı", "soyadi degisik",
        "vasiyet", "vasiyetname", "miras sozlesmesi",
        "tuzel kisi", "dernek", "vakif",
    ],
    "Ceza Hukuku": [
        "suc", "ceza", "hapis", "para cezasi", "suclanim", "savcilik",
        "kovusturma", "beraat", "mahkumiyet", "sikayetci", "tutuklama",
        "gozalti", "hirsizlik", "dolandiricilik", "hakaret", "tehdit",
        "darp", "yaralama", "cinayet", "sahtecilik",
        "suc duyurusu", "suclu", "suclama", "ceza davasi",
        "zimmet", "irtikap", "rusvet", "cinsel taciz", "cinsel saldiri",
        "kisi ozgurlugu", "konut dokunulmazligi",
        "uyusturucu", "uyusturucu kullanma",
        "kast", "taksir", "meşru savunma", "zorunluluk hali",
        "ceza kanunu", "tck", "5237",
    ],
    "Ticaret Hukuku": [
        "sirket", "limited sirket", "anonim sirket", "ortaklik", "hisse",
        "konkordato", "iflas", "tasfiye", "ticaret sicil",
        "ticaret kanun", "ticari isletme", "ticari defter",
        "ticaret unvani", "komandit", "kolektif",
        "ticari senet", "cek", "kambiyo", "police", "bono",
        "acentelik", "komisyoncu", "araci kurum",
        "franchise", "lisans anlasm",
        "sermaye", "pay", "ortaklar kurulu", "yonetim kurulu",
    ],
    "Tuketici Hukuku": [
        "tuketici", "ayipli mal", "ayipli urun", "iade", "garanti",
        "e-ticaret", "online alisveris", "satis sozlesme", "kampanya",
        "fatura", "haksiz sart", "mesafeli sozlesme", "cayma hakki",
        "urun iade", "urun degisim", "tuketici haklari", "satis sozles",
        "abonelik", "devre mulk", "paket tur", "sigorta hakki",
        "tuketici hakem heyeti", "tuketici mahkemesi", "tuketici sorunu",
        "peşin satis", "taksitli satis", "kredili satis",
        "etiket fiyati", "fiyat artisi", "ayipli hizmet",
    ],
    "Taşınmaz Mülk": [
        "tapu", "arsa", "arazi", "gayrimenkul", "tasinmaz", "mulk",
        "emlak vergisi", "kat mulkiyeti", "kat irtifaki",
        "imar", "imar plani", "ruhsat", "yapi ruhsati", "iskan",
        "kamulastirma", "kamulastirma bedeli", "istimlak",
        "kadastro", "sinir", "sinir anlazmasi", "gecit hakki",
        "irtifak hakki", "uzuk edindirme", "zilyetlik",
        "hazine arazisi", "hazine taahhutu",
        "ekrimisil", "mulk sahibinin hakki",
    ],
    "İdare Hukuku": [
        "devlet", "belediye", "kamu", "idare", "yontem",
        "lisans", "ruhsat", "izin belgesi", "idari islem",
        "iptal davasi", "yurutmeyi durdurma",
        "memur", "kamu gorevli", "devlet memuru", "disiplin cezasi",
        "mal bildirimi", "kamu ihale", "danistay", "idare mahkeme",
        "idari yargi", "idari dava", "idari karar", "idari para cezasi",
        "gorevli mahkeme", "yetki geni",
        "kamu hizmeti", "kamu kurumu",
        "valilik", "kaymakamlik", "muhtarlik",
    ],
    "Vergi Hukuku": [
        "vergi", "vergi cezasi", "kdv", "gelir vergisi", "vergi beyan",
        "kurumlar vergisi", "stopaj", "muhtasar", "beyanname",
        "vergi dairesi", "vergi borcu", "vergi iade", "vergi muafiyeti",
        "vergi istisnasi", "otv", "mtv", "emlak vergisi", "damga vergisi",
        "vergi mahkemesi", "vergi ceza", "vergi mufettis",
        "matrah", "tevkifat", "katma deger",
        "vergi yargi", "vergi inceleme", "vergi yapislandirma",
        "vergi beyannamesi", "vergi tarhiyati",
    ],
    "Sosyal Guvenlik Hukuku": [
        "sgk", "sosyal guvenlik", "emeklilik", "emekli", "prim",
        "prim gun", "sigorta", "malulluk", "yaslilik",
        "olum ayligi", "dul ayligi", "yetim ayligi", "borclanma",
        "hizmet tespit", "saglik sigortasi", "genel saglik",
        "istirahat raporu", "gecici is goremezlik", "surekli is goremezlik",
        "issizlik maasi", "issizlik odenegi",
        "askerlik borclanmasi", "dogum borclanmasi",
        "emekli sandigi", "bagkur",
        "sgk borcu", "sgk yapislandirma",
    ],
    "Fikri Mülkiyet": [
        "telif", "telif hakki", "fikri mülkiyet", "fikri sinai",
        "patent", "patent basvuru", "marka tescil", "marka tescili",
        "endustriyel tasarim", "faydali model",
        "eser sahibi", "eser hakki", "yapimci", "yayinci",
        "yazilim lisansi", "ticari sir",
        "kullanim hakki", "yayin hakki", "icra hakki",
    ],
    "Bilişim Hukuku": [
        "bilisim", "bilisim hukuku", "kvkk", "kisisel veri", "veri koruma",
        "veri ihlali", "siber suc", "siber saldiri", "internet suc",
        "e-imza", "elektronik imza",
        "dijital hak", "dijital kimlik", "dijital imza",
        "bilisim suclari", "bilisim sistemi", "bilisim agi",
        "5651", "internetsizlik", "erisim engelleme",
        "siber zorbalik", "kimlik hirsizligi",
        "kisisel verilerin korunmasi", "acik riza", "veri sorumlusu",
    ],
    "Anayasa Hukuku": [
        "anayasa", "anayasa mahkemesi", "aym", "bireysel basvuru",
        "temel hak", "ozgurluk", "temel hak ve ozgurluk",
        "ifade ozgurlugu", "basin ozgurlugu", "dusunce ozgurlugu",
        "din ve vicdan", "ibadet ozgurlugu", "vicdan ozgurlugu",
        "kisinin dokunulmazligi", "konut dokunulmazligi",
        "toplanti ve gosteri yuruyusu", "toplanti hakki",
        "secme ve secilme", "secilme hakki", "oy kullanma",
        "vatandaslik", "vatandaslikten cikarma", "vatandaslik basvuru",
        "olağanustu hal", "ohal", "sikayet yonetimi",
        "kanunun anayasaya uygunluk", "iptal karari", "cumhurbaskanligi kararnamesi",
    ],
    "Usul Hukuku": [
        "arabuluculuk", "arabulucu", "zorunlu arabuluculuk",
        "icra takibi", "icra dairesi", "icra emri", "icra", "haciz",
        "zamanaşimi", "zamanasimi", "hak dusurucu sure", "dava acma suresi",
        "tebligat", "teblig", "ihtiyati tedbir", "tedbir karari",
        "gorevli mahkeme", "yetkili mahkeme",
        "istinaf", "temyiz", "yargitay", "danistay",
        "delil tespiti", "delil toplama", "bilirkişi", "bilirkişi raporu",
        "yargilama gideri", "vekalet ucreti", "harç", "mahkeme harc",
        "uzlastirma", "hagb", "hukmun aciklanmasinin geri birakilmesi",
        "dava sartı", "dava acma", "dava sureci",
    ],
    "Genel Hukuk": [
        "hukuk", "hak", "kanun", "yasa", "yonetmelik",
        "dava", "mahkeme", "dilekce", "dilekce hakki", "basvuru",
        "trafik", "trafik cezasi", "trafik sigortasi", "trafik kazasi",
        "ikamet izni", "calisma izni", "vize", "deport", "deport karari",
        "aile birlesimi", "iltica", "multeci", "iltica basvuru",
        "noter", "vekaletname", "noter islemi",
        "hukuki yardim", "hukuki danisman", "avukat",
        "e-devlet",
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
