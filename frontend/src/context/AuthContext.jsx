import { useState, useCallback, useRef, useEffect } from 'react';
import { girisYap, kayitOl, tokenYenile, cikisYap } from '../api/auth';
import { setAuthHandlers } from '../api/client';
import { AuthContext } from './AuthContextValue';

const ACCESS_KEY = 'hakbul_access';
const EMAIL_KEY = 'hakbul_email';
const ID_KEY = 'hakbul_user_id';
const ROLE_KEY = 'hakbul_role';

function normalizeRole(role) {
    return String(role || 'user').trim().toLowerCase();
}

function parseUserIdFromToken(token) {
    if (!token) return null;
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = atob(padded);
        const parsed = JSON.parse(decoded);
        return parsed.sub || null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [kullanici, setKullanici] = useState(() => {
        const email = sessionStorage.getItem(EMAIL_KEY);
        const token = sessionStorage.getItem(ACCESS_KEY);
        const id = sessionStorage.getItem(ID_KEY) || parseUserIdFromToken(token);
        const rol = normalizeRole(sessionStorage.getItem(ROLE_KEY) || 'user');
        return token ? { id, email, token, rol } : null;
    });
    const [yukleniyor, setYukleniyor] = useState(false);
    const refreshPromiseRef = useRef(null);

    // Token'ları kaydet (refresh_token artık httpOnly cookie'de, sadece access_token saklanır)
    const tokenlariKaydet = useCallback((access, _refresh, email, rol, id) => {
        sessionStorage.setItem(ACCESS_KEY, access);
        if (email) sessionStorage.setItem(EMAIL_KEY, email);
        if (rol) sessionStorage.setItem(ROLE_KEY, normalizeRole(rol));
        const resolvedId = id || parseUserIdFromToken(access);
        if (resolvedId) sessionStorage.setItem(ID_KEY, resolvedId);
    }, []);

    // Giriş yap
    const giris = useCallback(async (email, sifre) => {
        setYukleniyor(true);
        try {
            const data = await girisYap({ email, sifre });
            const id = parseUserIdFromToken(data.access_token);
            tokenlariKaydet(data.access_token, data.refresh_token, email, data.role, id);
            setKullanici({ id, email, token: data.access_token, rol: normalizeRole(data.role || 'user') });
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
        sessionStorage.removeItem(ID_KEY);
        sessionStorage.removeItem(ROLE_KEY);
        setKullanici(null);
        window.dispatchEvent(new Event('auth-cikis'));
    }, []);

    // Token yenile (otomatik — singleton promise, httpOnly cookie kullanır)
    const tokenYenileFn = useCallback(async () => {
        if (refreshPromiseRef.current) return refreshPromiseRef.current;

        refreshPromiseRef.current = tokenYenile()
            .then((data) => {
                const id = parseUserIdFromToken(data.access_token);
                const normalizedRole = normalizeRole(data.role);
                tokenlariKaydet(data.access_token, "", null, normalizedRole, id);
                setKullanici((prev) => prev ? { ...prev, id: id || prev.id, token: data.access_token, rol: normalizedRole || prev.rol } : null);
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
            const next = patch.rol ? { ...prev, ...patch, rol: normalizeRole(patch.rol) } : { ...prev, ...patch };
            if (next.token) sessionStorage.setItem(ACCESS_KEY, next.token);
            if (next.email) sessionStorage.setItem(EMAIL_KEY, next.email);
            if (next.id) sessionStorage.setItem(ID_KEY, next.id);
            if (next.rol) sessionStorage.setItem(ROLE_KEY, normalizeRole(next.rol));
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
