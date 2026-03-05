import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GirisSayfasi() {
    const { giris, yukleniyor } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [sifre, setSifre] = useState('');
    const [sifreGoster, setSifreGoster] = useState(false);
    const [hata, setHata] = useState('');
    const [animasyon] = useState(true);

    const gonder = async (e) => {
        e.preventDefault();
        setHata('');
        const sonuc = await giris(email, sifre);
        if (sonuc.basarili) {
            navigate('/sohbet', { replace: true });
        } else {
            setHata(sonuc.mesaj);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background: 'linear-gradient(135deg, #050d1a 0%, #0a1628 50%, #0f1f38 100%)',
            }}
        >
            {/* Dekoratif arkaplan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gold-400/4 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/4 rounded-full blur-3xl" />
            </div>

            <div
                className={`relative w-full max-w-md transition-all duration-500 ${animasyon ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{
                            background: 'linear-gradient(135deg, rgba(212,168,83,0.2) 0%, rgba(212,168,83,0.05) 100%)',
                            border: '1px solid rgba(212,168,83,0.35)',
                            boxShadow: '0 0 40px rgba(212,168,83,0.08)',
                        }}
                    >
                        <Scale size={32} className="text-gold-400" />
                    </div>
                    <h1 className="font-serif text-3xl font-semibold gold-gradient">Hak-Bul</h1>
                    <p className="text-slate-400 text-sm mt-1">Türk Hukuk Asistanı</p>
                </div>

                {/* Form kartı */}
                <div
                    className="glass-card p-8"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,31,56,0.95) 0%, rgba(10,22,40,0.98) 100%)',
                        borderColor: 'rgba(212,168,83,0.2)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,168,83,0.1)',
                    }}
                >
                    <h2 className="text-white font-semibold text-xl mb-6">Giriş Yap</h2>

                    {hata && (
                        <div
                            className="flex items-center gap-2.5 p-3 rounded-xl mb-5 animate-fade-in"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                            <p className="text-red-300 text-sm">{hata}</p>
                        </div>
                    )}

                    <form onSubmit={gonder} className="space-y-4">
                        {/* E-posta */}
                        <div>
                            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                                E-posta
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ornek@email.com"
                                    className="input-field w-full pl-10"
                                />
                            </div>
                        </div>

                        {/* Şifre */}
                        <div>
                            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                                Şifre
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                <input
                                    type={sifreGoster ? 'text' : 'password'}
                                    required
                                    value={sifre}
                                    onChange={(e) => setSifre(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field w-full pl-10 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSifreGoster(!sifreGoster)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {sifreGoster ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Giriş butonu */}
                        <button
                            type="submit"
                            disabled={yukleniyor || !email || !sifre}
                            className="w-full py-3.5 rounded-xl font-semibold text-navy-900 text-base transition-all duration-200 mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'linear-gradient(135deg, #d4a853 0%, #f0c96a 50%, #b8892e 100%)',
                            }}
                        >
                            {yukleniyor ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Giriş yapılıyor...
                                </>
                            ) : (
                                'Giriş Yap'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-sm mt-6">
                        Hesabınız yok mu?{' '}
                        <Link
                            to="/kayit"
                            className="text-gold-400 hover:text-gold-300 font-medium transition-colors"
                        >
                            Kayıt olun
                        </Link>
                    </p>
                </div>

                <p className="text-center text-slate-600 text-xs mt-4">
                    ⚠️ Bu sistem bilgi amaçlıdır, hukuki danışmanlık değildir.
                </p>
            </div>
        </div>
    );
}
