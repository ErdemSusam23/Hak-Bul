# Test Soru Seti Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arşivlenmiş legacy kopyaları koruyarak 6 hukuk kategorisinin aktif test soru setlerini vatandaş odaklı sorularla yenilemek.

**Architecture:** Her hedef kategori klasöründe mevcut `sorular.json` dosyası `legacy/` altına tarih damgalı isimle taşınır. Aynı klasörde yeni aktif `sorular.json` dosyası mevcut tek-kategori JSON şemasını koruyacak şekilde yazılır; test pipeline'ı dosya yolu değiştirilmeden çalışmaya devam eder.

**Tech Stack:** JSON veri dosyaları, PowerShell dosya yapısı, `backend/test_api_otomatik.py`

---

### Task 1: Hedef Dosyaları ve Arşiv Yapısını Sabitle

**Files:**
- Modify: `backend/test_sorular/01_is_hukuku/sorular.json`
- Modify: `backend/test_sorular/02_medeni_hukuk/sorular.json`
- Modify: `backend/test_sorular/03_ceza_hukuku/sorular.json`
- Modify: `backend/test_sorular/05_tuketici_hukuku/sorular.json`
- Modify: `backend/test_sorular/13_usul_hukuku/sorular.json`
- Modify: `backend/test_sorular/14_genel_hukuk/sorular.json`
- Create: `backend/test_sorular/*/legacy/sorular_20260414.json`

- [ ] **Step 1: Hedef kategori klasörlerini doğrula**

Run:

```powershell
Get-ChildItem backend\test_sorular -Directory | Select-Object -ExpandProperty Name
```

Expected: `01_is_hukuku`, `02_medeni_hukuk`, `03_ceza_hukuku`, `05_tuketici_hukuku`, `13_usul_hukuku`, `14_genel_hukuk` dahil kategori klasörleri listelenir.

- [ ] **Step 2: Legacy adlandırmasını sabitle**

Archive target pattern:

```text
backend/test_sorular/<kategori>/legacy/sorular_20260414.json
```

Expected: Her aktif soru setinin değişim öncesi kopyası kategori altında tekil ve tarihli isimle korunur.

### Task 2: Vatandaş Odaklı Aktif Soru Setlerini Yaz

**Files:**
- Create: `backend/test_sorular/01_is_hukuku/sorular.json`
- Create: `backend/test_sorular/02_medeni_hukuk/sorular.json`
- Create: `backend/test_sorular/03_ceza_hukuku/sorular.json`
- Create: `backend/test_sorular/05_tuketici_hukuku/sorular.json`
- Create: `backend/test_sorular/13_usul_hukuku/sorular.json`
- Create: `backend/test_sorular/14_genel_hukuk/sorular.json`

- [ ] **Step 1: Tek kategori JSON yapısını koru**

Reference shape:

```json
{
  "İş Hukuku": [
    "Soru 1?",
    "Soru 2?"
  ]
}
```

Expected: Her dosya yalnızca bir kategori anahtarı ve 12 soruluk liste içerir.

- [ ] **Step 2: Soruları vatandaş talep örüntülerine göre güncelle**

Selection rule:

```text
Kıdem tazminatı, işten çıkarma, boşanma, nafaka, dolandırıcılık, icra itirazı,
mesafeli satış cayma hakkı, trafik cezası itirazı gibi yüksek frekanslı vatandaş soruları öne alınır.
```

Expected: Sorular tanımsal ders anlatımı yerine gerçek kullanım senaryolarına yaklaşır.

### Task 3: Pipeline Uyumunu ve Dokümantasyon İzini Doğrula

**Files:**
- Modify: `backend/test_sorular/README.md`
- Test: `backend/test_api_otomatik.py`

- [ ] **Step 1: README'ye legacy bilgisini ekle**

Required note:

```text
Aktif dosya her zaman ana klasördeki sorular.json'dır; eski setler legacy/ altında saklanır.
```

Expected: Sonraki düzenlemelerde hangi dosyanın canlı olduğu açık kalır.

- [ ] **Step 2: JSON yapısını doğrula**

Run:

```powershell
@'
import json
from pathlib import Path

targets = [
    Path("backend/test_sorular/01_is_hukuku/sorular.json"),
    Path("backend/test_sorular/02_medeni_hukuk/sorular.json"),
    Path("backend/test_sorular/03_ceza_hukuku/sorular.json"),
    Path("backend/test_sorular/05_tuketici_hukuku/sorular.json"),
    Path("backend/test_sorular/13_usul_hukuku/sorular.json"),
    Path("backend/test_sorular/14_genel_hukuk/sorular.json"),
]

for path in targets:
    data = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(data, dict) and len(data) == 1, path
    key = next(iter(data))
    assert isinstance(data[key], list) and len(data[key]) == 12, path
print("validated")
'@ | python -
```

Expected: `validated`

- [ ] **Step 3: Canlı dosyanın hangisi olduğunu not et**

Rule:

```text
test_api_otomatik.py yalnızca --sorular ile verilen dosyayı kullanır; verilmezse eski fallback olan backend/test_sorular.json kullanılır.
```

Expected: Kategori bazlı testte canlı dosya `backend/test_sorular/<kategori>/sorular.json` olarak kalır.
