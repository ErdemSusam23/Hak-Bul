import { useState, useRef, useEffect, useCallback } from 'react';
import { Scale, Send, Trash2, RotateCcw, Sparkles } from 'lucide-react';
import SohbetMesaji from '../components/SohbetMesaji';
import YukleniyorGostergesi from '../components/YukleniyorGostergesi';
import DirekArama from '../components/DirekArama';
import { useChat } from '../hooks/useChat';

const ORNEK_SORULAR = [
    'Kıdem tazminatı almak için ne kadar çalışmam gerekiyor?',
    'İşten çıkarılırsam haklarım nelerdir?',
    'Kiracı olarak ev sahibine karşı haklarım neler?',
    'Trafik kazasında tazminat nasıl alınır?',
];

export default function SohbetSayfasi() {
    const [girdi, setGirdi] = useState('');
    const chatSonuRef = useRef(null);
    const inputRef = useRef(null);

    const {
        mesajlar,
        yukleniyor,
        aramaYukleniyor,
        aramaSonuclari,
        mesajGonder,
        aramayiCalistir,
        aramayiTemizle,
        sohbetiTemizle,
    } = useChat();

    // Sohbet sonuna kaydır
    useEffect(() => {
        chatSonuRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mesajlar, yukleniyor]);

    const gonder = useCallback(async () => {
        if (!girdi.trim() || yukleniyor) return;
        const metin = girdi;
        setGirdi('');
        await mesajGonder(metin);
        inputRef.current?.focus();
    }, [girdi, yukleniyor, mesajGonder]);

    const klavyeIsle = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            gonder();
        }
    };

    const ornekSoruTikla = (soru) => {
        setGirdi(soru);
        inputRef.current?.focus();
    };

    const bosEkran = mesajlar.length === 0;

    return (
        <div className="flex flex-col h-full">
            {/* ── NAVİGASYON ÇUBUĞU ── */}
            <header
                className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/6"
                style={{
                    background: 'rgba(10,22,40,0.85)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Sol: Logo */}
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(212,168,83,0.25) 0%, rgba(212,168,83,0.08) 100%)',
                            border: '1px solid rgba(212,168,83,0.35)',
                        }}
                    >
                        <Scale size={20} className="text-gold-400" />
                    </div>
                    <div>
                        <h1 className="font-serif font-semibold text-lg gold-gradient leading-none">
                            Hak-Bul
                        </h1>
                        <p className="text-slate-500 text-xs">Türk Hukuk Asistanı</p>
                    </div>
                </div>

                {/* Sağ: Araçlar */}
                <div className="flex items-center gap-2">
                    <DirekArama
                        onArama={aramayiCalistir}
                        yukleniyor={aramaYukleniyor}
                        sonuclar={aramaSonuclari}
                        onTemizle={aramayiTemizle}
                    />
                    {mesajlar.length > 0 && (
                        <button
                            onClick={sohbetiTemizle}
                            title="Sohbeti temizle"
                            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </header>

            {/* ── SOHBET ALANI ── */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {bosEkran ? (
                    /* Karşılama ekranı */
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
                        <div
                            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                            style={{
                                background: 'linear-gradient(135deg, rgba(212,168,83,0.15) 0%, rgba(212,168,83,0.04) 100%)',
                                border: '1px solid rgba(212,168,83,0.25)',
                                boxShadow: '0 0 60px rgba(212,168,83,0.08)',
                            }}
                        >
                            <Scale size={40} className="text-gold-400" />
                        </div>

                        <h2 className="font-serif text-3xl font-semibold gold-gradient mb-2">
                            Hak-Bul'a Hoş Geldiniz
                        </h2>
                        <p className="text-slate-400 text-base mb-1 max-w-md">
                            Hukuki sorularınızı Türkçe sorun; kanun maddeleri ve Yargıtay kararları
                            ile desteklenmiş yanıtlar alın.
                        </p>
                        <p className="text-slate-600 text-sm mb-10">
                            ⚠️ Bu sistem bilgi amaçlıdır, hukuki danışmanlık değildir.
                        </p>

                        {/* Örnek sorular */}
                        <div className="w-full max-w-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={14} className="text-gold-400/60" />
                                <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">
                                    Örnek Sorular
                                </span>
                            </div>
                            <div className="grid gap-2">
                                {ORNEK_SORULAR.map((soru) => (
                                    <button
                                        key={soru}
                                        onClick={() => ornekSoruTikla(soru)}
                                        className="w-full text-left px-4 py-3 rounded-xl text-sm text-slate-300 hover:text-white transition-all duration-150 group"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(212,168,83,0.06)';
                                            e.currentTarget.style.borderColor = 'rgba(212,168,83,0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                                        }}
                                    >
                                        <span className="text-gold-400/50 mr-2">→</span>
                                        {soru}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Mesaj listesi */
                    <>
                        {mesajlar.map((mesaj) => (
                            <SohbetMesaji key={mesaj.id} mesaj={mesaj} />
                        ))}
                        {yukleniyor && <YukleniyorGostergesi />}
                    </>
                )}
                <div ref={chatSonuRef} />
            </div>

            {/* ── GİRDİ ÇUBUĞU ── */}
            <div
                className="flex-shrink-0 border-t border-white/6 px-4 py-4"
                style={{
                    background: 'rgba(10,22,40,0.85)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Tekrar dene butonu (hata varsa) */}
                <div className="max-w-3xl mx-auto">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={girdi}
                                onChange={(e) => setGirdi(e.target.value)}
                                onKeyDown={klavyeIsle}
                                placeholder="Hukuki sorunuzu yazın… (Enter gönderir, Shift+Enter satır ekler)"
                                rows={1}
                                disabled={yukleniyor}
                                className="input-field w-full text-sm min-h-[48px] max-h-40"
                                style={{
                                    height: 'auto',
                                    overflowY: girdi.split('\n').length > 3 ? 'auto' : 'hidden',
                                }}
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                                }}
                            />
                        </div>
                        <button
                            onClick={gonder}
                            disabled={!girdi.trim() || yukleniyor}
                            className="send-btn flex items-center gap-2 h-12 flex-shrink-0"
                        >
                            {yukleniyor ? (
                                <RotateCcw size={18} className="animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                            <span className="hidden sm:inline text-sm">Gönder</span>
                        </button>
                    </div>

                    <p className="text-slate-700 text-xs mt-2 text-center">
                        Mevzuat.gov.tr & Yargıtay kaynaklı yanıtlar · Bilgi amaçlıdır
                    </p>
                </div>
            </div>
        </div>
    );
}
