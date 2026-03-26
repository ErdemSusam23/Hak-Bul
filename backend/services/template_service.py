"""Hukuki belge taslakları — tanımlar ve PDF üretimi."""
import io
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

# ---------------------------------------------------------------------------
# Türkçe karakter desteği için sistem fontu aranır; bulunamazsa Helvetica.
# ---------------------------------------------------------------------------
_FONT = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"

_TTF_CANDIDATES = [
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
     "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
     "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    ("/usr/share/fonts/truetype/freefont/FreeSans.ttf",
     "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"),
]

for _reg, _bold in _TTF_CANDIDATES:
    if Path(_reg).exists() and Path(_bold).exists():
        pdfmetrics.registerFont(TTFont("TR", _reg))
        pdfmetrics.registerFont(TTFont("TR-Bold", _bold))
        _FONT, _FONT_BOLD = "TR", "TR-Bold"
        break

# ---------------------------------------------------------------------------
# Taslak tanımları
# ---------------------------------------------------------------------------

TEMPLATES: dict[str, dict] = {
    "kira_sozlesmesi": {
        "id": "kira_sozlesmesi",
        "baslik": "Kira Sözleşmesi",
        "aciklama": "Konut veya işyeri kira sözleşmesi taslağı",
        "alanlar": [
            {"ad": "kiraci_ad_soyad",     "etiket": "Kiracı Adı Soyadı",                  "zorunlu": True},
            {"ad": "mal_sahibi_ad_soyad", "etiket": "Kiraya Veren Adı Soyadı",             "zorunlu": True},
            {"ad": "adres",               "etiket": "Kiralanan Taşınmaz Adresi",            "zorunlu": True},
            {"ad": "kira_bedeli",         "etiket": "Aylık Kira Bedeli (TL)",               "zorunlu": True},
            {"ad": "baslangic_tarihi",    "etiket": "Başlangıç Tarihi (GG.AA.YYYY)",        "zorunlu": True},
            {"ad": "sure_ay",             "etiket": "Kira Süresi (Ay)",                     "zorunlu": True},
            {"ad": "depozito",            "etiket": "Depozito Tutarı (TL)",                 "zorunlu": False},
        ],
    },
    "is_sozlesmesi": {
        "id": "is_sozlesmesi",
        "baslik": "İş Sözleşmesi",
        "aciklama": "Belirsiz süreli iş sözleşmesi taslağı",
        "alanlar": [
            {"ad": "isci_ad_soyad",              "etiket": "İşçi Adı Soyadı",                    "zorunlu": True},
            {"ad": "isveren_unvan",              "etiket": "İşveren Ünvanı / Adı Soyadı",        "zorunlu": True},
            {"ad": "gorev",                      "etiket": "Görev / Unvan",                       "zorunlu": True},
            {"ad": "maas",                       "etiket": "Brüt Aylık Ücret (TL)",              "zorunlu": True},
            {"ad": "baslangic_tarihi",           "etiket": "İşe Başlama Tarihi (GG.AA.YYYY)",    "zorunlu": True},
            {"ad": "haftalik_calisma_saati",     "etiket": "Haftalık Çalışma Saati",             "zorunlu": False},
        ],
    },
    "ihtarname": {
        "id": "ihtarname",
        "baslik": "İhtarname",
        "aciklama": "Noterden gönderilmek üzere ihtarname taslağı",
        "alanlar": [
            {"ad": "gonderen_ad_soyad", "etiket": "Gönderen Adı Soyadı",   "zorunlu": True},
            {"ad": "gonderen_adres",   "etiket": "Gönderen Adresi",        "zorunlu": True},
            {"ad": "alici_ad_soyad",   "etiket": "Alıcı Adı Soyadı",      "zorunlu": True},
            {"ad": "alici_adres",      "etiket": "Alıcı Adresi",           "zorunlu": True},
            {"ad": "konu",             "etiket": "İhtarname Konusu",       "zorunlu": True},
            {"ad": "ihtar_metni",      "etiket": "İhtar İçeriği",          "zorunlu": True},
            {"ad": "tarih",            "etiket": "Tarih (GG.AA.YYYY)",     "zorunlu": True},
        ],
    },
    "taahhutname": {
        "id": "taahhutname",
        "baslik": "Taahhütname",
        "aciklama": "Genel amaçlı taahhütname taslağı",
        "alanlar": [
            {"ad": "taahut_eden_ad_soyad", "etiket": "Taahhüt Eden Adı Soyadı", "zorunlu": True},
            {"ad": "taahut_eden_tc",       "etiket": "TC Kimlik No",             "zorunlu": True},
            {"ad": "taahut_eden_adres",    "etiket": "Adres",                    "zorunlu": True},
            {"ad": "taahut_konusu",        "etiket": "Taahhüt Konusu",          "zorunlu": True},
            {"ad": "tarih",                "etiket": "Tarih (GG.AA.YYYY)",       "zorunlu": True},
        ],
    },
    "vekaletname": {
        "id": "vekaletname",
        "baslik": "Vekaletname",
        "aciklama": "Genel amaçlı vekaletname taslağı (noter onayı gerektirir)",
        "alanlar": [
            {"ad": "vekil_veren_ad_soyad", "etiket": "Vekil Veren Adı Soyadı",  "zorunlu": True},
            {"ad": "vekil_veren_tc",        "etiket": "Vekil Veren TC Kimlik No", "zorunlu": True},
            {"ad": "vekil_veren_adres",     "etiket": "Vekil Veren Adresi",       "zorunlu": True},
            {"ad": "vekil_ad_soyad",        "etiket": "Vekil Adı Soyadı",         "zorunlu": True},
            {"ad": "vekil_tc",              "etiket": "Vekil TC Kimlik No",        "zorunlu": True},
            {"ad": "vekil_adres",           "etiket": "Vekil Adresi",              "zorunlu": True},
            {"ad": "yetki_konusu",          "etiket": "Yetki Konusu / Kapsamı",   "zorunlu": True},
            {"ad": "tarih",                 "etiket": "Tarih (GG.AA.YYYY)",        "zorunlu": True},
        ],
    },
    "bosanma_dilekce": {
        "id": "bosanma_dilekce",
        "baslik": "Boşanma Dilekçesi",
        "aciklama": "Anlaşmalı boşanma davası dilekçesi taslağı",
        "alanlar": [
            {"ad": "davaci_ad_soyad",       "etiket": "Davacı Adı Soyadı",           "zorunlu": True},
            {"ad": "davaci_tc",             "etiket": "Davacı TC Kimlik No",          "zorunlu": True},
            {"ad": "davaci_adres",          "etiket": "Davacı Adresi",               "zorunlu": True},
            {"ad": "davali_ad_soyad",       "etiket": "Davalı (Eş) Adı Soyadı",     "zorunlu": True},
            {"ad": "davali_adres",          "etiket": "Davalı Adresi",               "zorunlu": True},
            {"ad": "evlilik_tarihi",        "etiket": "Evlilik Tarihi (GG.AA.YYYY)", "zorunlu": True},
            {"ad": "cocuk_bilgisi",         "etiket": "Müşterek Çocuk Bilgisi (varsa)", "zorunlu": False},
            {"ad": "nafaka_talebi",         "etiket": "Nafaka Talebi (varsa)",        "zorunlu": False},
            {"ad": "mahkeme",               "etiket": "Yetkili Aile Mahkemesi",       "zorunlu": True},
            {"ad": "tarih",                 "etiket": "Tarih (GG.AA.YYYY)",           "zorunlu": True},
        ],
    },
    "icra_itiraz_dilekce": {
        "id": "icra_itiraz_dilekce",
        "baslik": "İcra İtiraz Dilekçesi",
        "aciklama": "Ödeme emrine itiraz dilekçesi taslağı (7 gün içinde yapılmalıdır)",
        "alanlar": [
            {"ad": "borclunun_ad_soyad",    "etiket": "Borçlunun Adı Soyadı",         "zorunlu": True},
            {"ad": "borclunun_tc",          "etiket": "Borçlunun TC Kimlik No",        "zorunlu": True},
            {"ad": "borclunun_adres",       "etiket": "Borçlunun Adresi",              "zorunlu": True},
            {"ad": "icra_mudurluğu",        "etiket": "İcra Müdürlüğü (Adı / Şehri)", "zorunlu": True},
            {"ad": "dosya_no",              "etiket": "İcra Dosya Numarası",           "zorunlu": True},
            {"ad": "alacaklinin_ad_soyad",  "etiket": "Alacaklının Adı Soyadı",       "zorunlu": True},
            {"ad": "borcun_tutari",         "etiket": "Ödeme Emrindeki Borç Tutarı",  "zorunlu": True},
            {"ad": "itiraz_gerekce",        "etiket": "İtiraz Gerekçesi",              "zorunlu": True},
            {"ad": "tarih",                 "etiket": "Tarih (GG.AA.YYYY)",            "zorunlu": True},
        ],
    },
    "tuketici_sikayet_dilekce": {
        "id": "tuketici_sikayet_dilekce",
        "baslik": "Tüketici Şikayet Dilekçesi",
        "aciklama": "Tüketici hakem heyetine şikayet dilekçesi taslağı",
        "alanlar": [
            {"ad": "tuketici_ad_soyad",     "etiket": "Tüketici Adı Soyadı",          "zorunlu": True},
            {"ad": "tuketici_tc",           "etiket": "TC Kimlik No",                  "zorunlu": True},
            {"ad": "tuketici_adres",        "etiket": "Tüketici Adresi",               "zorunlu": True},
            {"ad": "satici_firma",          "etiket": "Satıcı / Sağlayıcı Firma Adı", "zorunlu": True},
            {"ad": "satici_adres",          "etiket": "Satıcı Adresi",                 "zorunlu": True},
            {"ad": "urun_hizmet",           "etiket": "Ürün / Hizmet Adı",             "zorunlu": True},
            {"ad": "satin_alma_tarihi",     "etiket": "Satın Alma Tarihi",             "zorunlu": True},
            {"ad": "satin_alma_bedeli",     "etiket": "Satın Alma Bedeli (TL)",        "zorunlu": True},
            {"ad": "sikayet_konusu",        "etiket": "Şikayet Konusu",                "zorunlu": True},
            {"ad": "talep",                 "etiket": "Talebiniz (iade / değişim vb.)", "zorunlu": True},
            {"ad": "tarih",                 "etiket": "Tarih (GG.AA.YYYY)",            "zorunlu": True},
        ],
    },
}


