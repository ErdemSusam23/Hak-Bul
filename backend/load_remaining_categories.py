#!/usr/bin/env python3
"""
Complete loading for remaining legal categories
Ticaret, İş, İdari, Usul
"""

import hashlib
import json
import os
import sys
import time
from pathlib import Path
from tqdm import tqdm
from collections import defaultdict

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import settings

VECTOR_SIZE = 768
PASSAGE_PREFIX = "passage: "
BATCH_SIZE = 8  # Very small for stability

# Remaining categories to load
REMAINING = {
    "Ticaret Hukuku": [
        "6102_türk_ticaret_kanunu_chunks.json",
        "5411_bankacılık_kanunu_chunks.json",
        "6362_sermaye_piyasası_kanunu_chunks.json",
    ],
    "İş Hukuku": [
        "4857_is_kanunu_chunks.json",
        "4904_türkiye_i̇ş_kurumu_kanunu_chunks.json",
        "6331_i̇ş_sağlığı_ve_güvenliği_kanunu_chunks.json",
        "6356_sendikalar_ve_toplu_i̇ş_sözleşm_chunks.json",
        "7036_i̇ş_mahkemeleri_kanunu_chunks.json",
    ],
    "İdari Hukuk": [
        "2577_i̇dari_yargılama_usulü_kanunu_chunks.json",
        "4734_kamu_i̇hale_kanunu_chunks.json",
        "657_devlet_memurları_kanunu_chunks.json",
        "4982_bilgi_edinme_hakkı_kanunu_chunks.json",
    ],
    "Usul Hukuku": [
        "6100_hukuk_muhakemeleri_kanunu_chunks.json",
        "2004_icra_ve_iflas_kanunu_chunks.json",
        "7201_tebligat_kanunu_chunks.json",
    ],
}


def _load_model():
    from sentence_transformers import SentenceTransformer
    print("\n📦 Model yükleniyor...")
    return SentenceTransformer("intfloat/multilingual-e5-base")


def _get_client():
    from qdrant_client import QdrantClient
    return QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY or None,
        timeout=60.0,
    )


def _stable_id(chunk_id: str) -> int:
    d = hashlib.blake2b(chunk_id.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(d, byteorder="big") & ((1 << 63) - 1)


def _load_chunks(path: Path) -> list:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, list) else []
    except:
        return []


def _upload(client, model, chunks, category):
    from qdrant_client.models import PointStruct
    
    if not chunks:
        return 0
    
    # Filter valid
    valid = [c for c in chunks if c.get("metin") and c.get("chunk_id")]
    if not valid:
        return 0
    
    uploaded = 0
    
    # Process in small batches with delay
    for batch_start in tqdm(range(0, len(valid), BATCH_SIZE), desc=f"  {category}", leave=False):
        batch = valid[batch_start:batch_start + BATCH_SIZE]
        
        # Embed
        texts = [PASSAGE_PREFIX + c["metin"].strip() for c in batch]
        embeds = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        
        # Create points
        points = []
        for chunk, embed in zip(batch, embeds):
            pid = _stable_id(chunk["chunk_id"])
            payload = {
                "chunk_id": chunk.get("chunk_id", ""),
                "kaynak_turu": chunk.get("kaynak_turu", "kanun"),
                "hukuk_alani": category.lower().replace(" ", "_"),
                "kanun_adi": (chunk.get("kanun_adi") or "")[:200],
                "kanun_no": chunk.get("kanun_no", ""),
                "madde_no": chunk.get("madde_no", ""),
                "metin": (chunk.get("metin") or "")[:5000],
            }
            points.append(PointStruct(id=pid, vector=embed.tolist(), payload=payload))
        
        # Upsert with retry
        for att in range(3):
            try:
                client.upsert(collection_name=settings.COLLECTION_NAME, points=points)
                uploaded += len(points)
                time.sleep(0.5)  # Small delay between batches
                break
            except Exception as e:
                if att < 2:
                    time.sleep((2 ** att) * 3)
    
    return uploaded


def main():
    model = _load_model()
    print("✅ Model ready\n")
    
    client = _get_client()
    
    data_dir = Path(__file__).resolve().parent / "data" / "processed"
    
    print("=" * 80)
    print("🏛️  KALAN KATEGORİLERİ YÜKLE")
    print("=" * 80 + "\n")
    
    total = 0
    summary = {}
    
    for cat in sorted(REMAINING.keys()):
        print(f"📂 {cat}:")
        
        cat_chunks = []
        for fname in REMAINING[cat]:
            fpath = data_dir / fname
            if fpath.exists():
                chunks = _load_chunks(fpath)
                if chunks:
                    print(f"  ✅ {fname}: {len(chunks)}")
                    cat_chunks.extend(chunks)
        
        if cat_chunks:
            uploaded = _upload(client, model, cat_chunks, cat)
            print(f"  ✅ {uploaded} vektör yüklendi\n")
            total += uploaded
            summary[cat] = uploaded
    
    # Summary
    print("=" * 80)
    print(f"✅ {total:,} yeni vektör eklendi!\n")
    
    # Verify total
    col = client.get_collection(settings.COLLECTION_NAME)
    print(f"🎯 Toplam: {col.points_count:,} vektör")
    print(f"📊 2x hedefi ({1388:,}): {'✅ AŞTI!' if col.points_count >= 1388 else '🟡 Devam et'}\n")


if __name__ == "__main__":
    main()
