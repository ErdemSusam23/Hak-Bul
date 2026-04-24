import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSource(...segments) {
  return readFile(path.join(__dirname, ...segments), 'utf8');
}

async function readFrontendRoot(...segments) {
  return readFile(path.join(__dirname, '..', ...segments), 'utf8');
}

test('LandingPage and SohbetSayfasi stop reading active product content from mockData', async () => {
  const landingSource = await readSource('pages', 'LandingPage.jsx');
  const sohbetSource = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.ok(!landingSource.includes("from '../data/mockData'"), 'LandingPage should not import mockData');
  assert.ok(!sohbetSource.includes("from '../data/mockData'"), 'SohbetSayfasi should not import mockData');
});

test('AdminSayfasi uses live admin APIs instead of mock dashboard data', async () => {
  const source = await readSource('pages', 'AdminSayfasi.jsx');

  assert.ok(!source.includes("from '../data/mockData'"), 'AdminSayfasi should not import mock dashboard data');
  assert.match(source, /adminIstatistikAPI/, 'AdminSayfasi should fetch live stats');
  assert.match(source, /adminKategoriDagilimiAPI/, 'AdminSayfasi should fetch live category distribution');
  assert.match(source, /adminFeedbackOzetiAPI/, 'AdminSayfasi should fetch live feedback summary');
  assert.match(source, /adminGunlukAktiviteAPI/, 'AdminSayfasi should fetch live daily activity');
  assert.match(source, /adminKullaniciListesiAPI/, 'AdminSayfasi should fetch live users');
  assert.match(source, /adminRolGuncelleAPI/, 'AdminSayfasi should update user roles through the API');
  assert.match(source, /adminKullaniciDurumAPI/, 'AdminSayfasi should update user status through the API');
  assert.match(source, /adminZayifSorguListesiAPI/, 'AdminSayfasi should fetch live weak queries');
  assert.match(source, /adminZayifSorguListesiAPI\(\{ limit: WEAK_QUERY_PAGE_SIZE, offset: weakQueryPage \* WEAK_QUERY_PAGE_SIZE \}\)/, 'AdminSayfasi should request weak queries page-by-page from the backend');
});

test('AdminSayfasi exposes backend-supported user filters and pagination', async () => {
  const source = await readSource('pages', 'AdminSayfasi.jsx');

  assert.match(source, /const \[userRoleFilter, setUserRoleFilter\] = useState\(''\);/, 'AdminSayfasi should keep a role filter');
  assert.match(source, /const \[userStatusFilter, setUserStatusFilter\] = useState\(''\);/, 'AdminSayfasi should keep a status filter');
  assert.match(source, /const \[userPageSize, setUserPageSize\] = useState\(50\);/, 'AdminSayfasi should keep a page-size selector');
  assert.match(source, /const \[userPage, setUserPage\] = useState\(0\);/, 'AdminSayfasi should keep user pagination state');
  assert.match(source, /adminKullaniciListesiAPI\(\{\s*limit: userPageSize,\s*offset: userPage \* userPageSize,\s*q: deferredSearch,\s*rol: userRoleFilter \|\| null,\s*aktif: userStatusFilter === 'active' \? true : userStatusFilter === 'inactive' \? false : null,\s*\}\)/s, 'AdminSayfasi should send user filters to /admin/users');
  assert.match(source, /setUserTotal\(usersResponse\.total \|\| 0\);/, 'AdminSayfasi should store the backend total count');
  assert.match(source, /setUserPage\(0\);[\s\S]*?\}, \[deferredSearch, userRoleFilter, userStatusFilter, userPageSize\]\);/, 'AdminSayfasi should reset user pagination when filters change');
  assert.match(source, /value=\{userRoleFilter\}/, 'AdminSayfasi should render the role filter control');
  assert.match(source, /value=\{userStatusFilter\}/, 'AdminSayfasi should render the status filter control');
  assert.match(source, /value=\{userPageSize\}/, 'AdminSayfasi should render the page-size control');
  assert.ok(!source.includes('{hasUserFilters && ('), 'AdminSayfasi should always render the clear filters button');
  assert.match(source, /setUserPage\(\(current\) => Math\.max\(0, current - 1\)\)/, 'AdminSayfasi should provide previous user page control');
  assert.match(source, /setUserPage\(\(current\) => current \+ 1\)/, 'AdminSayfasi should provide next user page control');
});

