import { createElement, useState, useRef, useEffect, useCallback } from 'react';
import {
    Scale,
    Send,
    RotateCcw,
    Briefcase,
    FileText,
    Clock,
    Heart,
    Sun,
    Moon,
    LogIn,
    UserPlus,
    LogOut,
    Paperclip,
    X,
    Sparkles,
} from 'lucide-react';
import SohbetMesaji from '../components/SohbetMesaji';
import YukleniyorGostergesi from '../components/YukleniyorGostergesi';
import DirekArama from '../components/DirekArama';
import AuthModal from '../components/AuthModal';
import { useChat } from '../hooks/useChat';
import { useTema } from '../context/useTema';
import { useAuth } from '../context/useAuth';
import { useDil } from '../context/useDil';
import { prepareComposerSubmission } from '../utils/chatUi';

const ORNEK_SORULAR_DATA = [
    {
        soru: 'İşten çıkarıldım, kıdem tazminatı alabilir miyim?',
        soruEn: 'I was fired, can I receive severance pay?',
        kategoriKey: 'isHukuku',
        Ikon: Briefcase,
    },
    {
        soru: 'İş sözleşmemi imzalamadım, sözlü anlaşmayla çalışıyorum, bu geçerli mi?',
        soruEn: 'I did not sign an employment contract, I work verbally. Is this valid?',
        kategoriKey: 'sozlesme',
        Ikon: FileText,
    },
    {
        soru: 'Fazla mesai yaptırıyorlar ama param yatmıyor, ne yapabilirim?',
        soruEn: 'I work overtime but do not get paid. What can I do?',
        kategoriKey: 'ucretHakki',
        Ikon: Clock,
    },
    {
        soru: 'Annem hasta, bakım iznine çıkabilir miyim işten?',
        soruEn: 'My mother is ill. Can I take caregiver leave from work?',
        kategoriKey: 'izinHakki',
        Ikon: Heart,
    },
];

function kullaniciEtiketi(kullanici) {
    const hamAd =
        kullanici?.name ||
        kullanici?.full_name ||
        kullanici?.display_name ||
        kullanici?.email?.split('@')[0];

    return hamAd?.trim() || null;
}

function ustMetin(kullanici, dil) {
    const kullaniciAdi = kullaniciEtiketi(kullanici);
    if (!kullaniciAdi) {
        return dil === 'en' ? 'Welcome' : 'Hoş geldin';
    }

    return dil === 'en' ? `Welcome, ${kullaniciAdi}` : `Hoş geldin, ${kullaniciAdi}`;
}

function UstAksiyonlar({
    tema,
    toggleTema,
    kullanici,
    cikis,
    t,
    setAuthModalAcik,
    aramayiCalistir,
    aramaYukleniyor,
    aramaSonuclari,
    aramayiTemizle,
}) {
    return (
        <header className="flex shrink-0 items-center justify-end px-8 pt-6">
            <div
                className="flex items-center gap-2 rounded-full px-2 py-2"
                style={{
                    background: 'var(--tema-soft-bg-subtle)',
                    border: '1px solid var(--tema-border-card)',
                }}
            >
                <DirekArama
                    onArama={aramayiCalistir}
                    yukleniyor={aramaYukleniyor}
                    sonuclar={aramaSonuclari}
                    onTemizle={aramayiTemizle}
                />

                <button
                    onClick={toggleTema}
                    title={tema === 'koyu' ? t('acikTemaya') : t('koyuTemaya')}
                    className="rounded-full p-2.5 transition-colors hover:bg-[var(--tema-soft-bg-subtle)]"
                    style={{ color: 'var(--tema-muted)' }}
                >
                    {tema === 'koyu' ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                <div className="mx-1 h-5 w-px" style={{ background: 'var(--tema-border-card)' }} />

                {kullanici ? (
                    <>
                        <span className="hidden text-xs sm:inline" style={{ color: 'var(--tema-muted)' }}>
                            {kullanici.email}
                        </span>
                        <button
                            onClick={cikis}
                            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] transition-colors hover:bg-[var(--tema-soft-bg-subtle)]"
                            style={{
                                color: 'var(--tema-text2)',
                                border: '1px solid var(--tema-border-card)',
                            }}
                        >
                            <LogOut size={14} />
                            <span className="hidden sm:inline">{t('cikis')}</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setAuthModalAcik(true)}
                            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] transition-colors hover:bg-[var(--tema-soft-bg-subtle)]"
                            style={{
                                color: 'var(--tema-text2)',
                                border: '1px solid var(--tema-border-card)',
                            }}
                        >
                            <LogIn size={14} />
                            <span className="hidden sm:inline">{t('giriYap')}</span>
                        </button>

                        <button
                            onClick={() => setAuthModalAcik(true)}
                            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] transition-all duration-150"
                            style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)' }}
                        >
                            <UserPlus size={14} />
                            <span className="hidden sm:inline">{t('kayitOl')}</span>
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}

