#!/usr/bin/env python3
"""
Check if specific legal categories have data in Qdrant collections
"""
import os
import httpx
from dotenv import load_dotenv

load_dotenv(override=False)

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")

# Keywords for each legal category
CATEGORY_KEYWORDS = {
    "Tüketici Hukuku": ["tuketici", "guarantee", "iacadeisi", "iadelik", "ayip"],
    "Medeni Hukuk": ["medeni", "miras", "vasily", "evlilik", "boşanma"],
    "Taşınmaz Mülk": ["tapu", "gayrimenkul", "arsa", "emlak", "ev satisi"],
    "Ticaret Hukuku": ["ticaret", "ortaklik", "şirket", "muhasebe", "sendika"],
    "İdari Hukuk": ["idari", "vasi", "devlet", "kamu", "emeklilik"],
    "Vergi Hukuku": ["vergi", "gelir", "kurumlar", "kdv", "muhasebe"]
}

def check_category_data():
    """Check Qdrant for data related to each category"""
    
    print("=" * 80)
    print("QDRANT - KATEGORI VERİ KONTROL")
    print("=" * 80)
    
    headers = {
        "api-key": QDRANT_API_KEY,
    }
    
    try:
        # Get collections
        print("\n1. Mevcut Koleksiyonlar:")
        response = httpx.get(
            f"{QDRANT_URL}/collections",
            headers=headers,
            timeout=30.0
        )
        
        if response.status_code == 200:
            collections = response.json().get("result", {}).get("collections", [])
            for col in collections:
                print(f"   - {col.get('name', '')}")
        
        # Check each category
        print("\n2. Kategori Verisi Kontrolü:\n")
        
        for category, keywords in CATEGORY_KEYWORDS.items():
            print(f"[{category}]")
            
            # Search in each collection for keywords
            for collection in ["hukuk_chunks", "hukuk_chunks_v2"]:
                found_count = 0
                
                try:
                    # Search with each keyword
                    for keyword in keywords[:3]:  # Test first 3 keywords
                        search_response = httpx.post(
                            f"{QDRANT_URL}/collections/{collection}/points/scroll",
                            headers=headers,
                            json={
                                "limit": 100,
                                "with_payload": True,
                                "with_vectors": False,
                                "filter": {
                                    "must": [
                                        {
                                            "key": "hukuk_alani",
                                            "match": {
                                                "value": category.replace(" ", "_").lower()
                                            }
                                        }
                                    ]
                                }
                            },
                            timeout=30.0
                        )
                        
                        if search_response.status_code == 200:
                            points = search_response.json().get("result", {}).get("points", [])
                            if points:
                                found_count += len(points)
                
                except Exception as e:
                    pass
                
                if found_count > 0:
                    print(f"   ✅ {collection}: {found_count}+ vektör bulundu")
            
            # Alternative: Direct payload search
            if found_count == 0:
                print(f"   ⚠️  Filter sorgusu başarısız, manuel kontrol yapılıyor...")
                
                for collection in ["hukuk_chunks", "hukuk_chunks_v2"]:
                    try:
                        scroll_response = httpx.post(
                            f"{QDRANT_URL}/collections/{collection}/points/scroll",
                            headers=headers,
                            json={
                                "limit": 1000,
                                "with_payload": True,
                                "with_vectors": False
                            },
                            timeout=30.0
                        )
                        
                        if scroll_response.status_code == 200:
                            points = scroll_response.json().get("result", {}).get("points", [])
                            
                            # Count matches
                            matches = 0
                            for point in points:
                                payload = point.get("payload", {})
                                hukuk_alani = str(payload.get("hukuk_alani", "")).lower()
                                kanun_adi = str(payload.get("kanun_adi", "")).lower()
                                
                                # Check category keywords
                                for keyword in keywords:
                                    if keyword.lower() in hukuk_alani or keyword.lower() in kanun_adi:
                                        matches += 1
                                        break
                            
                            if matches > 0:
                                print(f"   ✅ {collection}: {matches} matching vektör")
                    except:
                        pass
            
            print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ HATA: {e}")
        return False

if __name__ == "__main__":
    check_category_data()
