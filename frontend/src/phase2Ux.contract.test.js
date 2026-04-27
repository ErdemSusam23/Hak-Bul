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

test('LandingPage removes placeholder alerts and keeps the explainer CTA inside the landing flow', async () => {
  const source = await readSource('pages', 'LandingPage.jsx');

  assert.ok(!source.includes('alert('), 'LandingPage should not use alert-based placeholder UX');
  assert.match(source, /landing-nasil-calisir/, 'LandingPage should keep the "Nasıl Çalışır?" CTA inside the landing page flow');
});

test('SohbetSayfasi uses toast feedback instead of alert or confirm prompts', async () => {
  const source = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.match(source, /export default function SohbetSayfasi\(\{\s*toast\s*\}\)/, 'SohbetSayfasi should accept the shared toast helper');
  assert.ok(!source.includes('alert('), 'SohbetSayfasi should not use browser alerts');
  assert.ok(!source.includes('confirm('), 'SohbetSayfasi should not use browser confirms');
});

test('ForumBaslikSayfasi uses toast feedback instead of alert or confirm prompts', async () => {
  const source = await readSource('pages', 'ForumBaslikSayfasi.jsx');

  assert.match(source, /export default function ForumBaslikSayfasi\(\{\s*threadId,\s*onGeri,\s*toast\s*\}\)/, 'ForumBaslikSayfasi should accept the shared toast helper');
  assert.ok(!source.includes('alert('), 'ForumBaslikSayfasi should not use browser alerts');
  assert.ok(!source.includes('confirm('), 'ForumBaslikSayfasi should not use browser confirms');
});

test('App passes the shared toast helper into the Phase 2 pages', async () => {
  const source = await readSource('App.jsx');

  assert.match(source, /<SohbetSayfasi toast=\{toast\} \/>/, 'App should pass toast into SohbetSayfasi');
  assert.match(source, /<ForumBaslikSayfasi threadId=\{forumThreadId\} onGeri=\{\(\) => navigateToPage\('forum'\)\} toast=\{toast\} \/>/, 'App should pass toast into ForumBaslikSayfasi');
});

test('Navbar normalizes admin roles before deciding whether to show the admin panel link', async () => {
  const source = await readSource('App.jsx');

  assert.match(source, /normalizeRoleName\(kullanici\?\.rol \|\| kullanici\?\.role\) === 'admin'/, 'Navbar should normalize the role before admin-gating the menu entry');
});

test('Navbar exposes an accessible Turkish-English language switcher', async () => {
  const source = await readSource('App.jsx');

  assert.match(source, /import \{ useDil \} from '\.\/context\/useDil';/, 'Navbar should import the language hook');
  assert.match(source, /const \{ dil,\s*dilDegistir(?:,\s*t)? \} = useDil\(\);/, 'Navbar should read the current language and switcher');
  assert.match(source, /dilDegistir\(dil === 'tr' \? 'en' : 'tr'\)/, 'Navbar should toggle between Turkish and English');
  assert.match(source, /aria-label=\{dil === 'tr' \? 'Switch to English' : 'T\u00fcrk\u00e7eye ge\u00e7'\}/, 'Navbar language switcher should be accessible');
});

test('primary product surfaces render visible copy through the language dictionary', async () => {
  const appSource = await readSource('App.jsx');
  const landingSource = await readSource('pages', 'LandingPage.jsx');
  const chatSource = await readSource('pages', 'SohbetSayfasi.jsx');
  const compareSource = await readSource('pages', 'KarsilastirmaSayfasi.jsx');
  const templateSource = await readSource('pages', 'TaslakSayfasi.jsx');

  assert.match(appSource, /const \{ dil,\s*dilDegistir,\s*t \} = useDil\(\);/, 'Navbar should use translations for visible shell copy');
  assert.match(appSource, /function AuthModal[\s\S]*const \{ t \} = useDil\(\);/, 'Auth modal should read translated copy');
  assert.match(appSource, /function DisclaimerBar\(\)[\s\S]*const \{ t \} = useDil\(\);/, 'Disclaimer bar should read translated copy');
  assert.match(landingSource, /const \{ t \} = useDil\(\);/, 'LandingPage should read translated copy');
  assert.match(chatSource, /const \{ dil,\s*t \} = useDil\(\);/, 'SohbetSayfasi should use translations beyond the API language');
  assert.match(compareSource, /const \{ dil,\s*t \} = useDil\(\);/, 'KarsilastirmaSayfasi should use translations and active language');
  assert.match(templateSource, /const \{ dil,\s*t \} = useDil\(\);/, 'TaslakSayfasi should use translations and active language');
});

test('document comparison sends the active interface language to the compare API', async () => {
  const source = await readSource('pages', 'KarsilastirmaSayfasi.jsx');

  assert.match(source, /language: dil,/, 'Compare requests should use the current UI language instead of a fixed language');
  assert.ok(!source.includes("language: 'tr'"), 'Compare requests should not hard-code Turkish after language switching');
});

test('core language dictionaries contain the keys needed by translated product surfaces', async () => {
  const trSource = await readSource('i18n', 'tr.js');
  const enSource = await readSource('i18n', 'en.js');
  const requiredKeys = [
    'navChat',
    'landingHeroTitleLine1',
    'authGuestContinue',
    'chatWelcomePrefix',
    'compareHeroTitle',
    'templatesHeroTitle',
    'disclaimerText',
  ];

  for (const key of requiredKeys) {
    assert.match(trSource, new RegExp(`${key}:`), `tr dictionary should define ${key}`);
    assert.match(enSource, new RegExp(`${key}:`), `en dictionary should define ${key}`);
  }
});
