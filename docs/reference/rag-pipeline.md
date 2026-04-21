# RAG Pipeline

Bu belge `backend/rag/*` ve `/ask`, `/ask/stream` akislarinin guncel teknik ozetidir.

---

## Genel Akis

```text
Kullanici sorusu
      |
      v
[1] kategorize et
      |
      v
[2] query rewrite
      |
      v
[3] retrieval
      |   - default Qdrant collection
      |   - opsiyonel law collection merge
      |   - local corpus fallback / law merge
      v
[4] category penalty
      |
      v
[5] conditional rerank
      |
      v
[6] score filter + source dedupe
      |
      v
[7] answer generation
      |
      v
[8] source summary + response format
```

| Adim | Fonksiyon | Girdi | Cikti | Servis |
|---|---|---|---|---|
| 1 | `get_kategorilendirici().kategorile()` | Kullanici sorusu | 14 kategoriden biri | Uygulama ici |
| 2 | `rewrite_query()` | Kullanici sorusu | Retrieval icin kisa sorgu veya orijinal soru | Groq llama-3.1-8b-instant |
| 3 | `retrieve_chunks()` | Rewrite edilmis sorgu | Qdrant/local corpus chunk listesi | Qdrant Cloud + local corpus |
| 4 | `apply_category_penalty()` | Chunk listesi + kategori | Beklenmeyen kanunlara soft penalty uygulanmis liste | Uygulama ici |
| 5 | `rerank_chunks()` | Chunk listesi + orijinal soru | Gerektiginde yeniden siralanmis liste | Uygulama ici |
| 6 | `filter_by_score()` | Chunk listesi | Esik uygulanmis, mulga filtrelenmis liste | Uygulama ici |
| 7 | `generate_answer()` / `generate_answer_stream()` | Filtreli chunk'lar + orijinal soru | TR/EN yanit veya token akisi | Groq llama-3.3-70b-versatile |
| 8 | `_format_sources()` + response modelleri | Chunk metadata + yanit | `AskResponse` veya SSE event payload'lari | Uygulama ici |

---

## Adim Adim Detay

### 1. Kategori Tespiti

- `pipeline.retrieve_context()` ilk adimda soruyu keyword tabanli kategorizer'dan gecirir.
- Kategori bilgisi retrieval cezalari, admin istatistikleri ve weak query loglarinda kullanilir.
- Kategori kumesi 14 basliktan olusur: Is, Medeni, Ceza, Ticaret, Tuketici, Tasinmaz Mulk, Idare, Vergi, Sosyal Guvenlik, Fikri Mulkiyet, Bilisim, Anayasa, Usul, Genel.

### 2. Query Rewriting

- `rewrite_query()` normal durumda Groq `llama-3.1-8b-instant` ile retrieval dostu kisa bir sorgu uretir.
- Kullanici sorusunda acik kanun/madde referansi varsa rewrite atlanir ve orijinal soru kullanilir.
- `MOCK_MODE`, `MOCK_LLM` veya eksik `GROQ_API_KEY` durumunda rewrite atlanir.
- Groq hatasi, asiri uzun cikti veya tekrarli cikti gorulurse pipeline kirilmaz; orijinal sorguyla devam edilir.

### 3. Retrieval

`retrieve_chunks()` uc kaynagi birlestirebilir:

1. Varsayilan Qdrant collection (`settings.COLLECTION_NAME`)
2. Opsiyonel law collection (`settings.COLLECTION_KANUN_NAME`)
3. Local JSON corpus (`backend/data/processed_backup_*`)

Davranis kurallari:

- Default collection her zaman ilk sorgulanan kaynaktir.
- `COLLECTION_KANUN_NAME` set edilirse ikinci bir Qdrant sorgusu yapilir; kanun sonuclari varsa merge edilerek one alinabilir.
- Qdrant hic yapilandirilmamissa ve `ALLOW_LOCAL_RETRIEVAL_FALLBACK=true` ise yalnizca local corpus kullanilir.
- Law collection kullanilamazsa, kanun/madde ipucu tasiyan sorgularda local corpus'tan kanun chunk'lari merge edilir.
- Qdrant cagrisi exception verirse ve local fallback aciksa local corpus ile devam edilir.
- Ham payload korunur; mulga filtreleme ve source ozetleme sonraki adimlarda yapilir.

### 4. Category Penalty

- `apply_category_penalty()` yalnizca `kanun` turundeki chunk'lari etkiler.
- `KATEGORI_EXPECTED_LAWS` disindaki kanunlarin skoru varsayilan olarak `x0.5` ile dusurulur.
- Yargitay kararlari ve `Genel` kategori etkilenmez.
- Penalty sonrasi liste yeniden skora gore siralanir.

### 5. Conditional Rerank

`rerank_chunks()` her istekte zorunlu calismaz.

Guncel kurallar:

