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

test('LandingPage removes the KVKK trust badge and live example panel from the hero surface', async () => {
  const source = await readSource('pages', 'LandingPage.jsx');

  assert.ok(!source.includes('KVKK Uyumlu'), 'LandingPage should not show a KVKK trust badge in the hero');
  assert.ok(!source.includes('Canli ornek'), 'LandingPage should not keep the live example teaser panel');
  assert.ok(!source.includes('Canlı örnek'), 'LandingPage should not keep the live example teaser panel');
});

test('Auth modal no longer asks the user to accept KVKK copy during entry', async () => {
  const source = await readSource('App.jsx');

  assert.ok(!source.includes('kabul etmiş olursunuz'), 'Auth modal should not show consent-copy acceptance text');
  assert.ok(!source.includes('KVKK'), 'Auth modal should not mention KVKK in the entry footer');
});
