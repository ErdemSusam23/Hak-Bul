export const FORUM_CATEGORIES = [
  'Genel',
  'İş Hukuku',
  'Medeni Hukuk',
  'Ceza Hukuku',
  'Ticaret Hukuku',
  'Tüketici Hukuku',
  'Taşınmaz Mülk',
  'İdare Hukuku',
  'Vergi Hukuku',
  'Sosyal Güvenlik',
  'Bilişim Hukuku',
];

const CATEGORY_ALIASES = {
  genel: 'Genel',
  'genel hukuk': 'Genel',
  is: 'İş Hukuku',
  'is hukuku': 'İş Hukuku',
  'iş hukuku': 'İş Hukuku',
  'medeni hukuk': 'Medeni Hukuk',
  'ceza hukuk': 'Ceza Hukuku',
  'ceza hukuku': 'Ceza Hukuku',
  'ticaret hukuk': 'Ticaret Hukuku',
  'ticaret hukuku': 'Ticaret Hukuku',
  'tuketici hukuk': 'Tüketici Hukuku',
  'tuketici hukuku': 'Tüketici Hukuku',
  'tüketici hukuk': 'Tüketici Hukuku',
  'tüketici hukuku': 'Tüketici Hukuku',
  'tasinmaz mulk': 'Taşınmaz Mülk',
  gayrimenkul: 'Taşınmaz Mülk',
  'idare hukuk': 'İdare Hukuku',
  'idare hukuku': 'İdare Hukuku',
  'vergi hukuk': 'Vergi Hukuku',
  'vergi hukuku': 'Vergi Hukuku',
  'sosyal guvenlik': 'Sosyal Güvenlik',
  'bilişim hukuk': 'Bilişim Hukuku',
  'bilişim hukuku': 'Bilişim Hukuku',
  'bilisim hukuk': 'Bilişim Hukuku',
  'bilisim hukuku': 'Bilişim Hukuku',
};

function asciiKey(value) {
  return String(value || '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizeForumCategory(category) {
  const key = asciiKey(category);
  if (!key) return 'Genel';
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];

  const canonical = FORUM_CATEGORIES.find((item) => asciiKey(item) === key);
  return canonical || category;
}

export function normalizeForumThread(thread) {
  return {
    id: thread.id,
    title: thread.title,
    category: normalizeForumCategory(thread.category),
    voteScore: thread.vote_score,
    replyCount: thread.reply_count,
    displayName: thread.display_name,
    createdAt: thread.created_at,
    isLocked: thread.is_locked,
  };
}

export function buildForumCreatePayload({ title, content, category }) {
  return {
    title: title.trim(),
    content: content.trim(),
    category: normalizeForumCategory(category),
  };
}
