import { useState, useCallback, useRef, useEffect } from 'react';
import {
    girisYap,
    kayitOl,
    tokenYenile,
    cikisYap,
    tokenIleProfilGetir,
} from '../api/auth';
import { setAuthHandlers } from '../api/client';
import { AuthContext } from './AuthContextValue';
import {
    buildAuthUserFromAccessToken,
    decodeJwtPayload,
    isAccessTokenExpired,
    normalizeRoleName,
} from '../utils/authSession';

const ACCESS_KEY = 'hakbul_access';
const EMAIL_KEY = 'hakbul_email';
const ID_KEY = 'hakbul_user_id';
const ROLE_KEY = 'hakbul_role';

export function AuthProvider({ children }) {
    const [kullanici, setKullanici] = useState(null);
    const [authHazir, setAuthHazir] = useState(false);
    const [yukleniyor, setYukleniyor] = useState(false);
    const refreshPromiseRef = useRef(null);

    const sessionOku = useCallback(() => ({
        accessToken: sessionStorage.getItem(ACCESS_KEY),
        email: sessionStorage.getItem(EMAIL_KEY),
        id: sessionStorage.getItem(ID_KEY),
        rol: sessionStorage.getItem(ROLE_KEY),
    }), []);

    // Access token client-side tutulur; refresh token yalnızca httpOnly cookie içindedir.
    const tokenlariKaydet = useCallback((accessToken, { email = null, rol = null, id = null } = {}) => {
        sessionStorage.setItem(ACCESS_KEY, accessToken);
        if (email) sessionStorage.setItem(EMAIL_KEY, email);
        if (rol) sessionStorage.setItem(ROLE_KEY, normalizeRoleName(rol));

        const resolvedId = id || decodeJwtPayload(accessToken)?.sub || null;
        if (resolvedId) {
            sessionStorage.setItem(ID_KEY, resolvedId);
        }
    }, []);

    const sessionTemizle = useCallback(async ({ serverLogout = false, emitEvent = true } = {}) => {
        if (serverLogout) {
            try {
                await cikisYap();
            } catch {
                // Storage temizliği logout yanıtından daha önemli.
            }
        }

        sessionStorage.removeItem(ACCESS_KEY);
        sessionStorage.removeItem(EMAIL_KEY);
        sessionStorage.removeItem(ID_KEY);
        sessionStorage.removeItem(ROLE_KEY);
        setKullanici(null);

        if (emitEvent) {
            window.dispatchEvent(new Event('auth-cikis'));
        }
    }, []);

    const kullaniciyiKur = useCallback((accessToken, details = {}) => (
        buildAuthUserFromAccessToken({
            accessToken,
            email: details.email ?? null,
            rol: details.rol ?? null,
            id: details.id ?? null,
        })
    ), []);

    const oturumuKaydet = useCallback((accessToken, details = {}) => {
        tokenlariKaydet(accessToken, details);
        const nextUser = kullaniciyiKur(accessToken, details);
        setKullanici(nextUser);
        return nextUser;
    }, [tokenlariKaydet, kullaniciyiKur]);

    const giris = useCallback(async (email, sifre) => {
        setYukleniyor(true);
        try {
            const data = await girisYap({ email, sifre });
            oturumuKaydet(data.access_token, { email, rol: data.role });
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
    }, [oturumuKaydet]);

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

    const cikis = useCallback(async () => {
        await sessionTemizle({ serverLogout: true, emitEvent: true });
    }, [sessionTemizle]);

    const tokenYenileFn = useCallback(async ({ notifyOnFailure = true, resolveProfile = false } = {}) => {
        if (refreshPromiseRef.current) return refreshPromiseRef.current;

        refreshPromiseRef.current = tokenYenile()
            .then(async (data) => {
                const previousSession = sessionOku();
                let profile = null;

                if (resolveProfile || !previousSession.email) {
                    try {
                        profile = await tokenIleProfilGetir(data.access_token);
                    } catch {
                        profile = null;
                    }
                }

                oturumuKaydet(data.access_token, {
                    email: profile?.email || previousSession.email || null,
                    id: profile?.id || previousSession.id || null,
                    rol: profile?.role || data.role || previousSession.rol || null,
                });

                return data.access_token;
            })
            .catch(async (error) => {
                await sessionTemizle({ serverLogout: false, emitEvent: notifyOnFailure });
                throw error;
            })
            .finally(() => {
                refreshPromiseRef.current = null;
            });

        return refreshPromiseRef.current;
    }, [oturumuKaydet, sessionOku, sessionTemizle]);

    const accessToken = useCallback(() => sessionStorage.getItem(ACCESS_KEY), []);

    const kullaniciGuncelle = useCallback((patch) => {
        if (!patch) return;

        setKullanici((prev) => {
            if (!prev) return prev;

            const next = patch.rol
                ? { ...prev, ...patch, rol: normalizeRoleName(patch.rol) }
                : { ...prev, ...patch };

            if (next.token) sessionStorage.setItem(ACCESS_KEY, next.token);
            if (next.email) sessionStorage.setItem(EMAIL_KEY, next.email);
            if (next.id) sessionStorage.setItem(ID_KEY, next.id);
            if (next.rol) sessionStorage.setItem(ROLE_KEY, normalizeRoleName(next.rol));

            return next;
        });
    }, []);

    useEffect(() => {
        setAuthHandlers(accessToken, tokenYenileFn);
    }, [accessToken, tokenYenileFn]);

    useEffect(() => {
        let active = true;

        const bootstrapAuth = async () => {
            const storedSession = sessionOku();

            if (storedSession.accessToken && !isAccessTokenExpired(storedSession.accessToken)) {
                if (active) {
                    setKullanici(kullaniciyiKur(storedSession.accessToken, storedSession));
                    setAuthHazir(true);
                }
                return;
            }

            try {
                await tokenYenileFn({ notifyOnFailure: false, resolveProfile: true });
            } catch {
                // Refresh cookie yoksa veya artık geçersizse sessizce misafir moda dön.
            } finally {
                if (active) {
                    setAuthHazir(true);
                }
            }
        };

        bootstrapAuth();

        return () => {
            active = false;
        };
    }, [kullaniciyiKur, sessionOku, tokenYenileFn]);

    return (
        <AuthContext.Provider value={{
            kullanici,
            authHazir,
            yukleniyor,
            giris,
            kayit,
            cikis,
            tokenYenile: tokenYenileFn,
            accessToken,
            kullaniciGuncelle,
            girisYapildi: authHazir && !!kullanici,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
