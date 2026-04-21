# Hak-Bul Frontend

React + Vite tabanli frontend uygulamasi. Bu klasordeki resmi gelistirme ve dogrulama komutlari `package.json` uzerinden calisir.

## Kurulum

```bash
npm install
```

## Gelistirme

```bash
npm run dev
```

Vite gelistirme sunucusu varsayilan olarak `http://localhost:5173` adresinde acilir.

## Dogrulama Komutlari

```bash
npm run test:contracts
npm run test:unit
npm run test
npm run lint
npm run verify
```

- `npm run test:contracts`: `src/` kokundeki kontrat ve mimari checklist testlerini calistirir.
- `npm run test:unit`: `src/utils` ve `src/api` altindaki yardimci davranis testlerini calistirir.
- `npm run test`: tum frontend testlerini tek komutta toplar.
- `npm run verify`: standart teslim zinciridir; sirasiyla `test`, `lint` ve `build` calisir.

## Standart Akis

Frontend refactor veya bugfix sirasinda izlenecek resmi sira:

1. `npm run test:contracts`
2. ilgili degisiklikten sonra `npm run test:unit`
3. `npm run lint`
4. teslim oncesi `npm run verify`

Bu sira kontratlari referans belge gibi kullanir, sonra dosya temizligini kontrol eder, en sonda build ile paketleme denetimini yapar.

## Build Notu

Kisitli sandbox veya bazi CI-benzeri shell oturumlarinda `vite build` ya da `npm run verify` son adimda `spawn EPERM` hatasi verebilir. Bu durumda kontrat testleri ve lint gectiyse kodu once normal lokal terminalde tekrar dogrulamak gerekir; hata her zaman uygulama kodundan kaynaklanmaz.
