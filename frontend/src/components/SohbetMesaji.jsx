import { Scale, User, AlertCircle } from 'lucide-react';
import { useRef, useEffect } from 'react';
import clsx from 'clsx';
import KaynakKarti from './KaynakKarti';
import FeedbackButonlari from './FeedbackButonlari';
import { CHAT_TEXT_WRAP_STYLE } from '../utils/chatUi';

function SaatDamgasi({ zaman }) {
    if (!zaman) return null;
    const saat = new Date(zaman).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
    });
    return <span className="text-xs mt-1 px-1" style={{ color: 'var(--tema-dimmer)' }}>{saat}</span>;
}

// Inline format: **bold**
function InlineFormat({ text }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={i} className="font-semibold" style={{ color: 'var(--tema-text)' }}>
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
        <div
            className="space-y-2.5 text-[14.5px] leading-[1.7]"
            style={{ color: 'var(--tema-text2)', ...CHAT_TEXT_WRAP_STYLE }}
        >
            {bloklar.map((blok, bi) => {
                const satirlar = blok.split('\n').filter(Boolean);

                // Numaralı liste
                if (satirlar.length > 0 && /^\d+[.)]\s/.test(satirlar[0].trim())) {
                    return (
                        <ol key={bi} className="list-decimal list-outside pl-5 space-y-1">
                            {satirlar.map((satir, si) => (
                                <li key={si} className="pl-1">
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
                                <li key={si} className="pl-1">
                                    <InlineFormat text={satir.replace(/^[-*•]\s*/, '')} />
                                </li>
                            ))}
                        </ul>
                    );
                }

                // Normal paragraf
                const metin = satirlar.join(' ');
                return (
                    <p key={bi} style={CHAT_TEXT_WRAP_STYLE}>
                        <InlineFormat text={metin} />
                    </p>
                );
            })}
        </div>
    );
}

function KullaniciMesaji({ mesaj }) {
    return (
        <div className="flex items-end justify-end gap-2.5">
            <div className="flex flex-col items-end max-w-[78%]">
                <div
                    className="px-4 py-3 rounded-xl rounded-br-md"
                    style={{
                        background: 'var(--tema-user-bg)',
                        border: '1px solid var(--tema-user-border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                >
                    <p
                        className="text-[14.5px] leading-[1.68]"
                        style={{ color: 'var(--tema-text)', ...CHAT_TEXT_WRAP_STYLE }}
                    >
                        {mesaj.icerik}
                    </p>
                </div>
                <SaatDamgasi zaman={mesaj.zaman} />
            </div>
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mb-5"
                style={{
                    background: 'var(--tema-user-avatar)',
                    border: '1px solid var(--tema-border)',
                }}
            >
                <User size={15} style={{ color: 'var(--tema-muted)' }} />
            </div>
        </div>
    );
}

function AsistanMesaji({ mesaj }) {
    const varKaynak = mesaj.kaynaklar && mesaj.kaynaklar.length > 0;

    return (
        <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                style={{
                    background: `rgba(var(--a), 0.1)`,
                    border: `1px solid rgba(var(--a), 0.22)`,
                }}
            >
                {mesaj.hata ? (
                    <AlertCircle size={15} style={{ color: 'var(--tema-danger-text)' }} />
                ) : (
                    <Scale size={15} style={{ color: 'var(--tema-accent)' }} />
                )}
            </div>

            {/* İçerik */}
            <div className="flex-1 min-w-0 max-w-[87%]">
                {/* Yanıt balonu */}
                <div
                    className={clsx('rounded-xl px-4 py-4 mb-3', mesaj.hata && 'border border-red-500/20')}
                    style={{
                        background: mesaj.hata ? 'var(--tema-danger-bg)' : 'var(--tema-bubble)',
                        border: mesaj.hata ? '1px solid var(--tema-danger-border)' : '1px solid var(--tema-border)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    }}
                >
                    {!mesaj.hata && (
                        <div className="flex items-center justify-between gap-2 mb-2.5 border-b pb-2" style={{ borderColor: 'rgba(var(--a), 0.08)' }}>
                            <span
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase"
                                style={{ color: `rgba(var(--a), 0.7)` }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: `rgba(var(--a), 0.8)` }}
                                />
                                Hak-Bul
                            </span>
                            
                            {mesaj.kategori && (
                                <span 
                                    className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shadow-sm"
                                    style={{ 
                                        background: 'var(--tema-surface)', 
                                        color: 'var(--tema-accent)', 
                                        border: '1px solid var(--tema-border)' 
                                    }}
                                >
                                    {mesaj.kategori}
                                </span>
                            )}
                        </div>
                    )}

                    <div style={mesaj.hata ? { color: 'var(--tema-danger-text)' } : undefined}>
                        <RenderMarkdown icerik={mesaj.icerik} />
                        {mesaj.streaming && (
                            <span
                                className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm"
                                style={{ background: 'var(--tema-accent)', verticalAlign: 'middle' }}
                            />
                        )}
                    </div>
                </div>

                {/* Kaynak kartları */}
                {varKaynak && (
                    <div className="space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2 px-1 mb-2">
                            <div className="h-px flex-1" style={{ background: 'var(--tema-border)' }} />
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                                {mesaj.kaynaklar.length} Hukuki Kaynak
                            </span>
                            <div className="h-px flex-1" style={{ background: 'var(--tema-border)' }} />
                        </div>
                        {mesaj.kaynaklar.map((kaynak, index) => (
                            <KaynakKarti key={`${kaynak.baslik}-${index}`} kaynak={kaynak} />
                        ))}
                    </div>
                )}

                {/* Uyarı satırı */}
                {mesaj.uyari && !mesaj.hata && (
                    <p className="text-xs mt-3 px-1 italic" style={{ color: 'var(--tema-dimmer)' }}>
                        {mesaj.uyari}
                    </p>
                )}

                {/* Feedback butonları — sadece başarılı, tamamlanmış asistan mesajlarında */}
                {!mesaj.hata && !mesaj.streaming && mesaj.id && (
                    <FeedbackButonlari
                        mesajId={mesaj.id}
                        guestSessionId={mesaj.guest_session_id}
                    />
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
