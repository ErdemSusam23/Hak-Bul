import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildForumCreatePayload,
  normalizeForumThread,
} from './forumFlow.js';

test('normalizeForumThread maps backend thread fields into the list card view model', () => {
  assert.deepEqual(
    normalizeForumThread({
      id: 't1',
      title: 'Başlık',
      category: 'Genel',
      vote_score: 4,
      reply_count: 3,
      display_name: 'Kullanıcı',
      created_at: '2026-04-21T10:00:00',
      is_locked: false,
    }),
    {
      id: 't1',
      title: 'Başlık',
      category: 'Genel',
      voteScore: 4,
      replyCount: 3,
      displayName: 'Kullanıcı',
      createdAt: '2026-04-21T10:00:00',
      isLocked: false,
    },
  );
});

test('buildForumCreatePayload trims inputs before sending them to the API', () => {
  assert.deepEqual(
    buildForumCreatePayload({
      title: '  Tahliye  ',
      content: '  Kiracı çıkmıyor  ',
      category: '  Genel ',
    }),
    {
      title: 'Tahliye',
      content: 'Kiracı çıkmıyor',
      category: 'Genel',
    },
  );
});
