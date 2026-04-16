#!/usr/bin/env python3
"""
Load missing legal category data into Qdrant
For: Tüketici Hukuku, Taşınmaz Mülk, Vergi Hukuku, İdari Hukuk

Usage:
    python load_missing_categories.py
"""

import argparse
import hashlib
import json
import os
import sys
import time
import warnings
from pathlib import Path
from tqdm import tqdm

warnings.filterwarnings("ignore")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

# backend/ kök dizinini path'e ekle
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import settings

VECTOR_SIZE = 768
DISTANCE = "Cosine"
BATCH_SIZE = 32
PASSAGE_PREFIX = "passage: "

# Kategorilere göre yüklenecek dosyalar
FILES_BY_CATEGORY = {
    "Tüketici Hukuku": [
        "6502_tüketicinin_korunması_hakkında_chunks.json",
    ],
    "Taşınmaz Mülk": [
        "3194_i̇mar_kanunu_chunks.json",
        "2942_kamulaştırma_kanunu_chunks.json",
        "6306_afet_riski_altındaki_alanların_chunks.json",
    ],
    "Vergi Hukuku": [
        "193_gelir_vergisi_kanunu_chunks.json",
        "3065_katma_değer_vergisi_kanunu_chunks.json",
        "5520_kurumlar_vergisi_kanunu_chunks.json",
    ],
    "İdari Hukuk": [
        "2577_i̇dari_yargılama_usulü_kanunu_chunks.json",
        "4734_kamu_i̇hale_kanunu_chunks.json",
    ],
}


def _load_model():
    """Load embedding model"""
    from sentence_transformers import SentenceTransformer
    print(f"\n📦 Model yükleniyor: {settings.EMBEDDING_MODEL}")
    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    print("✅ Model hazır.\n")
    return model


def _get_qdrant_client():
    """Get Qdrant client"""
    from qdrant_client import QdrantClient
    if not settings.QDRANT_URL:
        print("❌ HATA: QDRANT_URL ayarlanmamış. .env dosyasını kontrol edin.")
        sys.exit(1)
    return QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)


def _stable_point_id(chunk_id: str) -> int:
    """Generate stable point ID from chunk_id"""
    digest = hashlib.blake2b(chunk_id.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, byteorder="big") & ((1 << 63) - 1)


