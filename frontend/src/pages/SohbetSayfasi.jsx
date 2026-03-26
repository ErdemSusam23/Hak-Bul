import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Scale, Send, Trash2, RotateCcw, Briefcase,
    FileText, Clock, Heart, ArrowRight, Sun, Moon,
    LogIn, UserPlus, LogOut, Paperclip, X
} from 'lucide-react';
import SohbetMesaji from '../components/SohbetMesaji';
import YukleniyorGostergesi from '../components/YukleniyorGostergesi';
import DirekArama from '../components/DirekArama';
import AuthModal from '../components/AuthModal';
import { useChat } from '../hooks/useChat';
import { useTema } from '../context/TemaContext';
import { useAuth } from '../context/AuthContext';
import { useDil } from '../context/DilContext';

const ORNEK_SORULAR_DATA = [
    { soru: 'İşten çıkarıldım, kıdem tazminatı alabilir miyim?', soru_en: 'I was fired, can I receive severance pay?', kategoriKey: 'isHukuku', Ikon: Briefcase },
    { soru: 'İş sözleşmemi imzalamadım, sözlü anlaşmayla çalışıyorum, bu geçerli mi?', soru_en: 'I did not sign an employment contract, I work verbally — is this valid?', kategoriKey: 'sozlesme', Ikon: FileText },
    { soru: 'Fazla mesai yaptırıyorlar ama param yatmıyor, ne yapabilirim?', soru_en: 'I work overtime but do not get paid — what can I do?', kategoriKey: 'ucretHakki', Ikon: Clock },
    { soru: 'Annem hasta, bakım iznine çıkabilir miyim işten?', soru_en: 'My mother is ill, can I take caregiver leave from work?', kategoriKey: 'izinHakki', Ikon: Heart },
];

