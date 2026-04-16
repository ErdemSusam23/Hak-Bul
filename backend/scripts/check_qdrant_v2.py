#!/usr/bin/env python3
"""
Script to check Qdrant connection and data status (with version check disabled)
"""
import os
import sys
from dotenv import load_dotenv
from qdrant_client import QdrantClient

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
        print("❌ HATA: QDRANT_URL veya QDRANT_API_KEY ayarlanmamış!")
        return False
    
    print(f"\n📍 QDRANT URL: {QDRANT_URL}")
    print(f"📍 QDRANT Koleksiyonu: {COLLECTION_NAME}")
    
    try:
        # Connect to Qdrant with version check disabled
        client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
            timeout=60.0,
        )
        print("\n✅ QDRANT'a bağlantı başarılı!")
        
        # Get server info
        try:
            server_info = client.get_telemetry_data()
            print(f"\n📊 Server Bilgileri:")
            print(f"   - Server Sürümü: {server_info.version.version if hasattr(server_info, 'version') else 'Bilinmiyor'}")
        except:
            pass
        
        # Get collections
        collections = client.get_collections()
        print(f"\n📊 Toplam koleksiyon sayısı: {len(collections.collections)}")
        
        if collections.collections:
            print("\nMevcut Koleksiyonlar:")
            for col in collections.collections:
                print(f"  ✅ {col.name} (Vektör Sayısı: {col.points_count})")
        
        # Check both collections
        for coll_name in ["hukuk_chunks", "hukuk_chunks_v2"]:
            print(f"\n🔍 '{coll_name}' koleksiyonu kontrol ediliyor...")
            try:
                # Use raw API to avoid pydantic issues
                result = client._client.http_client.get(
                    f"/collections/{coll_name}"
                )
                if result.status_code == 200:
                    data = result.json()
                    points_count = data.get("result", {}).get("points_count", 0)
                    print(f"   ✅ Koleksiyon bulundu!")
                    print(f"      - Vektör sayısı: {points_count}")
                    
                    if points_count > 0:
                        # Get sample data
                        scroll_results = client.scroll(
                            collection_name=coll_name,
                            limit=3,
                            with_payload=True,
                            with_vectors=False
                        )
                        
                        print(f"\n      📦 Veri Örnekleri (ilk 3):")
                        for idx, point in enumerate(scroll_results[0], 1):
                            print(f"\n         Vektör #{idx}:")
                            print(f"         - ID: {point.id}")
                            if point.payload:
                                for key, value in list(point.payload.items())[:3]:
                                    val_str = str(value)[:70]
                                    if len(str(value)) > 70:
                                        val_str += "..."
                                    print(f"         - {key}: {val_str}")
                    
                    print()
                else:
                    print(f"   ❌ Koleksiyon bulunamadı (Status: {result.status_code})")
            except Exception as e:
                print(f"   ⚠️  Hata: {str(e)[:100]}")
        
        return True
            
    except Exception as e:
        print(f"\n❌ BAĞLANTI HATASI: {e}")
        return False

if __name__ == "__main__":
    success = check_qdrant()
    sys.exit(0 if success else 1)
