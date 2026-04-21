import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(frontendRoot, 'src');

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTests(fullPath);
    }

    return entry.name.endsWith('.test.js') ? [fullPath] : [];
  }));

  return files.flat();
}

function normalizeRelative(filePath) {
  return path.relative(frontendRoot, filePath).split(path.sep).join('/');
}

function selectTests(files, scope) {
  if (scope === 'all') {
    return files;
  }

  if (scope === 'contracts') {
    return files.filter((filePath) => path.dirname(normalizeRelative(filePath)) === 'src');
  }

  if (scope === 'unit') {
    return files.filter((filePath) => path.dirname(normalizeRelative(filePath)) !== 'src');
  }

  throw new Error(`Unknown test scope: ${scope}`);
}

async function main() {
  const scope = process.argv[2] || 'all';
  const selectedFiles = selectTests(await collectTests(srcRoot), scope)
    .sort((left, right) => left.localeCompare(right));

  if (selectedFiles.length === 0) {
    throw new Error(`No test files found for scope: ${scope}`);
  }

  for (const filePath of selectedFiles) {
    await import(pathToFileURL(filePath).href);
  }
}

await main();
