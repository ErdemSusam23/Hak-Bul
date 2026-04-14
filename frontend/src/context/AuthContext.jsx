import { useState, useCallback, useRef, useEffect } from 'react';
import { girisYap, kayitOl, tokenYenile, cikisYap } from '../api/auth';
import { setAuthHandlers } from '../api/client';
import { AuthContext } from './AuthContextValue';

const ACCESS_KEY = 'hakbul_access';
const EMAIL_KEY = 'hakbul_email';

export function AuthProvider({ children }) {
    const [kullanici, setKullanici] = useState(() => {
        const email = sessionStorage.getItem(EMAIL_KEY);
        const token = sessionStorage.getItem(ACCESS_KEY);
        const rol = sessionStorage.getItem('hakbul_role') || 'user';
        return token ? { email, token, rol } : null;
    });
    const [yukleniyor, setYukleniyor] = useState(false);
    const refreshPromiseRef = useRef(null);

    // Token'ları kaydet (refresh_token artık httpOnly cookie'de, sadece access_token saklanır)
    const tokenlariKaydet = useCallback((access, _refresh, email, rol) => {
        sessionStorage.setItem(ACCESS_KEY, access);
        if (email) sessionStorage.setItem(EMAIL_KEY, email);
        if (rol) sessionStorage.setItem('hakbul_role', rol);
    }, []);

    // Giriş yap
    const giris = useCallback(async (email, sifre) => {
        setYukleniyor(true);
        try {
            const data = await girisYap({ email, sifre });
            tokenlariKaydet(data.access_token, data.refresh_token, email, data.role);
            setKullanici({ email, token: data.access_token, rol: data.role || 'user' });
            return { basarili: true };
        } catch (err) {
            const mesaj =
                err?.response?.status === 401
                    ? 'E-posta veya şifre hatalı.'
                    : 'Giriş yapılamadı. Lütfen tekrar deneyin.';
            return { basarili: false, mesaj };
        } finally {
            setYukleniyor(false);
        }
    }, [tokenlariKaydet]);

    // Kayıt ol
    const kayit = useCallback(async (email, sifre) => {
        setYukleniyor(true);
        try {
            await kayitOl({ email, sifre });
            return { basarili: true };
        } catch (err) {
            const status = err?.response?.status;
            const mesaj =
                status === 409
                    ? 'Bu e-posta zaten kullanılıyor.'
                    : status === 422
                        ? 'Geçersiz e-posta veya şifre formatı.'
                        : 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.';
            return { basarili: false, mesaj };
        } finally {
            setYukleniyor(false);
        }
    }, []);

    // Çıkış yap (cookie'yi sunucu tarafında iptal et)
    const cikis = useCallback(async () => {
        try { await cikisYap(); } catch { /* sessiz */ }
        sessionStorage.removeItem(ACCESS_KEY);
        sessionStorage.removeItem(EMAIL_KEY);
        sessionStorage.removeItem('hakbul_role');
        setKullanici(null);
        window.dispatchEvent(new Event('auth-cikis'));
    }, []);

    // Token yenile (otomatik — singleton promise, httpOnly cookie kullanır)
    const tokenYenileFn = useCallback(async () => {
        if (refreshPromiseRef.current) return refreshPromiseRef.current;

        refreshPromiseRef.current = tokenYenile()
            .then((data) => {
                tokenlariKaydet(data.access_token, "");
                setKullanici((prev) => prev ? { ...prev, token: data.access_token } : null);
                return data.access_token;
            })
            .catch(() => {
                cikis(); // Yenileme başarısızsa direkt çıkış yap
                throw new Error('Oturum süresi doldu');
            })
            .finally(() => { refreshPromiseRef.current = null; });

        return refreshPromiseRef.current;
    }, [tokenlariKaydet, cikis]);

    const accessToken = useCallback(() => sessionStorage.getItem(ACCESS_KEY), []);

    const kullaniciGuncelle = useCallback((patch) => {
        if (!patch) return;
        setKullanici((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...patch };
            if (next.token) sessionStorage.setItem(ACCESS_KEY, next.token);
            if (next.email) sessionStorage.setItem(EMAIL_KEY, next.email);
            if (next.rol) sessionStorage.setItem('hakbul_role', next.rol);
            return next;
        });
    }, []);

    // Interceptor için handler'ları set et
    useEffect(() => {
        setAuthHandlers(accessToken, tokenYenileFn);
    }, [accessToken, tokenYenileFn]);

    return (
        <AuthContext.Provider value={{
            kullanici,
            yukleniyor,
            giris,
            kayit,
            cikis,
            tokenYenile: tokenYenileFn,
            accessToken,
            kullaniciGuncelle,
            girisYapildi: !!kullanici,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
