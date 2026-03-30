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
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${animasyon ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
            <div
                className={`relative w-full max-w-lg transition-all duration-300 ${animasyon ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}
            >
                {/* Kart */}
                <div
                    className="glass-card p-8"
                    style={{
                        background: 'var(--tema-panel)',
                        border: `1px solid rgba(var(--a), 0.2)`,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}
                >
                    {/* Logo alanı */}
                    <div className="flex flex-col items-center mb-8">
                        <div
                            className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
                            style={{
                                background: `rgba(var(--a), 0.12)`,
                                border: `1px solid rgba(var(--a), 0.3)`,
                            }}
                        >
                            <Scale size={32} style={{ color: 'var(--tema-accent)' }} />
                        </div>
                        <h1 className="font-serif text-[1.75rem] leading-[1.1] font-semibold gold-gradient mb-1 tracking-[-0.02em]">
                            Hak-Bul
                        </h1>
                        <p className="text-[13px] tracking-[0.14em] uppercase" style={{ color: 'var(--tema-muted)' }}>
                            Türk Hukuk Asistanı
                        </p>
                    </div>

                    {/* Uyarı kutusu */}
                    <div
                        className="rounded-xl p-4 mb-6"
                        style={{
                            background: 'var(--modal-uyari-bg)',
                            border: '1px solid var(--modal-uyari-border)',
                        }}
                    >
                        <div className="flex gap-3">
                            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--modal-uyari-ikon)' }} />
                            <div>
                                <p className="font-semibold text-[14px] mb-1" style={{ color: 'var(--modal-uyari-baslik)' }}>
                                    Önemli Bilgilendirme
                                </p>
                                <p className="text-[14px] leading-[1.68]" style={{ color: 'var(--modal-uyari-metin)' }}>
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
                                <CheckCircle size={15} className="flex-shrink-0" style={{ color: 'var(--tema-accent)' }} />
                                <span className="text-[14px]" style={{ color: 'var(--tema-text2)' }}>{ozellik}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Kabul butonu */}
                    <button
                        onClick={kabulEt}
                        className="w-full py-3.5 rounded-lg font-semibold text-[15px] transition-all duration-200 active:scale-[0.98]"
                        style={{
                            background: 'var(--tema-send-btn)',
                            color: 'var(--tema-send-icon)',
                        }}
                    >
                        Anladım, Devam Et
                    </button>

                    <p className="text-center text-xs mt-4" style={{ color: 'var(--tema-dimmer)' }}>
                        Devam ederek kullanım koşullarını kabul etmiş olursunuz.
                    </p>
                </div>
            </div>
        </div>
    );
}
