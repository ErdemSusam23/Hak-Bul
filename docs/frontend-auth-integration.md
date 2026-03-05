# Frontend Auth Integration Guide

Bu dokuman frontend ekibinin backend JWT auth akisina hizli entegrasyon yapabilmesi icin hazirlanmistir.

## Base URL

- Local: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

## Eklenen Auth Endpointleri

### 1) Register

- `POST /auth/register`
- Body:

```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

- Basarili cevap (`201`):

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user"
}
```

- Olasi hatalar:
- `409`: Email zaten kayitli.
- `422`: Validation hatasi (email/password format-uzunluk).

### 2) Login

- `POST /auth/login`
- Body:

```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

- Basarili cevap (`200`):

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "bearer"
}
```

- Olasi hatalar:
- `401`: `Invalid credentials.`
- `422`: Validation hatasi.

### 3) Refresh (Rotation aktif)

- `POST /auth/refresh`
- Body:

```json
{
  "refresh_token": "<refresh_token>"
}
```

- Basarili cevap (`200`):

```json
{
  "access_token": "<new_jwt>",
  "refresh_token": "<new_refresh_jwt>",
  "token_type": "bearer"
}
```

Not: Refresh token rotation aktif. Yani refresh cagrisi sonrasi eski refresh token gecersiz olur. Client yeni refresh tokeni eski degerin uzerine yazmalidir.

- Olasi hatalar (`401`):
- `Invalid or expired token.`
- `Refresh token revoked.`
- `Refresh token expired.`
- `Refresh token not recognized.`
- `Invalid refresh token.`

### 4) Logout

- `POST /auth/logout`
- Body:

```json
{
  "refresh_token": "<refresh_token>"
}
```

- Basarili cevap: `204 No Content`

## Frontend'in Yapmasi Gerekenler

### Token saklama

- `access_token`: memory state (onerilen) veya guvenli storage.
- `refresh_token`: logout/refresh icin saklanmali.
- XSS riskine karsi localStorage kullaniliyorsa dikkatli olun.

### API cagrilarinda Authorization

- Protected endpointlerde header:
- `Authorization: Bearer <access_token>`

Su an `/ask`, `/search`, `/health` mevcut haliyle public davranir; ileride protected olabilir.

### Guest chat davranisi

- `/ask` public oldugu icin login olmadan da kullanilabilir.
- Login olmayan kullanicida backend `guest_session_id` uretir ve response icinde doner.
- Frontend bu `guest_session_id` degerini saklayip sonraki `/ask` cagrilarinda gondermelidir.
- Loginli kullanicida `guest_session_id` donmez (`null`) ve chat kayitlari user id ile tutulur.

### Otomatik refresh akisi

1. Request `401` donerse (ve endpoint auth gerektiriyorsa) bir kez `/auth/refresh` cagir.
2. Basariliysa yeni `access_token` ve `refresh_token` ile istegi retry et.
3. Refresh de `401` donerse session kapat, tokenlari sil, login ekranina yonlendir.

### Logout akisi

1. `/auth/logout` cagir.
2. Basarili veya hatali fark etmeksizin client tokenlarini temizle.
3. Login sayfasina yonlendir.

## Ornek Frontend Durum Modeli

```ts
type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  userEmail: string | null;
  role: "user" | "admin" | null;
};
```

## Minimum UI Akislari

- Register sayfasi -> basariliysa Login'e yonlendir.
- Login sayfasi -> tokenlari kaydet, uygulamaya al.
- Session expire -> otomatik refresh dene.
- Refresh basarisiz -> sessiz logout + login ekranina don.

## Hata Mesajlari Icin Oneri

- `401`: "Oturum suresi doldu. Lutfen tekrar giris yapin."
- `409`: "Bu e-posta zaten kullaniliyor."
- `422`: "Gonderilen bilgiler gecersiz."
- `500`: "Beklenmeyen bir hata olustu."

## Gelecek Hazirligi

- Backend role alanini donuyor (`user`, `admin`), frontend route guard altyapisini simdiden role-aware kurgulayabilir.
- Su an `/me` endpoint yok. Kullanici profil bilgisi gerektiginde backend tarafinda eklenebilir.