function SoruChip({ icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] transition-colors hover:bg-[var(--tema-soft-bg)] hover:border-[var(--tema-border-strong)]"
            style={{
                background: 'var(--tema-soft-bg-subtle)',
                border: '1px solid var(--tema-border-card)',
                color: 'var(--tema-text2)',
            }}
        >
            {createElement(icon, { size: 14, style: { color: 'var(--tema-accent-soft)' } })}
            <span>{label}</span>
        </button>
    );
}

function ComposerPanel({
    compact,
    t,
    yukleniyor,
    initialGirdi = '',
    onSubmit,
}) {
    const textareaRef = useRef(null);
    const dosyaInputRef = useRef(null);
    const [girdi, setGirdi] = useState(initialGirdi);
    const [secilenDosya, setSecilenDosya] = useState(null);

    useEffect(() => {
        if (!textareaRef.current) return;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, compact ? 160 : 190)}px`;
    }, [girdi, compact]);

    const gonder = useCallback(async () => {
        const payload = prepareComposerSubmission({ girdi, secilenDosya, yukleniyor });
        if (!payload) return;

        setGirdi(payload.nextGirdi);
        setSecilenDosya(payload.nextSecilenDosya);
        await onSubmit({ metin: payload.metin, dosya: payload.dosya });
    }, [girdi, secilenDosya, yukleniyor, onSubmit, setGirdi, setSecilenDosya]);

    const klavyeIsle = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            gonder();
        }
    }, [gonder]);

    return (
        <div className={`mx-auto w-full ${compact ? 'max-w-4xl' : 'max-w-[700px]'}`}>
            {secilenDosya && (
                <div
                    className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13.5px]"
                    style={{
                        background: 'var(--tema-soft-bg)',
                        border: '1px solid var(--tema-border-card)',
                        color: 'var(--tema-text2)',
                    }}
                >
                    <FileText size={14} />
                    <span className="max-w-[240px] truncate">{secilenDosya.name}</span>
                    <button
                        onClick={() => setSecilenDosya(null)}
                        className="rounded-full p-1 transition-colors"
                        style={{ color: 'var(--tema-muted)' }}
                    >
                        <X size={13} />
                    </button>
                </div>
            )}

            <div
                className={`rounded-2xl ${compact ? 'px-5 py-4' : 'px-5 py-4'}`}
                style={{
                    background: 'var(--tema-surface)',
                    border: compact ? '1px solid var(--tema-border-card)' : '1px solid var(--tema-border-strong)',
                    boxShadow: compact ? '0 4px 16px rgba(0,0,0,0.12)' : '0 4px 16px rgba(0,0,0,0.15)',
                }}
            >
                <input
                    type="file"
                    ref={dosyaInputRef}
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.[0]) setSecilenDosya(e.target.files[0]);
                    }}
                />

                <textarea
                    ref={textareaRef}
                    value={girdi}
                    onChange={(e) => setGirdi(e.target.value)}
                    onKeyDown={klavyeIsle}
                    placeholder={t('soruPlaceholder')}
                    rows={compact ? 1 : 2}
                    disabled={yukleniyor}
                    className="w-full resize-none bg-transparent text-[14.5px] leading-[1.65] outline-none"
                    style={{
                        color: 'var(--tema-text)',
                        minHeight: compact ? '48px' : '92px',
                        maxHeight: compact ? '160px' : '190px',
                    }}
                />

                <div
                    className="mt-4 flex items-center justify-between gap-3 border-t pt-3"
                    style={{ borderColor: 'var(--tema-border-card)' }}
                >
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => dosyaInputRef.current?.click()}
                            disabled={yukleniyor}
                            className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                            style={{
                                background: 'var(--tema-soft-bg-subtle)',
                                border: '1px solid var(--tema-border-card)',
                            }}
                            title={t('pdfYukleTip')}
                        >
                            <Paperclip size={16} style={{ color: secilenDosya ? 'var(--tema-accent)' : 'var(--tema-muted)' }} />
                        </button>

                        <span className="hidden text-xs sm:inline" style={{ color: 'var(--tema-dimmer)' }}>
                            {t('enterHint')}
                        </span>
                    </div>

                    <button
                        onClick={gonder}
                        disabled={(!girdi.trim() && !secilenDosya) || yukleniyor}
                        className="flex h-11 min-w-[52px] items-center justify-center rounded-full px-4 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                            background: (girdi.trim() || secilenDosya) && !yukleniyor
                                ? 'var(--tema-send-btn)'
                                : 'var(--tema-soft-bg-subtle)',
                            border: '1px solid var(--tema-border-card)',
                        }}
                        title={t('gonderTip')}
                    >
                        {yukleniyor ? (
                            <RotateCcw size={16} className="animate-spin" style={{ color: 'var(--tema-accent)' }} />
                        ) : (
                            <Send size={16} style={{ color: girdi.trim() || secilenDosya ? 'var(--tema-send-icon)' : 'var(--tema-muted)' }} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SohbetSayfasi({ secilenSohbet, onSoruIslendi, temizleSinyali }) {
    const [authModalAcik, setAuthModalAcik] = useState(false);
    const chatSonuRef = useRef(null);
    const sohbetIdRef = useRef(null);
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
    const composerRevision = `${secilenSohbet?.id || 'yeni'}:${temizleSinyali}`;
    const [composerState, setComposerState] = useState({
        key: 0,
        initialGirdi: '',
        revision: composerRevision,
    });

    useEffect(() => {
        chatSonuRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mesajlar, yukleniyor]);

    useEffect(() => {
        if (secilenSohbet) {
            mesajlariYukle(secilenSohbet.mesajlar);
            sohbetIdRef.current = secilenSohbet.id;
            onSoruIslendi?.();
        }
    }, [secilenSohbet, mesajlariYukle, onSoruIslendi]);

    useEffect(() => {
        if (temizleSinyali > 0) {
            sohbetiTemizle();
            sohbetIdRef.current = null;
        }
    }, [temizleSinyali, sohbetiTemizle]);

    useEffect(() => {
        if (mesajlar.length === 0 || yukleniyor) return;
        window.dispatchEvent(new Event('gecmis-guncellendi'));
    }, [mesajlar, yukleniyor]);

    const gonder = useCallback(async ({ metin, dosya }) => {
        if ((!metin.trim() && !dosya) || yukleniyor) return;

        setComposerState((prev) => ({
            key: prev.key + 1,
            initialGirdi: '',
            revision: composerRevision,
        }));

        const localGuestId = localStorage.getItem('hakbul_guest_session_id') || null;
        const stateVars = await mesajGonder(metin, {
            conversationId: sohbetIdRef.current,
            guestSessionId: localGuestId,
            dosya,
        });

        if (stateVars) {
            sohbetIdRef.current = stateVars.conversation_id;
            if (stateVars.guest_session_id) {
                localStorage.setItem('hakbul_guest_session_id', stateVars.guest_session_id);
            }
        }
    }, [composerRevision, yukleniyor, mesajGonder]);

    const ornekSoruyuYukle = (soru) => {
        setComposerState((prev) => ({
            key: prev.key + 1,
            initialGirdi: soru,
            revision: composerRevision,
        }));
    };

    const bosEkran = mesajlar.length === 0;
    const composerKey = `${bosEkran ? 'empty' : 'compact'}:${secilenSohbet?.id || 'yeni'}:${temizleSinyali}:${composerState.key}`;
    const composerInitialGirdi =
        composerState.revision === composerRevision ? composerState.initialGirdi : '';
    const ornekSorular = ORNEK_SORULAR_DATA.map((item) => ({
        soru: dil === 'en' ? item.soruEn : item.soru,
        kategori: t(item.kategoriKey),
        Ikon: item.Ikon,
    }));

    return (
        <div className="flex h-full flex-col">
            <UstAksiyonlar
                tema={tema}
                toggleTema={toggleTema}
                kullanici={kullanici}
                cikis={cikis}
                t={t}
                setAuthModalAcik={setAuthModalAcik}
                aramayiCalistir={aramayiCalistir}
                aramaYukleniyor={aramaYukleniyor}
                aramaSonuclari={aramaSonuclari}
                aramayiTemizle={aramayiTemizle}
            />

            {bosEkran ? (
                <div className="flex flex-1 items-center justify-center px-6 pb-12">
                    <div className="w-full max-w-[900px] -translate-y-5">
                        <div className="mb-8 text-center">
                            <div className="mb-4 flex justify-center">
                                <div
                                    className="inline-flex items-center gap-3 rounded-full px-4 py-2"
                                    style={{
                                        background: 'var(--tema-soft-bg-subtle)',
                                        border: '1px solid var(--tema-border-card)',
                                        color: 'var(--tema-accent-soft)',
                                    }}
                                >
                                    <Sparkles size={16} style={{ color: 'var(--tema-accent)' }} />
                                    <span className="text-[11px] tracking-[0.14em] uppercase">Hak-Bul</span>
                                </div>
                            </div>
                            <h2 className="gold-gradient inline-block pb-[0.08em] font-serif text-[clamp(2rem,4.4vw,3.35rem)] leading-[1.12] tracking-[-0.025em]">
                                {ustMetin(kullanici, dil)}
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-[1.7]" style={{ color: 'var(--tema-text2)' }}>
                                {t('hosGeldinizAlt')}
                            </p>
                            <p className="mt-2.5 text-[12px]" style={{ color: 'var(--tema-dimmer)' }}>
                                {t('bilgiAmacliAvukat')}
                            </p>
                        </div>

                        <ComposerPanel
                            key={composerKey}
                            compact={false}
                            t={t}
                            yukleniyor={yukleniyor}
                            initialGirdi={composerInitialGirdi}
                            onSubmit={gonder}
                        />

                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                            {ornekSorular.map(({ soru, kategori, Ikon }) => (
                                <SoruChip
                                    key={kategori}
                                    icon={Ikon}
                                    label={kategori}
                                    onClick={() => ornekSoruyuYukle(soru)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="min-h-0 flex-1 overflow-y-auto px-6">
                        <div className="mx-auto w-full max-w-4xl space-y-6 py-10">
                            <div className="mb-2 flex items-center gap-3">
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                                    style={{
                                        background: 'var(--tema-soft-bg-subtle)',
                                        border: '1px solid var(--tema-border-card)',
                                    }}
                                >
                                    <Scale size={18} style={{ color: 'var(--tema-accent-soft)' }} />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--tema-dimmer)' }}>
                                        Hak-Bul
                                    </p>
                                    <p className="text-[13.5px]" style={{ color: 'var(--tema-text2)' }}>
                                        {t('assistantChatLabel')}
                                    </p>
                                </div>
                            </div>

                            {mesajlar.map((mesaj) => (
                                <SohbetMesaji key={mesaj.id} mesaj={mesaj} />
                            ))}

                            {yukleniyor && <YukleniyorGostergesi />}
                            <div ref={chatSonuRef} />
                        </div>
                    </div>

                    <div className="shrink-0 px-6 pb-6 pt-3">
                        <ComposerPanel
                            key={composerKey}
                            compact
                            t={t}
                            yukleniyor={yukleniyor}
                            initialGirdi={composerInitialGirdi}
                            onSubmit={gonder}
                        />
                    </div>
                </>
            )}

            {authModalAcik && <AuthModal onKapat={() => setAuthModalAcik(false)} />}
        </div>
    );
}