def _ensure_collection_exists(client):
    """Ensure collection exists"""
    from qdrant_client.models import Distance, VectorParams
    
    col = settings.COLLECTION_NAME
    existing = [c.name for c in client.get_collections().collections]
    if col not in existing:
        print(f"📌 Koleksiyon oluşturuluyor: {col}")
        client.create_collection(
            collection_name=col,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print("✅ Koleksiyon hazır.\n")
    else:
        print(f"✅ Koleksiyon zaten mevcut: {col}\n")


def _load_chunks_from_file(file_path: Path) -> list[dict]:
    """Load chunks from JSON file"""
    try:
        raw = json.loads(file_path.read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            print(f"⚠️  {file_path.name} liste değil, atlanıyor")
            return []
        return raw
    except Exception as e:
        print(f"⚠️  {file_path.name} okunamadı: {e}")
        return []


def _validate_chunk(chunk: dict) -> bool:
    """Validate chunk required fields"""
    required = ["chunk_id", "metin"]
    return all(chunk.get(f) for f in required)


def _upload_chunks(client, model, chunks: list[dict], category: str) -> int:
    """Embed and upload chunks to Qdrant"""
    from qdrant_client.models import PointStruct
    
    if not chunks:
        return 0
    
    total = len(chunks)
    uploaded = 0
    
    print(f"  Embedding ve yükleniyor ({total} chunk)...")
    
    for batch_start in tqdm(range(0, total, BATCH_SIZE), desc=f"  {category}"):
        batch = chunks[batch_start: batch_start + BATCH_SIZE]
        
        # Filter valid chunks
        valid_chunks = [c for c in batch if _validate_chunk(c)]
        if not valid_chunks:
            continue
        
        # Embed
        texts = [PASSAGE_PREFIX + c["metin"] for c in valid_chunks]
        embeddings = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        
        # Create points
        points = []
        for chunk, embedding in zip(valid_chunks, embeddings):
            point_id = _stable_point_id(chunk["chunk_id"])
            
            payload = {
                "chunk_id":    chunk.get("chunk_id"),
                "kaynak_turu": chunk.get("kaynak_turu", "kanun"),
                "hukuk_alani": chunk.get("hukuk_alani", category.lower().replace(" ", "_")),
                "kanun_adi":   chunk.get("kanun_adi", ""),
                "kanun_no":    chunk.get("kanun_no", ""),
                "madde_no":    chunk.get("madde_no", ""),
                "metin":       chunk.get("metin", ""),
                "yil":         chunk.get("yil"),
            }
            points.append(PointStruct(id=point_id, vector=embedding.tolist(), payload=payload))
        
        client.upsert(collection_name=settings.COLLECTION_NAME, points=points)
        uploaded += len(points)
    
    return uploaded


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Load missing legal categories to Qdrant")
    parser.add_argument(
        "--categories",
        nargs="+",
        default=list(FILES_BY_CATEGORY.keys()),
        help="Categories to load (default: all)",
        choices=list(FILES_BY_CATEGORY.keys()),
    )
    args = parser.parse_args()
    
    # Load model
    try:
        model = _load_model()
    except Exception as e:
        print(f"❌ Model yüklenemedi: {e}")
        sys.exit(1)
    
    # Get Qdrant client
    try:
        client = _get_qdrant_client()
        _ensure_collection_exists(client)
    except Exception as e:
        print(f"❌ Qdrant bağlantısı başarısız: {e}")
        sys.exit(1)
    
    # Load data
    data_dir = Path(__file__).parent / "data" / "processed"
    
    print("=" * 80)
    print("EKSIK KATEGORİLERİ QDRANT'A YÜKLE")
    print("=" * 80)
    
    total_uploaded = 0
    
    for category in args.categories:
        file_names = FILES_BY_CATEGORY[category]
        print(f"\n📂 {category}:")
        
        category_chunks = []
        for file_name in file_names:
            file_path = data_dir / file_name
            if not file_path.exists():
                print(f"  ⚠️  {file_name} bulunamadı")
                continue
            
            chunks = _load_chunks_from_file(file_path)
            if chunks:
                print(f"  ✅ {file_name}: {len(chunks)} chunk")
                category_chunks.extend(chunks)
        
        if category_chunks:
            uploaded = _upload_chunks(client, model, category_chunks, category)
            print(f"  ✅ Toplamda {uploaded} vektör yüklendi\n")
            total_uploaded += uploaded
        else:
            print(f"  ❌ Dosya yüklenemedi\n")
    
    # Verification
    print("=" * 80)
    print("DOĞRULAMA")
    print("=" * 80)
    
    col_info = client.get_collection(settings.COLLECTION_NAME)
    print(f"\n✅ Koleksiyonda toplam {col_info.points_count} vektör:")
    
    # Count by category
    try:
        # Get sample points to count categories
        response = client.scroll(
            collection_name=settings.COLLECTION_NAME,
            limit=10000,
            with_payload=True,
            with_vectors=False,
        )
        
        category_counts = {}
        for point in response[0]:
            category = point.payload.get("hukuk_alani", "unknown")
            category_counts[category] = category_counts.get(category, 0) + 1
        
        for category in sorted(category_counts.keys()):
            count = category_counts[category]
            print(f"  {category:30s} | {count:5d} vektör")
    except:
        pass
    
    print(f"\n✅ {total_uploaded} yeni vektör eklendi!")
    print("\n🎉 Başarılı!")


if __name__ == "__main__":
    main()
