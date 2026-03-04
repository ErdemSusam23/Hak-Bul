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

// Inline format: **bold**
function InlineFormat({ text }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={i} className="font-semibold text-white">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

// Tam markdown renderer — paragraf, liste, kalın yazı
function RenderMarkdown({ icerik }) {
    const bloklar = icerik.split(/\n{2,}/);

    return (
        <div className="space-y-2.5 text-sm leading-relaxed">
            {bloklar.map((blok, bi) => {
                const satirlar = blok.split('\n').filter(Boolean);

                // Numaralı liste
                if (satirlar.length > 0 && /^\d+[.)]\s/.test(satirlar[0].trim())) {
                    return (
                        <ol key={bi} className="list-decimal list-outside pl-5 space-y-1">
                            {satirlar.map((satir, si) => (
                                <li key={si} className="text-slate-200 pl-1">
                                    <InlineFormat text={satir.replace(/^\d+[.)]\s*/, '')} />
                                </li>
                            ))}
                        </ol>
                    );
                }

                // Madde işaretli liste
                if (satirlar.length > 0 && /^[-*•]\s/.test(satirlar[0].trim())) {
                    return (
                        <ul key={bi} className="list-disc list-outside pl-5 space-y-1">
                            {satirlar.map((satir, si) => (
                                <li key={si} className="text-slate-200 pl-1">
                                    <InlineFormat text={satir.replace(/^[-*•]\s*/, '')} />
                                </li>
                            ))}
                        </ul>
                    );
                }

                // Normal paragraf (tek satırlık metin de dahil)
                const metin = satirlar.join(' ');
                return (
                    <p key={bi} className="text-slate-200">
                        <InlineFormat text={metin} />
                    </p>
                );
            })}
        </div>
    );
}

function KullaniciMesaji({ mesaj }) {
    return (
        <div className="flex items-end justify-end gap-2.5 animate-slide-up">
            <div className="flex flex-col items-end max-w-[78%]">
                <div
                    className="px-4 py-3 rounded-2xl rounded-br-md"
                    style={{
                        background: 'linear-gradient(135deg, #1e3a5f 0%, #162840 100%)',
                        border: '1px solid rgba(212,168,83,0.18)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                    }}
                >
                    <p className="text-slate-100 text-sm leading-relaxed">{mesaj.icerik}</p>
                </div>
                <SaatDamgasi zaman={mesaj.zaman} />
            </div>
            <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-5"
                style={{
                    background: 'rgba(30,58,95,0.7)',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <User size={15} className="text-slate-400" />
            </div>
        </div>
    );
}

function AsistanMesaji({ mesaj }) {
    const varKaynak = mesaj.kaynaklar && mesaj.kaynaklar.length > 0;

    return (
        <div className="flex items-start gap-3 animate-slide-up">
            {/* Avatar */}
            <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                style={{
                    background: 'linear-gradient(135deg, rgba(212,168,83,0.22) 0%, rgba(212,168,83,0.06) 100%)',
                    border: '1px solid rgba(212,168,83,0.32)',
                    boxShadow: '0 0 12px rgba(212,168,83,0.08)',
                }}
            >
                {mesaj.hata ? (
                    <AlertCircle size={15} className="text-red-400" />
                ) : (
                    <Scale size={15} className="text-gold-400" />
                )}
            </div>

            {/* İçerik */}
            <div className="flex-1 min-w-0 max-w-[87%]">
                {/* Yanıt balonu */}
                <div
                    className={clsx('rounded-2xl px-4 py-4 mb-3', mesaj.hata && 'border border-red-500/20')}
                    style={{
                        background: mesaj.hata
                            ? 'rgba(239,68,68,0.07)'
                            : 'rgba(255,255,255,0.035)',
                        border: mesaj.hata ? undefined : '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
                    }}
                >
                    {!mesaj.hata && (
                        <div className="flex items-center gap-2 mb-2.5">
                            <span
                                className="inline-flex items-center gap-1.5 text-xs font-medium tracking-widest uppercase"
                                style={{ color: 'rgba(212,168,83,0.65)' }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: 'rgba(212,168,83,0.7)' }}
                                />
                                Hak-Bul
                            </span>
                        </div>
                    )}

                    <div className={mesaj.hata ? 'text-red-300' : ''}>
                        <RenderMarkdown icerik={mesaj.icerik} />
                    </div>
                </div>

                {/* Kaynak kartları */}
                {varKaynak && (
                    <div className="space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2 px-1 mb-2">
                            <div
                                className="h-px flex-1"
                                style={{ background: 'rgba(255,255,255,0.06)' }}
                            />
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                                {mesaj.kaynaklar.length} Hukuki Kaynak
                            </span>
                            <div
                                className="h-px flex-1"
                                style={{ background: 'rgba(255,255,255,0.06)' }}
                            />
                        </div>
                        {mesaj.kaynaklar.map((kaynak, index) => (
                            <KaynakKarti key={`${kaynak.baslik}-${index}`} kaynak={kaynak} />
                        ))}
                    </div>
                )}

                {/* Uyarı satırı */}
                {mesaj.uyari && !mesaj.hata && (
                    <p className="text-xs text-slate-600 mt-3 px-1 italic">
                        {mesaj.uyari}
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