def zorunlu_alanlari_dogrula(template_id: str, alanlar: dict[str, str]) -> list[str]:
    """Eksik zorunlu alanları döndürür. Boş liste → hata yok."""
    taslak = TEMPLATES.get(template_id)
    if not taslak:
        return []
    return [
        a["etiket"]
        for a in taslak["alanlar"]
        if a["zorunlu"] and not alanlar.get(a["ad"], "").strip()
    ]


# ---------------------------------------------------------------------------
# Stil yardımcıları
# ---------------------------------------------------------------------------

def _baslik_stili() -> ParagraphStyle:
    return ParagraphStyle(
        "Baslik",
        fontName=_FONT_BOLD,
        fontSize=16,
        leading=20,
        spaceAfter=0.3 * cm,
        alignment=1,  # ortalı
    )


def _alt_baslik_stili() -> ParagraphStyle:
    return ParagraphStyle(
        "AltBaslik",
        fontName=_FONT_BOLD,
        fontSize=11,
        leading=14,
        spaceBefore=0.4 * cm,
        spaceAfter=0.2 * cm,
    )


def _normal_stili() -> ParagraphStyle:
    return ParagraphStyle(
        "Normal",
        fontName=_FONT,
        fontSize=10,
        leading=14,
        spaceAfter=0.15 * cm,
    )


