function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

export function decodeJwtPayload(token) {
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token, now = Date.now(), skewMs = 5000) {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);

  if (!Number.isFinite(exp)) {
    return true;
  }

  return exp * 1000 <= now + skewMs;
}

export function normalizeRoleName(role) {
  return String(role || 'user').trim().toLowerCase();
}

export function buildAuthUserFromAccessToken({ accessToken, email = null, rol = null, id = null }) {
  if (!accessToken) return null;

  const payload = decodeJwtPayload(accessToken);
  return {
    id: id || payload?.sub || null,
    email,
    token: accessToken,
    rol: normalizeRoleName(payload?.role || rol || 'user'),
  };
}
