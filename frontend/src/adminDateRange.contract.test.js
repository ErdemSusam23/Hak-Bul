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

test('backend admin stats endpoints accept a shared gun range across the full dashboard', async () => {
  const routerSource = await readBackend('routers', 'admin.py');
  const serviceSource = await readBackend('services', 'admin_service.py');

  assert.match(routerSource, /def admin_genel_istatistik\(\s*gun: int = Query\(default=7, ge=1, le=90\)/s, 'admin stats route should accept gun');
  assert.match(routerSource, /def admin_kategori_dagilimi\(\s*gun: int = Query\(default=7, ge=1, le=90\)/s, 'admin categories route should accept gun');
  assert.match(routerSource, /def admin_feedback_ozeti\(\s*gun: int = Query\(default=7, ge=1, le=90\)/s, 'admin feedback route should accept gun');
  assert.match(serviceSource, /def genel_istatistikler\(db: Session, gun: int\) -> dict:/, 'admin stats service should accept gun');
  assert.match(serviceSource, /def kategori_dagilimi\(db: Session, gun: int\) -> list\[dict\]:/, 'admin categories service should accept gun');
  assert.match(serviceSource, /def feedback_ozeti\(db: Session, gun: int\) -> dict:/, 'admin feedback service should accept gun');
});

test('frontend admin clients forward the selected date range to every admin metrics endpoint', async () => {
  const source = await readFrontend('api', 'client.js');

  assert.match(source, /export async function adminIstatistikAPI\(gun = 7\)/, 'admin stats client should accept gun');
  assert.match(source, /client\.get\('\/admin\/stats', \{ params: \{ gun \} \}\)/, 'admin stats client should send gun');
  assert.match(source, /export async function adminKategoriDagilimiAPI\(gun = 7\)/, 'admin categories client should accept gun');
  assert.match(source, /client\.get\('\/admin\/stats\/categories', \{ params: \{ gun \} \}\)/, 'admin categories client should send gun');
  assert.match(source, /export async function adminFeedbackOzetiAPI\(gun = 7\)/, 'admin feedback client should accept gun');
  assert.match(source, /client\.get\('\/admin\/stats\/feedback', \{ params: \{ gun \} \}\)/, 'admin feedback client should send gun');
});

test('AdminSayfasi drives the full dashboard from a shared date-range selector and drops the real-api badge', async () => {
  const source = await readFrontend('pages', 'AdminSayfasi.jsx');

  assert.match(source, /const \[selectedRange, setSelectedRange\] = useState\(7\);/, 'AdminSayfasi should keep a shared selectedRange state');
  assert.match(source, /adminIstatistikAPI\(selectedRange\)/, 'AdminSayfasi should fetch stats for the selected range');
  assert.match(source, /adminKategoriDagilimiAPI\(selectedRange\)/, 'AdminSayfasi should fetch categories for the selected range');
  assert.match(source, /adminFeedbackOzetiAPI\(selectedRange\)/, 'AdminSayfasi should fetch feedback for the selected range');
  assert.match(source, /adminGunlukAktiviteAPI\(selectedRange\)/, 'AdminSayfasi should fetch daily activity for the selected range');
  assert.match(source, /DASHBOARD_RANGES\.map\(\(range\) =>/, 'AdminSayfasi should render 7/30/90 range controls');
  assert.ok(!source.includes('Gerçek API'), 'AdminSayfasi should not render a Gerçek API badge');
});
