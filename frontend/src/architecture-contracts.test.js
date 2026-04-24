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

test('streaming chat uses the shared API layer instead of reading auth state directly', async () => {
  const source = await readSource('hooks', 'useChat.js');

  assert.ok(source.includes('apiFetch('), 'useChat.js should send stream requests through apiFetch');
  assert.ok(!source.includes("sessionStorage.getItem('hakbul_access')"), 'useChat.js should not read the access token directly');
});

test('shared UI barrel exports components only', async () => {
  const source = await readSource('components', 'ui', 'index.jsx');

  assert.ok(!source.includes('useEffect'), 'components/ui/index.jsx should not keep the unused useEffect import');
  assert.ok(!source.includes('useRef'), 'components/ui/index.jsx should not keep the unused useRef import');
  assert.ok(!source.includes('export function renderInline'), 'renderInline should live outside the shared UI barrel');
});

test('forum API methods in client.js apply the shared mock-mode guard', async () => {
  const source = await readSource('api', 'client.js');
  const forumSection = source.slice(source.indexOf('// --- FORUM API ---'));

  assert.ok(forumSection.includes('runWithMockMode('), 'forum API methods should route through the shared mock-mode helper');
});

test('admin role updates send backend enum values instead of display labels', async () => {
  const source = await readSource('api', 'client.js');
  const adminRoleSection = source.slice(
    source.indexOf('export async function adminRolGuncelleAPI'),
    source.indexOf('export async function adminKullaniciDurumAPI'),
  );

  assert.match(adminRoleSection, /const normalizedRole = String\(rol \|\| ''\)\.trim\(\)\.toLowerCase\(\);/, 'admin role updates should normalize select values before sending them');
  assert.match(adminRoleSection, /\{ rol: normalizedRole \}/, 'admin role updates should send lowercase backend enum values');
});

test('local development API calls go through the Vite reverse proxy by default', async () => {
  const clientSource = await readSource('api', 'client.js');
  const authSource = await readSource('api', 'auth.js');
  const viteConfig = await readFile(path.join(__dirname, '..', 'vite.config.js'), 'utf8');

  assert.match(clientSource, /const API_URL = import\.meta\.env\?\.VITE_API_URL \|\| '';/);
  assert.match(authSource, /const API_URL = import\.meta\.env\.VITE_API_URL \|\| '';/);
  assert.ok(!clientSource.includes("|| 'http://localhost:8000'"), 'client.js should not expose the backend origin by default');
  assert.ok(!authSource.includes("|| 'http://localhost:8000'"), 'auth.js should not expose the backend origin by default');
  assert.match(viteConfig, /VITE_PROXY_TARGET/);
  for (const route of ['/ask', '/auth', '/chat', '/documents', '/feedback', '/templates', '/admin', '/forum', '/search', '/health']) {
    assert.ok(viteConfig.includes(route), `vite.config.js should proxy ${route}`);
  }
});
