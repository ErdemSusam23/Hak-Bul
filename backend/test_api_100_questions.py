#!/usr/bin/env python3
"""
Comprehensive system test: Send 100 Turkish legal questions and evaluate responses
"""
import httpx
import json
import time
from datetime import datetime
from typing import Optional

API_URL = "http://127.0.0.1:8000"

# Test questions organized by legal category
TEST_QUESTIONS = {
    "İş Hukuku": [
        "İşçi hakları nelerdir?",
        "İş sözleşmesinin iptal şartları nedir?",
        "Asgari ücret hakkında hukuki düzenlemeler nelerdir?",
        "Gece vardiyası başına ek ödeme ne kadar?",
        "İşten çıkarmanın yasal koşulları nelerdir?",
        "İşyerinde mobbing nedir ve ne kadar cezası var?",
        "Paralı izin hakkı nedir?",
        "Kurban Bayramı izni kaç gündür?",
        "Emeklilik hakkını etkileyen faktörler nelerdir?",
        "Sendika kurma hakkı nedir?",
    ],
    "Kira Hukuku": [
        "Kira sözleşmesinin en kısa süresi ne kadardir?",
        "Ev sahibi kirayı ne kadar artırabilir?",
        "Kira borcunun tahsil şekli nedir?",
        "Kiracı çıkarma davası hangi koşullarda açılır?",
        "Ev sahibi yenilenme hakkını kullandığında ne olmaktadır?",
        "Depozito iadesinde süre ne kadardir?",
        "Dayanıklı tüketim malına kaç yıllık garanti vardır?",
        "Kira sözleşmesi yazılı olmak zorunda mı?",
        "Arabulucu olmadan davaya başlanabilir mi?",
        "Kira uyuşmazlığı hangi mahkemede görülür?",
    ],
    "Aile Hukuku": [
        "Boşanma davası nasıl açılır?",
        "Velayet hakkı kimindir?",
        "Nafaka ödeme yükümlülüğü ne zaman sona erer?",
        "Evlilik birliğinin mal rejimi nedir?",
        "Müşterek hayatın temelini sarsan nedenler nelerdir?",
        "Evlilik sırasında edinilen mal ortak maldır mı?",
        "Evlenme yaşı kaçtır?",
        "Miras hakkı kim tarafından kullanılır?",
        "Evlat edinme şartları nelerdir?",
        "Ergin çocuk nafakası devam eder mi?",
    ],
    "Ceza Hukuku": [
        "Hırsızlık cezası ne kadardir?",
        "Kasten yaralama cezası ne kadardir?",
        "Dövme hadisesi ne kadar cezaya tabi?",
        "Tehdit suçunun cezası ne kadardir?",
        "Dolandırıcılık suçunun en az cezası ne kadardir?",
        "Cinsel istismar suçunun cezası nedir?",
        "İnternet aracılığıyla suç işlemenin cezası nedir?",
        "Uyuşturucu kullanma cezası ne kadardir?",
        "Özel hayata tecavüz suçu nedir?",
        "Gerekli taksir nedir?",
    ],
    "Tüketici Hukuku": [
        "Tüketici nedir?",
        "Ürün garantisi kaç yıl geçerlidir?",
        "Peşin satış hakkında neler bilinmelidir?",
        "Çevrimiçi alışverişte ödeme işlemlerine ne denir?",
        "Eksik veya arızalı ürün almışsam ne yapabilirim?",
        "Iadeli satış hakkı ne kadardir?",
        "Hiç kullanılmayan ürünü geri verebilir miyim?",
        "Verilen malın fiyatı düşmüşse ne yapabilirim?",
        "Şikayeti nereye bildirebilirim?",
        "Kötü niyetli reklamın cezası ne kadardir?",
    ],
    "Medeni Hukuk": [
        "Geri alınamaz vasi tayini nasıl yapılır?",
        "Mirastan mahrumiyet koşuları nelerdir?",
        "Vasilik müessesesi nedir?",
        "Yetim mirasının yönetimi nasıl olmaktadır?",
        "Miktar mirasının şartları nelerdir?",
        "İdari ceza nedir?",
        "Mektuplaşmaya dayanan boşanma hakkında ne yapılması gerekir?",
        "Evlenme sözleşmesi geçerli mi?",
        "Evlenme mahzuru nedir?",
        "Hangi evlilikler bağlama engeli oluştur?",
    ],
    "Taşınmaz Mülk": [
        "Tapu almak için gerekli şartlar nelerdir?",
        "Arsa satın aldığımda gerekli belgeler nelerdir?",
        "Ev kirase vermek istiyorsam ne yapmalıyım?",
        "Miras yoluyla aldığım evi satamıyor muyum?",
        "Emlak danışmanı kontrası zorunlu mu?",
        "Gayrimenkul vergisi nasıl hesaplanır?",
        "Hazine arazisine ilişkin hükümler nelerdir?",
        "Imar planı değiştirilirse mülk sahibinin hakkı ne olur?",
        "Sınır aşan inşaat yapıldığında ne yapılmalı?",
        "Gayrimenkul satışında vergi oranı nedir?",
    ],
    "Ticaret Hukuku": [
        "Ticari işletme icrası için neler gereklidir?",
        "Ticaret unvanı nedir?",
        "Komandit şirketi nedir?",
        "Anonim şirketin yönetim organları nelerdir?",
        "Ortaklığın kâr ve zarar dağılımı nasıl yapılır?",
        "Senedin tanımı nedir?",
        "Poliçe nedir?",
        "Rehin hakkı nedir?",
        "Lisans anlaşması nedir?",
        "Franchise nedir?",
    ],
    "İdari Hukuk": [
        "Vasi makamı nedir?",
        "Kamu hukuku ve özel hukuk farkı nedir?",
        "İdarenin işlemleri iptal ettirilir mi?",
        "Aşkın yetkiye karşı ne yapılabilir?",
        "Gayrı meşru işlemler nasıl düzeltilir?",
        "İmiş amaç nedir?",
        "Hükmü fesahlık koşuları nelerdir?",
        "Memurun disipliner cezası nedir?",
        "Kamu görevlisine yaşlılık aylığı verilir mi?",
        "Denetimcilik nedir?",
    ],
    "Vergi Hukuku": [
        "Gelir vergisi oranı nedir?",
        "Kurumlar vergisinin oranı ne kadardir?",
        "KDV nedir?",
        "Damga vergisi hangi işlemlere uygulanır?",
        "Vergi müfettişinin görevleri nelerdir?",
        "Vergi kaçakçılığının cezası ne kadardir?",
        "Vergi incelemesi başlama koşulları nelerdir?",
        "Vergi müzayedesi nasıl yapılır?",
        "Vergi borcu kimden tahsil edilir?",
        "Ayar kalemi nedir?",
    ],
}

