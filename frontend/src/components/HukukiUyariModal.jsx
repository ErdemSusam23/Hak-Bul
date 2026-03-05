import { useEffect, useState } from 'react';
import { Scale, AlertTriangle, CheckCircle } from 'lucide-react';

export default function HukukiUyariModal({ onKabul }) {
    const [gosteriliyor, setGosteriliyor] = useState(true);
    const [animasyon, setAnimasyon] = useState(false);

    useEffect(() => {
        setTimeout(() => setAnimasyon(true), 50);
    }, []);

    const kabulEt = () => {
        setAnimasyon(false);
        setTimeout(() => {
            setGosteriliyor(false);
            onKabul();
        }, 300);
    };

    if (!gosteriliyor) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${animasyon ? 'opacity-100' : 'opacity-0'
                }`}
            style={{ background: 'rgba(5, 13, 26, 0.92)', backdropFilter: 'blur(8px)' }}
        >
            {/* Arkaplan dekoratif elementler */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div
                className={`relative w-full max-w-lg transition-all duration-300 ${animasyon ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'
                    }`}
            >
                {/* Kart */}
                <div
                    className="glass-card p-8"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,31,56,0.95) 0%, rgba(10,22,40,0.98) 100%)',
                        borderColor: 'rgba(212,168,83,0.3)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,83,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}
                >
                    {/* Logo alanı */}
                    <div className="flex flex-col items-center mb-8">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{
                                background: 'linear-gradient(135deg, rgba(212,168,83,0.2) 0%, rgba(212,168,83,0.05) 100%)',
                                border: '1px solid rgba(212,168,83,0.4)',
                            }}
                        >
                            <Scale size={32} className="text-gold-400" />
                        </div>
                        <h1 className="font-serif text-3xl font-semibold gold-gradient mb-1">
                            Hak-Bul
                        </h1>
                        <p className="text-slate-400 text-sm tracking-widest uppercase">
                            Türk Hukuk Asistanı
                        </p>
                    </div>

                    {/* Uyarı kutusu */}
                    <div
                        className="rounded-xl p-4 mb-6"
                        style={{
                            background: 'rgba(217,119,6,0.08)',
                            border: '1px solid rgba(217,119,6,0.25)',
                        }}
                    >
                        <div className="flex gap-3">
                            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-300 font-semibold text-sm mb-1">
                                    Önemli Bilgilendirme
                                </p>
                                <p className="text-amber-200/80 text-sm leading-relaxed">
                                    Bu sistem yalnızca <strong>bilgi sunma</strong> amacıyla çalışır.
                                    Verilen yanıtlar hukuki danışmanlık niteliği taşımaz ve avukat
                                    görüşünün yerini tutmaz.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Özellikler */}
                    <ul className="space-y-2 mb-8">
                        {[
                            'Mevzuat.gov.tr kaynaklı kanun metinleri',
                            'Yargıtay ve Danıştay emsal kararları',
                            'Kaynak atıflı, şeffaf yanıtlar',
                        ].map((ozellik) => (
                            <li key={ozellik} className="flex items-center gap-2.5">
                                <CheckCircle size={15} className="text-gold-400 flex-shrink-0" />
                                <span className="text-slate-300 text-sm">{ozellik}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Kabul butonu */}
                    <button
                        onClick={kabulEt}
                        className="w-full py-3.5 rounded-xl font-semibold text-navy-900 text-base transition-all duration-200 hover:shadow-xl hover:shadow-gold-400/20 active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #d4a853 0%, #f0c96a 50%, #b8892e 100%)',
                        }}
                    >
                        Anladım, Devam Et
                    </button>

                    <p className="text-center text-slate-600 text-xs mt-4">
                        Devam ederek kullanım koşullarını kabul etmiş olursunuz.
                    </p>
                </div>
            </div>
        </div>
    );
}