- `RERANKER_ENABLED=false` ise rerank hic uygulanmaz.
- `RERANKER_ENABLED=true` olsa bile sadece ilk retrieval sonucunun skoru `SCORE_THRESHOLD` altindaysa rerank devreye girer.
- Rerank adayi sayisi `min(len(chunks), max(8, max_kaynak + 3))` ile sinirlanir.
- Sira cross-encoder tarafindan belirlenir; `skor` alani ise downstream filtreler bozulmasin diye retrieval skorunu korur.
- Model: `BAAI/bge-reranker-v2-m3`

### 6. Score Filter ve Weak Query

- `filter_by_score()` once tamamen mulga maddeleri eler.
- Sonra `SCORE_THRESHOLD` esigi uygulanir.
- Esik ustunde hic sonuc kalmazsa, en yuksek skorlu ilk 5 chunk fallback olarak dondurulur.
- `/ask` tarafinda `kaynaklar` bossa veya `max_skor < SCORE_THRESHOLD` ise sorgu `weak_queries` tablosuna loglanabilir.

### 7. Answer Generation

- `generate_answer()` ve `generate_answer_stream()` Groq `llama-3.3-70b-versatile` kullanir.
- Sistem prompt'u kaynak disi madde/hukum uydurmayi yasaklar.
- Kritik ve kisisel hukuki senaryolarda ALO 182 yonlendirmesi eklenebilir.
- `generate_answer_stream()` ayni cevabi token token yield eder; `/ask/stream` bu fonksiyonu kullanir.
- Basarili SSE akisinda `done`, generator hatasinda ise `error` event'i gonderilip stream kapanir.

### 8. Source Summary

`pipeline._format_sources()` her kaynak icin `metin_ozet` uretir.

Kurallar:

- Cumleler query token ortusmesine gore puanlanir.
- Sure odakli sorularda sayi ve zaman birimi iceren cumleler ek puan alir.
- En ilgili en fazla 3 cumle secilir.
- Ozet 280 karaktere kirpilir.
- API yanitinda tam `metin` yerine `metin_ozet` gosterilir.

---

## `/ask` ve `/ask/stream`

### `/ask`

- `run_pipeline()` cagrilir.
- Sonuc chat history'ye kaydedilir.
- Basarili durumda tek parca `AskResponse` JSON doner.

### `/ask/stream`

- Retrieval ve kaynak hazirligi once tamamlanir.
- Ardindan SSE uzerinden asagidaki event tipleri gonderilir:
  - `meta`
  - `token`
  - `error`
  - `done`
- Basarili akista event sirasi `meta -> token* -> done` seklindedir.
- Generator hatasinda `error` emit edilir ve stream kapanir; `done` gonderilmez.

---

## Hata Yonetimi

| Senaryo | Davranis | HTTP |
|---|---|---|
| Groq rewrite hatasi | Orijinal sorguya duser | `200` akis devam eder |
| Groq generation hatasi (`/ask`) | RuntimeError -> HTTP katmani | `500` veya `503` |
| Groq generation hatasi (`/ask/stream`) | `error` SSE event'i gonderilir | `200` stream kapanisi |
| Qdrant yok, local fallback acik | Local corpus ile devam | `200` |
| Qdrant yok, local fallback kapali | Kontrollu hata | `503` |
| Esik ustu chunk yok | En yuksek skorlu ilk 5 ile devam | `200` |
| `STRICT_UPSTREAMS=true` ve upstream kapali | Sessiz fallback yerine hard-fail | `503` |

Production hard-fail kombinasyonu:

```env
STRICT_UPSTREAMS=true
ALLOW_LOCAL_RETRIEVAL_FALLBACK=false
```

---

## Isletim Notlari

### Retrieval warm-up

- FastAPI startup sirasinda `start_retrieval_warmup()` arka planda embedding modelini yuklemeyi dener.
- Warm-up basarisiz olursa uygulama acilmaz; ilk gercek retrieval isteginde lazy-load yapilir.

### Performans loglari

Asagidaki flag acik oldugunda asama bazli sure loglari `uvicorn.error` logger'ina yazilir:

```env
HAKBUL_PERF_LOG=true
```

Loglanan baslica noktalar:

- retrieval model warm-up
- query rewrite sureleri ve fallback nedenleri
- retrieval, category penalty, rerank, filter ve source format sureleri
- answer generation ve streaming sureleri
- `/ask`, `/ask/stream` ve `save_chat_pair()` toplam sureleri

Her istek zincirine kisa bir `request_id` eklenir; boylece ayni istegin rewrite, retrieval, generation ve stream loglari birlikte izlenebilir.

---

## Modeller ve Ayarlar

| Alan | Deger |
|---|---|
| Rewrite modeli | `llama-3.1-8b-instant` |
| Generation modeli | `llama-3.3-70b-versatile` |
| Embedding modeli | `intfloat/multilingual-e5-base` |
| Reranker modeli | `BAAI/bge-reranker-v2-m3` |
| Esik | `SCORE_THRESHOLD` |

Onemli flag'ler:

- `STRICT_UPSTREAMS`
- `ALLOW_LOCAL_RETRIEVAL_FALLBACK`
- `RERANKER_ENABLED`
- `COLLECTION_KANUN_NAME`
- `HAKBUL_PERF_LOG`

