from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from config import QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION, SCORE_THRESHOLD, MOCK_RETRIEVAL

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
embedder = SentenceTransformer("sentence-transformers/paraphrase-multilingual-mpnet-base-v2")

MOCK_CHUNKS = [
    {
        "payload": {
            "kaynak_turu": "kanun",
            "kanun_adi": "4857 Sayılı İş Kanunu",
            "madde_no": "Madde 17",
            "metin": "Belirsiz süreli iş sözleşmelerinin feshinde bildirim önellerine"
                     " uyulması zorunludur. İş sözleşmeleri; işçinin kıdemine göre"
                     " belirli süreler öncesinde bildirimde bulunularak feshedilebilir.",
            "chunk_id": "kanun_4857_m17",
        },
        "skor": 0.91,
    }
]


def retrieve_chunks(query: str, top_n: int = 5) -> list[dict]:
    if MOCK_RETRIEVAL:  # Normalde MOCK_MODE, Groq API test için geçici olarak böyle yapıldı
        return MOCK_CHUNKS

    embedding = embedder.encode(query)
    results = client.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=embedding.tolist(),
        limit=top_n,
        with_payload=True,
    )
    return [{"payload": r.payload, "skor": r.score} for r in results]


def filter_by_score(chunks: list[dict]) -> list[dict]:
    filtered = [c for c in chunks if c["skor"] >= SCORE_THRESHOLD]
    if not filtered:
        return [max(chunks, key=lambda c: c["skor"])]
    return filtered