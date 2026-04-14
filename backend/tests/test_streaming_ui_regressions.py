from rag import retriever
from rag import pipeline


def test_normalize_relevance_score_clamps_values_into_unit_interval():
    assert retriever.normalize_relevance_score(0.82) == 0.82
    assert retriever.normalize_relevance_score(1.73) == 1.0
    assert retriever.normalize_relevance_score(-2.0) == 0.0


def test_format_sources_uses_normalized_scores_for_api_payloads():
    kaynaklar = pipeline._format_sources(
        [
            {
                "payload": {
                    "chunk_id": "kanun_4857_madde17",
                    "kaynak_turu": "kanun",
                    "kanun_adi": "4857 Sayılı İş Kanunu",
                    "madde_no": "Madde 17",
                    "metin": "Bildirim süresi düzenlemesi.",
                },
                "skor": 1.73,
            }
        ]
    )

    assert kaynaklar[0]["skor"] == 1.0


def test_format_sources_batch_normalization_preserves_relative_order():
    """Scores inflated above 1.0 (local scoring + merge) should be rescaled
    relative to batch max so all values land in [0, 1] and ordering is kept."""
    chunks = [
        {
            "payload": {
                "chunk_id": "kanun_5237_m125",
                "kaynak_turu": "kanun",
                "kanun_adi": "5237 Sayılı Türk Ceza Kanunu",
                "madde_no": "Madde 125",
                "metin": "Hakaret.",
            },
            "skor": 1.4,
        },
        {
            "payload": {
                "chunk_id": "kanun_5237_m51",
                "kaynak_turu": "kanun",
                "kanun_adi": "5237 Sayılı Türk Ceza Kanunu",
                "madde_no": "Madde 51",
                "metin": "Erteleme.",
            },
            "skor": 1.05,
        },
        {
            "payload": {
                "chunk_id": "kanun_2709_m19",
                "kaynak_turu": "kanun",
                "kanun_adi": "2709 Sayılı Türkiye Cumhuriyeti Anayasası",
                "madde_no": "Madde 19",
                "metin": "Kişi özgürlüğü.",
            },
            "skor": 0.35,
        },
    ]
    kaynaklar = pipeline._format_sources(chunks)

    scores = [k["skor"] for k in kaynaklar]
    # En yüksek ham skor (1.4) → 1.0
    assert scores[0] == 1.0
    # Tüm skorlar [0, 1] aralığında
    assert all(0.0 <= s <= 1.0 for s in scores)
    # Göreli sıralama korunmuş
    assert scores[0] > scores[1] > scores[2]


# ---------------------------------------------------------------------------
# Generator sistem prompt — kaynak yoksa madde numarası üretme kuralı
# ---------------------------------------------------------------------------

from rag.generator import GENERAL_SYSTEM_PROMPT_TR, GENERAL_SYSTEM_PROMPT_EN


def test_tr_prompt_kaynak_yoksa_madde_yazma_kurali():
    """TR prompt, kaynaklarda geçmeyen madde numarası yazmayı yasaklamalı."""
    assert "kaynaklarda gecmeyen hicbir madde numarasi yazma" in GENERAL_SYSTEM_PROMPT_TR.lower() or \
           "kaynaklarda gecmeyen" in GENERAL_SYSTEM_PROMPT_TR.lower()


def test_tr_prompt_kaynak_yoksa_ceza_siniri_yazma_kurali():
    """TR prompt, kaynaklarda geçmeyen ceza sınırı yazmayı yasaklamalı."""
    assert "ceza siniri" in GENERAL_SYSTEM_PROMPT_TR.lower() or \
           "ay, yil" in GENERAL_SYSTEM_PROMPT_TR.lower() or \
           "tl tutari" in GENERAL_SYSTEM_PROMPT_TR.lower()


def test_tr_prompt_kaynak_karsilamiyor_formati():
    """TR prompt, kaynak yetersizliği için yönlendirme formatı içermeli."""
    assert "karsilamiyor" in GENERAL_SYSTEM_PROMPT_TR.lower()


def test_en_prompt_no_article_number_rule():
    """EN prompt must also prohibit article numbers not found in sources."""
    prompt_lower = GENERAL_SYSTEM_PROMPT_EN.lower()
    assert "article number" in prompt_lower or "article numbers" in prompt_lower
