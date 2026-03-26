import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

// --- Mock veriler ---
const MOCK_DELAY = 1800;

const mockDelay = () => new Promise((r) => setTimeout(r, MOCK_DELAY));
const normalizeLanguage = (language) => (language === 'en' ? 'en' : 'tr');

const MOCK_YANIT = {
    yanit: `Kıdem tazminatı hakkı kazanabilmek için iş sözleşmenizin asgari **1 yıl** sürmüş olması ve işveren tarafından haksız fesih, emeklilik, askerlik ya da kadın işçi için evlilik gibi kanunda sayılan hallerden biriyle sona ermesi gerekmektedir.

**4857 Sayılı İş Kanunu** kapsamındaki bir işçi olarak şu koşullarda kıdem tazminatı alabilirsiniz:

- En az 1 yıl aynı işyerinde çalışmış olmak
- İş sözleşmesinin işveren tarafından haksız ya da geçersiz nedenle feshedilmesi
- Emeklilik nedeniyle ayrılma (SGK şartları sağlandığında)
- Askerlik hizmeti nedeniyle işten ayrılma
- Ölüm halinde mirasçılara ödeme

Her tam yıl için 30 günlük brüt ücret tutarında ödeme yapılır. Üst sınır her altı ayda bir güncellenen **kıdem tazminatı tavanı** ile sınırlıdır.`,
    kaynaklar: [
        {
            id: 'k1',
            kaynak_turu: 'kanun',
            baslik: '4857 Sayılı İş Kanunu — Madde 17',
            metin_ozet: 'Belirsiz süreli iş sözleşmelerinin feshinde bildirim şartı ve kıdem tazminatına esas sürelere ilişkin düzenlemeler.',
            skor: 0.94,
            url: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf',
        },
        {
            id: 'k2',
            kaynak_turu: 'kanun',
            baslik: '1475 Sayılı İş Kanunu — Madde 14',
            metin_ozet: 'Kıdem tazminatının hesaplanması, ödeme koşulları ve üst sınırına ilişkin temel düzenleme.',
            skor: 0.91,
            url: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.1475.pdf',
        },
        {
            id: 'k3',
            kaynak_turu: 'yargitay_karari',
            baslik: 'Yargıtay 9. HD — E.2021/1234 K.2022/5678',
            metin_ozet: 'İşverenin haklı neden olmaksızın iş sözleşmesini feshetmesi durumunda işçinin kıdem ve ihbar tazminatına hak kazanacağına ilişkin emsal karar.',
            skor: 0.87,
            url: null,
        },
    ],
    uyari: 'Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz. Hukuki danışmanlık için bir avukata başvurunuz.',
};

const MOCK_SEARCH_RESULTS = [
    {
        id: 's1',
        kaynak_turu: 'kanun',
        baslik: '4857 Sayılı İş Kanunu — Madde 17',
        metin_ozet: 'Belirsiz süreli iş sözleşmelerinin feshinde bildirim şartı ve kıdem tazminatına esas süreler.',
        skor: 0.99,
        url: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf',
    },
    {
        id: 's2',
        kaynak_turu: 'kanun',
        baslik: '4857 Sayılı İş Kanunu — Madde 18',
        metin_ozet: 'Feshin geçerli sebebe dayandırılması zorunluluğu; otuz ve üzeri işçi çalıştıran işverenlerdeki geçerlilik denetimi.',
        skor: 0.88,
        url: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf',
    },
];

// --- Gerçek API ---
const client = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,  // Required for httpOnly cookie-based refresh token
});

let getAccessToken = null;
let refreshAccessToken = null;

export const setAuthHandlers = (getToken, refreshToken) => {
    getAccessToken = getToken;
    refreshAccessToken = refreshToken;
};

