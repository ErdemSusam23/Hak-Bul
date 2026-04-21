import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSource(...segments) {
  return readFile(path.join(__dirname, ...segments), 'utf8');
}

test('AuthContext bootstraps auth state before treating the user as logged in', async () => {
  const source = await readSource('context', 'AuthContext.jsx');

  assert.match(source, /const \[authHazir, setAuthHazir\] = useState\(false\);/, 'AuthContext should track whether bootstrap finished');
  assert.match(source, /isAccessTokenExpired\(storedSession\.accessToken\)/, 'AuthContext should validate the stored access token before trusting it');
  assert.match(source, /await tokenYenileFn\(\{ notifyOnFailure: false, resolveProfile: true \}\);/, 'AuthContext should try the refresh cookie during bootstrap');
  assert.match(source, /authHazir && !!kullanici/, 'AuthContext should not mark the user as logged in until bootstrap finishes');
});

test('AuthContext resolves profile data explicitly after cookie-based refresh when needed', async () => {
  const source = await readSource('context', 'AuthContext.jsx');
  const apiSource = await readSource('api', 'auth.js');

  assert.match(source, /tokenIleProfilGetir\(data\.access_token\)/, 'AuthContext should fetch profile data with the refreshed access token when it cannot trust session storage alone');
  assert.match(apiSource, /export async function tokenIleProfilGetir\(accessToken\)/, 'auth API should expose a token-scoped profile fetch helper');
  assert.match(apiSource, /refresh_token: ''/, 'auth API comments should reflect the cookie-based refresh contract');
});

test('ProfilSayfasi revokes the frontend session after auth-critical profile updates', async () => {
  const source = await readSource('pages', 'ProfilSayfasi.jsx');
  const appSource = await readSource('App.jsx');

  assert.match(source, /export default function ProfilSayfasi\(\{ onGeri, toast \}\)/, 'ProfilSayfasi should accept the shared toast helper');
  assert.match(source, /toast\?\.\('Profil bilgileri güncellendi\. Lütfen yeniden giriş yapın\.', 'info'\);/, 'ProfilSayfasi should inform the user before logging them out after an email change');
  assert.match(source, /toast\?\.\('Şifreniz güncellendi\. Lütfen yeniden giriş yapın\.', 'info'\);/, 'ProfilSayfasi should inform the user before logging them out after a password change');
  assert.match(source, /await cikis\?\.\(\);/, 'ProfilSayfasi should end the current session after auth-critical profile updates');
  assert.match(appSource, /<ProfilSayfasi onGeri=\{\(\) => navigateToPage\('sohbet'\)\} toast=\{toast\} \/>/, 'App should pass toast into ProfilSayfasi');
});
