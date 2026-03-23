import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { girisYap, kayitOl, tokenYenile, cikisYap } from '../api/auth';
import { setAuthHandlers } from '../api/client';

const AuthContext = createContext(null);

const ACCESS_KEY = 'hakbul_access';
const REFRESH_KEY = 'hakbul_refresh';
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

    // Token'ları kaydet
    const tokenlariKaydet = useCallback((access, refresh, email, rol) => {
        sessionStorage.setItem(ACCESS_KEY, access);
        sessionStorage.setItem(REFRESH_KEY, refresh);
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

    // Token yenile (otomatik — singleton promise)
    const tokenYenileFn = useCallback(async () => {
        if (refreshPromiseRef.current) return refreshPromiseRef.current;

        const refresh = sessionStorage.getItem(REFRESH_KEY);
        if (!refresh) throw new Error('Refresh token yok');

        refreshPromiseRef.current = tokenYenile(refresh)
            .then((data) => {
                tokenlariKaydet(data.access_token, data.refresh_token);
                setKullanici((prev) => prev ? { ...prev, token: data.access_token } : null);
                return data.access_token;
            })
            .catch(() => {
                cikis(); // Yenileme başarısızsa direkt çıkış yap
                throw new Error('Oturum süresi doldu');
            })
            .finally(() => { refreshPromiseRef.current = null; });

        return refreshPromiseRef.current;
    }, [tokenlariKaydet]);

    // Çıkış yap
    const cikis = useCallback(async () => {
        const refresh = sessionStorage.getItem(REFRESH_KEY);
        try { if (refresh) await cikisYap(refresh); } catch { /* sessiz */ }
        sessionStorage.removeItem(ACCESS_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
        sessionStorage.removeItem(EMAIL_KEY);
        sessionStorage.removeItem('hakbul_role');
        setKullanici(null);
    }, []);

    const accessToken = useCallback(() => sessionStorage.getItem(ACCESS_KEY), []);

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
            girisYapildi: !!kullanici,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
