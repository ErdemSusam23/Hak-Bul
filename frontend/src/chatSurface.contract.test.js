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

test('SohbetSayfasi removes sidebar chrome that no longer carries product value', async () => {
  const source = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.ok(!source.includes('Kbd'), 'SohbetSayfasi should remove the shortcut badge from Yeni Sohbet');
  assert.ok(!source.includes('title="Ayarlar"'), 'SohbetSayfasi should remove the sidebar settings button');
});

test('SohbetSayfasi shows the authenticated user role from the normalized auth payload', async () => {
  const source = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.match(source, /function kullaniciRolEtiketi\(kullanici\)/, 'SohbetSayfasi should derive a role label for the footer card');
  assert.match(source, /normalizeRoleName\(kullanici\.rol \|\| kullanici\.role\)/, 'SohbetSayfasi should normalize auth roles before rendering them');
  assert.match(source, /return 'Admin';/, 'SohbetSayfasi should render the admin role label');
  assert.match(source, /return 'Avukat';/, 'SohbetSayfasi should render the lawyer role label');
  assert.match(source, /return 'Kullanıcı';/, 'SohbetSayfasi should render the default user role label');
});

test('SohbetSayfasi wires PDF upload into the composer and caps text input at 1000 characters', async () => {
  const source = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.match(source, /type="file"/, 'SohbetSayfasi should include a hidden file input for PDF upload');
  assert.match(source, /accept="application\/pdf,.pdf"/, 'SohbetSayfasi should accept only PDFs in the composer');
  assert.match(source, /dosya: submission\.dosya \|\| undefined/, 'SohbetSayfasi should forward the selected PDF to useChat');
  assert.match(source, /maxLength=\{CHAT_COMPOSER_MAX_LENGTH\}/, 'SohbetSayfasi should apply the shared 1000-char limit');
  assert.match(source, /\{input\.length\}\/\{CHAT_COMPOSER_MAX_LENGTH\}/, 'SohbetSayfasi should show the live 1000-char counter');
});

test('SohbetSayfasi shows the selected conversation title in the chat header', async () => {
  const source = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.match(source, /selectedConversationTitle/, 'SohbetSayfasi should keep the selected conversation title in parent state');
  assert.match(source, /title: sohbet\.title/, 'ChatSidebar should pass the sidebar title when selecting a conversation');
  assert.ok(!source.includes('Sohbet #'), 'SohbetSayfasi should not render the conversation id prefix as the header title');
});
