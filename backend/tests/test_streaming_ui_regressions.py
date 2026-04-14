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
