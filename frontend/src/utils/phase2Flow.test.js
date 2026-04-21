import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSharedConversationUrl,
  createNewsletterNotice,
  togglePendingAction,
} from './phase2Flow.js';

test('buildSharedConversationUrl creates a stable shared conversation hash URL', () => {
  assert.equal(
    buildSharedConversationUrl('https://hakbul.example', 'share-token'),
    'https://hakbul.example/#/shared/share-token',
  );
});

test('createNewsletterNotice requires an email before showing the waiting-list message', () => {
  assert.deepEqual(createNewsletterNotice('   '), {
    kind: 'error',
    text: 'Bülten için e-posta adresi girin.',
  });

  assert.deepEqual(createNewsletterNotice('  kisi@example.com '), {
    kind: 'info',
    text: 'Bülten aboneliği yakında açılacak. Şimdilik bu özellik beklemede.',
  });
});

test('togglePendingAction arms and disarms the same destructive action id', () => {
  assert.equal(togglePendingAction(null, 'reply-1'), 'reply-1');
  assert.equal(togglePendingAction('reply-1', 'reply-1'), null);
  assert.equal(togglePendingAction('reply-1', 'reply-2'), 'reply-2');
});
