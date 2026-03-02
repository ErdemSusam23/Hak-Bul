import { Scale, User, AlertCircle } from 'lucide-react';
import { useRef, useEffect } from 'react';
import clsx from 'clsx';
import KaynakKarti from './KaynakKarti';

function SaatDamgasi({ zaman }) {
    if (!zaman) return null;
    const saat = new Date(zaman).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
    });
    return <span className="text-xs text-slate-600 mt-1 px-1">{saat}</span>;
}

// Markdown kalın yazı için basit parser
function Metinisle({ icerik }) {
    const parcalar = icerik.split(/(\*\*.*?\*\*)/g);
    return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {parcalar.map((parca, i) => {
                if (parca.startsWith('**') && parca.endsWith('**')) {
                    return (
                        <strong key={i} className="font-semibold text-white">
                            {parca.slice(2, -2)}
                        </strong>
                    );
                }
                return <span key={i}>{parca}</span>;
            })}
        </p>
    );
}

// Kullanıcı mesajı
function KullaniciMesaji({ mesaj }) {
    return (
        <div className="flex items-end justify-end gap-2 animate-slide-up">
            <div className="flex flex-col items-end max-w-[75%]">
                <div
                    className="px-4 py-3 rounded-2xl rounded-br-sm"
                    style={{
                        background: 'linear-gradient(135deg, #1e3554 0%, #162840 100%)',
                        border: '1px solid rgba(212,168,83,0.2)',
                    }}
                >
                    <p className="text-slate-100 text-sm leading-relaxed">{mesaj.icerik}</p>
                </div>
                <SaatDamgasi zaman={mesaj.zaman} />
            </div>
            <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-5"
                style={{
                    background: 'rgba(30,53,84,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <User size={16} className="text-slate-400" />
            </div>
        </div>
    );
}

// Asistan mesajı
function AsistanMesaji({ mesaj }) {
    const varKaynak = mesaj.kaynaklar && mesaj.kaynaklar.length > 0;

    return (
        <div className="flex items-start gap-3 animate-slide-up">
            {/* İkon */}
            <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                style={{
                    background: 'linear-gradient(135deg, rgba(212,168,83,0.2) 0%, rgba(212,168,83,0.05) 100%)',
                    border: '1px solid rgba(212,168,83,0.3)',
                }}
            >
                {mesaj.hata ? (
                    <AlertCircle size={16} className="text-red-400" />
                ) : (
                    <Scale size={16} className="text-gold-400" />
                )}
            </div>

            {/* Balon + kaynaklar */}
            <div className="flex-1 max-w-[85%]">
                <div
                    className={clsx(
                        'glass-card px-4 py-3.5 mb-3',
                        mesaj.hata && 'border-red-500/20'
                    )}
                    style={{
                        background: mesaj.hata
                            ? 'rgba(239,68,68,0.06)'
                            : 'rgba(255,255,255,0.04)',
                    }}
                >
                    {/* Marka etiketi */}
                    {!mesaj.hata && (
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-1 h-1 bg-gold-400 rounded-full" />
                            <span className="text-gold-400/70 text-xs font-medium tracking-wider uppercase">
                                Hak-Bul
                            </span>
                        </div>
                    )}

                    <div className={mesaj.hata ? 'text-red-300' : 'text-slate-200'}>
                        <Metinisle icerik={mesaj.icerik} />
                    </div>
                </div>

                {/* Kaynak kartları */}
                {varKaynak && (
                    <div className="space-y-2 animate-fade-in">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider px-1 mb-2">
                            📚 Hukuki Kaynaklar ({mesaj.kaynaklar.length})
                        </p>
                        {mesaj.kaynaklar.map((kaynak, index) => (
                            <KaynakKarti key={`${kaynak.baslik}-${index}`} kaynak={kaynak} />
                        ))}
                    </div>
                )}

                {/* Uyarı satırı */}
                {mesaj.uyari && !mesaj.hata && (
                    <p className="text-xs text-slate-600 mt-3 px-1 italic">
                        ⚠️ {mesaj.uyari}
                    </p>
                )}

                <SaatDamgasi zaman={mesaj.zaman} />
            </div>
        </div>
    );
}

export default function SohbetMesaji({ mesaj }) {
    const ref = useRef(null);

    useEffect(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, []);

    return (
        <div ref={ref}>
            {mesaj.rol === 'kullanici' ? (
                <KullaniciMesaji mesaj={mesaj} />
            ) : (
                <AsistanMesaji mesaj={mesaj} />
            )}
        </div>
    );
}
