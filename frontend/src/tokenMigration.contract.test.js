import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATED_SURFACES = [
  ['components', 'AuthModal.jsx'],
  ['components', 'DirekArama.jsx'],
  ['components', 'FeedbackButonlari.jsx'],
  ['components', 'HukukiUyariModal.jsx'],
  ['components', 'KaynakKarti.jsx'],
  ['components', 'SohbetMesaji.jsx'],
  ['components', 'YukleniyorGostergesi.jsx'],
  ['pages', 'PaylasimSayfasi.jsx'],
];

async function readSource(...segments) {
  return readFile(path.join(__dirname, ...segments), 'utf8');
}

test('remaining migrated surfaces stop consuming legacy or undefined design tokens', async () => {
  for (const segments of MIGRATED_SURFACES) {
    const source = await readSource(...segments);
    const label = segments.join('/');

    assert.ok(!source.includes('--tema-'), `${label} should use the new shared design tokens instead of --tema-* aliases`);
    assert.ok(!source.includes('--kanun-'), `${label} should not depend on undefined --kanun-* tokens`);
    assert.ok(!source.includes('--yargitay-'), `${label} should not depend on undefined --yargitay-* tokens`);
    assert.ok(!source.includes('--modal-'), `${label} should not depend on undefined --modal-* tokens`);
    assert.ok(!source.includes('rgba(var(--a)'), `${label} should not depend on the undefined --a accent channel`);
  }
});

test('remaining migrated surfaces no longer contain garbled Turkish text', async () => {
  for (const segments of MIGRATED_SURFACES) {
    const source = await readSource(...segments);
    assert.ok(!/[ÃÅÄ]/.test(source), `${segments.join('/')} should not contain mojibake text`);
  }
});
