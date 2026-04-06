import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rag import retriever
from rag.query_rewriter import rewrite_query

_original_platform = sys.platform
sys.platform = "linux"
from scrape_kanunlar import maddelere_bol
sys.platform = _original_platform


class _DummyEmbedding(list):
    def tolist(self):
        return list(self)


class _DummyModel:
    def encode(self, _text):
        return _DummyEmbedding([0.0, 0.0, 0.0])


def test_rewrite_query_preserves_explicit_legal_reference():
    soru = "193 sayılı gelir vergisi kanunu madde 94 stopaj"
    assert rewrite_query(soru) == soru


def test_retrieve_chunks_prioritizes_exact_law_match_over_qdrant_noise(monkeypatch):
    monkeypatch.setattr(retriever.settings, "EMBEDDING_MODE", "local", raising=False)
    monkeypatch.setattr(retriever.settings, "ALLOW_LOCAL_RETRIEVAL_FALLBACK", True)
    monkeypatch.setattr(retriever, "_get_model", lambda: _DummyModel())
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: True)
    monkeypatch.setattr(
        retriever,
        "_retrieve_local",
        lambda query, top_n, kaynak_turu=None: [
            {
                "payload": {
                    "chunk_id": "kanun_193_madde94",
                    "kaynak_turu": "kanun",
                    "kanun_adi": "193 Sayılı Gelir Vergisi Kanunu",
                    "madde_no": "Madde 94",
                    "metin": "Stopaj düzenlemesi.",
                },
                "skor": 1.0,
            }
        ],
    )
    monkeypatch.setattr(
        retriever,
        "_query_qdrant",
        lambda embedding, top_n, kaynak_turu=None: [
            SimpleNamespace(
                payload={
                    "chunk_id": "kanun_6098_madde94",
                    "kaynak_turu": "kanun",
                    "kanun_adi": "6098 Sayılı Türk Borçlar Kanunu",
                    "madde_no": "Madde 94",
                    "metin": "Borç, alışılmış iş saatlerinde ifa ve kabul edilir.",
                },
                score=0.91,
            ),
            SimpleNamespace(
                payload={
                    "chunk_id": "kanun_657_madde97",
                    "kaynak_turu": "kanun",
                    "kanun_adi": "657 Sayılı Devlet Memurları Kanunu",
                    "madde_no": "Madde 97",
                    "metin": "94 üncü maddenin ikinci fıkrasına uygun olarak...",
                },
                score=0.89,
            ),
        ],
    )

    results = retriever.retrieve_chunks("madde 94 stopaj", top_n=5, kaynak_turu="kanun")

    assert results
    assert results[0]["payload"]["chunk_id"] == "kanun_193_madde94"


def test_maddelere_bol_splits_temporary_and_additional_articles():
    metin = "\n".join(
        [
            "Madde 124 - Asıl madde metni yeterince uzun bir içerik taşıyor.",
            "Geçici Madde 1 - Geçici hüküm de yeterince uzun bir içerik taşıyor.",
            "Ek Madde 2 - Ek hüküm de yeterince uzun bir içerik taşıyor.",
            "Mükerrer Madde 3 - Mükerrer hüküm de yeterince uzun bir içerik taşıyor.",
        ]
    )

    parcalar = maddelere_bol(metin)
    basliklar = [baslik for baslik, _ in parcalar]

    assert basliklar == [
        "Madde 124",
        "Geçici Madde 1",
        "Ek Madde 2",
        "Mükerrer Madde 3",
    ]
