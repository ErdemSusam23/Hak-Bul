import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAuthUserFromAccessToken,
  decodeJwtPayload,
  isAccessTokenExpired,
  normalizeRoleName,
} from './authSession.js';

function createToken(payload) {
  const encode = (value) => btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

test('decodeJwtPayload reads the access-token claims safely', () => {
  const token = createToken({ sub: 'user-1', role: 'admin', exp: 9999999999 });

  assert.deepEqual(decodeJwtPayload(token), {
    sub: 'user-1',
    role: 'admin',
    exp: 9999999999,
  });
});

test('isAccessTokenExpired treats missing or past exp claims as expired', () => {
  assert.equal(isAccessTokenExpired(createToken({ sub: 'user-1' })), true);
  assert.equal(isAccessTokenExpired(createToken({ sub: 'user-1', exp: 10 }), 20_000), true);
  assert.equal(isAccessTokenExpired(createToken({ sub: 'user-1', exp: 40 }), 20_000), false);
});

test('buildAuthUserFromAccessToken prefers explicit identity fields but trusts the token role claim', () => {
  const token = createToken({ sub: 'token-user', role: 'LAWYER', exp: 9999999999 });

  assert.deepEqual(
    buildAuthUserFromAccessToken({
      accessToken: token,
      email: 'avukat@example.com',
      rol: 'ADMIN',
      id: 'explicit-user',
    }),
    {
      id: 'explicit-user',
      email: 'avukat@example.com',
      token,
      rol: 'lawyer',
    },
  );
});

test('normalizeRoleName keeps auth session role checks case-insensitive', () => {
  assert.equal(normalizeRoleName('ADMIN'), 'admin');
  assert.equal(normalizeRoleName('Lawyer'), 'lawyer');
  assert.equal(normalizeRoleName(undefined), 'user');
});
