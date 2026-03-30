import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SIFRE_KURALLARI = [
    { test: (s) => s.length >= 8, label: 'En az 8 karakter' },
    { test: (s) => /[A-Z]/.test(s), label: 'En az 1 büyük harf' },
    { test: (s) => /[0-9]/.test(s), label: 'En az 1 rakam' },
];

export default function AuthModal({ onKapat }) {
    const { giris, kayit, yukleniyor } = useAuth();
    const [sekme, setSekme] = useState('giris');
    const [email, setEmail] = useState('');
    const [sifre, setSifre] = useState('');
    const [sifreTekrar, setSifreTekrar] = useState('');
    const [sifreGoster, setSifreGoster] = useState(false);
    const [hata, setHata] = useState('');
    const [basarili, setBasarili] = useState(false);

    const temizle = (yeniSekme) => {
        setSekme(yeniSekme);
        setEmail('');
        setSifre('');
        setSifreTekrar('');
        setHata('');
        setBasarili(false);
    };

    const sifreGecerli = SIFRE_KURALLARI.every((k) => k.test(sifre));
    const sifreslerEsit = sifre === sifreTekrar && sifreTekrar.length > 0;

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
            setHata('Şifre güvenlik gereksinimlerini karşılamıyor.');
            return;
        }

        if (!sifreslerEsit) {
            setHata('Şifreler eşleşmiyor.');
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
            style={{ background: 'var(--tema-overlay)', backdropFilter: 'blur(10px)' }}
            onClick={(e) => e.target === e.currentTarget && onKapat()}
        >
            <div
                className="relative w-full max-w-sm animate-fade-in rounded-2xl p-6"
                style={{
                    background: 'var(--tema-dialog-bg)',
                    border: '1px solid var(--tema-dialog-border)',
                    boxShadow: 'var(--tema-dialog-shadow)',
                }}
            >
                <button
                    onClick={onKapat}
                    className="absolute top-4 right-4 transition-colors"
                    style={{ color: 'var(--tema-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--tema-text)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
                >
                    <X size={18} />
                </button>

                <div className="mb-6 flex" style={{ borderBottom: '1px solid var(--tema-border)' }}>
                    {['giris', 'kayit'].map((s) => (
                        <button
                            key={s}
                            onClick={() => temizle(s)}
                            className="flex-1 -mb-px border-b-2 py-2.5 text-sm font-medium transition-all"
                            style={
                                sekme === s
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
                            onMouseEnter={(e) => {
                                if (sekme !== s) e.currentTarget.style.color = 'var(--tema-text)';
                            }}
                            onMouseLeave={(e) => {
                                if (sekme !== s) e.currentTarget.style.color = 'var(--tema-muted)';
                            }}
                        >
                            {s === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
                        </button>
                    ))}
                </div>

                {basarili && (
                    <div
                        className="mb-4 flex items-center gap-2 rounded-xl p-3 animate-fade-in"
                        style={{ background: 'var(--tema-success-bg)', border: '1px solid var(--tema-success-border)' }}
                    >
                        <CheckCircle size={15} className="flex-shrink-0" style={{ color: 'var(--tema-success-text)' }} />
                        <p className="text-sm" style={{ color: 'var(--tema-success-text)' }}>Hesap oluşturuldu. Giriş sekmesine geçiliyor...</p>
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
                            E-posta
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
                                placeholder="ornek@email.com"
                                className="input-field w-full pl-9 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                            Şifre
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
                                placeholder="••••••••"
                                className="input-field w-full pl-9 pr-9 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setSifreGoster(!sifreGoster)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--tema-dimmer)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--tema-text)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-dimmer)'; }}
                            >
                                {sifreGoster ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        {sekme === 'kayit' && sifre && (
                            <ul className="mt-1.5 space-y-0.5">
                                {SIFRE_KURALLARI.map((k) => (
                                    <li key={k.label} className="flex items-center gap-1.5">
                                        <CheckCircle
                                            size={11}
                                            style={{ color: k.test(sifre) ? 'var(--tema-success-text)' : 'var(--tema-dimmer)' }}
                                        />
                                        <span
                                            className="text-xs"
                                            style={{ color: k.test(sifre) ? 'var(--tema-success-text)' : 'var(--tema-dimmer)' }}
                                        >
                                            {k.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {sekme === 'kayit' && (
                        <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                            Şifre Tekrar
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
                                    placeholder="••••••••"
                                    className={`input-field w-full pl-9 text-sm ${sifreTekrar && !sifreslerEsit ? 'border-red-500/40' : sifreTekrar && sifreslerEsit ? 'border-emerald-500/40' : ''}`}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={yukleniyor || !email || !sifre || (sekme === 'kayit' && (!sifreGecerli || !sifreslerEsit)) || basarili}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)' }}
                    >
                        {yukleniyor ? (
                            <><Loader2 size={16} className="animate-spin" />{sekme === 'giris' ? 'Giriş yapılıyor...' : 'Kayıt oluşturuluyor...'}</>
                        ) : (
                            sekme === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
