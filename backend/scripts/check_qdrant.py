#!/usr/bin/env python3
"""
Script to check Qdrant connection and data status
"""
import os
import sys
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models

# Load environment
load_dotenv(override=False)

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
COLLECTION_NAME = os.environ.get("QDRANT_COLLECTION", "hukuk_chunks")

def check_qdrant():
    """Check Qdrant connection and collection status"""
    
    print("=" * 70)
    print("QDRANT KONTROL VE VERİ DURUMU")
    print("=" * 70)
    
    if not QDRANT_URL or not QDRANT_API_KEY:
        print("❌ HATATA: QDRANT_URL veya QDRANT_API_KEY ayarlanmamış!")
        return False
    
    print(f"\n📍 QDRANT URL: {QDRANT_URL}")
    print(f"📍 QDRANT Koleksiyonu: {COLLECTION_NAME}")
    
    try:
        # Connect to Qdrant
        client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
        )
        print("\n✅ QDRANT'a bağlantı başarılı!")
        
        # Get collections
        collections = client.get_collections()
        print(f"\n📊 Toplam koleksiyon sayısı: {len(collections.collections)}")
        
        if collections.collections:
            print("\nMevcut Koleksiyonlar:")
            for col in collections.collections:
                print(f"  - {col.name}")
        
        # Check our collection
        print(f"\n🔍 '{COLLECTION_NAME}' koleksiyonu kontrol ediliyor...")
        
        try:
            collection_info = client.get_collection(COLLECTION_NAME)
            print(f"\n✅ Koleksiyon bulundu!")
            print(f"   - Vektör sayısı: {collection_info.points_count}")
            print(f"   - Vektör boyutu: {collection_info.config.params.vectors.size}")
            print(f"   - Shard/Segment sayısı: {len(collection_info.config.params.shards)}")
            
            # Get some sample vectors
            if collection_info.points_count > 0:
                print(f"\n📦 Veri Örnekleri (ilk 5):")
                scroll_results = client.scroll(
                    collection_name=COLLECTION_NAME,
                    limit=5,
                    with_payload=True,
                    with_vectors=False
                )
                
                for idx, point in enumerate(scroll_results[0], 1):
                    print(f"\n   Vektör #{idx}:")
                    print(f"     - ID: {point.id}")
                    if point.payload:
                        for key, value in point.payload.items():
                            # Truncate long strings
                            val_str = str(value)[:80]
                            if len(str(value)) > 80:
                                val_str += "..."
                            print(f"     - {key}: {val_str}")
                
                return True
            else:
                print("\n⚠️  UYARI: Koleksiyon boş! Veri yüklenmemiş.")
                return False
                
        except Exception as e:
            print(f"\n❌ HATA: Koleksiyon açılamadı: {e}")
            print(f"   Koleksiyon var mı kontrol et: {[c.name for c in collections.collections]}")
            return False
            
    except Exception as e:
        print(f"\n❌ BAĞLANTI HATASI: {e}")
        return False

if __name__ == "__main__":
    success = check_qdrant()
    sys.exit(0 if success else 1)
