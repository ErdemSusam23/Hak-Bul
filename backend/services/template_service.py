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
        fontSize=8,
        leading=11,
        textColor=(0.4, 0.4, 0.4),
        spaceBefore=0.5 * cm,
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


_PDF_URETICI = {
    "kira_sozlesmesi": _pdf_kira_sozlesmesi,
    "is_sozlesmesi":   _pdf_is_sozlesmesi,
    "ihtarname":       _pdf_ihtarname,
    "taahhutname":     _pdf_taahhutname,
}


def pdf_uret(template_id: str, alanlar: dict[str, str]) -> bytes:
    """Verilen taslak için PDF baytları üretir."""
    uretici = _PDF_URETICI.get(template_id)
    if not uretici:
        raise ValueError(f"Bilinmeyen taslak: {template_id}")
    return uretici(alanlar)
