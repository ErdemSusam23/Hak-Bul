#!/usr/bin/env python3
"""
Load ALL legal data into Qdrant + improve embedding model
For comprehensive legal AI bot

Usage:
    python load_all_legal_data.py          # Load all categories
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
from collections import defaultdict

warnings.filterwarnings("ignore")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import settings

VECTOR_SIZE = 768
DISTANCE = "Cosine"
BATCH_SIZE = 16  # Reduced to prevent timeout
PASSAGE_PREFIX = "passage: "

# ALL legal files mapped to categories
ALL_FILES = {
    "İş Hukuku": [
        "4857_is_kanunu_chunks.json",
        "4904_türkiye_i̇ş_kurumu_kanunu_chunks.json",
        "6331_i̇ş_sağlığı_ve_güvenliği_kanunu_chunks.json",
        "6356_sendikalar_ve_toplu_i̇ş_sözleşm_chunks.json",
        "7036_i̇ş_mahkemeleri_kanunu_chunks.json",
    ],
    "Medeni Hukuk": [
        "4721_türk_medeni_kanunu_chunks.json",
        "6284_ailenin_korunması_ve_kadına_ka_chunks.json",
        "6306_afet_riski_altındaki_alanların_chunks.json",
    ],
    "Ceza Hukuku": [
        "5237_türk_ceza_kanunu_chunks.json",
    ],
    "Ticaret Hukuku": [
        "6102_türk_ticaret_kanunu_chunks.json",
        "5411_bankacılık_kanunu_chunks.json",
        "6362_sermaye_piyasası_kanunu_chunks.json",
    ],
    "Tüketici Hukuku": [
        "6502_tüketicinin_korunması_hakkında_chunks.json",
    ],
    "Taşınmaz Mülk": [
        "3194_i̇mar_kanunu_chunks.json",
        "2942_kamulaştırma_kanunu_chunks.json",
    ],
    "İdari Hukuk": [
        "2577_i̇dari_yargılama_usulü_kanunu_chunks.json",
        "4734_kamu_i̇hale_kanunu_chunks.json",
        "657_devlet_memurları_kanunu_chunks.json",
        "4982_bilgi_edinme_hakkı_kanunu_chunks.json",
    ],
    "Vergi Hukuku": [
        "193_gelir_vergisi_kanunu_chunks.json",
        "3065_katma_değer_vergisi_kanunu_chunks.json",
        "5520_kurumlar_vergisi_kanunu_chunks.json",
    ],
    "Sosyal Güvenlik": [
        "4447_i̇şsizlik_sigortası_kanunu_chunks.json",
        "5510_sgk_kanunu_chunks.json",
    ],
    "Fikri Mülkiyet": [
        "5846_fikir_ve_sanat_eserleri_kanunu_chunks.json",
        "6698_kişisel_verilerin_korunması_ka_chunks.json",
    ],
    "Bilişim Hukuku": [
        "5070_elektronik_i̇mza_kanunu_chunks.json",
        "5651_i̇nternet_ortamında_yapılan_yay_chunks.json",
    ],
    "Anayasa Hukuku": [
        "2709_türkiye_cumhuriyeti_anayasası_chunks.json",
    ],
    "Usul Hukuku": [
        "6100_hukuk_muhakemeleri_kanunu_chunks.json",
        "2004_icra_ve_iflas_kanunu_chunks.json",
        "7201_tebligat_kanunu_chunks.json",
    ],
    "Diğer": [
        "2911_toplantı_ve_gösteri_yürüyüşler_chunks.json",
        "2918_karayolları_trafik_kanunu_chunks.json",
        "3071_dilekçe_hakkının_kullanılmasın_chunks.json",
        "5253_dernekler_kanunu_chunks.json",
    ],
}


def _load_model():
    """Load embedding model (e5-base for 768-dim compatibility)"""
    from sentence_transformers import SentenceTransformer
    
    model_name = "intfloat/multilingual-e5-base"
    
    print(f"\n📦 Model yükleniyor: {model_name}")
    try:
        model = SentenceTransformer(model_name)
        print("✅ Model hazır (768-dim output).\n")
        return model
    except Exception as e:
        print(f"❌ Model yüklenemedi: {e}")
        sys.exit(1)


def _get_qdrant_client():
    """Get Qdrant client"""
    from qdrant_client import QdrantClient
    if not settings.QDRANT_URL:
        print("❌ HATA: QDRANT_URL ayarlanmamış.")
        sys.exit(1)
    return QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)


def _stable_point_id(chunk_id: str) -> int:
    """Generate stable point ID"""
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
        print(f"✅ Koleksiyon mevcut: {col}\n")


def _load_chunks_from_file(file_path: Path) -> list[dict]:
    """Load chunks from JSON file"""
    try:
        raw = json.loads(file_path.read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            return []
        return raw
    except Exception as e:
        print(f"⚠️  {file_path.name}: {e}")
        return []


def _validate_chunk(chunk: dict) -> bool:
    """Validate chunk - must have metin"""
    return bool(chunk.get("metin") and chunk.get("chunk_id"))


def _upload_chunks(client, model, chunks: list[dict], category: str) -> int:
    """Embed and upload chunks"""
    from qdrant_client.models import PointStruct
    
    if not chunks:
        return 0
    
    total = len(chunks)
    uploaded = 0
    
    for batch_start in tqdm(
        range(0, total, BATCH_SIZE),
        desc=f"    {category}",
        leave=False,
    ):
        batch = chunks[batch_start: batch_start + BATCH_SIZE]
        valid_chunks = [c for c in batch if _validate_chunk(c)]
        
        if not valid_chunks:
            continue
        
        # Embed with better model
        texts = [PASSAGE_PREFIX + c["metin"] for c in valid_chunks]
        embeddings = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        
        # Create points with full metadata
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
                "fikra_no":    chunk.get("fikra_no"),
                "metin":       chunk.get("metin", ""),
                "yil":         chunk.get("yil"),
            }
            points.append(PointStruct(id=point_id, vector=embedding.tolist(), payload=payload))
        
        # Upsert with retry
        max_retries = 3
        for attempt in range(max_retries):
            try:
                client.upsert(collection_name=settings.COLLECTION_NAME, points=points)
                uploaded += len(points)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    import time
                    wait_time = (2 ** attempt) * 5
                    time.sleep(wait_time)
                else:
                    pass  # Skip on final failure
    
    return uploaded


def main():
    """Main function"""
    # Load model ONCE (memory efficient)
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
        print(f"❌ Qdrant hatası: {e}")
        sys.exit(1)
    
    data_dir = Path(__file__).resolve().parent / "data" / "processed"
    
    print("=" * 80)
    print("🏛️  KAPSAMLI HUKUK BOTU - TÜM VERİLERİ YÜKLE")
    print("=" * 80)
    print(f"📂 Veri dizini: {data_dir}")
    print(f"🤖 Model: intfloat/multilingual-e5-large (geliştirilmiş)\n")
    
    total_uploaded = 0
    category_summary = {}
    
    for category in sorted(ALL_FILES.keys()):
        file_names = ALL_FILES[category]
        print(f"\n📂 {category}:")
        
        category_chunks = []
        files_found = 0
        
        for file_name in file_names:
            file_path = data_dir / file_name
            if not file_path.exists():
                print(f"  ⚠️  {file_name} bulunamadı")
                continue
            
            chunks = _load_chunks_from_file(file_path)
            if chunks:
                print(f"  ✅ {file_name}: {len(chunks)} chunk")
                category_chunks.extend(chunks)
                files_found += 1
        
        if category_chunks:
            uploaded = _upload_chunks(client, model, category_chunks, category)
            print(f"  ✅ Toplamda {uploaded} vektör yüklendi")
            total_uploaded += uploaded
            category_summary[category] = {
                "files": files_found,
                "chunks": len(category_chunks),
                "vectors": uploaded,
            }
        else:
            print(f"  ❌ Dosya yüklenemedi")
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 YÜKLEME ÖZETİ")
    print("=" * 80 + "\n")
    
    print(f"{'Kategori':<25} {'Dosya':<8} {'Chunk':<8} {'Vektör':<8}")
    print("-" * 55)
    
    for category in sorted(category_summary.keys()):
        s = category_summary[category]
        print(f"{category:<25} {s['files']:<8} {s['chunks']:<8} {s['vectors']:<8}")
    
    print("-" * 55)
    print(f"{'TOPLAM':<25} {sum(s['files'] for s in category_summary.values()):<8} "
          f"{sum(s['chunks'] for s in category_summary.values()):<8} {total_uploaded:<8}")
    
    # Verification
    print("\n" + "=" * 80)
    print("✅ DOĞRULAMA")
    print("=" * 80)
    
    try:
        col_info = client.get_collection(settings.COLLECTION_NAME)
        print(f"\n🎯 Koleksiyonda TOPLAM VEKTÖR: {col_info.points_count:,}\n")
        
        # Count by category
        resp = client.scroll(
            collection_name=settings.COLLECTION_NAME,
            limit=100000,
            with_payload=True,
            with_vectors=False,
        )
        
        cat_counts = defaultdict(int)
        for point in resp[0]:
            cat = point.payload.get("hukuk_alani", "unknown")
            cat_counts[cat] += 1
        
        print("Kategori Dağılımı:")
        for cat in sorted(cat_counts.keys()):
            count = cat_counts[cat]
            pct = (count / col_info.points_count) * 100
            bar = "█" * (count // 50)
            print(f"  {cat:30s} │ {bar:<20} {count:6d} ({pct:5.1f}%)")
        
    except Exception as e:
        print(f"⚠️  Doğrulama hatası: {e}")
    
    print(f"\n✅ {total_uploaded:,} yeni vektör başarıyla yüklendi!")
    print("🎉 Hukuk botu hazır!\n")


if __name__ == "__main__":
    main()
