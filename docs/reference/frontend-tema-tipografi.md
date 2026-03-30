# Hak-Bul Frontend Tema ve Tipografi Rehberi

Bu doküman, Hak-Bul frontend'inde aktif olarak kullanılan renk paletini ve tipografi sistemini tek yerde toplar.

Ana kaynak dosyalar:
- `frontend/src/index.css`
- `frontend/tailwind.config.js`

Not:
- Tema için asıl kaynak `frontend/src/index.css` içindeki CSS değişkenleridir.
- `tailwind.config.js` içindeki renk uzantıları yardımcıdır; güncel görsel sistem CSS tokenları üzerinden yürür.

## Font Sistemi

Kullanılan font aileleri:
- Başlıklar: `Manrope`
- Gövde metni ve arayüz: `Inter`

Google Fonts import:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800&display=swap');
```

Tailwind eşlemesi:
- `font-sans` -> `Inter`
- `font-serif` -> `Manrope`

Kullanım önerisi:
- Logo, ana başlık, bölüm başlıkları: `font-serif`
- Mesajlar, butonlar, inputlar, sidebar, yardımcı metinler: `font-sans`

Global tipografi ayarları:

```css
body {
  line-height: 1.65;
  letter-spacing: 0.005em;
}
```

## Koyu Tema

### Ana yüzeyler

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--tema-bg` | `#0C0F1D` | Ana arka plan |
| `--tema-bg-gradient` | `linear-gradient(180deg, #0C0F1D 0%, #101428 100%)` | Sayfa arka plan geçişi |
| `--tema-panel` | `rgba(12, 15, 29, 0.94)` | Sidebar / panel |
| `--tema-surface` | `rgba(24, 29, 50, 0.96)` | Input / modal / yüzey |
| `--tema-card` | `rgba(24, 29, 50, 0.92)` | Kartlar |
| `--tema-bubble` | `rgba(26, 32, 56, 0.78)` | Mesaj / glass yüzeyler |

### Metinler

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--tema-text` | `#E8EAF4` | Ana metin |
| `--tema-text2` | `rgba(182, 188, 214, 0.92)` | İkincil metin |
| `--tema-muted` | `rgba(160, 168, 198, 0.78)` | Yardımcı metin |
| `--tema-dimmer` | `rgba(160, 168, 198, 0.66)` | Daha silik metin |
| `--tema-placeholder` | `rgba(160, 168, 198, 0.64)` | Placeholder |
| `--tema-title` | `#E8EAF4` | Büyük başlık |

### Accent ve etkileşim

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--tema-accent` | `#4F6AE8` | Ana vurgu rengi |
| `--tema-accent-soft` | `#7B8FEF` | Hover / badge / ikon |
| `--tema-accent-dark` | `#3B54C9` | Koyu vurgu |
| `--tema-send-btn` | `#4F6AE8` | Gönder / CTA butonu |
| `--tema-send-icon` | `#F7F8FF` | CTA üstü ikon / yazı |
| `--tema-soft-bg-subtle` | `rgba(79, 106, 232, 0.08)` | Hafif mavi yüzey |
| `--tema-soft-bg` | `rgba(79, 106, 232, 0.12)` | Seçili durum |
| `--tema-soft-bg-strong` | `rgba(79, 106, 232, 0.18)` | Güçlü vurgu zemini |
| `--tema-soft-hover` | `rgba(109, 132, 239, 0.22)` | Hover arka planı |

### Border ve gölgeler

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--tema-border` | `rgba(40, 47, 72, 0.9)` | Genel border |
| `--tema-border-card` | `rgba(40, 47, 72, 0.78)` | Kart border |
| `--tema-border-strong` | `rgba(109, 132, 239, 0.22)` | Güçlü ayırıcı |
| `--tema-border-focus` | `rgba(109, 132, 239, 0.38)` | Focus border |
| `--tema-shadow-focus` | `0 0 0 2px rgba(79,106,232,0.15)` | Focus halkası |

### Durum renkleri

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--tema-success-bg` | `rgba(34, 197, 94, 0.1)` | Başarı yüzeyi |
| `--tema-success-border` | `rgba(34, 197, 94, 0.24)` | Başarı border |
| `--tema-success-text` | `#9de2ad` | Başarı metni |
| `--tema-danger-bg` | `rgba(239, 68, 68, 0.1)` | Hata yüzeyi |
| `--tema-danger-border` | `rgba(239, 68, 68, 0.22)` | Hata border |
| `--tema-danger-text` | `#f3adad` | Hata metni |

