"""
load_qdrant.py
==============
Yargıtay kararı chunk'larını multilingual-e5-base modeli ile encode edip
Qdrant koleksiyonuna yükler.

Kullanım:
    python scripts/load_qdrant.py --input data/processed/yargitay_chunks.json
    python scripts/load_qdrant.py --input data/processed/  # dizindeki tüm yargitay_*.json
    python scripts/load_qdrant.py --recreate               # koleksiyonu sıfırdan oluştur

Uyarı:
    --recreate bayrağı koleksiyondaki TÜM mevcut vektörleri siler.
    Eski model (paraphrase-multilingual-mpnet-base-v2) ile yüklenmiş
    vektörler varsa --recreate ZORUNLUDUR.
"""

import argparse
import hashlib
import json
import os
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

# backend/ kök dizinini path'e ekle (scripts/ altından çalıştırma için)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings

VECTOR_SIZE = 768           # multilingual-e5-base çıktı boyutu
DISTANCE = "Cosine"
BATCH_SIZE = 64             # Qdrant'a tek seferde gönderilecek vektör sayısı
PASSAGE_PREFIX = "passage: "  # multilingual-e5-base zorunlu prefix


def _load_model():
    """multilingual-e5-base modelini yükle."""
    from sentence_transformers import SentenceTransformer
    print(f"Model yükleniyor: {settings.EMBEDDING_MODEL}")
    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    print("Model hazır.")
    return model


def _get_qdrant_client():
    from qdrant_client import QdrantClient
    if not settings.QDRANT_URL:
        print("HATA: QDRANT_URL ayarlanmamış. .env dosyasını kontrol edin.")
        sys.exit(1)
    return QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)


def _stable_point_id(chunk_id: str) -> int:
    digest = hashlib.blake2b(chunk_id.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, byteorder="big") & ((1 << 63) - 1)


