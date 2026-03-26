"""Hukuki belge taslakları endpoint testleri."""
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

ZORUNLU_ALANLAR = {
    "kira_sozlesmesi": {
        "kiraci_ad_soyad":     "Ali Yılmaz",
        "mal_sahibi_ad_soyad": "Ayşe Kaya",
        "adres":               "Atatürk Cad. No:5 Kadıköy/İstanbul",
        "kira_bedeli":         "8000",
        "baslangic_tarihi":    "01.04.2026",
        "sure_ay":             "12",
    },
    "is_sozlesmesi": {
        "isci_ad_soyad":   "Mehmet Demir",
        "isveren_unvan":   "ABC Teknoloji A.Ş.",
        "gorev":           "Yazılım Geliştirici",
        "maas":            "45000",
        "baslangic_tarihi": "01.04.2026",
    },
    "ihtarname": {
        "gonderen_ad_soyad": "Fatma Çelik",
        "gonderen_adres":    "Bağcılar Mah. No:3 Bursa",
        "alici_ad_soyad":    "Hasan Arslan",
        "alici_adres":       "Merkez Mah. No:7 Ankara",
        "konu":              "Kira Borcunun Ödenmesi",
        "ihtar_metni":       "Kira borcunuzun 7 gün içinde ödenmesini talep ederiz.",
        "tarih":             "17.03.2026",
    },
    "taahhutname": {
        "taahut_eden_ad_soyad": "Can Öztürk",
        "taahut_eden_tc":       "12345678901",
        "taahut_eden_adres":    "Kızılay Mah. No:2 Ankara",
        "taahut_konusu":        "Söz konusu aracı belirlenen tarihte teslim edeceğimi taahhüt ederim.",
        "tarih":                "17.03.2026",
    },
}


def test_taslak_listesi_mevcut_taslaklari_dondurur():
    r = client.get("/templates")
    assert r.status_code == 200
    data = r.json()
    assert len(data["taslaklar"]) == 8
    ids = {t["id"] for t in data["taslaklar"]}
    assert ids == {
        "kira_sozlesmesi",
        "is_sozlesmesi",
        "ihtarname",
        "taahhutname",
        "vekaletname",
        "bosanma_dilekce",
        "icra_itiraz_dilekce",
        "tuketici_sikayet_dilekce",
    }


def test_taslak_listesi_alanlar_iceriyor():
    r = client.get("/templates")
    for taslak in r.json()["taslaklar"]:
        assert len(taslak["alanlar"]) > 0
        for alan in taslak["alanlar"]:
            assert "ad" in alan
            assert "zorunlu" in alan


def test_taslak_listesi_english_localization_supports_labels():
    r = client.get("/templates", params={"language": "en"})
    assert r.status_code == 200
    kira = next(t for t in r.json()["taslaklar"] if t["id"] == "kira_sozlesmesi")
    assert kira["baslik"] == "Lease Agreement"
    assert kira["alanlar"][0]["etiket"] == "Tenant Full Name"


@pytest.mark.parametrize("template_id", list(ZORUNLU_ALANLAR.keys()))
def test_pdf_uretimi_basarili(template_id):
    r = client.post(
        f"/templates/{template_id}/generate",
        json={"alanlar": ZORUNLU_ALANLAR[template_id]},
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"


def test_bilinmeyen_taslak_404():
    r = client.post("/templates/yok/generate", json={"alanlar": {}})
    assert r.status_code == 404


def test_zorunlu_alan_eksik_422():
    r = client.post(
        "/templates/kira_sozlesmesi/generate",
        json={"alanlar": {"kiraci_ad_soyad": "Ali"}},  # diğerleri eksik
    )
    assert r.status_code == 422


def test_opsiyonel_alan_olmadan_pdf_uretilir():
    """Depozito zorunlu değil — olmadan da PDF üretilmeli."""
    r = client.post(
        "/templates/kira_sozlesmesi/generate",
        json={"alanlar": ZORUNLU_ALANLAR["kira_sozlesmesi"]},
    )
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"


def test_opsiyonel_alan_ile_pdf_uretilir():
    alanlar = {**ZORUNLU_ALANLAR["kira_sozlesmesi"], "depozito": "16000"}
    r = client.post(
        "/templates/kira_sozlesmesi/generate",
        json={"alanlar": alanlar},
    )
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"
