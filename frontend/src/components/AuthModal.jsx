import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useDil } from '../context/DilContext';

export default function AuthModal({ onKapat }) {
    const { giris, kayit, yukleniyor } = useAuth();
    const { t } = useDil();
    const [sekme, setSekme] = useState('giris');
    const [email, setEmail] = useState('');
    const [sifre, setSifre] = useState('');
    const [sifreTekrar, setSifreTekrar] = useState('');
    const [sifreGoster, setSifreGoster] = useState(false);
    const [hata, setHata] = useState('');
    const [basarili, setBasarili] = useState(false);

    const sifreKurallari = [
        { test: (value) => value.length >= 8, label: t('passwordRuleMin') },
        { test: (value) => /[A-Z]/.test(value), label: t('passwordRuleUpper') },
        { test: (value) => /[0-9]/.test(value), label: t('passwordRuleNumber') },
    ];

    const temizle = (yeniSekme) => {
        setSekme(yeniSekme);
        setEmail('');
        setSifre('');
        setSifreTekrar('');
        setHata('');
        setBasarili(false);
    };

    const sifreGecerli = sifreKurallari.every((kural) => kural.test(sifre));
    const sifrelerEsit = sifre === sifreTekrar && sifreTekrar.length > 0;

    const gonder = async (e) => {
        e.preventDefault();
        setHata('');

        if (sekme === 'giris') {
            const sonuc = await giris(email, sifre);
            if (sonuc.basarili) {
                onKapat();
            } else {
                setHata(sonuc.mesaj);
            }
            return;
        }

        if (!sifreGecerli) {
            setHata(t('authPasswordRulesFailed'));
            return;
        }

        if (!sifrelerEsit) {
            setHata(t('authPasswordsMismatch'));
            return;
        }

        const sonuc = await kayit(email, sifre);
        if (sonuc.basarili) {
            setBasarili(true);
            setTimeout(() => temizle('giris'), 1800);
        } else {
            setHata(sonuc.mesaj);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--tema-overlay)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => e.target === e.currentTarget && onKapat()}
        >
            <div
                className="relative w-full max-w-sm animate-fade-in rounded-xl p-6"
                style={{
                    background: 'var(--tema-dialog-bg)',
                    border: '1px solid var(--tema-dialog-border)',
                    boxShadow: 'var(--tema-dialog-shadow)',
                }}
            >
                <button
                    onClick={onKapat}
                    className="absolute right-4 top-4 transition-colors hover:text-[var(--tema-text)]"
                    style={{ color: 'var(--tema-muted)' }}
                >
                    <X size={18} />
                </button>

                <div className="mb-6 flex" style={{ borderBottom: '1px solid var(--tema-border)' }}>
                    {['giris', 'kayit'].map((sekmeKey) => (
                        <button
                            key={sekmeKey}
                            onClick={() => temizle(sekmeKey)}
                            className="flex-1 -mb-px border-b-2 py-2.5 text-sm font-medium transition-all hover:text-[var(--tema-text)]"
                            style={
                                sekme === sekmeKey
                                    ? {
                                        borderColor: 'var(--tema-accent)',
                                        color: 'var(--tema-accent)',
                                        background: 'rgba(var(--a), 0.06)',
                                    }
                                    : {
                                        borderColor: 'transparent',
                                        color: 'var(--tema-muted)',
                                    }
                            }
                        >
                            {sekmeKey === 'giris' ? t('authLoginTab') : t('authRegisterTab')}
                        </button>
                    ))}
                </div>

                {basarili && (
                    <div
                        className="mb-4 flex items-center gap-2 rounded-xl p-3 animate-fade-in"
                        style={{ background: 'var(--tema-success-bg)', border: '1px solid var(--tema-success-border)' }}
                    >
                        <CheckCircle size={15} className="flex-shrink-0" style={{ color: 'var(--tema-success-text)' }} />
                        <p className="text-sm" style={{ color: 'var(--tema-success-text)' }}>{t('authRegisterSuccess')}</p>
                    </div>
                )}

                {hata && !basarili && (
                    <div
                        className="mb-4 flex items-center gap-2 rounded-xl p-3 animate-fade-in"
                        style={{ background: 'var(--tema-danger-bg)', border: '1px solid var(--tema-danger-border)' }}
                    >
                        <AlertCircle size={15} className="flex-shrink-0" style={{ color: 'var(--tema-danger-text)' }} />
                        <p className="text-sm" style={{ color: 'var(--tema-danger-text)' }}>{hata}</p>
                    </div>
                )}

                <form onSubmit={gonder} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                            {t('authEmailLabel')}
                        </label>
                        <div className="relative">
                            <Mail
                                size={15}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--tema-dimmer)' }}
                            />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('authEmailPlaceholder')}
                                className="input-field w-full pl-9 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                            {t('authPasswordLabel')}
                        </label>
                        <div className="relative">
                            <Lock
                                size={15}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--tema-dimmer)' }}
                            />
                            <input
                                type={sifreGoster ? 'text' : 'password'}
                                required
                                value={sifre}
                                onChange={(e) => setSifre(e.target.value)}
                                placeholder={t('authPasswordPlaceholder')}
                                className="input-field w-full pl-9 pr-9 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setSifreGoster(!sifreGoster)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--tema-text)]"
                                style={{ color: 'var(--tema-dimmer)' }}
                            >
                                {sifreGoster ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        {sekme === 'kayit' && sifre && (
                            <ul className="mt-1.5 space-y-0.5">
                                {sifreKurallari.map((kural) => (
                                    <li key={kural.label} className="flex items-center gap-1.5">
                                        <CheckCircle
                                            size={11}
                                            style={{ color: kural.test(sifre) ? 'var(--tema-success-text)' : 'var(--tema-dimmer)' }}
                                        />
                                        <span
                                            className="text-xs"
                                            style={{ color: kural.test(sifre) ? 'var(--tema-success-text)' : 'var(--tema-dimmer)' }}
                                        >
                                            {kural.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {sekme === 'kayit' && (
                        <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                                {t('authRepeatPasswordLabel')}
                            </label>
                            <div className="relative">
                                <Lock
                                    size={15}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                                    style={{ color: 'var(--tema-dimmer)' }}
                                />
                                <input
                                    type={sifreGoster ? 'text' : 'password'}
                                    required
                                    value={sifreTekrar}
                                    onChange={(e) => setSifreTekrar(e.target.value)}
                                    placeholder={t('authPasswordPlaceholder')}
                                    className={`input-field w-full pl-9 text-sm ${sifreTekrar && !sifrelerEsit ? 'border-red-500/40' : sifreTekrar && sifrelerEsit ? 'border-emerald-500/40' : ''}`}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={yukleniyor || !email || !sifre || (sekme === 'kayit' && (!sifreGecerli || !sifrelerEsit)) || basarili}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)' }}
                    >
                        {yukleniyor ? (
                            <><Loader2 size={16} className="animate-spin" />{sekme === 'giris' ? t('authLoggingIn') : t('authRegistering')}</>
                        ) : (
                            sekme === 'giris' ? t('authLoginTab') : t('authRegisterTab')
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
