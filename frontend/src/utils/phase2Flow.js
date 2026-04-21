export function buildSharedConversationUrl(origin, shareToken) {
  const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return `${normalizedOrigin}/#/shared/${shareToken}`;
}

export function createNewsletterNotice(email) {
  if (!email?.trim()) {
    return {
      kind: 'error',
      text: 'Bülten için e-posta adresi girin.',
    };
  }

  return {
    kind: 'info',
    text: 'Bülten aboneliği yakında açılacak. Şimdilik bu özellik beklemede.',
  };
}

export function togglePendingAction(currentId, nextId) {
  return currentId === nextId ? null : nextId;
}