def _uyari_stili() -> ParagraphStyle:
    return ParagraphStyle(
        "Uyari",
        fontName=_FONT,
        fontSize=6.5,
        leading=9,
        textColor=(0.72, 0.72, 0.72),
        spaceBefore=0.8 * cm,
    )


def _build_pdf(story: list) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )
    doc.build(story)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# PDF üreticiler
# ---------------------------------------------------------------------------

def _pdf_kira_sozlesmesi(a: dict[str, str]) -> bytes:
    depozito_satir = (
        f"Depozito tutarı <b>{a['depozito']} TL</b> olup sözleşme sonunda iade edilecektir."
        if a.get("depozito", "").strip()
        else "Depozito alınmamıştır."
    )
    story = [
        Paragraph("KİRA SÖZLEŞMESİ", _baslik_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph("TARAFLAR", _alt_baslik_stili()),
        Paragraph(f"<b>Kiraya Veren:</b> {a['mal_sahibi_ad_soyad']}", _normal_stili()),
        Paragraph(f"<b>Kiracı:</b> {a['kiraci_ad_soyad']}", _normal_stili()),
        Spacer(1, 0.2 * cm),
        Paragraph("MADDE 1 – KİRALANAN TAŞINMAZ", _alt_baslik_stili()),
        Paragraph(
            f"Kiralanan taşınmaz aşağıdaki adreste bulunmaktadır: <b>{a['adres']}</b>",
            _normal_stili(),
        ),
        Paragraph("MADDE 2 – KİRA SÜRESİ", _alt_baslik_stili()),
        Paragraph(
            f"İşbu sözleşme <b>{a['baslangic_tarihi']}</b> tarihinden itibaren "
            f"<b>{a['sure_ay']} ay</b> süreyle geçerlidir.",
            _normal_stili(),
        ),
        Paragraph("MADDE 3 – KİRA BEDELİ", _alt_baslik_stili()),
        Paragraph(
            f"Aylık kira bedeli <b>{a['kira_bedeli']} TL</b> olup her ayın birinci günü "
            "peşin olarak kiraya verene ödenecektir.",
            _normal_stili(),
        ),
        Paragraph("MADDE 4 – DEPOZİTO", _alt_baslik_stili()),
        Paragraph(depozito_satir, _normal_stili()),
        Paragraph("MADDE 5 – GENEL HÜKÜMLER", _alt_baslik_stili()),
        Paragraph(
            "Kiracı, kiralananı özenle kullanmak ve sözleşme bitiminde teslim aldığı gibi "
            "iade etmekle yükümlüdür. Bu sözleşmede hüküm bulunmayan hallerde 6098 Sayılı "
            "Türk Borçlar Kanunu'nun ilgili hükümleri uygulanır.",
            _normal_stili(),
        ),
        Spacer(1, 1 * cm),
        Paragraph(
            f"<b>Kiraya Veren:</b> {a['mal_sahibi_ad_soyad']} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
            f"<b>Kiracı:</b> {a['kiraci_ad_soyad']}",
            _normal_stili(),
        ),
        Spacer(1, 1.5 * cm),
        Paragraph("İmza: ______________________ &nbsp;&nbsp;&nbsp;&nbsp; İmza: ______________________", _normal_stili()),
        Paragraph(
            "⚠ Bu belge bilgi amaçlı taslak niteliğindedir. Hukuki geçerlilik için noter veya avukattan destek alınız.",
            _uyari_stili(),
        ),
    ]
    return _build_pdf(story)


def _pdf_is_sozlesmesi(a: dict[str, str]) -> bytes:
    calisma_satiri = (
        f"Haftalık çalışma süresi <b>{a['haftalik_calisma_saati']} saat</b>tir."
        if a.get("haftalik_calisma_saati", "").strip()
        else "Haftalık çalışma süresi yasal sınırlar dahilinde belirlenecektir."
    )
    story = [
        Paragraph("İŞ SÖZLEŞMESİ (BELİRSİZ SÜRELİ)", _baslik_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph("TARAFLAR", _alt_baslik_stili()),
        Paragraph(f"<b>İşveren:</b> {a['isveren_unvan']}", _normal_stili()),
        Paragraph(f"<b>İşçi:</b> {a['isci_ad_soyad']}", _normal_stili()),
        Paragraph("MADDE 1 – GÖREV VE UNVAN", _alt_baslik_stili()),
        Paragraph(
            f"İşçi, <b>{a['gorev']}</b> unvanıyla işverenin işyerinde görev yapacaktır.",
            _normal_stili(),
        ),
        Paragraph("MADDE 2 – BAŞLANGIÇ TARİHİ", _alt_baslik_stili()),
        Paragraph(
            f"İş sözleşmesi <b>{a['baslangic_tarihi']}</b> tarihinde yürürlüğe girer.",
            _normal_stili(),
        ),
        Paragraph("MADDE 3 – ÜCRET", _alt_baslik_stili()),
        Paragraph(
            f"İşçinin brüt aylık ücreti <b>{a['maas']} TL</b> olup her ayın sonunda banka "
            "hesabına yatırılır.",
            _normal_stili(),
        ),
        Paragraph("MADDE 4 – ÇALIŞMA SÜRESİ", _alt_baslik_stili()),
        Paragraph(calisma_satiri, _normal_stili()),
        Paragraph("MADDE 5 – GENEL HÜKÜMLER", _alt_baslik_stili()),
        Paragraph(
            "İşbu sözleşmede düzenlenmeyen hususlarda 4857 Sayılı İş Kanunu ve ilgili mevzuat "
            "hükümleri uygulanır. Taraflar, uyuşmazlıklarda öncelikle uzlaşma yolunu deneyecektir.",
            _normal_stili(),
        ),
        Spacer(1, 1 * cm),
        Paragraph(
            f"<b>İşveren:</b> {a['isveren_unvan']} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
            f"<b>İşçi:</b> {a['isci_ad_soyad']}",
            _normal_stili(),
        ),
        Spacer(1, 1.5 * cm),
        Paragraph("İmza: ______________________ &nbsp;&nbsp;&nbsp;&nbsp; İmza: ______________________", _normal_stili()),
        Paragraph(
            "⚠ Bu belge bilgi amaçlı taslak niteliğindedir. Hukuki geçerlilik için noter veya avukattan destek alınız.",
            _uyari_stili(),
        ),
    ]
    return _build_pdf(story)


def _pdf_ihtarname(a: dict[str, str]) -> bytes:
    story = [
        Paragraph("İHTARNAME", _baslik_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph("GÖNDEREN", _alt_baslik_stili()),
        Paragraph(f"<b>Ad Soyad:</b> {a['gonderen_ad_soyad']}", _normal_stili()),
        Paragraph(f"<b>Adres:</b> {a['gonderen_adres']}", _normal_stili()),
        Paragraph("ALICI", _alt_baslik_stili()),
        Paragraph(f"<b>Ad Soyad:</b> {a['alici_ad_soyad']}", _normal_stili()),
        Paragraph(f"<b>Adres:</b> {a['alici_adres']}", _normal_stili()),
        Paragraph(f"<b>KONU:</b> {a['konu']}", _alt_baslik_stili()),
        Paragraph("AÇIKLAMALAR", _alt_baslik_stili()),
        Paragraph(a["ihtar_metni"], _normal_stili()),
        Spacer(1, 0.5 * cm),
        Paragraph(
            "Yukarıda belirtilen hususların tarafınızca yerine getirilmesini, aksi takdirde "
            "yasal haklarımızı kullanmakta tereddüt etmeyeceğimizi ihtar ederiz.",
            _normal_stili(),
        ),
        Spacer(1, 0.8 * cm),
        Paragraph(f"Tarih: {a['tarih']}", _normal_stili()),
        Spacer(1, 1.2 * cm),
        Paragraph(f"{a['gonderen_ad_soyad']}", _normal_stili()),
        Paragraph("İmza: ______________________", _normal_stili()),
        Paragraph(
            "⚠ Bu belge bilgi amaçlı taslak niteliğindedir. Resmi ihtarname için noter kanalıyla gönderilmesi önerilir.",
            _uyari_stili(),
        ),
    ]
    return _build_pdf(story)


def _pdf_taahhutname(a: dict[str, str]) -> bytes:
    story = [
        Paragraph("TAAHHÜTNAME", _baslik_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph("TAAHHÜT EDEN", _alt_baslik_stili()),
        Paragraph(f"<b>Ad Soyad:</b> {a['taahut_eden_ad_soyad']}", _normal_stili()),
        Paragraph(f"<b>TC Kimlik No:</b> {a['taahut_eden_tc']}", _normal_stili()),
        Paragraph(f"<b>Adres:</b> {a['taahut_eden_adres']}", _normal_stili()),
        Paragraph("TAAHHÜT KONUSU", _alt_baslik_stili()),
        Paragraph(a["taahut_konusu"], _normal_stili()),
        Spacer(1, 0.5 * cm),
        Paragraph(
            "Yukarıda belirtilen hususları eksiksiz yerine getireceğimi, aksi hâlde doğacak "
            "her türlü hukuki ve mali sorumlulukları kabul ettiğimi taahhüt ederim.",
            _normal_stili(),
        ),
        Spacer(1, 0.8 * cm),
        Paragraph(f"Tarih: {a['tarih']}", _normal_stili()),
        Spacer(1, 1.2 * cm),
        Paragraph(f"{a['taahut_eden_ad_soyad']}", _normal_stili()),
        Paragraph("İmza: ______________________", _normal_stili()),
        Paragraph(
            "⚠ Bu belge bilgi amaçlı taslak niteliğindedir. Hukuki geçerlilik için noter veya avukattan destek alınız.",
            _uyari_stili(),
        ),
    ]
    return _build_pdf(story)


def _pdf_vekaletname(a: dict[str, str]) -> bytes:
    story = [
        Paragraph("VEKÂLETNAMİ", _baslik_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph("VEKİL VEREN", _alt_baslik_stili()),
        Paragraph(f"<b>Ad Soyad:</b> {a['vekil_veren_ad_soyad']}", _normal_stili()),
        Paragraph(f"<b>TC Kimlik No:</b> {a['vekil_veren_tc']}", _normal_stili()),
        Paragraph(f"<b>Adres:</b> {a['vekil_veren_adres']}", _normal_stili()),
        Paragraph("VEKİL", _alt_baslik_stili()),
        Paragraph(f"<b>Ad Soyad:</b> {a['vekil_ad_soyad']}", _normal_stili()),
        Paragraph(f"<b>TC Kimlik No:</b> {a['vekil_tc']}", _normal_stili()),
        Paragraph(f"<b>Adres:</b> {a['vekil_adres']}", _normal_stili()),
        Paragraph("YETKİ KAPSAMI", _alt_baslik_stili()),
        Paragraph(a["yetki_konusu"], _normal_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph(
            "Yukarıda belirtilen konularda vekil tayin ettiğimi, vekilimin bu kapsamda "
            "yapacağı tüm işlemleri kabul ve teyit ettiğimi beyan ederim.",
            _normal_stili(),
        ),
        Spacer(1, 0.8 * cm),
        Paragraph(f"Tarih: {a['tarih']}", _normal_stili()),
        Spacer(1, 1.2 * cm),
        Paragraph(f"Vekil Veren: {a['vekil_veren_ad_soyad']}", _normal_stili()),
        Paragraph("İmza: ______________________", _normal_stili()),
        Paragraph(
            "⚠ Bu belge taslak niteliğindedir. Vekaletname hukuki geçerlilik kazanması için noter onayı gerektirir.",
            _uyari_stili(),
        ),
    ]
    return _build_pdf(story)


def _pdf_bosanma_dilekce(a: dict[str, str]) -> bytes:
    cocuk_satiri = (
        f"Tarafların müşterek çocuğu/çocukları: {a['cocuk_bilgisi']}"
        if a.get("cocuk_bilgisi", "").strip()
        else "Tarafların müşterek çocuğu bulunmamaktadır."
    )
    nafaka_satiri = (
        f"Nafaka talebi: {a['nafaka_talebi']}"
        if a.get("nafaka_talebi", "").strip()
        else "Nafaka talebim bulunmamaktadır."
    )
    story = [
        Paragraph(f"{a['mahkeme'].upper()}", _baslik_stili()),
        Spacer(1, 0.2 * cm),
        Paragraph("BOŞANMA DAVASI DİLEKÇESİ", _baslik_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph("DAVACI", _alt_baslik_stili()),
        Paragraph(f"{a['davaci_ad_soyad']} — TC: {a['davaci_tc']}", _normal_stili()),
        Paragraph(f"Adres: {a['davaci_adres']}", _normal_stili()),
        Paragraph("DAVALI", _alt_baslik_stili()),
        Paragraph(f"{a['davali_ad_soyad']}", _normal_stili()),
        Paragraph(f"Adres: {a['davali_adres']}", _normal_stili()),
        Paragraph("KONU", _alt_baslik_stili()),
        Paragraph("Anlaşmalı boşanma talebimizden ibarettir.", _normal_stili()),
        Paragraph("AÇIKLAMALAR", _alt_baslik_stili()),
        Paragraph(
            f"Taraflar, {a['evlilik_tarihi']} tarihinde evlenmiş olup evlilik birliği "
            "sarsılmış ve ortak hayatın devamı taraflarca mümkün görülmemektedir.",
            _normal_stili(),
        ),
        Paragraph(cocuk_satiri, _normal_stili()),
        Paragraph(nafaka_satiri, _normal_stili()),
        Paragraph("TALEP", _alt_baslik_stili()),
        Paragraph(
            "4721 Sayılı Türk Medeni Kanunu'nun 166/3. maddesi uyarınca anlaşmalı "
            "boşanmamıza karar verilmesini saygıyla arz ederim.",
            _normal_stili(),
        ),
        Spacer(1, 0.8 * cm),
        Paragraph(f"Tarih: {a['tarih']}", _normal_stili()),
        Spacer(1, 1.2 * cm),
        Paragraph(f"Davacı: {a['davaci_ad_soyad']}", _normal_stili()),
        Paragraph("İmza: ______________________", _normal_stili()),
        Paragraph(
            "⚠ Bu belge taslak niteliğindedir. Boşanma davası için avukat desteği önerilir; "
            "anlaşmalı boşanmada protokol ayrıca hazırlanmalıdır.",
            _uyari_stili(),
        ),
    ]
    return _build_pdf(story)


def _pdf_icra_itiraz_dilekce(a: dict[str, str]) -> bytes:
    story = [
        Paragraph(f"{a['icra_mudurluğu'].upper()} İCRA MÜDÜRLÜĞÜ'NE", _baslik_stili()),
        Spacer(1, 0.3 * cm),
        Paragraph("ÖDEME EMRİNE İTİRAZ DİLEKÇESİ", _baslik_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph(f"<b>Dosya No:</b> {a['dosya_no']}", _normal_stili()),
        Paragraph("BORÇLU (İTİRAZ EDEN)", _alt_baslik_stili()),
        Paragraph(f"<b>Ad Soyad:</b> {a['borclunun_ad_soyad']}", _normal_stili()),
        Paragraph(f"<b>TC Kimlik No:</b> {a['borclunun_tc']}", _normal_stili()),
        Paragraph(f"<b>Adres:</b> {a['borclunun_adres']}", _normal_stili()),
        Paragraph("ALACAKLI", _alt_baslik_stili()),
        Paragraph(f"{a['alacaklinin_ad_soyad']}", _normal_stili()),
        Paragraph("İTİRAZ KONUSU VE GEREKÇESİ", _alt_baslik_stili()),
        Paragraph(
            f"Tarafınızdan tebliğ edilen, {a['alacaklinin_ad_soyad']} alacaklısına ait "
            f"{a['borcun_tutari']} TL tutarlı ödeme emrine itiraz etmekteyim.",
            _normal_stili(),
        ),
        Paragraph(f"<b>Gerekçe:</b> {a['itiraz_gerekce']}", _normal_stili()),
        Paragraph("TALEP", _alt_baslik_stili()),
        Paragraph(
            "2004 Sayılı İcra ve İflas Kanunu'nun 62. maddesi uyarınca, tebliğden "
            "itibaren 7 günlük süre içinde ödeme emrine itiraz ediyorum. "
            "İtirazımın kabulüne ve takibin durdurulmasına karar verilmesini arz ederim.",
            _normal_stili(),
        ),
        Spacer(1, 0.8 * cm),
        Paragraph(f"Tarih: {a['tarih']}", _normal_stili()),
        Spacer(1, 1.2 * cm),
        Paragraph(f"Borçlu: {a['borclunun_ad_soyad']}", _normal_stili()),
        Paragraph("İmza: ______________________", _normal_stili()),
        Paragraph(
            "⚠ Bu belge taslak niteliğindedir. İtiraz dilekçesi tebliğden itibaren 7 gün içinde "
            "icra müdürlüğüne şahsen veya posta yoluyla ulaştırılmalıdır.",
            _uyari_stili(),
        ),
    ]
    return _build_pdf(story)


def _pdf_tuketici_sikayet_dilekce(a: dict[str, str]) -> bytes:
    story = [
        Paragraph("TÜKETİCİ HAKEM HEYETİ BAŞKANLIĞI'NA", _baslik_stili()),
        Spacer(1, 0.3 * cm),
        Paragraph("TÜKETİCİ ŞİKAYET DİLEKÇESİ", _baslik_stili()),
        Spacer(1, 0.4 * cm),
        Paragraph("ŞİKAYETÇİ (TÜKETİCİ)", _alt_baslik_stili()),
        Paragraph(f"<b>Ad Soyad:</b> {a['tuketici_ad_soyad']}", _normal_stili()),
        Paragraph(f"<b>TC Kimlik No:</b> {a['tuketici_tc']}", _normal_stili()),
        Paragraph(f"<b>Adres:</b> {a['tuketici_adres']}", _normal_stili()),
        Paragraph("ŞİKAYET EDİLEN (SATICI / SAĞLAYICI)", _alt_baslik_stili()),
        Paragraph(f"<b>Firma:</b> {a['satici_firma']}", _normal_stili()),
        Paragraph(f"<b>Adres:</b> {a['satici_adres']}", _normal_stili()),
        Paragraph("ŞİKAYET KONUSU", _alt_baslik_stili()),
        Paragraph(
            f"{a['satin_alma_tarihi']} tarihinde {a['satici_firma']} firmasından "
            f"<b>{a['urun_hizmet']}</b> adlı ürün/hizmet için <b>{a['satin_alma_bedeli']} TL</b> "
            "ödeme yapılmıştır.",
            _normal_stili(),
        ),
        Paragraph(f"<b>Sorun:</b> {a['sikayet_konusu']}", _normal_stili()),
        Paragraph("TALEP", _alt_baslik_stili()),
        Paragraph(
            f"6502 Sayılı Tüketicinin Korunması Hakkında Kanun kapsamındaki haklarım "
            f"çerçevesinde talebim: {a['talep']}",
            _normal_stili(),
        ),
        Spacer(1, 0.4 * cm),
        Paragraph(
            "Gereğini saygıyla arz ederim.",
            _normal_stili(),
        ),
        Spacer(1, 0.8 * cm),
        Paragraph(f"Tarih: {a['tarih']}", _normal_stili()),
        Spacer(1, 1.2 * cm),
        Paragraph(f"Şikayetçi: {a['tuketici_ad_soyad']}", _normal_stili()),
        Paragraph("İmza: ______________________", _normal_stili()),
        Paragraph(
            "⚠ Bu belge taslak niteliğindedir. Dilekçeyi ikamet ettiğiniz yerdeki "
            "Tüketici Hakem Heyeti'ne şahsen veya e-Devlet üzerinden iletebilirsiniz.",
            _uyari_stili(),
        ),
    ]
    return _build_pdf(story)


_PDF_URETICI = {
    "kira_sozlesmesi":          _pdf_kira_sozlesmesi,
    "is_sozlesmesi":            _pdf_is_sozlesmesi,
    "ihtarname":                _pdf_ihtarname,
    "taahhutname":              _pdf_taahhutname,
    "vekaletname":              _pdf_vekaletname,
    "bosanma_dilekce":          _pdf_bosanma_dilekce,
    "icra_itiraz_dilekce":      _pdf_icra_itiraz_dilekce,
    "tuketici_sikayet_dilekce": _pdf_tuketici_sikayet_dilekce,
}


_MAX_ALAN_UZUNLUK = 500
_GUVENLI_OLMAYAN = str.maketrans({"<": "&lt;", ">": "&gt;", "&": "&amp;"})


def _sanitize_alanlar(alanlar: dict[str, str]) -> dict[str, str]:
    """Alan değerlerini ReportLab injection ve aşırı uzunluğa karşı temizler."""
    temiz: dict[str, str] = {}
    for anahtar, deger in alanlar.items():
        if not isinstance(deger, str):
            deger = str(deger) if deger is not None else ""
        deger = deger.strip()
        deger = deger[:_MAX_ALAN_UZUNLUK]
        deger = deger.translate(_GUVENLI_OLMAYAN)
        temiz[anahtar] = deger
    return temiz


def pdf_uret(template_id: str, alanlar: dict[str, str]) -> bytes:
    """Verilen taslak için PDF baytları üretir."""
    uretici = _PDF_URETICI.get(template_id)
    if not uretici:
        raise ValueError(f"Bilinmeyen taslak: {template_id}")
    return uretici(_sanitize_alanlar(alanlar))