class TestResults:
    def __init__(self):
        self.total_questions = 0
        self.successful_responses = 0
        self.failed_responses = 0
        self.responses = []
        self.errors = []
        self.timing = []
        self.start_time = None
        self.end_time = None
    
    def add_response(self, question, answer, category, response_time, success=True, error=None):
        self.total_questions += 1
        if success:
            self.successful_responses += 1
            self.responses.append({
                "question": question,
                "answer": answer[:500] if answer else "",  # First 500 chars
                "category": category,
                "response_time": response_time,
                "success": True
            })
        else:
            self.failed_responses += 1
            self.errors.append({
                "question": question,
                "error": error,
                "category": category
            })
        
        self.timing.append(response_time)
    
    def get_stats(self):
        avg_time = sum(self.timing) / len(self.timing) if self.timing else 0
        return {
            "total": self.total_questions,
            "successful": self.successful_responses,
            "failed": self.failed_responses,
            "success_rate": f"{(self.successful_responses / self.total_questions * 100):.1f}%" if self.total_questions > 0 else "0%",
            "avg_response_time": f"{avg_time:.2f}s",
            "min_response_time": f"{min(self.timing):.2f}s" if self.timing else "N/A",
            "max_response_time": f"{max(self.timing):.2f}s" if self.timing else "N/A",
        }

