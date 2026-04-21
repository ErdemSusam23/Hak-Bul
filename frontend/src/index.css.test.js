import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexCssPath = path.join(__dirname, 'index.css');

const REQUIRED_THEME_ALIASES = [
  '--tema-accent',
  '--tema-bg',
  '--tema-border',
  '--tema-border-card',
  '--tema-bubble',
  '--tema-card',
  '--tema-card-hover',
  '--tema-danger-bg',
  '--tema-danger-border',
  '--tema-danger-text',
  '--tema-dialog-bg',
  '--tema-dialog-border',
  '--tema-dialog-shadow',
  '--tema-dimmer',
  '--tema-muted',
  '--tema-overlay',
  '--tema-panel',
  '--tema-send-btn',
  '--tema-send-icon',
  '--tema-soft-bg',
  '--tema-soft-bg-subtle',
  '--tema-success-bg',
  '--tema-success-border',
  '--tema-success-text',
  '--tema-surface',
  '--tema-text',
  '--tema-text2',
  '--tema-user-avatar',
  '--tema-user-bg',
  '--tema-user-border',
];

test('index.css defines the legacy tema token aliases used by migrated screens', async () => {
  const css = await readFile(indexCssPath, 'utf8');

  for (const token of REQUIRED_THEME_ALIASES) {
    assert.match(css, new RegExp(`${token}\\s*:`), `${token} is missing from index.css`);
  }
});
