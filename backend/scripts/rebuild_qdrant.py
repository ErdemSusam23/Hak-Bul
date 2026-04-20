"""
rebuild_qdrant.py
Qdrant koleksiyonunu sifirdan olusturur:
 1. Mevcut koleksiyonu siler
 2. Yeni koleksiyon olusturur (768-dim, Cosine)
 3. Local JSON korpustan kanun chunklarini yukler (mulga filtrelenmis)
 4. Qdrant'taki Yargitay kararlarini daire normalizasyonuyla yukler
"""

import json
import os
import re
import sys
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
COLLECTION_OLD = os.environ.get("QDRANT_COLLECTION", "hukuk_chunks")
COLLECTION_NEW = "hukuk_chunks_v2"
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "intfloat/multilingual-e5-base")
BATCH_SIZE = 64

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"

MULGA_RE = re.compile(r"\(M[üu]lga", re.IGNORECASE)

DAIRE_NORMALIZE_MAP = {
    "Yargitay ": "",
    "Yargıtay ": "",
    "(Kapatilan) ": "",
    "(Kapatılan) ": "",
    "(kapatilan) ": "",
    "(kapatılan) ": "",
}


def normalize_daire(daire: str) -> str:
    if not daire:
        return daire
    result = daire.strip()
    for old, new in DAIRE_NORMALIZE_MAP.items():
        result = result.replace(old, new)
    result = re.sub(r"(\d+)\s*\.\s*", r"\1. ", result)
    result = re.sub(r"\s+", " ", result).strip()
    return result


def is_tamamen_mulga(metin: str) -> bool:
    if not MULGA_RE.search(metin):
        return False
    stripped = MULGA_RE.sub("", metin)
    stripped = re.sub(r"\([^)]*\)", "", stripped)
    stripped = re.sub(r"MADDE\s+\d+\s*[-–]?\s*", "", stripped)
    stripped = re.sub(r"Madde\s+\d+\s*[-–]?\s*", "", stripped)
    stripped = stripped.strip()
    return len(stripped) < 30


def load_local_kanun_chunks() -> list[dict]:
    chunks = []
    if not DATA_DIR.exists():
        print(f"UYARI: {DATA_DIR} bulunamadi")
        return chunks

    for f in sorted(DATA_DIR.iterdir()):
        if f.suffix != ".json":
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"UYARI: {f.name} okunamadi: {e}")
            continue

        if not isinstance(data, list):
            continue

        skipped = 0
        for item in data:
            if not isinstance(item, dict):
                continue
            metin = item.get("metin", "")
            if is_tamamen_mulga(metin):
                skipped += 1
                continue
            chunks.append(item)

        if skipped:
            print(f"  {f.name}: {skipped} mulga madde filtrelendi")

    return chunks


