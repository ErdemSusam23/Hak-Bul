import test from 'node:test';
import assert from 'node:assert/strict';

import { getKaynakPreviewText } from './chatUi.js';

test('getKaynakPreviewText prefers the short summary over the full source text', () => {
    const preview = getKaynakPreviewText({
        metin_ozet: 'Sadece ilgili kısa özet.',
        metin: 'Kartta artık gösterilmemesi gereken uzun tam metin.',
    });

    assert.equal(preview, 'Sadece ilgili kısa özet.');
});
