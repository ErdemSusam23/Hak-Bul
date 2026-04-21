import test from 'node:test';
import assert from 'node:assert/strict';
import { formatForumThreadHash, parseAppLocation } from './appRoutes.js';

test('parseAppLocation resolves the forum thread hash route', () => {
  assert.deepEqual(parseAppLocation('#/forum/thread-123', 'landing'), {
    page: 'forum',
    forumThreadId: 'thread-123',
  });
});

test('parseAppLocation falls back to the stored page when there is no special hash route', () => {
  assert.deepEqual(parseAppLocation('', 'karsilastir'), {
    page: 'karsilastir',
    forumThreadId: null,
  });
});

test('formatForumThreadHash generates a stable hash route for forum details', () => {
  assert.equal(formatForumThreadHash('abc'), '#/forum/abc');
});
