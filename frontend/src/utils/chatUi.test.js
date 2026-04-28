import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHAT_COMPOSER_MAX_LENGTH,
    CHAT_TEXT_WRAP_STYLE,
    prepareComposerSubmission,
    scoreToBandLabel,
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

test('scoreToBandLabel maps scores to the expected confidence bands', () => {
    assert.equal(scoreToBandLabel(0.59), 'Çok düşük');
    assert.equal(scoreToBandLabel(0.60), 'Düşük');
    assert.equal(scoreToBandLabel(0.69), 'Düşük');
    assert.equal(scoreToBandLabel(0.70), 'Orta');
    assert.equal(scoreToBandLabel(0.79), 'Orta');
    assert.equal(scoreToBandLabel(0.80), 'İyi');
    assert.equal(scoreToBandLabel(0.89), 'İyi');
    assert.equal(scoreToBandLabel(0.90), 'Çok iyi');
    assert.equal(scoreToBandLabel(1.0), 'Çok iyi');
    assert.equal(scoreToBandLabel(-1), 'Çok düşük');
    assert.equal(scoreToBandLabel(Number.NaN), 'Çok düşük');
    assert.equal(scoreToBandLabel(1.7), 'Çok iyi');
});

test('CHAT_TEXT_WRAP_STYLE forces long streaming content to wrap', () => {
    assert.equal(CHAT_TEXT_WRAP_STYLE.overflowWrap, 'anywhere');
    assert.equal(CHAT_TEXT_WRAP_STYLE.wordBreak, 'break-word');
});

test('CHAT_COMPOSER_MAX_LENGTH keeps the sohbet composer capped at 1000 characters', () => {
    assert.equal(CHAT_COMPOSER_MAX_LENGTH, 1000);
});
