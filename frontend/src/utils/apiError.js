function joinPath(loc) {
  if (!Array.isArray(loc) || loc.length === 0) return '';
  return loc.map((item) => String(item)).join('.');
}

export function extractApiErrorMessage(error, fallback = 'İşlem başarısız.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const normalized = detail
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (!item || typeof item !== 'object') return '';
        const msg = typeof item.msg === 'string' ? item.msg.trim() : '';
        const loc = joinPath(item.loc);
        if (msg && loc) return `${loc}: ${msg}`;
        return msg;
      })
      .filter(Boolean);
    if (normalized.length > 0) {
      return normalized.join(' | ');
    }
  }

  if (detail && typeof detail === 'object') {
    const message = detail.message || detail.error || detail.msg;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  const genericMessage = error?.message;
  if (typeof genericMessage === 'string' && genericMessage.trim()) {
    return genericMessage.trim();
  }

  return fallback;
}
