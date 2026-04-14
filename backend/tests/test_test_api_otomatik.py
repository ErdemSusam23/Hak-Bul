import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import test_api_otomatik as otomatik


def test_normalize_category_name_maps_diger_to_genel_hukuk():
    assert otomatik.normalize_category_name("Diğer") == "Genel Hukuk"
    assert otomatik.normalize_category_name("Diger") == "Genel Hukuk"
    assert otomatik.normalize_category_name("Genel Hukuk") == "Genel Hukuk"


def test_categories_match_accepts_aliases():
    assert otomatik.categories_match("Diğer", "Genel Hukuk") is True
    assert otomatik.categories_match("Genel Hukuk", "Diğer") is True
    assert otomatik.categories_match("Genel Hukuk", "İdare Hukuku") is False


def test_slugify_category_name_uses_genel_hukuk_for_diger():
    assert otomatik.slugify_category_name("Diğer") == "genel_hukuk"
    assert otomatik.slugify_category_name("Genel Hukuk") == "genel_hukuk"


def test_cikti_yolu_belirle_uses_renamed_numarali_folder():
    sorular = {"Genel Hukuk": ["Soru?"]}

    cikti = otomatik.cikti_yolu_belirle(
        sorular=sorular,
        sorular_yolu=str(Path("backend/test_sorular/14_genel_hukuk/sorular.json")),
    )

    assert "14_genel_hukuk" in cikti


def test_cikti_yolu_belirle_falls_back_to_genel_hukuk_slug_for_single_category():
    sorular = {"Diğer": ["Soru?"]}

    cikti = otomatik.cikti_yolu_belirle(sorular=sorular)

    assert "genel_hukuk" in cikti


def test_sorulari_yuk_normalizes_diger_key(tmp_path):
    soru_dosyasi = tmp_path / "sorular.json"
    soru_dosyasi.write_text('{"Diğer": ["Soru?"]}', encoding="utf-8")

    sorular = otomatik.sorulari_yuk(str(soru_dosyasi))

    assert sorular == {"Genel Hukuk": ["Soru?"]}
