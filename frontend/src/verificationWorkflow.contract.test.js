import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.join(__dirname, '..');

async function readFrontendFile(...segments) {
  return readFile(path.join(frontendRoot, ...segments), 'utf8');
}

test('frontend package.json exposes the standard verification scripts', async () => {
  const packageJson = JSON.parse(await readFrontendFile('package.json'));

  assert.equal(packageJson.scripts.test, 'node ./scripts/run-tests.mjs all');
  assert.equal(packageJson.scripts['test:contracts'], 'node ./scripts/run-tests.mjs contracts');
  assert.equal(packageJson.scripts['test:unit'], 'node ./scripts/run-tests.mjs unit');
  assert.equal(packageJson.scripts.verify, 'npm run test && npm run lint && npm run build');
});

test('frontend README documents the standard verification flow', async () => {
  const readme = await readFrontendFile('README.md');

  assert.match(readme, /npm run test:contracts/, 'README should point developers to the contract test command');
  assert.match(readme, /npm run test:unit/, 'README should point developers to the unit test command');
  assert.match(readme, /npm run verify/, 'README should point developers to the full verification command');
  assert.match(readme, /spawn EPERM/, 'README should document the restricted-shell build caveat');
});
