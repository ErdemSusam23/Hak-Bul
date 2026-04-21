import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAccountUpdatePayload,
  buildPasswordUpdatePayload,
  normalizeProfileState,
} from './profileFlow.js';

test('normalizeProfileState prefers API profile data over auth fallback fields', () => {
  assert.deepEqual(
    normalizeProfileState({
      profile: { id: '1', email: 'api@hakbul.com', role: 'admin' },
      authUser: { id: '2', email: 'auth@hakbul.com', rol: 'user' },
    }),
    { id: '1', email: 'api@hakbul.com', role: 'admin' },
  );
});

test('buildAccountUpdatePayload trims email and requires the current password', () => {
  assert.deepEqual(
    buildAccountUpdatePayload({
      email: '  yeni@hakbul.com ',
      currentPassword: 'secret',
    }),
    { email: 'yeni@hakbul.com', mevcut_sifre: 'secret' },
  );
});

test('buildPasswordUpdatePayload enforces password confirmation before submission', () => {
  assert.throws(
    () => buildPasswordUpdatePayload({
      currentPassword: 'secret',
      nextPassword: 'new-password',
      confirmPassword: 'different',
    }),
    /eşleşmiyor/i,
  );
});
