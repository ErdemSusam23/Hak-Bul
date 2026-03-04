import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Scale, Send, Trash2, RotateCcw, Briefcase,
    FileText, Clock, Heart, ArrowRight,
} from 'lucide-react';
import SohbetMesaji from '../components/SohbetMesaji';
import YukleniyorGostergesi from '../components/YukleniyorGostergesi';
import DirekArama from '../components/DirekArama';
import { useChat } from '../hooks/useChat';

const ORNEK_SORULAR = [
    {
        soru: 'İşten çıkarıldım, kıdem tazminatı alabilir miyim?',
        kategori: 'İş Hukuku',
        Ikon: Briefcase,
    },
    {
        soru: 'İş sözleşmemi imzalamadım, sözlü anlaşmayla çalışıyorum, bu geçerli mi?',
        kategori: 'Sözleşme',
        Ikon: FileText,
    },
    {
        soru: 'Fazla mesai yaptırıyorlar ama param yatmıyor, ne yapabilirim?',
        kategori: 'Ücret Hakkı',
        Ikon: Clock,
    },
    {
        soru: 'Annem hasta, bakım iznine çıkabilir miyim işten?',
        kategori: 'İzin Hakkı',
        Ikon: Heart,
    },
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
                className="flex-shrink-0 flex items-center justify-between px-5 py-3"
                style={{
                    background: 'rgba(8,18,36,0.9)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(212,168,83,0.2) 0%, rgba(212,168,83,0.06) 100%)',
                            border: '1px solid rgba(212,168,83,0.3)',
                        }}
                    >
                        <Scale size={18} className="text-gold-400" />
                    </div>
                    <div>
                        <h1 className="font-serif font-semibold text-lg leading-none gold-gradient">
                            Hak-Bul
                        </h1>
                        <p className="text-xs leading-none mt-0.5" style={{ color: 'rgba(100,116,139,0.9)' }}>
                            Türk Hukuk Asistanı
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
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
                            className="p-2 rounded-xl transition-all duration-150"
                            style={{ color: 'rgba(100,116,139,0.7)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'rgba(203,213,225,0.9)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'rgba(100,116,139,0.7)';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            </header>

            {/* ── SOHBET ALANI ── */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
                {bosEkran ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
                        {/* Hero */}
                        <div
                            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                            style={{
                                background: 'linear-gradient(135deg, rgba(212,168,83,0.14) 0%, rgba(212,168,83,0.04) 100%)',
                                border: '1px solid rgba(212,168,83,0.22)',
                                boxShadow: '0 0 60px rgba(212,168,83,0.07)',
                            }}
                        >
                            <Scale size={38} className="text-gold-400" />
                        </div>

                        <h2 className="font-serif text-3xl font-semibold gold-gradient mb-2">
                            Hak-Bul'a Hoş Geldiniz
                        </h2>
                        <p className="text-sm max-w-sm mb-1" style={{ color: 'rgba(148,163,184,0.8)' }}>
                            Hukuki sorularınızı Türkçe sorun; kanun maddeleri ve
                            Yargıtay kararlarıyla desteklenmiş yanıtlar alın.
                        </p>
                        <p className="text-xs mb-10" style={{ color: 'rgba(100,116,139,0.7)' }}>
                            Bilgi amaçlıdır · Avukat görüşünün yerini tutmaz
                        </p>

                        {/* Örnek sorular — 2×2 grid */}
                        <div className="w-full max-w-2xl">
                            <p
                                className="text-xs uppercase tracking-widest font-medium mb-3"
                                style={{ color: 'rgba(100,116,139,0.7)' }}
                            >
                                Örnek Sorular
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {ORNEK_SORULAR.map(({ soru, kategori, Ikon }) => (
                                    <button
                                        key={soru}
                                        onClick={() => ornekSoruTikla(soru)}
                                        className="group text-left px-4 py-3.5 rounded-xl transition-all duration-150 flex items-start gap-3"
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
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                            style={{ background: 'rgba(212,168,83,0.1)' }}
                                        >
                                            <Ikon size={13} className="text-gold-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p
                                                className="text-xs font-medium mb-0.5"
                                                style={{ color: 'rgba(212,168,83,0.65)' }}
                                            >
                                                {kategori}
                                            </p>
                                            <p
                                                className="text-sm leading-snug group-hover:text-white transition-colors"
                                                style={{ color: 'rgba(203,213,225,0.85)' }}
                                            >
                                                {soru}
                                            </p>
                                        </div>
                                        <ArrowRight
                                            size={14}
                                            className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                            style={{ color: 'rgba(212,168,83,0.6)' }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
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
                className="flex-shrink-0 px-4 py-4"
                style={{
                    background: 'rgba(8,18,36,0.9)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div className="max-w-3xl mx-auto">
                    <div
                        className="flex gap-0 items-end rounded-2xl overflow-hidden transition-all duration-200"
                        style={{
                            background: 'rgba(15,31,56,0.8)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                        }}
                        onFocusCapture={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(212,168,83,0.4)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,168,83,0.08), 0 2px 12px rgba(0,0,0,0.2)';
                        }}
                        onBlurCapture={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
                        }}
                    >
                        <textarea
                            ref={inputRef}
                            value={girdi}
                            onChange={(e) => setGirdi(e.target.value)}
                            onKeyDown={klavyeIsle}
                            placeholder="Hukuki sorunuzu yazın…"
                            rows={1}
                            disabled={yukleniyor}
                            className="flex-1 bg-transparent text-slate-100 text-sm px-4 py-3.5 placeholder-slate-600 focus:outline-none resize-none min-h-[48px] max-h-40"
                            style={{
                                overflowY: girdi.split('\n').length > 3 ? 'auto' : 'hidden',
                            }}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                            }}
                        />
                        <button
                            onClick={gonder}
                            disabled={!girdi.trim() || yukleniyor}
                            className="flex items-center justify-center w-11 h-11 m-1.5 rounded-xl transition-all duration-150 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                            style={{
                                background: girdi.trim() && !yukleniyor
                                    ? 'linear-gradient(135deg, #d4a853 0%, #f0c96a 100%)'
                                    : 'rgba(255,255,255,0.06)',
                            }}
                            title="Gönder (Enter)"
                        >
                            {yukleniyor ? (
                                <RotateCcw size={16} className="animate-spin text-gold-400" />
                            ) : (
                                <Send
                                    size={16}
                                    style={{ color: girdi.trim() ? '#0a1628' : 'rgba(100,116,139,0.6)' }}
                                />
                            )}
                        </button>
                    </div>

                    <p className="text-center text-xs mt-2" style={{ color: 'rgba(71,85,105,0.8)' }}>
                        Enter ile gönder · Shift+Enter satır ekler · Yanıtlar bilgi amaçlıdır
                    </p>
                </div>
            </div>
        </div>
    );
}