def main():
    if not QDRANT_URL:
        print("HATA: QDRANT_URL ayarlanmamis")
        sys.exit(1)

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=120)
    model = SentenceTransformer(EMBEDDING_MODEL)

    # --- 1. Eski koleksiyondaki Yargitay kararlarini al ---
    print("=" * 60)
    print("ADIM 1: Eski koleksiyondan Yargitay kararlarini cekiliyor...")
    print("=" * 60)

    yargitay_chunks = []
    try:
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        offset = None
        batch_count = 0
        while True:
            result = client.scroll(
                COLLECTION_OLD,
                scroll_filter=Filter(
                    must=[FieldCondition(key="kaynak_turu", match=MatchValue(value="yargitay_karari"))]
                ),
                limit=1000,
                offset=offset,
                with_payload=True,
                with_vectors=True,
            )
            points, next_offset = result
            for p in points:
                payload = dict(p.payload)
                payload["daire"] = normalize_daire(payload.get("daire", ""))
                yargitay_chunks.append({
                    "payload": payload,
                    "vector": p.vector,
                })
            batch_count += 1
            if batch_count % 10 == 0:
                print(f"  {len(yargitay_chunks)} Yargitay karari cekild...")
            if next_offset is None:
                break
            offset = next_offset

        print(f"  Toplam {len(yargitay_chunks)} Yargitay karari cekild.")
    except Exception as e:
        print(f"UYARI: Yargitay kararlari cekilemedi: {e}")
        print("  Sadece kanun maddeleri yuklenecek.")

    # --- 2. Local kanun chunklarini yukle ---
    print("\n" + "=" * 60)
    print("ADIM 2: Local kanun chunklari yukleniyor (mulga filtrelenmis)...")
    print("=" * 60)

    kanun_chunks = load_local_kanun_chunks()
    print(f"  Toplam {len(kanun_chunks)} temiz kanun chunk'i yuklendi.")

    # --- 3. Yeni koleksiyon olustur ---
    print("\n" + "=" * 60)
    print(f"ADIM 3: '{COLLECTION_NEW}' koleksiyonu olusturuluyor...")
    print("=" * 60)

    try:
        client.delete_collection(COLLECTION_NEW)
        print(f"  Mevcut '{COLLECTION_NEW}' silindi.")
    except Exception:
        pass

    client.create_collection(
        collection_name=COLLECTION_NEW,
        vectors_config=VectorParams(size=768, distance=Distance.COSINE),
    )
    print(f"  '{COLLECTION_NEW}' olusturuldu.")

    # Payload index for kaynak_turu
    from qdrant_client.models import PayloadSchemaType

    client.create_payload_index(
        collection_name=COLLECTION_NEW,
        field_name="kaynak_turu",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    print("  'kaynak_turu' payload indexi olusturuldu.")

    # --- 4. Kanun chunklarini embed et ve yukle ---
    print("\n" + "=" * 60)
    print("ADIM 4: Kanun chunklari embed ediliyor ve yukleniyor...")
    print("=" * 60)

    kanun_texts = [f"passage: {c.get('metin', '')}" for c in kanun_chunks]

    for i in range(0, len(kanun_texts), BATCH_SIZE):
        batch_texts = kanun_texts[i : i + BATCH_SIZE]
        batch_chunks = kanun_chunks[i : i + BATCH_SIZE]

        embeddings = model.encode(batch_texts, normalize_embeddings=True, show_progress_bar=False)

        points = []
        for j, (emb, chunk) in enumerate(zip(embeddings, batch_chunks)):
            point_id = abs(hash(chunk.get("chunk_id", str(uuid.uuid4())))) % (2**63)
            payload = {
                "chunk_id": chunk.get("chunk_id", ""),
                "kaynak_turu": "kanun",
                "kanun_adi": chunk.get("kanun_adi", ""),
                "kanun_no": chunk.get("kanun_no", ""),
                "madde_no": chunk.get("madde_no", ""),
                "fikra_no": chunk.get("fikra_no"),
                "metin": chunk.get("metin", ""),
                "hukuk_alani": chunk.get("hukuk_alani", ""),
                "yil": chunk.get("yil"),
                "url": chunk.get("url", ""),
            }
            points.append(PointStruct(id=point_id, vector=emb.tolist(), payload=payload))

        client.upsert(collection_name=COLLECTION_NEW, points=points)

        if (i // BATCH_SIZE + 1) % 10 == 0 or i + BATCH_SIZE >= len(kanun_texts):
            print(f"  {min(i + BATCH_SIZE, len(kanun_texts))}/{len(kanun_texts)} kanun chunk yuklendi")

    # --- 5. Yargitay kararlarini yukle (vektorler mevcut) ---
    print("\n" + "=" * 60)
    print("ADIM 5: Yargitay kararlari yukleniyor (normalize edilmis)...")
    print("=" * 60)

    for i in range(0, len(yargitay_chunks), BATCH_SIZE):
        batch = yargitay_chunks[i : i + BATCH_SIZE]

        points = []
        for item in batch:
            payload = item["payload"]
            vector = item["vector"]
            point_id = abs(hash(payload.get("chunk_id", "") or payload.get("karar_id", "") or str(uuid.uuid4()))) % (2**63)
            points.append(PointStruct(id=point_id, vector=vector, payload=payload))

        client.upsert(collection_name=COLLECTION_NEW, points=points)

        if (i // BATCH_SIZE + 1) % 100 == 0 or i + BATCH_SIZE >= len(yargitay_chunks):
            print(f"  {min(i + BATCH_SIZE, len(yargitay_chunks))}/{len(yargitay_chunks)} Yargitay karari yuklendi")

    # --- 6. Sonuc ---
    print("\n" + "=" * 60)
    print("TAMAMLANDI!")
    print("=" * 60)
    info = client.get_collection(COLLECTION_NEW)
    print(f"  Koleksiyon: {COLLECTION_NEW}")
    print(f"  Toplam nokta: {info.points_count}")
    print(f"  Status: {info.status}")
    print(f"\n  Simdi config.py'de QDRANT_COLLECTION='{COLLECTION_NEW}' olarak degistirin")
    print(f"  veya .env dosyasina QDRANT_COLLECTION={COLLECTION_NEW} ekleyin.")


if __name__ == "__main__":
    main()
