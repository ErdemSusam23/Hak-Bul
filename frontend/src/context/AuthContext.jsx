import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

import { girisYap, kayitOl, tokenYenile, cikisYap, oturumProfiliGetir } from '../api/auth';
import { setAuthHandlers } from '../api/client';

const AuthContext = createContext(null);

const ACCESS_KEY = 'hakbul_access';
const EMAIL_KEY = 'hakbul_email';
const ID_KEY = 'hakbul_user_id';
const DIL_KEY = 'hakbul_dil';

function authMesajlari() {
    const dil = sessionStorage.getItem(DIL_KEY) || localStorage.getItem(DIL_KEY) || 'tr';
    return dil === 'en'
        ? {
            invalidCredentials: 'Email or password is incorrect.',
            loginFailed: 'Login failed. Please try again.',
            emailInUse: 'This email address is already in use.',
            invalidRegister: 'Invalid email or password format.',
            registerFailed: 'Registration could not be completed. Please try again.',
            sessionExpired: 'Session expired',
        }
        : {
            invalidCredentials: 'E-posta veya \u015fifre hatal\u0131.',
            loginFailed: 'Giri\u015f yap\u0131lamad\u0131. L\u00fctfen tekrar deneyin.',
            emailInUse: 'Bu e-posta zaten kullan\u0131l\u0131yor.',
            invalidRegister: 'Ge\u00e7ersiz e-posta veya \u015fifre format\u0131.',
            registerFailed: 'Kay\u0131t olu\u015fturulamad\u0131. L\u00fctfen tekrar deneyin.',
            sessionExpired: 'Oturum s\u00fcresi doldu',
        };
}

export function AuthProvider({ children }) {
    const [kullanici, setKullanici] = useState(() => {
        const id = sessionStorage.getItem(ID_KEY);
        const email = sessionStorage.getItem(EMAIL_KEY);
        const token = sessionStorage.getItem(ACCESS_KEY);
        const rol = sessionStorage.getItem('hakbul_role') || 'user';
        return token ? { id, email, token, rol } : null;
    });
    const [yukleniyor, setYukleniyor] = useState(false);
    const refreshPromiseRef = useRef(null);

    const tokenlariKaydet = useCallback((access, _refresh, email, rol, id) => {
        sessionStorage.setItem(ACCESS_KEY, access);
        if (email) sessionStorage.setItem(EMAIL_KEY, email);
        if (rol) sessionStorage.setItem('hakbul_role', rol);
        if (id) sessionStorage.setItem(ID_KEY, id);
    }, []);

    const giris = useCallback(async (email, sifre) => {
        setYukleniyor(true);
        try {
            const data = await girisYap({ email, sifre });
            tokenlariKaydet(data.access_token, data.refresh_token, email, data.role, data.id);
            setKullanici({ id: data.id, email, token: data.access_token, rol: data.role || 'user' });
            return { basarili: true };
        } catch (err) {
            const mesajlar = authMesajlari();
            const mesaj = err?.response?.status === 401 ? mesajlar.invalidCredentials : mesajlar.loginFailed;
            return { basarili: false, mesaj };
        } finally {
            setYukleniyor(false);
        }
    }, [tokenlariKaydet]);

    const kayit = useCallback(async (email, sifre) => {
        setYukleniyor(true);
        try {
            await kayitOl({ email, sifre });
            return { basarili: true };
        } catch (err) {
            const mesajlar = authMesajlari();
            const status = err?.response?.status;
            const mesaj = status === 409
                ? mesajlar.emailInUse
                : status === 422
                    ? mesajlar.invalidRegister
                    : mesajlar.registerFailed;
            return { basarili: false, mesaj };
        } finally {
            setYukleniyor(false);
        }
    }, []);

    const cikis = useCallback(async () => {
        try { await cikisYap(); } catch { /* sessiz */ }
        sessionStorage.removeItem(ACCESS_KEY);
        sessionStorage.removeItem(EMAIL_KEY);
        sessionStorage.removeItem(ID_KEY);
        sessionStorage.removeItem('hakbul_role');
        setKullanici(null);
        window.dispatchEvent(new Event('auth-cikis'));
    }, []);

    const tokenYenileFn = useCallback(async () => {
        if (refreshPromiseRef.current) return refreshPromiseRef.current;

        refreshPromiseRef.current = tokenYenile()
            .then((data) => {
                tokenlariKaydet(data.access_token, '', undefined, data.role, data.id);
                setKullanici((prev) => (prev ? { ...prev, id: data.id || prev.id, token: data.access_token, rol: data.role || prev.rol } : null));
                return data.access_token;
            })
            .catch(() => {
                cikis();
                throw new Error(authMesajlari().sessionExpired);
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
            if (next.id) sessionStorage.setItem(ID_KEY, next.id);
            if (next.rol) sessionStorage.setItem('hakbul_role', next.rol);
            return next;
        });
    }, []);

    useEffect(() => {
        setAuthHandlers(accessToken, tokenYenileFn);
    }, [accessToken, tokenYenileFn]);

    useEffect(() => {
        if (!kullanici?.token || kullanici.id) return;

        oturumProfiliGetir(kullanici.token)
            .then((profil) => {
                if (!profil?.id) return;
                kullaniciGuncelle({ id: profil.id, email: profil.email, rol: profil.role || kullanici.rol });
            })
            .catch(() => {
                // Eski session'da kullanici kimligini tamamlamayi deneriz.
            });
    }, [kullanici, kullaniciGuncelle]);

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
        }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
