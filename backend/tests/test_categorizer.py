"""
test_categorizer.py — keyword tabanlı kategori sınıflandırma regresyon testleri.

Faz 2 sonrası kategori doğruluğunu garanti altına alır.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from rag.categorizer import SoruKategorilendiricisi


@pytest.fixture(scope="module")
def kategorilendirici():
    return SoruKategorilendiricisi()


# ---------------------------------------------------------------------------
# Taşınmaz Mülk (06)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "soru",
    [
        "Kiracı tahliyesi hangi durumlarda mümkündür?",
        "Kira artış oranı nasıl belirlenir?",
        "İpotek nedir ve nasıl kaldırılır?",
        "Komşuluk hukukundan doğan haklar nelerdir?",
        "Haksız işgal (ecrimisil) nedir ve nasıl talep edilir?",
        "Ortak mülkiyet (paylı mülkiyet) nedir ve nasıl sona erdirilir?",
        "Arsa payı karşılığı inşaat sözleşmesi nedir?",
        "Tapu iptal ve tescil davası hangi durumlarda açılır?",
    ],
)
def test_tasinmaz_mulk(kategorilendirici, soru):
    assert kategorilendirici.kategorile(soru) == "Taşınmaz Mülk"


# ---------------------------------------------------------------------------
# İdare Hukuku (07)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "soru",
    [
        "İptal davası ile tam yargı davası arasındaki fark nedir?",
        "İdari sözleşme nedir ve özel hukuk sözleşmesinden farkı nedir?",
        "İdari para cezalarına nasıl itiraz edilir?",
    ],
)
def test_idare_hukuku(kategorilendirici, soru):
    assert kategorilendirici.kategorile(soru) == "İdare Hukuku"


# ---------------------------------------------------------------------------
# Fikri Mülkiyet (10)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "soru",
    [
        "Geliştirdiğim buluş için patent aldım, bu beni rakip şirketlere karşı nasıl korur?",
        "Peynirlerimiz coğrafi işaretle korunuyor, başkası aynı adı kullanabilir mi?",
        "Yazılımımın kaynak kodunu kopyalayan kişiye dava açabilir miyim?",
        "Bir yayınevine eserimi verdim, sözleşme sona erdi ama yayımlamaya devam ediyorlar.",
        "İnternet sitesinde kullandığım logo başkasına ait marka çıktı.",
        "Lisans sözleşmesiyle kullanım hakkı verdim ama karşı taraf anlaşmaya aykırı davranıyor.",
    ],
)
def test_fikri_mulkiyet(kategorilendirici, soru):
    assert kategorilendirici.kategorile(soru) == "Fikri Mülkiyet"


# ---------------------------------------------------------------------------
# Bilişim Hukuku (11)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "soru",
    [
        "Kişisel verilerimin bir şirket tarafından izinsiz kullanıldığını öğrendim.",
        "Banka hesabım hacklendi ve param çalındı.",
        "E-ticaret sitesi kuruyorum, hangi yasal zorunluluklara uymam gerekiyor?",
        "Kişisel verilerimin silinmesini talep ettim ama şirket yanıt vermiyor.",
        "İnternet ortamında hakarete uğradım.",
    ],
)
def test_bilisim_hukuku(kategorilendirici, soru):
    assert kategorilendirici.kategorile(soru) == "Bilişim Hukuku"


# ---------------------------------------------------------------------------
# Anayasa Hukuku (12)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "soru",
    [
        "Gözaltına alındıktan sonra ne kadar süre içinde hakim karşısına çıkarılmam gerekiyor?",
        "Evim arandı ama arama kararı yoktu, bu hukuka aykırı mı?",
        "Dernek kurmak istiyorum, kuruluş için hangi belgeler gerekiyor?",
        "Gazeteci olarak kaynaklarımı açıklamak zorunda mıyım?",
        "Kamu görevinden ihraç edildim, olağanüstü hal KHK'sıyla, itiraz yolum nedir?",
        "Anayasa Mahkemesi'ne bireysel başvuru yapabilmek için hangi şartları taşımalıyım?",
    ],
)
def test_anayasa_hukuku(kategorilendirici, soru):
    assert kategorilendirici.kategorile(soru) == "Anayasa Hukuku"


# ---------------------------------------------------------------------------
# Regresyon: mevcut doğru atamalar bozulmamalı
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "soru, beklenen",
    [
        ("İşten çıkarıldım, kıdem tazminatı alabilir miyim?", "İş Hukuku"),
        ("Yıllık izin hakkım ne kadardır?", "İş Hukuku"),
        ("Doğum iznim ne kadar sürer?", "İş Hukuku"),
        ("Boşanma davası açmak istiyorum.", "Medeni Hukuk"),
        ("Miras paylaşımı nasıl yapılır?", "Medeni Hukuk"),
        ("Vakıf kurmak için ne gerekir?", "Medeni Hukuk"),
        ("Hakaret suçunun cezası nedir?", "Ceza Hukuku"),
        ("Limited şirket kurmak istiyorum.", "Ticaret Hukuku"),
        ("Aldığım ürün ayıplı çıktı, iade edebilir miyim?", "Tuketici Hukuku"),
        ("Vergi incelemesi hangi durumlarda yapılır?", "Vergi Hukuku"),
        ("SGK emeklilik primi kaç gün?", "Sosyal Guvenlik Hukuku"),
        ("Arabuluculuk zorunlu mudur?", "Usul Hukuku"),
        ("Trafik cezası nasıl itiraz edilir?", "Genel Hukuk"),
    ],
)
def test_regresyon_mevcut_dogrular(kategorilendirici, soru, beklenen):
    assert kategorilendirici.kategorile(soru) == beklenen
