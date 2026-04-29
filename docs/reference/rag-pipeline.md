# RAG Pipeline

Bu belge `backend/rag/*`, `backend/main.py` ve `/ask` - `/ask/stream` akışlarının güncel teknik özetidir.

## Genel Akış

```text
Kullanıcı sorusu
  -> gibberish kontrolü
  -> kategori tespiti
  -> query rewrite
  -> retrieval
  -> category penalty
  -> koşullu rerank
  -> score filter
  -> source dedupe
  -> source summary
  -> answer generation
```

## Adımlar

### 1. Gibberish Kontrolü

`pipeline._is_gibberish_query()` şu tip girişleri erken yakalar:
- klavye ezmesi
- aşırı uzun anlamsız tek token
- çok düşük sesli harf oranı

Bu durumda pipeline kaynak üretmez ve açıklayıcı reddetme yanıtı döner.

### 2. Kategori Tespiti

`get_kategorilendirici().kategorile()` keyword tabanlı çalışır.

Desteklenen 14 kategori:
- İş Hukuku
- Medeni Hukuk
- Ceza Hukuku
- Ticaret Hukuku
- Tüketici Hukuku
- Taşınmaz Mülk
- İdare Hukuku
- Vergi Hukuku
- Sosyal Güvenlik Hukuku
- Fikri Mülkiyet
- Bilişim Hukuku
- Anayasa Hukuku
- Usul Hukuku
- Genel Hukuk

### 3. Query Rewrite

`rewrite_query()` normal koşulda Groq `llama-3.1-8b-instant` ile kısa retrieval sorgusu üretir.

Rewrite atlanır:
- kullanıcı açık kanun / madde referansı verdiyse
- `MOCK_MODE` veya `MOCK_LLM` açıksa
- `GROQ_API_KEY` yoksa
- Groq hatası olursa

Fallback davranışı: orijinal soru kullanılır.

### 4. Retrieval

`retrieve_chunks()` aşağıdaki kaynakları kullanabilir:
- ana Qdrant collection
- opsiyonel kanun collection
- local JSON corpus fallback

Davranış özeti:
- Qdrant yapılandırılmamışsa ve fallback açıksa local corpus kullanılır.
- Qdrant sonuçları boşsa veya erişim hatası varsa local fallback devreye girebilir.
- Kanun / madde ipucu taşıyan sorgularda local kanun chunk'ları merge edilebilir.
- Sonuçlar `payload + skor` biçiminde taşınır.

### 5. Category Penalty

`apply_category_penalty()` beklenmeyen kanun chunk'larının skorunu düşürür.

Kurallar:
- sadece `kanun` türüne uygulanır
- beklenmeyen kanunlar varsayılan `x0.5` ceza alır
- `Genel` kategoride ceza uygulanmaz
- karar chunk'ları etkilenmez

### 6. Koşullu Rerank

`rerank_chunks()` yalnızca gerekli olduğunda çalışır.

Aktivasyon:
- `RERANKER_ENABLED=true`
- ilk retrieval sonucunun skoru `SCORE_THRESHOLD` altındaysa

Model:
- `BAAI/bge-reranker-v2-m3`

Not:
- Reranker sıralamayı değiştirir, fakat downstream eşikler için retrieval skoru korunur.

### 7. Score Filter

`filter_by_score()`:
- tamamen mulga maddeleri eler
- `SCORE_THRESHOLD` uygular
- eşik üstü sonuç yoksa en yüksek skorlu ilk 5 sonucu fallback olarak döndürür

Ek kural:
- tüm skorlar çok düşükse (`< 0.05`) kaynaklar tamamen bastırılır

### 8. Source Dedupe ve Summary

`_deduplicate_sources()` duplicate kaynakları kaldırır.

`_format_sources()` her kaynak için:
- başlık
- `metin_ozet`
- normalize edilmiş skor
- kanunsa resmi mevzuat URL'si
üretir.

Özet üretimi `query` ile örtüşen cümleleri tercih eder ve maksimum 280 karaktere kırpar.

### 9. Answer Generation

Chat answer:
- `generate_answer()`
- `generate_answer_stream()`
- model: `llama-3.3-70b-versatile`

Document answer:
- `generate_document_answer()`
- `generate_document_compare_answer()`
- aynı temel model kullanılır

Fallback:
- `MOCK_MODE`, `MOCK_LLM` veya `GROQ_API_KEY` yoksa extractive / document fallback çalışır.

## `/ask`

Akış:
- upstream kontrolü (`STRICT_UPSTREAMS=true` ise)
- `run_pipeline()`
- conversation çözümü
- auth ise `user_id`, değilse guest cookie çözümü
- `save_chat_pair()` ile chat history kaydı
- kaynak yoksa veya skor düşükse `weak_queries` kaydı

Response modeli `AskResponse`.

## `/ask/stream`

Akış:
- retrieval hazırlığı önce tamamlanır
- ilk event `meta`
- sonra `token` eventleri gelir
- başarılı bitişte `done`
- generation hatasında `error`

Başarılı sıra:
- `meta -> token* -> done`

## Health ve Warm-up

`main.py` startup'ında:
- retrieval model warm-up arka planda denenir
- başarısız warm-up uygulamayı kapatmaz, lazy-load devam eder

## Perf Logging

`HAKBUL_PERF_LOG=true` olduğunda loglanan başlıca adımlar:
- warm-up
- query rewrite
- retrieval
- category penalty
- rerank
- filter
- source formatting
- answer generation
- `/ask` ve `/ask/stream` toplam süreleri

Her istekte kısa bir `request_id` kullanılır.

## Önemli Ayarlar

| Ayar | Amaç |
|---|---|
| `STRICT_UPSTREAMS` | Fallback yerine hard-fail davranışı |
| `ALLOW_LOCAL_RETRIEVAL_FALLBACK` | Local corpus fallback aç/kapat |
| `RERANKER_ENABLED` | Koşullu rerank aç/kapat |
| `COLLECTION_KANUN_NAME` | İkinci kanun collection adı |
| `SCORE_THRESHOLD` | Kaynak eşik skoru |
| `HAKBUL_PERF_LOG` | Perf logları |

## Modeller

| İş | Model |
|---|---|
| Rewrite | `llama-3.1-8b-instant` |
| Chat / document generation | `llama-3.3-70b-versatile` |
| Embedding | `intfloat/multilingual-e5-base` |
| Reranker | `BAAI/bge-reranker-v2-m3` |
