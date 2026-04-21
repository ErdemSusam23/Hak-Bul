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

export function normalizeForumThread(thread) {
  return {
    id: thread.id,
    title: thread.title,
    category: thread.category,
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
    category: category.trim(),
  };
}