test('TaslakSayfasi uses live template APIs and removes simulated browser-dialog UX', async () => {
  const source = await readSource('pages', 'TaslakSayfasi.jsx');

  assert.ok(!source.includes("from '../data/mockData'"), 'TaslakSayfasi should not import mock templates');
  assert.match(source, /taslakListesiAPI/, 'TaslakSayfasi should fetch live templates');
  assert.match(source, /taslakPdfUretAPI/, 'TaslakSayfasi should generate PDFs through the API');
  assert.ok(!source.includes('alert('), 'TaslakSayfasi should not use alert-based placeholder UX');
  assert.ok(!source.includes('setGenerated(true)'), 'TaslakSayfasi should not simulate PDF generation success in local state');
  assert.ok(!source.includes('actions={'), 'TaslakSayfasi should not show a custom template placeholder action');
});

test('Active product surface text no longer contains garbled encoding artifacts', async () => {
  const files = [
    ['App.jsx'],
    ['components', 'ui', 'index.jsx'],
    ['pages', 'LandingPage.jsx'],
    ['pages', 'SohbetSayfasi.jsx'],
    ['pages', 'AdminSayfasi.jsx'],
    ['pages', 'TaslakSayfasi.jsx'],
    ['pages', 'KarsilastirmaSayfasi.jsx'],
    ['pages', 'ForumSayfasi.jsx'],
    ['pages', 'ProfilSayfasi.jsx'],
    ['utils', 'forumFlow.js'],
    ['utils', 'profileFlow.js'],
    ['utils', 'compareFlow.js'],
  ];

  for (const segments of files) {
    const source = await readSource(...segments);
    assert.ok(!/[ÃÅÂ]/.test(source), `${segments.join('/')} should not contain garbled encoding artifacts`);
  }
});

test('Active product surface does not reference ALO 182 as legal support', async () => {
  const files = [
    ['App.jsx'],
    ['pages', 'LandingPage.jsx'],
    ['pages', 'SohbetSayfasi.jsx'],
  ];

  for (const segments of files) {
    const source = await readSource(...segments);
    assert.ok(!source.includes('ALO 182'), `${segments.join('/')} should not mention ALO 182`);
    assert.ok(!source.includes('Türkiye Barolar Birliği'), `${segments.join('/')} should not tie ALO 182 to the bar association`);
    assert.ok(!source.includes('Turkiye Barolar Birligi'), `${segments.join('/')} should not tie ALO 182 to the bar association`);
  }
});

test('Active product surface does not use restricted legal assistant wording', async () => {
  const files = [
    () => readSource('App.jsx'),
    () => readFrontendRoot('index.html'),
    () => readSource('components', 'HukukiUyariModal.jsx'),
    () => readSource('i18n', 'tr.js'),
    () => readSource('i18n', 'en.js'),
    () => readSource('pages', 'SohbetSayfasi.jsx'),
  ];

  for (const readFileContent of files) {
    const source = await readFileContent();
    assert.ok(!/hukuk asistan[ıi]/i.test(source), 'Frontend should not use Hukuk Asistani wording');
    assert.ok(!/legal assistant/i.test(source), 'Frontend should not use Legal Assistant wording');
  }
});

test('AsistanBot is retired from the active product surface', async () => {
  await assert.rejects(
    access(path.join(__dirname, 'components', 'AsistanBot.jsx')),
    /ENOENT/,
    'AsistanBot should be removed when it is no longer part of the active product surface',
  );
});
