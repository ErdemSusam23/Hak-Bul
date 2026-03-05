import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

// Token getter/setter — AuthContext ile aynı key'leri kullanır
const getAccessToken = () => sessionStorage.getItem('hakbul_access');
const getRefreshToken = () => sessionStorage.getItem('hakbul_refresh');
const setTokens = (access, refresh) => {
    sessionStorage.setItem('hakbul_access', access);
    if (refresh) sessionStorage.setItem('hakbul_refresh', refresh);
};

// --- Mock veriler ---
const MOCK_DELAY = 1800;

const mockDelay = () => new Promise((r) => setTimeout(r, MOCK_DELAY));

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
});

// Request interceptor — her isteğe token ekle
client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor — 401 gelirse token yenile, bir kez tekrar dene
let _yenileniyor = false;
let _beklemeListesi = [];

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const orijinal = error.config;
        if (error?.response?.status !== 401 || orijinal._tekrarDenendi) {
            return Promise.reject(error);
        }
        orijinal._tekrarDenendi = true;

        if (_yenileniyor) {
            return new Promise((resolve, reject) => {
                _beklemeListesi.push({ resolve, reject });
            }).then((token) => {
                orijinal.headers.Authorization = `Bearer ${token}`;
                return client(orijinal);
            });
        }

        _yenileniyor = true;
        try {
            const refresh = getRefreshToken();
            if (!refresh) throw new Error('Refresh token yok');
            const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refresh });
            setTokens(data.access_token, data.refresh_token);
            _beklemeListesi.forEach((p) => p.resolve(data.access_token));
            _beklemeListesi = [];
            orijinal.headers.Authorization = `Bearer ${data.access_token}`;
            return client(orijinal);
        } catch {
            _beklemeListesi.forEach((p) => p.reject(error));
            _beklemeListesi = [];
            // Session temizle
            sessionStorage.removeItem('hakbul_access');
            sessionStorage.removeItem('hakbul_refresh');
            sessionStorage.removeItem('hakbul_email');
            window.location.href = '/giris';
            return Promise.reject(error);
        } finally {
            _yenileniyor = false;
        }
    }
);

// POST /ask  →  { soru, max_kaynak }
export async function soruSor(soru, maxKaynak = 5) {
    if (MOCK_MODE) {
        await mockDelay();
        return MOCK_YANIT;
    }
    const { data } = await client.post('/ask', { soru, max_kaynak: maxKaynak });
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
