const KEY = (email) => `hakbul_sohbetler_${email}`;
const MAX_SOHBET = 30;

export function sohbetleriGetir(email) {
    if (!email) return [];
    try {
        return JSON.parse(localStorage.getItem(KEY(email)) || '[]');
    } catch {
        return [];
    }
}

/**
 * Sohbeti kaydeder veya günceller.
 * sohbet: { id, title, tarih, mesajlar }
 */
export function sohbetKaydet(email, sohbet) {
    if (!email || !sohbet?.id || !sohbet?.mesajlar?.length) return;
    const mevcut = sohbetleriGetir(email);
    const filtered = mevcut.filter((s) => s.id !== sohbet.id);
    const guncellenmis = [sohbet, ...filtered].slice(0, MAX_SOHBET);
    localStorage.setItem(KEY(email), JSON.stringify(guncellenmis));
}

export function sohbetSil(email, sohbetId) {
    if (!email || !sohbetId) return;
    const mevcut = sohbetleriGetir(email);
    localStorage.setItem(KEY(email), JSON.stringify(mevcut.filter((s) => s.id !== sohbetId)));
}