def _recreate_collection(client):
    """Koleksiyonu sil ve yeniden oluştur (eski vektörleri temizler)."""
    from qdrant_client.models import Distance, VectorParams

    col = settings.COLLECTION_NAME

    existing = [c.name for c in client.get_collections().collections]
    if col in existing:
        print(f"Koleksiyon siliniyor: {col}")
        client.delete_collection(col)
        time.sleep(1)

    print(f"Koleksiyon oluşturuluyor: {col}  (size={VECTOR_SIZE}, distance={DISTANCE})")
    client.create_collection(
        collection_name=col,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    print("Koleksiyon hazır.")


def _ensure_collection_exists(client):
    """Koleksiyon yoksa oluştur, varsa dokunma."""
    from qdrant_client.models import Distance, VectorParams

    col = settings.COLLECTION_NAME
    existing = [c.name for c in client.get_collections().collections]
    if col not in existing:
        print(f"Koleksiyon bulunamadı, oluşturuluyor: {col}")
        client.create_collection(
            collection_name=col,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
    else:
        print(f"Mevcut koleksiyon kullanılıyor: {col}  (--recreate ile temizleyebilirsiniz)")


def _load_chunks_from_path(input_path: Path) -> list[dict]:
    """Verilen dosya veya dizindeki yargitay_*.json dosyalarını yükle."""
    chunks = []

    if input_path.is_file():
        paths = [input_path]
    elif input_path.is_dir():
        paths = sorted(input_path.glob("*_chunks.json"))
        if not paths:
            print(f"UYARI: {input_path} içinde *_chunks.json bulunamadı.")
        print(f"{len(paths)} dosya bulundu: {[p.name for p in paths]}")
    else:
        print(f"HATA: {input_path} bulunamadı.")
        sys.exit(1)

    for path in paths:
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"UYARI: {path.name} okunamadı: {e}")
            continue

        if not isinstance(raw, list):
            print(f"UYARI: {path.name} beklenen format değil (list olmalı), atlanıyor.")
            continue

        print(f"  {path.name}: {len(raw)} chunk yüklendi")
        chunks.extend(raw)

    return chunks


def _validate_chunk(chunk: dict, idx: int) -> bool:
    """Zorunlu alanları kontrol et."""
    required = ["chunk_id", "metin", "kaynak_turu"]
    missing = [f for f in required if not chunk.get(f)]
    if missing:
        print(f"UYARI: chunk[{idx}] eksik alan: {missing} — atlanıyor")
        return False
    return True


def _upload_batches(client, model, chunks: list[dict]) -> int:
    """Chunk'ları batch'ler halinde encode edip Qdrant'a yükle."""
    from qdrant_client.models import PointStruct

    toplam = len(chunks)
    yuklenen = 0

    for batch_start in range(0, toplam, BATCH_SIZE):
        batch = chunks[batch_start: batch_start + BATCH_SIZE]

        # Geçerli chunk'ları filtrele
        gecerli = [(i + batch_start, c) for i, c in enumerate(batch)
                   if _validate_chunk(c, i + batch_start)]
        if not gecerli:
            continue

        idxler, chunk_listesi = zip(*gecerli)

        # multilingual-e5-base: belgeler "passage: " ile prefix'lenir
        metinler = [PASSAGE_PREFIX + c["metin"] for c in chunk_listesi]
        embeddings = model.encode(
            metinler,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        points = []
        for (orijinal_idx, chunk), embedding in zip(gecerli, embeddings):
            # Deterministik ID, tekrar yüklemelerde duplicate point üretmemesi için sabittir.
            point_id = _stable_point_id(chunk["chunk_id"])

            payload = {
                "chunk_id":    chunk.get("chunk_id"),
                "kaynak_turu": chunk.get("kaynak_turu", "yargitay_karari"),
                "hukuk_alani": chunk.get("hukuk_alani", ""),
                "kanun_adi":   chunk.get("kanun_adi", ""),
                "kanun_no":    chunk.get("kanun_no", ""),
                "madde_no":    chunk.get("madde_no", ""),
                "fikra_no":    chunk.get("fikra_no"),
                "metin":       chunk.get("metin", ""),
                "karar_no":    chunk.get("karar_no", ""),
                "daire":       chunk.get("daire", ""),
                "karar_bolumu": chunk.get("karar_bolumu", ""),
                "tarih":       chunk.get("tarih", ""),
                "yil":         chunk.get("yil"),
                "url":         chunk.get("url"),
            }
            points.append(PointStruct(id=point_id, vector=embedding.tolist(), payload=payload))

        client.upsert(collection_name=settings.COLLECTION_NAME, points=points)
        yuklenen += len(points)

        bitti = min(batch_start + BATCH_SIZE, toplam)
        print(f"  [{bitti}/{toplam}] yüklendi...", end="\r")

    print()  # satır sonu
    return yuklenen


def main():
    parser = argparse.ArgumentParser(description="Qdrant yargitay_karari yükleyici")
    parser.add_argument(
        "--input", "-i",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "processed",
        help="Chunk JSON dosyası veya dizin (default: data/processed/)",
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Koleksiyonu sil ve yeniden oluştur (eski model vektörlerini temizler)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Veri yükleme — sadece chunk sayısını ve model bilgisini göster",
    )
    args = parser.parse_args()

    # 1. Chunk'ları oku
    chunks = _load_chunks_from_path(args.input)
    if not chunks:
        print("Yüklenecek chunk bulunamadı. Çıkılıyor.")
        sys.exit(0)

    # Tüm chunk tipleri Qdrant'a yükleniyor (kanun + yargitay_karari)
    tip_sayilari: dict[str, int] = {}
    for c in chunks:
        tip = c.get("kaynak_turu", "bilinmeyen")
        tip_sayilari[tip] = tip_sayilari.get(tip, 0) + 1

    print(f"\nToplam chunk: {len(chunks)}")
    for tip, sayi in sorted(tip_sayilari.items()):
        print(f"  {tip}: {sayi}  <- Qdrant'a yuklenecek")

    if args.dry_run:
        print("\n[DRY-RUN] Gercek yukleme yapilmadi.")
        return

    yukleme_chunks = chunks

    # 2. Model ve Qdrant bağlantısı
    model = _load_model()
    client = _get_qdrant_client()

    # 3. Koleksiyon hazırlığı
    if args.recreate:
        _recreate_collection(client)
    else:
        _ensure_collection_exists(client)

    # 4. Yükleme
    print(f"\nYukleme basliyor... (batch_size={BATCH_SIZE})")
    baslangic = time.time()
    yuklenen = _upload_batches(client, model, yukleme_chunks)
    sure = time.time() - baslangic

    print(f"\n✓ Tamamlandı: {yuklenen} vektör {sure:.1f} saniyede yüklendi.")

    # 5. Koleksiyon özeti
    info = client.get_collection(settings.COLLECTION_NAME)
    print(f"  Koleksiyon: {settings.COLLECTION_NAME}")
    print(f"  Toplam vektör: {info.points_count}")
    print(f"  Vector size: {info.config.params.vectors.size}")
    print(f"  Distance: {info.config.params.vectors.distance}")


if __name__ == "__main__":
    main()
