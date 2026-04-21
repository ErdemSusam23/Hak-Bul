export function parseAppLocation(hash, storedPage = 'landing') {
  const normalizedHash = hash || '';
  const forumThreadMatch = normalizedHash.match(/^#\/forum\/([^/?#]+)/);

  if (forumThreadMatch) {
    return {
      page: 'forum',
      forumThreadId: decodeURIComponent(forumThreadMatch[1]),
    };
  }

  if (/^#\/forum\/?$/.test(normalizedHash)) {
    return {
      page: 'forum',
      forumThreadId: null,
    };
  }

  return {
    page: storedPage || 'landing',
    forumThreadId: null,
  };
}

export function formatForumThreadHash(threadId) {
  return `#/forum/${encodeURIComponent(threadId)}`;
}

export function formatForumListHash() {
  return '#/forum';
}

export function isForumHash(hash) {
  return /^#\/forum(\/|$)/.test(hash || '');
}
