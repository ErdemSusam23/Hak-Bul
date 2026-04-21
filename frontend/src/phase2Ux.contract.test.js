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
