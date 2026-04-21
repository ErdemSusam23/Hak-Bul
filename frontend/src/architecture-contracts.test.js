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
