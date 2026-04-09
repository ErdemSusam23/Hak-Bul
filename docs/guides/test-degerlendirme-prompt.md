# 🤖 Hak-Bul Test Sonuçları — AI Değerlendirme Prompt Şablonu

## Ne Zaman Kullanılır?

`test_api_otomatik.py` çalıştırıldıktan sonra `test_results/` altındaki JSON dosyasını alıp yapay zekaya (ChatGPT, Claude, Gemini vb.) yapıştırarak niteliksel değerlendirme yapmak için kullanılır.

---

## Prompt Şablonu

Aşağıdaki metni kopyala, `{JSON_VERI}` kısmını test çıktı JSON'ının içeriği ile değiştir ve AI'a gönder.

---

```
Sen bir Türk hukuku uzmanı ve RAG (Retrieval-Augmented Generation) sistem değerlendiricisisin.
Aşağıda bir Türk hukuku asistanının (Hak-Bul) test sonuçları var.
Her test kaydında bir hukuk sorusu, modelin cevabı, getirilen kaynaklar ve otomatik metrikler bulunuyor.

Lütfen aşağıdaki 4 başlıkta değerlendirme yap:

## 1. Kategori Tespit Doğruluğu
- Model soruları doğru kategorilere sınıflandırmış mı?
- Yanlış sınıflandırılan sorular hangileri? Ortak bir patern var mı?

## 2. Cevap Kalitesi (Answer Relevance)
- Cevaplar soruyu doğrudan yanıtlıyor mu, yoksa saçmalıyor mu?
- Cevaplar çok kısa (<200 karakter) veya aşırı uzun (>5000 karakter) mi?
- Hangi kategorilerdeki cevaplar en zayıf?

## 3. Kaynak Alaka Düzeyi (Context Precision)
- Getirilen kaynaklar (kanun maddeleri, Yargıtay kararları) soruyla alakalı mı?
- Ortalama kaynak skoru düşük (<0.7) olan sorular var mı?
- Kaynaklar güncel ve doğru kanunlara mı atıf yapıyor?

## 4. Halüsinasyon (Faithfulness)
- Model kaynaklarda olmayan bilgi uyduruyor mu?
- Yanlış kanun maddesi veya yanlış ceza süresi veriyor mu?
- "Bu konu profesyonel hukuki destek gerektirmektedir" uyarısı uygun yerlerde mi çıkıyor?

## Özet Skor Tablosu
Her kategori için 0-10 arasında puan ver:

| Kategori | Kategori Tespit | Cevap Kalitesi | Kaynak Alaka | Halüsinasyon Yokluğu | GENEL |
|---|---|---|---|---|---|
| ... | /10 | /10 | /10 | /10 | /10 |

## İyileştirme Önerileri
- En kritik 3 sorun nedir?
- Hangi kategorilerde retrieval (kaynak getirme) iyileştirilmeli?
- Hangi kategorilerde generator (cevap üretme) prompt'u düzeltilmeli?
- Vektör veritabanına hangi hukuk alanlarından daha fazla veri eklenmeli?

---

TEST SONUÇLARI (JSON):

{JSON_VERI}
```

---

## Hızlı Batch Kullanımı (Kategori Bazlı)

70 soru tek seferde sığmazsa, kategorilere bölerek gönder:

```
Aşağıda Hak-Bul hukuk asistanının {KATEGORI_ADI} kategorisindeki test sonuçları var.

Bu kategorideki cevapları değerlendir:
1. Cevap soruyu yanıtlıyor mu?
2. Kaynaklar alakalı mı?
3. Halüsinasyon var mı?
4. Puan (0-10)

SONUÇLAR:

{ILGILI_KATEGORININ_JSON_ARRAYI}
```

## JSON'dan İlgili Kategoriyi Çıkarma

Python ile tek komut:

```bash
cd backend
python -c "
import json
veri = json.load(open('test_results/08042026/test_sonuclari_YYYYMMDD_HHMMSS.json', encoding='utf-8'))
kat_sonuclar = [s for s in veri['sonuclar'] if s['kategori_beklenen'] == 'Ceza Hukuku']
print(json.dumps({'kategori': 'Ceza Hukuku', 'sonuclar': kat_sonuclar}, ensure_ascii=False, indent=2))
"
```

---

## Değerlendirme Sıklığı Önerisi

| Durum | Sıklık |
|---|---|
| Yeni veri yüklendiyse | Hemen test et |
| RAG pipeline değiştiyse | Hemen test et |
| Normal geliştirme | Haftada 1 |
| Production öncesi | Zorunlu |

---

## Skor Yorumlama

| Metrik | 🟢 İyi | 🟡 Orta | 🔴 Kötü |
|---|---|---|---|
| **Kategori Doğruluğu** | ≥ %90 | %70-89 | < %70 |
| **Ort. Cevap Uzunluğu** | 500-3000 chr | 200-499 veya 3001-5000 | < 200 veya > 5000 |
| **Ort. Kaynak Skoru** | ≥ 0.75 | 0.60-0.74 | < 0.60 |
| **AI Genel Puan** | ≥ 8/10 | 6-7/10 | < 6/10 |
