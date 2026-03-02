from rag.query_rewriter import rewrite_query
from rag.retriever import retrieve_chunks, filter_by_score
from rag.generator import generate_answer
from schemas import AskResponse, KaynakItem


def run_pipeline(soru: str, max_kaynak: int = 5) -> AskResponse:
    rewritten = rewrite_query(soru)
    chunks = retrieve_chunks(rewritten, top_n=max_kaynak)
    chunks = filter_by_score(chunks)
    yanit = generate_answer(soru, chunks)

    kaynaklar = []
    for c in chunks:
        p = c["payload"]
        kaynaklar.append(
            KaynakItem(
                kaynak_turu=p["kaynak_turu"],
                baslik=p.get("kanun_adi", p.get("karar_no", "Kaynak")),
                metin_ozet=p["metin"][:200],
                skor=c["skor"],
            )
        )

    return AskResponse(yanit=yanit, kaynaklar=kaynaklar)