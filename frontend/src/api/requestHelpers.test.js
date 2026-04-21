import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithAuthRetry, runWithMockMode } from './requestHelpers.js';

test('runWithMockMode bypasses the request callback when mock mode is enabled', async () => {
  let requestCalled = false;

  const result = await runWithMockMode({
    mockMode: true,
    mockResponse: () => ({ ok: true }),
    request: async () => {
      requestCalled = true;
      return { ok: false };
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(requestCalled, false);
});

test('fetchWithAuthRetry sends the current access token in the authorization header', async () => {
  const calls = [];

  const response = await fetchWithAuthRetry({
    url: 'http://example.test/stream',
    getAccessToken: () => 'initial-token',
    fetchImpl: async (_url, init) => {
      calls.push(init);
      return { status: 200 };
    },
  });

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(new Headers(calls[0].headers).get('Authorization'), 'Bearer initial-token');
});

test('fetchWithAuthRetry retries once with the refreshed token after a 401 response', async () => {
  const authHeaders = [];
  let callCount = 0;

  const response = await fetchWithAuthRetry({
    url: 'http://example.test/stream',
    getAccessToken: () => 'expired-token',
    refreshAccessToken: async () => 'fresh-token',
    fetchImpl: async (_url, init) => {
      callCount += 1;
      authHeaders.push(new Headers(init.headers).get('Authorization'));
      return { status: callCount === 1 ? 401 : 200 };
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(authHeaders, ['Bearer expired-token', 'Bearer fresh-token']);
});