export default function SohbetSayfasi({ secilenSohbet, onSoruIslendi, temizleSinyali }) {
    const [girdi, setGirdi] = useState('');
    const [secilenDosya, setSecilenDosya] = useState(null);
    const [authModalAcik, setAuthModalAcik] = useState(false);
    const chatSonuRef = useRef(null);
    const inputRef = useRef(null);
    const dosyaInputRef = useRef(null);
    const sohbetIdRef = useRef(null); // aktif session ID
    const { tema, toggleTema } = useTema();
    const { kullanici, cikis } = useAuth();
    const { t, dil } = useDil();

    const {
        mesajlar,
        yukleniyor,
        aramaYukleniyor,
        aramaSonuclari,
        mesajGonder,
        aramayiCalistir,
        aramayiTemizle,
        sohbetiTemizle,
        mesajlariYukle,
    } = useChat(dil);

    useEffect(() => {
        chatSonuRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mesajlar, yukleniyor]);

    // Soldan sohbet seçilince mesajları geri yükle
    useEffect(() => {
        if (secilenSohbet) {
            mesajlariYukle(secilenSohbet.mesajlar);
            sohbetIdRef.current = secilenSohbet.id;
            setGirdi('');
            onSoruIslendi?.();
        }
    }, [secilenSohbet, mesajlariYukle, onSoruIslendi]);

    // Yeni sohbet sinyali gelince temizle
    useEffect(() => {
        if (temizleSinyali > 0) {
            sohbetiTemizle();
            setGirdi('');
            setSecilenDosya(null);
            sohbetIdRef.current = null;
        }
    }, [temizleSinyali, sohbetiTemizle]);

    // Her AI yanıtından sonra sohbet geçmiş listesinin güncellenmesi için sinyal gönder
    useEffect(() => {
        if (mesajlar.length === 0 || yukleniyor) return;
        window.dispatchEvent(new Event('gecmis-guncellendi'));
    }, [mesajlar, yukleniyor]);

    const gonder = useCallback(async () => {
        if ((!girdi.trim() && !secilenDosya) || yukleniyor) return;
        const metin = girdi;
        const dosya = secilenDosya;
        setGirdi('');
        setSecilenDosya(null);
        
        const localGuestId = localStorage.getItem('hakbul_guest_session_id') || null;

        const stateVars = await mesajGonder(metin, {
            conversationId: sohbetIdRef.current,
            guestSessionId: localGuestId,
            dosya: dosya,
        });

        if (stateVars) {
            sohbetIdRef.current = stateVars.conversation_id;
            if (stateVars.guest_session_id) {
                localStorage.setItem('hakbul_guest_session_id', stateVars.guest_session_id);
            }
        }
        
        inputRef.current?.focus();
    }, [girdi, secilenDosya, yukleniyor, mesajGonder, kullanici]);

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

    const ORNEK_SORULAR = ORNEK_SORULAR_DATA.map(item => ({
        soru: dil === 'en' ? item.soru_en : item.soru,
        kategori: t(item.kategoriKey),
        Ikon: item.Ikon,
    }));

    return (
        <div className="flex flex-col h-full">
            {/* ── NAVİGASYON ÇUBUĞU ── */}
            <header
                className="flex-shrink-0 flex items-center justify-between px-5 py-3"
                style={{
                    background: 'var(--tema-panel)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid var(--tema-border)',
                }}
            >
                {/* Sol: Logo */}
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                            background: `rgba(var(--a), 0.12)`,
                            border: `1px solid rgba(var(--a), 0.25)`,
                        }}
                    >
                        <Scale size={18} style={{ color: 'var(--tema-accent)' }} />
                    </div>
                    <div>
                        <h1 className="font-serif font-semibold text-lg leading-none gold-gradient">
                            Hak-Bul
                        </h1>
                        <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--tema-muted)' }}>
                            {t('turkHukukAsistani')}
                        </p>
                    </div>
                </div>

                {/* Sağ: Arama + Tema + Auth + Temizle */}
                <div className="flex items-center gap-1.5">
                    <DirekArama
                        onArama={aramayiCalistir}
                        yukleniyor={aramaYukleniyor}
                        sonuclar={aramaSonuclari}
                        onTemizle={aramayiTemizle}
                    />

                    {/* Tema toggle */}
                    <button
                        onClick={toggleTema}
                        title={tema === 'koyu' ? t('acikTemaya') : t('koyuTemaya')}
                        className="p-2 rounded-xl transition-all duration-150"
                        style={{ color: 'var(--tema-muted)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--tema-text)';
                            e.currentTarget.style.background = `rgba(var(--a), 0.08)`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--tema-muted)';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        {tema === 'koyu' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>

                    {/* Ayırıcı */}
                    <div className="w-px h-5 mx-1" style={{ background: 'var(--tema-border)' }} />

                    {kullanici ? (
                        <>
                            {/* Kullanıcı emaili */}
                            <span className="text-xs hidden sm:inline" style={{ color: 'var(--tema-muted)' }}>
                                {kullanici.email}
                            </span>
                            {/* Çıkış */}
                            <button
                                onClick={cikis}
                                title={`${t('cikis')} (${kullanici.email})`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150"
                                style={{ color: 'var(--tema-muted)', border: '1px solid var(--tema-border)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--tema-text)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
                            >
                                <LogOut size={14} />
                                <span className="hidden sm:inline">{t('cikis')}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Giriş Yap */}
                            <button
                                onClick={() => setAuthModalAcik(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150"
                                style={{ color: 'var(--tema-muted)', border: '1px solid var(--tema-border)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--tema-text)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
                            >
                                <LogIn size={14} />
                                <span className="hidden sm:inline">{t('giriYap')}</span>
                            </button>
                            {/* Kayıt Ol */}
                            <button
                                onClick={() => setAuthModalAcik(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150"
                                style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)' }}
                            >
                                <UserPlus size={14} />
                                <span className="hidden sm:inline">{t('kayitOl')}</span>
                            </button>
                        </>
                    )}

                    {/* Sohbet temizle */}
                    {mesajlar.length > 0 && (
                        <button
                            onClick={sohbetiTemizle}
                            title={t('sohbetiTemizle')}
                            className="p-2 rounded-xl transition-all duration-150"
                            style={{ color: 'var(--tema-muted)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--tema-text)';
                                e.currentTarget.style.background = 'var(--tema-card-hover)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--tema-muted)';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            </header>

            {/* ── SOHBET ALANI ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                {bosEkran ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
                        {/* Hero */}
                        <div
                            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                            style={{
                                background: `rgba(var(--a), 0.1)`,
                                border: `1px solid rgba(var(--a), 0.2)`,
                                boxShadow: `0 0 40px rgba(var(--a), 0.06)`,
                            }}
                        >
                            <Scale size={38} style={{ color: 'var(--tema-accent)' }} />
                        </div>

                        <h2 className="font-serif text-3xl font-semibold gold-gradient mb-2">
                            {t('hosGeldiniz')}
                        </h2>
                        <p className="text-sm max-w-sm mb-1" style={{ color: 'var(--tema-text2)' }}>
                            {t('hosGeldinizAlt')}
                        </p>
                        <p className="text-xs mb-10" style={{ color: 'var(--tema-muted)' }}>
                            {t('bilgiAmacliAvukat')}
                        </p>

                        {/* Örnek sorular — 2×2 grid */}
                        <div className="w-full max-w-2xl">
                            <p
                                className="text-xs uppercase tracking-widest font-medium mb-3"
                                style={{ color: 'var(--tema-muted)' }}
                            >
                                {t('ornekSorular')}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {ORNEK_SORULAR.map(({ soru, kategori, Ikon }) => (
                                    <button
                                        key={soru}
                                        onClick={() => ornekSoruTikla(soru)}
                                        className="group text-left px-4 py-3.5 rounded-xl transition-all duration-150 flex items-start gap-3"
                                        style={{
                                            background: 'var(--tema-card)',
                                            border: '1px solid var(--tema-border-card)',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--tema-card-hover)';
                                            e.currentTarget.style.borderColor = `rgba(var(--a), 0.2)`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'var(--tema-card)';
                                            e.currentTarget.style.borderColor = 'var(--tema-border-card)';
                                        }}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                            style={{ background: `rgba(var(--a), 0.1)` }}
                                        >
                                            <Ikon size={13} style={{ color: 'var(--tema-accent)' }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p
                                                className="text-xs font-medium mb-0.5"
                                                style={{ color: `rgba(var(--a), 0.7)` }}
                                            >
                                                {kategori}
                                            </p>
                                            <p
                                                className="text-sm leading-snug transition-colors"
                                                style={{ color: 'var(--tema-text2)' }}
                                            >
                                                {soru}
                                            </p>
                                        </div>
                                        <ArrowRight
                                            size={14}
                                            className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                            style={{ color: `rgba(var(--a), 0.6)` }}
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
                className="flex-shrink-0 px-6 py-4"
                style={{
                    background: 'var(--tema-panel)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid var(--tema-border)',
                }}
            >
                <div className="max-w-3xl mx-auto">
                    {secilenDosya && (
                        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                             style={{ background: 'var(--tema-card)', borderColor: 'var(--tema-border)', color: 'var(--tema-text2)' }}>
                            <FileText size={14} className="opacity-70" />
                            <span className="text-sm truncate max-w-[200px]">{secilenDosya.name}</span>
                            <button onClick={() => setSecilenDosya(null)} className="ml-1 opacity-60 hover:opacity-100 hover:text-red-400 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <div
                        className="flex gap-0 items-end rounded-2xl overflow-hidden transition-all duration-200"
                        style={{
                            background: 'var(--tema-surface)',
                            border: '1px solid var(--tema-border)',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                        }}
                        onFocusCapture={(e) => {
                            e.currentTarget.style.borderColor = 'var(--tema-border-focus)';
                            e.currentTarget.style.boxShadow = 'var(--tema-shadow-focus)';
                        }}
                        onBlurCapture={(e) => {
                            e.currentTarget.style.borderColor = 'var(--tema-border)';
                            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)';
                        }}
                    >
                        <input 
                            type="file" 
                            ref={dosyaInputRef} 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={(e) => { if(e.target.files[0]) setSecilenDosya(e.target.files[0]); }} 
                        />
                        <button
                            onClick={() => dosyaInputRef.current?.click()}
                            disabled={yukleniyor}
                            className="flex items-center justify-center w-11 h-11 m-1.5 rounded-xl transition-all duration-150 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
                            title={t('pdfYukleTip')}
                        >
                            <Paperclip size={18} style={{ color: secilenDosya ? 'var(--tema-accent)' : 'var(--tema-muted)' }} />
                        </button>
                        <textarea
                            ref={inputRef}
                            value={girdi}
                            onChange={(e) => setGirdi(e.target.value)}
                            onKeyDown={klavyeIsle}
                            placeholder={t('soruPlaceholder')}
                            rows={1}
                            disabled={yukleniyor}
                            className="flex-1 bg-transparent text-sm px-4 py-3.5 focus:outline-none resize-none min-h-[48px] max-h-40"
                            style={{
                                color: 'var(--tema-text)',
                                overflowY: girdi.split('\n').length > 3 ? 'auto' : 'hidden',
                            }}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                            }}
                        />
                        <button
                            onClick={gonder}
                            disabled={(!girdi.trim() && !secilenDosya) || yukleniyor}
                            className="flex items-center justify-center w-11 h-11 m-1.5 rounded-xl transition-all duration-150 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                            style={{
                                background: (girdi.trim() || secilenDosya) && !yukleniyor
                                    ? 'var(--tema-send-btn)'
                                    : `rgba(var(--a), 0.08)`,
                            }}
                            title={t('gonderTip')}
                        >
                            {yukleniyor ? (
                                <RotateCcw size={16} className="animate-spin" style={{ color: 'var(--tema-accent)' }} />
                            ) : (
                                <Send
                                    size={16}
                                    style={{ color: girdi.trim() || secilenDosya ? 'var(--tema-send-icon)' : 'var(--tema-muted)' }}
                                />
                            )}
                        </button>
                    </div>

                    <p className="text-center text-xs mt-2" style={{ color: 'var(--tema-dimmer)' }}>
                        {t('enterHint')}
                    </p>
                </div>
            </div>
        {authModalAcik && <AuthModal onKapat={() => setAuthModalAcik(false)} />}
        </div>
    );
}
