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

test('KarsilastirmaSayfasi uses the real compare API and real File objects', async () => {
  const source = await readSource('pages', 'KarsilastirmaSayfasi.jsx');

  assert.match(source, /dokumanKarsilastirAPI/, 'KarsilastirmaSayfasi should use the real compare API');
  assert.ok(!source.includes("setFile({ name:"), 'Drop zones should keep real File objects instead of mock file metadata');
  assert.ok(!source.includes('setTimeout(() => { setLoading(false); setAnalyzed(true); }, 2000);'), 'Compare flow should not simulate results with setTimeout');
});
