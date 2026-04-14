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
