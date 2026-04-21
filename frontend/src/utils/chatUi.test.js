import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHAT_COMPOSER_MAX_LENGTH,
    CHAT_TEXT_WRAP_STYLE,
    prepareComposerSubmission,
    scoreToPercentage,
} from './chatUi.js';

test('prepareComposerSubmission clears the composer after a valid submission', () => {
    const payload = prepareComposerSubmission({
        girdi: 'Fazla mesai ücreti alabilir miyim?',
        secilenDosya: { name: 'bordro.pdf' },
        yukleniyor: false,
    });

    assert.deepEqual(payload, {
        metin: 'Fazla mesai ücreti alabilir miyim?',
        dosya: { name: 'bordro.pdf' },
        nextGirdi: '',
        nextSecilenDosya: null,
    });
});

test('prepareComposerSubmission blocks empty or loading submissions', () => {
    assert.equal(
        prepareComposerSubmission({
            girdi: '   ',
            secilenDosya: null,
            yukleniyor: false,
        }),
        null,
    );

    assert.equal(
        prepareComposerSubmission({
            girdi: 'Geçerli bir soru',
            secilenDosya: null,
            yukleniyor: true,
        }),
        null,
    );
});

test('scoreToPercentage clamps invalid and oversized scores into 0-100 range', () => {
    assert.equal(scoreToPercentage(0.82), 82);
    assert.equal(scoreToPercentage(1.73), 100);
    assert.equal(scoreToPercentage(-4), 0);
    assert.equal(scoreToPercentage(Number.NaN), 0);
});

test('CHAT_TEXT_WRAP_STYLE forces long streaming content to wrap', () => {
    assert.equal(CHAT_TEXT_WRAP_STYLE.overflowWrap, 'anywhere');
    assert.equal(CHAT_TEXT_WRAP_STYLE.wordBreak, 'break-word');
});

test('CHAT_COMPOSER_MAX_LENGTH keeps the sohbet composer capped at 1000 characters', () => {
    assert.equal(CHAT_COMPOSER_MAX_LENGTH, 1000);
});