// İstek interceptor: Her isteğe Authorization başlığı ekler
client.interceptors.request.use((config) => {
    if (getAccessToken) {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
}, (error) => Promise.reject(error));

// Yanıt interceptor: 401 hatasında token yenilemeyi dener
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && refreshAccessToken) {
            originalRequest._retry = true;
            try {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return client(originalRequest);
                }
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

// POST /ask
export async function soruSor({ soru, maxKaynak = 5, language = 'tr', conversation_id = null, guest_session_id = null }) {
    if (MOCK_MODE) {
        await mockDelay();
        return MOCK_YANIT;
    }
    const payload = { soru, max_kaynak: maxKaynak, language: normalizeLanguage(language) };
    if (conversation_id) payload.conversation_id = conversation_id;
    if (guest_session_id) payload.guest_session_id = guest_session_id;

    const { data } = await client.post('/ask', payload);
    return data;
}

// POST /documents/analyze
export async function dokumanAnalizAPI({ dosya, soru, language = 'tr', conversation_id, guest_session_id }) {
    if (MOCK_MODE) {
        await mockDelay();
        return MOCK_YANIT;
    }
    const headers = { 'Content-Type': 'multipart/form-data' };
    const formData = new FormData();
    formData.append('dosya', dosya);
    if (soru) formData.append('soru', soru);
    formData.append('language', normalizeLanguage(language));
    if (conversation_id) formData.append('conversation_id', conversation_id);
    if (guest_session_id) formData.append('guest_session_id', guest_session_id);

    const { data } = await client.post('/documents/analyze', formData, { headers });
    return data;
}

// POST /documents/compare
export async function dokumanKarsilastirAPI({ dosya1, dosya2, soru, language = 'tr' }) {
    if (MOCK_MODE) {
        await mockDelay();
        return { ...MOCK_YANIT, belge1_ozet: 'Belge 1 özeti...', belge2_ozet: 'Belge 2 özeti...' };
    }
    const formData = new FormData();
    formData.append('dosya1', dosya1);
    formData.append('dosya2', dosya2);
    if (soru) formData.append('soru', soru);
    formData.append('language', normalizeLanguage(language));
    const { data } = await client.post('/documents/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

// GET /search  →  { q }
export async function aramaYap(q) {
    if (MOCK_MODE) {
        await mockDelay();
        return { sonuclar: MOCK_SEARCH_RESULTS };
    }
    const { data } = await client.get('/search', { params: { q } });
    return data;
}

// GET /health
export async function saglikKontrol() {
    if (MOCK_MODE) return { durum: 'tamam', mod: 'mock' };
    const { data } = await client.get('/health');
    return data;
}

// POST /feedback  →  { message_id, puan, guest_session_id }
export async function feedbackGonder({ message_id, puan, guest_session_id }) {
    if (MOCK_MODE) return { basarili: true, mesaj: 'Mock feedback' };
    const { data } = await client.post('/feedback', { message_id, puan, guest_session_id });
    return data;
}

// REST API SOHBET GEÇMİŞİ METOTLARI

export async function sohbetGecmisiListeleAPI() {
    if (MOCK_MODE) return { conversations: [], total: 0 };
    const { data } = await client.get('/chat/conversations', {
        params: { limit: 50, offset: 0 }
    });
    return data;
}

export async function misafirSohbetGecmisiListeleAPI(guestSessionId) {
    if (MOCK_MODE) return { conversations: [], total: 0 };
    const { data } = await client.get('/chat/guest/conversations', {
        params: { guest_session_id: guestSessionId, limit: 50, offset: 0 }
    });
    return data;
}

export async function sohbetDetayGetirAPI(conversationId) {
    if (MOCK_MODE) return { messages: [], total: 0 };
    const { data } = await client.get(`/chat/history/${conversationId}`, {
        params: { limit: 100, offset: 0 }
    });
    return data;
}

export async function misafirSohbetDetayGetirAPI(conversationId, guestSessionId) {
    if (MOCK_MODE) return { messages: [], total: 0 };
    const { data } = await client.get(`/chat/guest/history/${conversationId}`, {
        params: { guest_session_id: guestSessionId, limit: 100, offset: 0 }
    });
    return data;
}

export async function sohbetSilAPI(conversationId) {
    if (MOCK_MODE) return { ok: true };
    await client.delete(`/chat/conversations/${conversationId}`);
}

export async function sohbetPaylasAPI(conversationId) {
    if (MOCK_MODE) return { share_token: 'mock-token-123' };
    const { data } = await client.post(`/chat/conversations/${conversationId}/share`);
    return data;
}

export async function sohbetPaylasimKaldirAPI(conversationId) {
    if (MOCK_MODE) return;
    await client.delete(`/chat/conversations/${conversationId}/share`);
}

export async function paylasimSohbetGetirAPI(shareToken) {
    if (MOCK_MODE) return { messages: [], total: 0 };
    const { data } = await client.get(`/chat/shared/${shareToken}`);
    return data;
}

export async function sohbetPDFIndirAPI(conversationId) {
    if (MOCK_MODE) return new Blob(['Mock PDF'], { type: 'application/pdf' });
    const { data } = await client.get(`/chat/conversations/${conversationId}/export`, {
        responseType: 'blob',
    });
    return data;
}

export async function sohbetYenidenAdlandirAPI(conversationId, title) {
    if (MOCK_MODE) return { ok: true };
    const { data } = await client.patch(`/chat/conversations/${conversationId}/title`, { title });
    return data;
}

// REST API TASLAK METOTLARI
export async function taslakListesiAPI(language = 'tr') {
    if (MOCK_MODE) return [{ id: 1, title: 'Kira Sözleşmesi Taslağı', description: 'Kiracı ve Ev Sahibi arasında temel kontrat.', alanlar: ['Kiracı Adı', 'Mülk Adresi'] }];
    const { data } = await client.get('/templates', { params: { language: normalizeLanguage(language) } });
    return data;
}

export async function taslakPdfUretAPI(templateId, body, language = 'tr') {
    if (MOCK_MODE) {
        await mockDelay();
        return new Blob(['Mock PDF Content'], { type: 'application/pdf' });
    }
    const payload = { ...body, language: normalizeLanguage(language) };
    const { data } = await client.post(`/templates/${templateId}/generate`, payload, {
        responseType: 'blob'
    });
    return data;
}

// REST API PROFİL METOTLARI
export async function profilGetirAPI() {
    if (MOCK_MODE) return { id: 'mock', email: 'kullanici@ornek.com', role: 'user' };
    const { data } = await client.get('/auth/profile');
    return data;
}

export async function profilGuncelleAPI({ email, yeni_sifre, mevcut_sifre }) {
    if (MOCK_MODE) return { id: 'mock', email: email || 'kullanici@ornek.com', role: 'user' };
    const { data } = await client.put('/auth/profile', { email, yeni_sifre, mevcut_sifre });
    return data;
}

export async function hesapSilAPI(mevcut_sifre) {
    if (MOCK_MODE) return;
    await client.delete(`/auth/account?mevcut_sifre=${encodeURIComponent(mevcut_sifre)}`);
}

// REST API ADMIN METOTLARI
export async function adminIstatistikAPI() {
    if (MOCK_MODE) return { toplam_kullanici: 42, toplam_mesaj: 1280, toplam_konusma: 310 };
    const { data } = await client.get('/admin/stats');
    return data;
}

export async function adminKategoriDagilimiAPI() {
    if (MOCK_MODE) return [{ kategori: 'İş Hukuku', sayi: 45 }, { kategori: 'Sözleşme', sayi: 28 }];
    const { data } = await client.get('/admin/stats/categories');
    return data;
}

export async function adminFeedbackOzetiAPI() {
    if (MOCK_MODE) return { begeni: 12, begenmeme: 3, toplam: 15, oran: 0.8 };
    const { data } = await client.get('/admin/stats/feedback');
    return data;
}

export async function adminGunlukAktiviteAPI(gun = 7) {
    if (MOCK_MODE) return [];
    const { data } = await client.get('/admin/stats/daily', { params: { gun } });
    return data;
}

export async function adminKullaniciListesiAPI(limit = 50, offset = 0) {
    if (MOCK_MODE) return { kullanicilar: [], total: 0 };
    const { data } = await client.get('/admin/users', { params: { limit, offset } });
    return data;
}

export async function adminRolGuncelleAPI(userId, rol) {
    if (MOCK_MODE) return {};
    const { data } = await client.patch(`/admin/users/${userId}/role`, { rol });
    return data;
}

export async function adminKullaniciDurumAPI(userId, aktif) {
    if (MOCK_MODE) return {};
    const { data } = await client.patch(`/admin/users/${userId}/status`, null, { params: { aktif } });
    return data;
}

export async function adminZayifSorguListesiAPI(limit = 100) {
    if (MOCK_MODE) return [];
    const { data } = await client.get('/admin/weak-queries', { params: { limit } });
    return data;
}
