import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, ChevronDown } from 'lucide-react';
import { soruSor } from '../api/client';

function MesajBalonu({ mesaj }) {
    const kullanici = mesaj.rol === 'kullanici';

    const renderIcerik = (metin) => {
        // Basit bold markdown (**text**)
        const parcalar = metin.split(/(\*\*[^*]+\*\*)/g);
        return parcalar.map((parca, i) => {
            if (parca.startsWith('**') && parca.endsWith('**')) {
                return <strong key={i}>{parca.slice(2, -2)}</strong>;
            }
            return parca;
        });
    };

    return (
        <div className={`flex gap-2 ${kullanici ? 'flex-row-reverse' : 'flex-row'}`}>
            {!kullanici && (
                <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--tema-send-btn)' }}
                >
                    <Bot size={12} style={{ color: 'var(--tema-send-icon)' }} />
                </div>
            )}
            <div
                className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                style={kullanici ? {
                    background: 'var(--tema-user-bg)',
                    border: '1px solid var(--tema-user-border)',
                    color: 'var(--tema-text)',
                    borderBottomRightRadius: '4px',
                } : {
                    background: 'var(--tema-surface)',
                    border: '1px solid var(--tema-border)',
                    color: 'var(--tema-text2)',
                    borderBottomLeftRadius: '4px',
                }}
            >
                {renderIcerik(mesaj.icerik)}
            </div>
        </div>
    );
}

export default function AsistanBot() {
    const [acik, setAcik] = useState(false);
    const [mesajlar, setMesajlar] = useState([
        {
            rol: 'asistan',
            icerik: 'Merhaba! Hukuki sorularınızda size yardımcı olmak için buradayım. Ne öğrenmek istersiniz?',
        },
    ]);
    const [girdi, setGirdi] = useState('');
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState(null);
    const mesajlarRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (mesajlarRef.current) {
            mesajlarRef.current.scrollTop = mesajlarRef.current.scrollHeight;
        }
    }, [mesajlar, acik]);

    useEffect(() => {
        if (acik && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [acik]);

    const gonder = async () => {
        const soru = girdi.trim();
        if (!soru || yukleniyor) return;

        setGirdi('');
        setHata(null);
        setMesajlar((prev) => [...prev, { rol: 'kullanici', icerik: soru }]);
        setYukleniyor(true);

        try {
            const guestId = localStorage.getItem('hakbul_guest_session_id');
            const yanit = await soruSor({
                soru,
                maxKaynak: 3,
                guest_session_id: guestId || undefined,
            });
            setMesajlar((prev) => [
                ...prev,
                { rol: 'asistan', icerik: yanit.yanit || 'Yanıt alınamadı.' },
            ]);
        } catch (e) {
            const durum = e?.response?.status;
            let mesaj = 'Bir hata oluştu. Lütfen tekrar deneyin.';
            if (durum === 429) mesaj = 'Çok fazla istek gönderildi. Biraz bekleyin.';
            else if (durum === 503) mesaj = 'Servis şu an kullanılamıyor.';
            setHata(mesaj);
        } finally {
            setYukleniyor(false);
        }
    };

    const tusTakip = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            gonder();
        }
    };

    return (
        <>
            {/* Açık panel */}
            {acik && (
                <div
                    className="fixed bottom-20 right-4 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                        width: '340px',
                        height: '480px',
                        background: 'var(--tema-panel)',
                        border: '1px solid var(--tema-border)',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                        animation: 'bot-slide-up 0.2s ease-out',
                    }}
                >
                    {/* Başlık */}
                    <div
                        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                        style={{ borderBottom: '1px solid var(--tema-border)', background: 'var(--tema-surface)' }}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--tema-send-btn)' }}
                            >
                                <Bot size={14} style={{ color: 'var(--tema-send-icon)' }} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold" style={{ color: 'var(--tema-text)' }}>
                                    Hukuk Asistanı
                                </p>
                                <p className="text-xs" style={{ color: 'var(--tema-muted)' }}>
                                    Sorularınızı yanıtlıyorum
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setAcik(false)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--tema-muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    {/* Mesajlar */}
                    <div
                        ref={mesajlarRef}
                        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--tema-border) transparent' }}
                    >
                        {mesajlar.map((m, i) => (
                            <MesajBalonu key={i} mesaj={m} />
                        ))}
                        {yukleniyor && (
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'var(--tema-send-btn)' }}
                                >
                                    <Bot size={12} style={{ color: 'var(--tema-send-icon)' }} />
                                </div>
                                <div
                                    className="px-3 py-2 rounded-2xl rounded-bl-sm"
                                    style={{ background: 'var(--tema-surface)', border: '1px solid var(--tema-border)' }}
                                >
                                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--tema-accent)' }} />
                                </div>
                            </div>
                        )}
                        {hata && (
                            <p className="text-xs text-center px-3 py-1.5 rounded-xl"
                                style={{ color: '#f38ba8', background: 'rgba(243,139,168,0.08)', border: '1px solid rgba(243,139,168,0.2)' }}>
                                {hata}
                            </p>
                        )}
                    </div>

                    {/* Input */}
                    <div
                        className="px-3 py-3 flex-shrink-0"
                        style={{ borderTop: '1px solid var(--tema-border)' }}
                    >
                        <div
                            className="flex items-end gap-2 rounded-xl px-3 py-2"
                            style={{
                                background: 'var(--tema-surface)',
                                border: '1px solid var(--tema-border)',
                            }}
                        >
                            <textarea
                                ref={inputRef}
                                value={girdi}
                                onChange={(e) => setGirdi(e.target.value)}
                                onKeyDown={tusTakip}
                                placeholder="Sorunuzu yazın..."
                                rows={1}
                                className="flex-1 resize-none bg-transparent outline-none text-xs leading-relaxed"
                                style={{
                                    color: 'var(--tema-text)',
                                    maxHeight: '80px',
                                    scrollbarWidth: 'none',
                                    fontFamily: 'inherit',
                                }}
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                                }}
                                disabled={yukleniyor}
                            />
                            <button
                                onClick={gonder}
                                disabled={!girdi.trim() || yukleniyor}
                                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                style={{
                                    background: girdi.trim() && !yukleniyor ? 'var(--tema-send-btn)' : 'var(--tema-card)',
                                    opacity: girdi.trim() && !yukleniyor ? 1 : 0.4,
                                }}
                            >
                                <Send size={12} style={{ color: girdi.trim() && !yukleniyor ? 'var(--tema-send-icon)' : 'var(--tema-muted)' }} />
                            </button>
                        </div>
                        <p className="text-center mt-1.5 text-xs" style={{ color: 'var(--tema-dimmer)', fontSize: '10px' }}>
                            Hukuki tavsiye değildir · Bilgi amaçlıdır
                        </p>
                    </div>
                </div>
            )}

            {/* Açma butonu */}
            <button
                onClick={() => setAcik((v) => !v)}
                className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
                style={{
                    background: acik ? 'var(--tema-surface)' : 'var(--tema-send-btn)',
                    border: '1px solid var(--tema-border)',
                    boxShadow: '0 4px 20px rgba(137,180,250,0.3)',
                    transform: acik ? 'scale(0.95)' : 'scale(1)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = acik ? 'scale(0.95)' : 'scale(1)'; }}
                title="Hukuk Asistanı"
            >
                {acik
                    ? <X size={18} style={{ color: 'var(--tema-accent)' }} />
                    : <MessageCircle size={20} style={{ color: 'var(--tema-send-icon)' }} />
                }
            </button>

            <style>{`
                @keyframes bot-slide-up {
                    from { opacity: 0; transform: translateY(12px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
}
