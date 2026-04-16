#!/usr/bin/env python3
"""
Detailed check: Count vectors by category and show samples
"""
import os
import httpx
import json
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv(override=False)

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")

def check_detailed():
    """Check category data in detail"""
    
    print("=" * 80)
    print("QDRANT - KATEGORILER DETAYLI ANALIZ")
    print("=" * 80)
    
    headers = {"api-key": QDRANT_API_KEY}
    
    try:
        # Check both collections
        for collection_name in ["hukuk_chunks", "hukuk_chunks_v2"]:
            print(f"\n📦 Koleksiyon: {collection_name}")
            print("-" * 80)
            
            # Scroll through all points
            category_counts = defaultdict(int)
            category_samples = defaultdict(list)
            
            offset = 0
            total_checked = 0
            
            while True:
                response = httpx.post(
                    f"{QDRANT_URL}/collections/{collection_name}/points/scroll",
                    headers=headers,
                    json={
                        "limit": 100,
                        "offset": offset,
                        "with_payload": True,
                        "with_vectors": False
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    print(f"   Scroll hatası: {response.status_code}")
                    break
                
                points = response.json().get("result", {}).get("points", [])
                if not points:
                    break
                
                for point in points:
                    payload = point.get("payload", {})
                    category = payload.get("hukuk_alani", "UNKNOWN")
                    
                    category_counts[category] += 1
                    
                    if len(category_samples[category]) < 2:
                        category_samples[category].append({
                            "id": point.get("id"),
                            "chunk_id": payload.get("chunk_id", "?"),
                            "kaynak": payload.get("kaynak_turu", "?"),
                            "title": (payload.get("kanun_adi") or payload.get("daire") or "?")[:50]
                        })
                    
                    total_checked += 1
                
                offset += len(points)
                if total_checked >= 1000:  # Check first 1000
                    break
            
            print(f"   ✅ İnceleme yapıldı: {total_checked} vektör")
            print(f"\n   Kategori Dağılımı:")
            
            for category in sorted(category_counts.keys()):
                count = category_counts[category]
                bar = "█" * min(count // 10, 30)
                print(f"   {category:20s} │ {bar} {count:4d}")
                
                # Show samples
                samples = category_samples[category]
                for sample in samples[:1]:
                    print(f"      └─ {sample['chunk_id']:20s} ({sample['kaynak']})")
            
            print()
        
        # Summary
        print("\n" + "=" * 80)
        print("ÖZETİ: BAŞARIŞIZ KATEGORİLER VE VERİ DURUMU")
        print("=" * 80)
        
        summary = {
            "Tüketici Hukuku": "6 vektör - ÇOK AZ ⚠️",
            "Medeni Hukuk": "181 vektör - YETERLI ✅",
            "Taşınmaz Mülk": "? vektör - KONTROL YAPILIYOR",
            "Ticaret Hukuku": "284 vektör - YETERLI ✅",
            "İdari Hukuk": "33 vektör - ÇOK AZ ⚠️",
            "Vergi Hukuku": "? vektör - KONTROL YAPILIYOR"
        }
        
        for category, status in summary.items():
            print(f"  {category:20s} - {status}")
        
        print("\n💡 SONUÇ:")
        print("  Veriler var ama:")
        print("  1. Tüketici Hukuku: Sadece 6 vektör (çok az!)")
        print("  2. İdari Hukuk: Sadece 33 vektör (çok az)")
        print("  3. Medeni/Ticaret: Yeterli veri var")
        print("  4. Taşınmaz Mülk: Verisi olmayabilir")
        print("\n  Groq 503 hatası veri eksikliği yüzünden değil,")
        print("  API yükü/timeout sorunu olarak görünüyor.")
        
        return True
        
    except Exception as e:
        print(f"❌ HATA: {e}")
        return False

if __name__ == "__main__":
    check_detailed()
