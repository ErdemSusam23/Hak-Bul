export const CHAT_TEXT_WRAP_STYLE = Object.freeze({
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
});

export const CHAT_COMPOSER_MAX_LENGTH = 1000;

export function prepareComposerSubmission({ girdi = '', secilenDosya = null, yukleniyor = false }) {
    const metin = typeof girdi === 'string' ? girdi : '';

    if ((!metin.trim() && !secilenDosya) || yukleniyor) {
        return null;
    }

    return {
        metin,
        dosya: secilenDosya,
        nextGirdi: '',
        nextSecilenDosya: null,
    };
}

export function scoreToPercentage(skor) {
    const numericScore = Number(skor);

    if (!Number.isFinite(numericScore)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(numericScore * 100)));
}

export function getKaynakPreviewText(kaynak = {}) {
    if (typeof kaynak.metin_ozet === 'string' && kaynak.metin_ozet.trim()) {
        return kaynak.metin_ozet;
    }

    if (typeof kaynak.metin === 'string' && kaynak.metin.trim()) {
        return kaynak.metin;
    }

    return '';
}