def send_question(client: httpx.Client, question: str, category: str = "") -> tuple[Optional[str], float, Optional[str]]:
    """Send question to API and return response, time taken, and error"""
    try:
        start = time.time()
        response = client.post(
            f"{API_URL}/ask",
            json={"soru": question},
            timeout=60.0
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            answer = data.get("cevap", "")
            return answer, elapsed, None
        else:
            return None, elapsed, f"Status {response.status_code}: {response.text[:100]}"
    except Exception as e:
        return None, 0, str(e)

def run_tests():
    """Run all tests"""
    print("=" * 80)
    print("HAK-BÜL SYSTEM TEST - 100 Turkish Legal Questions")
    print("=" * 80)
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    results = TestResults()
    results.start_time = time.time()
    
    # Flatten all questions
    all_questions = []
    for category, questions in TEST_QUESTIONS.items():
        for q in questions:
            all_questions.append((q, category))
    
    print(f"[STAT] Total Questions to Test: {len(all_questions)}")
    print(f"[STAT] Categories: {len(TEST_QUESTIONS)}")
    print()
    
    # Send questions
    with httpx.Client() as client:
        for idx, (question, category) in enumerate(all_questions, 1):
            print(f"[{idx:3d}/{len(all_questions)}] [{category:15s}] ", end="", flush=True)
            
            answer, elapsed, error = send_question(client, question, category)
            
            if error:
                print(f"[FAIL] FAILED ({elapsed:.2f}s)")
                results.add_response(question, "", category, elapsed, False, error)
            else:
                status = "[OK]" if answer and len(answer) > 50 else "[WARN] "
                print(f"{status} OK ({elapsed:.2f}s) - {len(answer) if answer else 0} chars")
                results.add_response(question, answer, category, elapsed, True)
            
            # Small delay between requests
            time.sleep(0.5)
    
    results.end_time = time.time()
    
    print()
    print("=" * 80)
    print("TEST RESULTS SUMMARY")
    print("=" * 80)
    
    stats = results.get_stats()
    print(f"[OK] Successful: {stats['successful']}/{stats['total']}")
    print(f"[FAIL] Failed: {stats['failed']}/{stats['total']}")
    print(f"[STAT] Success Rate: {stats['success_rate']}")
    print()
    print("[TIME]  Response Times:")
    print(f"   Average: {stats['avg_response_time']}")
    print(f"   Min: {stats['min_response_time']}")
    print(f"   Max: {stats['max_response_time']}")
    print()
    print(f"[DURATION] Total Test Duration: {results.end_time - results.start_time:.1f}s")
    
    # Category breakdown
    print()
    print("=" * 80)
    print("RESULTS BY CATEGORY")
    print("=" * 80)
    
    category_stats = {}
    for response in results.responses:
        cat = response["category"]
        if cat not in category_stats:
            category_stats[cat] = {"total": 0, "success": 0, "avg_time": 0, "times": []}
        category_stats[cat]["total"] += 1
        category_stats[cat]["success"] += 1
        category_stats[cat]["times"].append(response["response_time"])
    
    for cat in sorted(TEST_QUESTIONS.keys()):
        if cat in category_stats:
            stats = category_stats[cat]
            avg_time = sum(stats["times"]) / len(stats["times"]) if stats["times"] else 0
            success_rate = (stats["success"] / stats["total"] * 100) if stats["total"] > 0 else 0
            print(f"{cat:20s} - {stats['success']:2d}/{stats['total']:2d} [OK] ({success_rate:5.1f}%) - Avg: {avg_time:.2f}s")
    
    # Sample responses
    if results.responses:
        print()
        print("=" * 80)
        print("SAMPLE RESPONSES (First 3)")
        print("=" * 80)
        for idx, resp in enumerate(results.responses[:3], 1):
            print()
            print(f"Q{idx}: {resp['question']}")
            print(f"Category: {resp['category']}")
            print(f"Response Time: {resp['response_time']:.2f}s")
            print(f"Answer Preview:")
            print(f"{resp['answer'][:300]}...")
            print("-" * 80)
    
    # Errors
    if results.errors:
        print()
        print("=" * 80)
        print(f"ERRORS ({len(results.errors)})")
        print("=" * 80)
        for error in results.errors[:5]:
            print(f"Q: {error['question']}")
            print(f"Error: {error['error']}")
            print()
    
    # Save detailed results
    output_file = "test_results_detailed.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "summary": stats,
            "by_category": {cat: {"total": cat_stats["total"], "success": cat_stats["success"]} 
                           for cat, cat_stats in category_stats.items()},
            "sample_responses": [r for r in results.responses[:5]],
            "errors": results.errors
        }, f, ensure_ascii=False, indent=2)
    
    print()
    print(f"[FILE] Detailed results saved to: {output_file}")

if __name__ == "__main__":
    run_tests()
