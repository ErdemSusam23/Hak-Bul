import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readFrontend(...segments) {
  return readFile(path.join(__dirname, ...segments), 'utf8');
}

async function readBackend(...segments) {
  return readFile(path.join(__dirname, '..', '..', 'backend', ...segments), 'utf8');
}

test('backend weak-query endpoint supports offset-based pagination and returns metadata', async () => {
  const routerSource = await readBackend('routers', 'admin.py');
  const serviceSource = await readBackend('services', 'admin_service.py');
  const schemaSource = await readBackend('schemas.py');

  assert.match(routerSource, /offset: int = Query\(default=0, ge=0\)/, 'admin weak-query route should accept an offset parameter');
  assert.match(routerSource, /AdminZayifSorguListeCevap/, 'admin weak-query route should use a paginated response model');
  assert.match(serviceSource, /def zayif_sorgular_listele\(db: Session, limit: int = 100, offset: int = 0\)/, 'weak-query service should accept offset');
  assert.match(serviceSource, /return rows, total/, 'weak-query service should return rows together with total count');
  assert.match(schemaSource, /class AdminZayifSorguListeCevap\(BaseModel\):/, 'backend schemas should define a paginated weak-query response model');
});

test('frontend admin weak-query client forwards pagination params to the backend', async () => {
  const source = await readFrontend('api', 'client.js');

  assert.match(source, /export async function adminZayifSorguListesiAPI\(\{ limit = 100, offset = 0 \} = \{\}\)/, 'admin weak-query client should accept limit and offset');
  assert.match(source, /params: \{ limit, offset \}/, 'admin weak-query client should send both pagination params');
});

test('AdminSayfasi keeps page state for weak queries and renders pagination controls', async () => {
  const source = await readFrontend('pages', 'AdminSayfasi.jsx');

  assert.match(source, /const \[weakQueryPage, setWeakQueryPage\] = useState\(0\);/, 'AdminSayfasi should track the current weak-query page');
  assert.match(source, /adminZayifSorguListesiAPI\(\{ limit: WEAK_QUERY_PAGE_SIZE, offset: weakQueryPage \* WEAK_QUERY_PAGE_SIZE \}\)/, 'AdminSayfasi should request the current weak-query page from the backend');
  assert.match(source, /Önceki/, 'AdminSayfasi should render a previous-page control');
  assert.match(source, /Sonraki/, 'AdminSayfasi should render a next-page control');
  assert.match(source, /setWeakQueryPage\(\(current\) => Math.max\(0, current - 1\)\)/, 'AdminSayfasi should move to the previous page');
  assert.match(source, /setWeakQueryPage\(\(current\) => current \+ 1\)/, 'AdminSayfasi should move to the next page');
});
