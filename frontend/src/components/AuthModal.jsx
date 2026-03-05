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
    const [sekme, setSekme] = useState('giris'); // 'giris' | 'kayit'
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
        } else {
            if (!sifreGecerli) { setHata('Şifre güvenlik gereksinimlerini karşılamıyor.'); return; }
            if (!sifreslerEsit) { setHata('Şifreler eşleşmiyor.'); return; }
            const sonuc = await kayit(email, sifre);
            if (sonuc.basarili) {
                setBasarili(true);
                setTimeout(() => temizle('giris'), 1800);
            } else {
                setHata(sonuc.mesaj);
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => e.target === e.currentTarget && onKapat()}
        >
            <div
                className="relative w-full max-w-sm animate-fade-in rounded-2xl p-6"
                style={{
                    background: 'linear-gradient(135deg, rgba(10,22,40,0.98) 0%, rgba(15,31,56,0.98) 100%)',
                    border: '1px solid rgba(212,168,83,0.25)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,83,0.08)',
                }}
            >
                {/* Kapat */}
                <button
                    onClick={onKapat}
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Sekmeler */}
                <div className="flex mb-6 border-b border-white/8">
                    {['giris', 'kayit'].map((s) => (
                        <button
                            key={s}
                            onClick={() => temizle(s)}
                            className={`flex-1 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${sekme === s
                                    ? 'border-gold-400 text-gold-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {s === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
                        </button>
                    ))}
                </div>

                {/* Başarı */}
                {basarili && (
                    <div className="flex items-center gap-2 p-3 rounded-xl mb-4 animate-fade-in"
                        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                        <p className="text-emerald-300 text-sm">Hesap oluşturuldu! Giriş sekmesine geçiliyor...</p>
                    </div>
                )}

                {/* Hata */}
                {hata && !basarili && (
                    <div className="flex items-center gap-2 p-3 rounded-xl mb-4 animate-fade-in"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                        <p className="text-red-300 text-sm">{hata}</p>
                    </div>
                )}

                <form onSubmit={gonder} className="space-y-4">
                    {/* E-posta */}
                    <div>
                        <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">E-posta</label>
                        <div className="relative">
                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                type="email" required value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ornek@email.com"
                                className="input-field w-full pl-9 text-sm"
                            />
                        </div>
                    </div>

                    {/* Şifre */}
                    <div>
                        <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Şifre</label>
                        <div className="relative">
                            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                type={sifreGoster ? 'text' : 'password'} required value={sifre}
                                onChange={(e) => setSifre(e.target.value)}
                                placeholder="••••••••"
                                className="input-field w-full pl-9 pr-9 text-sm"
                            />
                            <button type="button" onClick={() => setSifreGoster(!sifreGoster)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                {sifreGoster ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        {/* Şifre kuralları - sadece kayıt sekmesinde */}
                        {sekme === 'kayit' && sifre && (
                            <ul className="mt-1.5 space-y-0.5">
                                {SIFRE_KURALLARI.map((k) => (
                                    <li key={k.label} className="flex items-center gap-1.5">
                                        <CheckCircle size={11} className={k.test(sifre) ? 'text-emerald-400' : 'text-slate-600'} />
                                        <span className={`text-xs ${k.test(sifre) ? 'text-emerald-400' : 'text-slate-600'}`}>{k.label}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Şifre tekrar - sadece kayıt */}
                    {sekme === 'kayit' && (
                        <div>
                            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Şifre Tekrar</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                <input
                                    type={sifreGoster ? 'text' : 'password'} required value={sifreTekrar}
                                    onChange={(e) => setSifreTekrar(e.target.value)}
                                    placeholder="••••••••"
                                    className={`input-field w-full pl-9 text-sm ${sifreTekrar && !sifreslerEsit ? 'border-red-500/40' : sifreTekrar && sifreslerEsit ? 'border-emerald-500/40' : ''}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Buton */}
                    <button
                        type="submit"
                        disabled={yukleniyor || !email || !sifre || (sekme === 'kayit' && (!sifreGecerli || !sifreslerEsit)) || basarili}
                        className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                        style={{ background: 'linear-gradient(135deg, #d4a853 0%, #f0c96a 50%, #b8892e 100%)', color: '#0a1628' }}
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
