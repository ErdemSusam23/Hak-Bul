#!/usr/bin/env python3
"""
Simple script to check Qdrant data using REST API directly
"""
import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv(override=False)

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")

def check_qdrant_rest():
    """Check Qdrant using REST API directly"""
    
    print("=" * 70)
    print("QDRANT KONTROL VE VERİ DURUMU (REST API)")
    print("=" * 70)
    
    if not QDRANT_URL or not QDRANT_API_KEY:
        print("❌ HATA: QDRANT_URL veya QDRANT_API_KEY ayarlanmamış!")
        return False
    
    print(f"\n📍 QDRANT URL: {QDRANT_URL}")
    
    headers = {
        "api-key": QDRANT_API_KEY,
    }
    
    try:
        # Check collections
        print("\n1️⃣ Koleksiyonlar Kontrol Ediliyor...")
        response = httpx.get(
            f"{QDRANT_URL}/collections",
            headers=headers,
            timeout=30.0
        )
        
        if response.status_code == 200:
            result = response.json()
            collections = result.get("result", {}).get("collections", [])
            print(f"   ✅ {len(collections)} Koleksiyon Bulundu:")
            
            for col in collections:
                col_name = col.get("name", "")
                print(f"\n   📦 Koleksiyon: {col_name}")
                
                # Get collection info
                info_response = httpx.get(
                    f"{QDRANT_URL}/collections/{col_name}",
                    headers=headers,
                    timeout=30.0
                )
                
                if info_response.status_code == 200:
                    info_data = info_response.json()
                    result_data = info_data.get("result", {})
                    points_count = result_data.get("points_count", 0)
                    
                    print(f"      📊 Vektör Sayısı: {points_count}")
                    
                    if points_count > 0:
                        # Get sample points
                        scroll_response = httpx.post(
                            f"{QDRANT_URL}/collections/{col_name}/points/scroll",
                            headers=headers,
                            json={
                                "limit": 3,
                                "with_payload": True,
                                "with_vectors": False
                            },
                            timeout=30.0
                        )
                        
                        if scroll_response.status_code == 200:
                            scroll_data = scroll_response.json()
                            points = scroll_data.get("result", {}).get("points", [])
                            
                            print(f"\n      📖 Veri Örnekleri (ilk 3 vektör):")
                            for idx, point in enumerate(points, 1):
                                print(f"\n         Vektör #{idx}:")
                                print(f"         - ID: {point.get('id')}")
                                
                                payload = point.get("payload", {})
                                if payload:
                                    for key, value in list(payload.items())[:3]:
                                        val_str = str(value)[:60]
                                        if len(str(value)) > 60:
                                            val_str += "..."
                                        print(f"         - {key}: {val_str}")
            
            print("\n")
            return True
        else:
            print(f"   ❌ Hata: Status {response.status_code}")
            print(f"   Mesaj: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ BAĞLANTI HATASI: {e}")
        return False

if __name__ == "__main__":
    success = check_qdrant_rest()
    sys.exit(0 if success else 1)
