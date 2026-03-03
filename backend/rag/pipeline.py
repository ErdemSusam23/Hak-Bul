from rag.query_rewriter import rewrite_query
from rag.retriever import retrieve_chunks, filter_by_score
from rag.generator import generate_answer
from schemas import AskResponse, KaynakItem


def _build_baslik(p: dict) -> str:
    """Kaynak türüne göre madde/karar numarasını içeren başlık üretir."""
    if p.get("kaynak_turu") == "kanun":
        kanun_adi = p.get("kanun_adi", "Kanun")
        madde_no = p.get("madde_no", "")
        return f"{kanun_adi} — {madde_no}" if madde_no else kanun_adi
    elif p.get("kaynak_turu") == "yargitay_karari":
        daire = p.get("daire", "")
        karar_no = p.get("karar_no", "Karar")
        return f"Yargıtay {daire} — {karar_no}" if daire else karar_no
    return p.get("kanun_adi", p.get("karar_no", "Kaynak"))


def run_pipeline(soru: str, max_kaynak: int = 5) -> AskResponse:
    rewritten = rewrite_query(soru)
    chunks = retrieve_chunks(rewritten, top_n=max_kaynak)
    chunks = filter_by_score(chunks)

    # rewritten_query'yi generator'a da ilet
    yanit = generate_answer(soru, chunks, rewritten_query=rewritten)

    kaynaklar = []
    for c in chunks:
        p = c["payload"]
        kaynaklar.append(
            KaynakItem(
                kaynak_turu=p["kaynak_turu"],
                baslik=_build_baslik(p),        # madde_no artık başlıkta
                metin_ozet=p["metin"][:200],
                skor=c["skor"],
            )
        )

    return AskResponse(yanit=yanit, kaynaklar=kaynaklar)