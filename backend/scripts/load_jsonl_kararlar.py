"""
load_jsonl_kararlar.py
======================
Qdrant-formatındaki JSONL dosyasını (vector:null olan) multilingual-e5-base
modeli ile encode edip Qdrant koleksiyonuna yükler.

Beklenen JSONL formatı (her satır):
  {"id": "...", "vector": null, "payload": {"chunk_id":..., "metin":..., ...}}

Kullanım:
    python scripts/load_jsonl_kararlar.py --input "path/to/kararlar.jsonl"
    python scripts/load_jsonl_kararlar.py --input "..." --dry-run
"""

import argparse
import json
import os
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings

VECTOR_SIZE = 768
BATCH_SIZE = 64
PASSAGE_PREFIX = "passage: "


def _load_model():
    from sentence_transformers import SentenceTransformer
    print(f"Model yükleniyor: {settings.EMBEDDING_MODEL}")
    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    print("Model hazır.")
    return model


def _get_qdrant_client():
    from qdrant_client import QdrantClient
    if not settings.QDRANT_URL:
        print("HATA: QDRANT_URL ayarlanmamış.")
        sys.exit(1)
    return QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)


def _ensure_collection(client):
    from qdrant_client.models import Distance, VectorParams
    col = settings.COLLECTION_NAME
    existing = [c.name for c in client.get_collections().collections]
    if col not in existing:
        print(f"Koleksiyon oluşturuluyor: {col}")
        client.create_collection(
            collection_name=col,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
    else:
        print(f"Mevcut koleksiyon kullanılıyor: {col}")


def _load_jsonl(path: Path) -> list[dict]:
    """JSONL dosyasını oku, payload'ı düzleştir."""
    chunks = []
    with open(path, encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"UYARI: satır {line_no} JSON hatası: {e} — atlanıyor")
                continue

            payload = record.get("payload") or {}
            # chunk_id: payload.chunk_id varsa onu kullan, yoksa record.id
            chunk_id = payload.get("chunk_id") or record.get("id", "")
            metin = payload.get("metin", "")
            kaynak_turu = payload.get("kaynak_turu", "yargitay_karari")

            if not chunk_id or not metin:
                print(f"UYARI: satır {line_no} eksik chunk_id veya metin — atlanıyor")
                continue

            chunks.append({
                "chunk_id":    chunk_id,
                "kaynak_turu": kaynak_turu,
                "hukuk_alani": payload.get("hukuk_alani", ""),
                "metin":       metin,
                "karar_no":    payload.get("karar_no", ""),
                "daire":       payload.get("daire", ""),
                "karar_bolumu": payload.get("karar_bolumu", ""),
                "tarih":       payload.get("tarih", ""),
                "yil":         payload.get("yil"),
                "url":         payload.get("url"),
                "karar_id":    payload.get("karar_id", ""),
            })

    return chunks


def _upload_batches(client, model, chunks: list[dict]) -> int:
    from qdrant_client.models import PointStruct

    toplam = len(chunks)
    yuklenen = 0

    for batch_start in range(0, toplam, BATCH_SIZE):
        batch = chunks[batch_start: batch_start + BATCH_SIZE]

        metinler = [PASSAGE_PREFIX + c["metin"] for c in batch]
        embeddings = model.encode(
            metinler,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        points = []
        for chunk, embedding in zip(batch, embeddings):
            point_id = abs(hash(chunk["chunk_id"])) % (2**63)
            points.append(PointStruct(
                id=point_id,
                vector=embedding.tolist(),
                payload={k: v for k, v in chunk.items() if k != "metin" or True},
            ))

        for attempt in range(5):
            try:
                client.upsert(collection_name=settings.COLLECTION_NAME, points=points)
                break
            except Exception as e:
                if attempt == 4:
                    raise
                wait = 2 ** attempt
                print(f"\n  HATA (deneme {attempt+1}/5): {e}  — {wait}s bekleniyor...")
                time.sleep(wait)
        yuklenen += len(points)

        bitti = min(batch_start + BATCH_SIZE, toplam)
        print(f"  [{bitti}/{toplam}] yüklendi...", end="\r")

    print()
    return yuklenen


def main():
    parser = argparse.ArgumentParser(description="JSONL Yargıtay kararı yükleyici")
    parser.add_argument("--input", "-i", type=Path, required=True,
                        help="JSONL dosyası")
    parser.add_argument("--dry-run", action="store_true",
                        help="Gerçek yükleme yapma, sadece istatistik göster")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"HATA: Dosya bulunamadı: {args.input}")
        sys.exit(1)

    print(f"JSONL okunuyor: {args.input}")
    chunks = _load_jsonl(args.input)
    print(f"Toplam {len(chunks)} chunk yüklendi.")

    if not chunks:
        print("Yüklenecek chunk yok. Çıkılıyor.")
        sys.exit(0)

    # Kaynak türü özeti
    tip_sayilari: dict[str, int] = {}
    for c in chunks:
        tip = c.get("kaynak_turu", "bilinmeyen")
        tip_sayilari[tip] = tip_sayilari.get(tip, 0) + 1
    for tip, sayi in sorted(tip_sayilari.items()):
        print(f"  {tip}: {sayi}")

    if args.dry_run:
        print("[DRY-RUN] Gerçek yükleme yapılmadı.")
        return

    model = _load_model()
    client = _get_qdrant_client()
    _ensure_collection(client)

    print(f"\nYükleme başlıyor... (batch_size={BATCH_SIZE})")
    baslangic = time.time()
    yuklenen = _upload_batches(client, model, chunks)
    sure = time.time() - baslangic

    print(f"\n✓ Tamamlandı: {yuklenen} vektör {sure:.1f} saniyede yüklendi.")

    info = client.get_collection(settings.COLLECTION_NAME)
    print(f"  Koleksiyon toplam vektör: {info.points_count}")


if __name__ == "__main__":
    main()
