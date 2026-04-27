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

test('SohbetSayfasi does not render the quick start prompt panel', async () => {
  const source = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.ok(!source.includes('quickCats'), 'SohbetSayfasi should not keep quick-start categories');
  assert.ok(!source.includes('Hizli basla'), 'SohbetSayfasi should not render the quick-start panel label');
  assert.ok(!source.includes('setInput(`'), 'SohbetSayfasi should not inject category prompts from quick-start buttons');
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

test('short chat question warning uses readable Turkish characters', async () => {
  const source = await readSource('hooks', 'useChat.js');
  const minLengthLine = source.split('\n').find((line) => line.includes('minLength:'));

  assert.match(minLengthLine, /Sorunuz en az 10 karakter olmalıdır\. Lütfen daha ayrıntılı yazın\./);
  assert.ok(!minLengthLine.includes('olmalÄ±dÄ±r'), 'Short-question warning should not contain mojibake');
  assert.ok(!minLengthLine.includes('LÃ¼tfen'), 'Short-question warning should not contain mojibake');
});

test('SohbetSayfasi shows the selected conversation title in the chat header', async () => {
  const source = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.match(source, /selectedConversationTitle/, 'SohbetSayfasi should keep the selected conversation title in parent state');
  assert.match(source, /title: sohbet\.title/, 'ChatSidebar should pass the sidebar title when selecting a conversation');
  assert.ok(!source.includes('Sohbet #'), 'SohbetSayfasi should not render the conversation id prefix as the header title');
});

test('SohbetSayfasi opens source URLs from source cards without toggling expansion', async () => {
  const source = await readSource('pages', 'SohbetSayfasi.jsx');

  assert.match(source, /const sourceUrl = s\.url;/, 'SourceCard should read the source URL from the API payload');
  assert.match(source, /window\.open\(sourceUrl, '_blank', 'noopener,noreferrer'\)/, 'SourceCard should open source URLs in a safe new tab');
  assert.match(source, /event\.stopPropagation\(\);/, 'SourceCard link clicks should not toggle card expansion');
  assert.match(source, /title="Kaynağı aç"|title="Kaynagi ac"/, 'SourceCard should expose the source link through the top-right icon');
  assert.ok(!source.includes('inline-flex items-center gap-1 text-[11px]'), 'SourceCard should not render a second lower source link action');
});

test('recommended chat questions use high-confidence law and article retrieval examples', async () => {
  const source = await readSource('content', 'productContent.js');

  assert.match(source, /Medeni Hukuk/, 'Recommended questions should include the top law-and-article retrieval category');
  assert.match(source, /Ticaret Hukuku/, 'Recommended questions should include the other top law-and-article retrieval category');
  assert.ok(source.includes('Boşanma davası açmak istiyorum, hangi sebeplere dayanabilirim ve süreç nasıl başlar?'));
  assert.ok(source.includes('Mirasçılık belgesi nasıl alınır ve miras payımı göstermek için hangi hükme bakılır?'));
  assert.ok(source.includes('Şirket kurmak istiyorum, kuruluş ve ticaret siciline tescil için hangi temel kurallara bakmalıyım?'));
  assert.ok(source.includes('Tacir sayılmanın hukuki sonuçları nelerdir, basiretli davranma ve ticaret unvanı yükümlülüğü ne demektir?'));
  assert.ok(!source.includes('Trafik cezasına itiraz nasıl yapılır?'));
  assert.ok(!source.includes('İhtarname örneğini nasıl hazırlayabilirim?'));
});