## Açık Tema

### Ana yüzeyler

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--tema-bg` | `#F4F6FB` | Ana arka plan |
| `--tema-bg-gradient` | `linear-gradient(180deg, #F5F7FC 0%, #ECF0F9 100%)` | Sayfa arka plan geçişi |
| `--tema-panel` | `rgba(244, 246, 251, 0.96)` | Sidebar / panel |
| `--tema-surface` | `rgba(255, 255, 255, 0.98)` | Input / modal |
| `--tema-card` | `rgba(255, 255, 255, 0.96)` | Kart |
| `--tema-bubble` | `rgba(79, 106, 232, 0.05)` | Hafif vurgulu yüzey |

### Metinler

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--tema-text` | `#1A1F36` | Ana metin |
| `--tema-text2` | `rgba(58, 68, 105, 0.92)` | İkincil metin |
| `--tema-muted` | `rgba(85, 96, 138, 0.86)` | Yardımcı metin |
| `--tema-dimmer` | `rgba(100, 112, 158, 0.82)` | Daha silik metin |
| `--tema-placeholder` | `rgba(100, 112, 158, 0.74)` | Placeholder |
| `--tema-title` | `#2F45B0` | Başlık |

### Accent ve etkileşim

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--tema-accent` | `#4F6AE8` | Ana vurgu rengi |
| `--tema-accent-soft` | `#3B54C9` | İkincil vurgu |
| `--tema-accent-dark` | `#2F45B0` | Koyu vurgu |
| `--tema-send-btn` | `#4F6AE8` | Gönder / CTA butonu |
| `--tema-send-icon` | `#ffffff` | CTA üstü ikon / yazı |

## Kaynak Kartları

Hak-Bul içinde iki ana kaynak kartı rengi var:

### Kanun kartı

| Token | Değer |
| --- | --- |
| `--kanun-strip` | `rgba(79, 106, 232, 0.72)` |
| `--kanun-icon-bg` | `rgba(79, 106, 232, 0.14)` |
| `--kanun-icon` | `#A8B4F0` |
| `--kanun-badge-bg` | `rgba(79, 106, 232, 0.14)` |
| `--kanun-badge-text` | `rgba(200, 210, 245, 0.94)` |

### Yargıtay kartı

Yargıtay kartları özellikle mavi sistemden ayrılarak sıcak amber tonuyla işaretlenir.

| Token | Değer |
| --- | --- |
| `--yargitay-strip` | `rgba(217, 167, 62, 0.65)` |
| `--yargitay-icon-bg` | `rgba(217, 167, 62, 0.14)` |
| `--yargitay-icon` | `#E4C577` |
| `--yargitay-badge-bg` | `rgba(217, 167, 62, 0.14)` |
| `--yargitay-badge-text` | `rgba(240, 224, 180, 0.92)` |

## Tailwind Font ve Yardımcı Renkler

`frontend/tailwind.config.js` içindeki mevcut uzantılar:

```js
fontFamily: {
  sans: ['"Inter"', 'system-ui', 'sans-serif'],
  serif: ['"Manrope"', 'system-ui', 'sans-serif'],
}
```

Yardımcı renk grupları:

```js
navy: {
  950: '#0B0E22',
  900: '#121731',
  800: '#1B2139',
  700: '#272E4A',
  600: '#3D4671',
},
gold: {
  300: '#B9C2FF',
  400: '#8A95FF',
  500: '#5E6EFF',
  600: '#444FDD',
}
```

Not:
- Bu Tailwind renkleri projede yardımcı amaçla duruyor.
- Görsel tutarlılık için yeni bileşenlerde mümkünse doğrudan CSS tokenları kullanılmalı.

## Kullanım Kuralları

- Yeni komponentlerde arka plan için doğrudan hex yerine `var(--tema-...)` tokenları kullan.
- Başlıklar için `font-serif`, gövde metni için `font-sans` kullan.
- CTA, seçim, focus ve aktif durumlarda `--tema-accent` ailesinden çıkma.
- Yargıtay kartları dışında sıcak amber tonunu ana sistem rengi gibi yayma.
- Yeni hardcoded renk eklemek yerine önce mevcut tokenlardan biri uygun mu kontrol et.

## Hızlı Referans

En sık kullanılan tokenlar:

```css
background: var(--tema-bg);
background: var(--tema-surface);
color: var(--tema-text);
color: var(--tema-text2);
border-color: var(--tema-border-card);
background: var(--tema-send-btn);
color: var(--tema-send-icon);
```
