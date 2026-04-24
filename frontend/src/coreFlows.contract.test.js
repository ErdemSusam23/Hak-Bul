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

test('App shell wires the real forum detail screen into the main product flow', async () => {
  const source = await readSource('App.jsx');

  assert.match(source, /import ForumBaslikSayfasi from '\.\/pages\/ForumBaslikSayfasi';/, 'App should import the real forum detail screen');
  assert.match(source, /hashchange|window\.location\.hash|parseAppLocation/, 'App should derive forum state from the URL hash');
  assert.match(source, /ForumBaslikSayfasi/, 'App should render the real forum detail screen when a forum thread route is active');
});

test('ForumSayfasi stops depending on mock forum data and uses real forum APIs', async () => {
  const source = await readSource('pages', 'ForumSayfasi.jsx');

  assert.ok(!source.includes("from '../data/mockData'"), 'ForumSayfasi should not import forum mock data');
  assert.match(source, /forumThreadListesiAPI|forumThreadOlusturAPI/, 'ForumSayfasi should use real forum APIs');
  assert.ok(!source.includes('yakında aktif olacak'), 'ForumSayfasi should not keep the placeholder create-thread alert');
});

test('ForumSayfasi keeps all forum threads reachable in a scrollable list area', async () => {
  const source = await readSource('pages', 'ForumSayfasi.jsx');
  const appSource = await readSource('App.jsx');

  assert.match(appSource, /<main className="flex-1 min-h-0 overflow-hidden">/, 'App shell should constrain product pages so inner scroll regions can work');
  assert.match(source, /className="max-w-5xl mx-auto px-6 py-10 h-full min-h-0 flex flex-col overflow-hidden"/, 'ForumSayfasi should use a bounded flex column layout');
  assert.match(source, /className="flex-1 min-h-0 overflow-y-auto pr-1"/, 'Forum thread list should be the scrollable region');
});

test('ForumSayfasi keeps category tabs in one row with arrow scroll controls', async () => {
  const source = await readSource('pages', 'ForumSayfasi.jsx');

  assert.match(source, /const categoryScrollRef = useRef\(null\);/, 'Forum categories should keep a scroll container ref');
  assert.match(source, /scrollBy\(\{ left: direction \* 240, behavior: 'smooth' \}\)/, 'Forum category arrows should scroll horizontally');
  assert.match(source, /title="Kategorileri sola kaydır"/, 'Forum categories should expose a left scroll button');
  assert.match(source, /title="Kategorileri sağa kaydır"/, 'Forum categories should expose a right scroll button');
  assert.match(source, /className="flex items-center gap-1 hairline-b mb-2"/, 'Forum category controls should stay in a single toolbar row');
  assert.match(source, /className="flex-1 min-w-0 overflow-hidden"/, 'Forum category viewport should clip one row while arrows reveal hidden tabs');
  assert.match(source, /className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth"/, 'Forum category tabs should stay in a horizontally scrollable row');
  assert.ok(!source.includes('className="flex flex-wrap items-center gap-1 hairline-b mb-2"'), 'Forum categories should not wrap to multiple rows');
});

test('ProfilSayfasi is backed by profile APIs rather than mock conversation data', async () => {
  const source = await readSource('pages', 'ProfilSayfasi.jsx');

  assert.ok(!source.includes("from '../data/mockData'"), 'ProfilSayfasi should not import mock profile/history data');
  assert.match(source, /profilGetirAPI/, 'ProfilSayfasi should fetch the real profile');
  assert.match(source, /profilGuncelleAPI/, 'ProfilSayfasi should submit profile updates');
  assert.match(source, /hesapSilAPI/, 'ProfilSayfasi should submit account deletion');
});

test('ProfilSayfasi does not show a chat history tab or placeholder panel', async () => {
  const source = await readSource('pages', 'ProfilSayfasi.jsx');

  assert.ok(!source.includes("['history'"), 'ProfilSayfasi should not expose a chat history tab');
  assert.ok(!source.includes("tab === 'history'"), 'ProfilSayfasi should not render a chat history panel');
  assert.ok(!source.includes('Sohbet Geçmişi'), 'ProfilSayfasi should not label a profile chat history section');
});

test('ProfilSayfasi does not show a profile photo upload control', async () => {
  const source = await readSource('pages', 'ProfilSayfasi.jsx');

  assert.ok(!source.includes('name="camera"'), 'ProfilSayfasi should not render a camera icon for profile photo upload');
});

test('ProfilSayfasi marks password verification fields to avoid browser autofill', async () => {
  const source = await readSource('pages', 'ProfilSayfasi.jsx');
  const uiSource = await readSource('components', 'ui', 'index.jsx');

  assert.match(uiSource, /inputProps/, 'Field should pass explicit input attributes to the rendered input');
  assert.match(source, /autoComplete:\s*'new-password'/, 'Profile password fields should opt out of saved-login autofill');
  assert.match(source, /name:\s*'profile-current-password'/, 'Account verification password should use a non-login field name');
  assert.match(source, /name:\s*'delete-account-password'/, 'Delete confirmation password should use a non-login field name');
});

test('Login modal keeps the password visibility control aligned and removes the forgotten password link', async () => {
  const source = await readSource('App.jsx');

  assert.match(source, /className="relative"/, 'Password input should use a relative wrapper for absolute icon placement');
  assert.match(source, /className="w-full bg-transparent px-3 py-2 pr-10 text-sm outline-none"/, 'Password input should reserve room for the visibility icon');
  assert.match(source, /className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-muted hover:text-ink"/, 'Password visibility button should be centered in a fixed-width hit area');
  assert.ok(!source.includes('Şifremi unuttum') && !source.includes('Åifremi unuttum'), 'Login modal should not show a forgotten password link');
});

test('KarsilastirmaSayfasi uses the real compare API and real File objects', async () => {
  const source = await readSource('pages', 'KarsilastirmaSayfasi.jsx');

  assert.match(source, /dokumanKarsilastirAPI/, 'KarsilastirmaSayfasi should use the real compare API');
  assert.ok(!source.includes("setFile({ name:"), 'Drop zones should keep real File objects instead of mock file metadata');
  assert.ok(!source.includes('setTimeout(() => { setLoading(false); setAnalyzed(true); }, 2000);'), 'Compare flow should not simulate results with setTimeout');
});
