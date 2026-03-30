import { useEffect, useRef, useState } from 'react';
import {
    ArrowUpRight,
    Bot,
    ChevronDown,
    LifeBuoy,
    MessageCircle,
    Search,
    X,
} from 'lucide-react';
import { useDil } from '../context/DilContext';
import { destekSoruBankasi } from '../data/destekSoruBankasi';

const SUPPORT_URL =
    import.meta.env.VITE_SUPPORT_URL ||
    'mailto:destek@hakbul.com?subject=Hak-Bul%20Destek%20Talebi';

function normalizeText(text = '') {
    return text
        .toLocaleLowerCase('tr-TR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function scoreQuestion(item, query) {
    if (!query) return 1;

    const normalizedQuestion = normalizeText(item.question);
    const normalizedKeywords = item.keywords.map((keyword) => normalizeText(keyword));
    const parts = query.split(/\s+/).filter(Boolean);

    let score = 0;

    if (normalizedQuestion === query) score += 120;
    if (normalizedQuestion.startsWith(query)) score += 70;
    if (normalizedQuestion.includes(query)) score += 40;

    normalizedKeywords.forEach((keyword) => {
        if (keyword === query) score += 45;
        else if (keyword.includes(query) || query.includes(keyword)) score += 24;
    });

    parts.forEach((part) => {
        if (normalizedQuestion.includes(part)) score += 10;
        if (normalizedKeywords.some((keyword) => keyword.includes(part))) score += 6;
    });

    return score;
}

function MesajBalonu({ mesaj }) {
    const kullanici = mesaj.rol === 'kullanici';

    const renderIcerik = (metin) => {
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
                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'var(--tema-send-btn)' }}
                >
                    <Bot size={12} style={{ color: 'var(--tema-send-icon)' }} />
                </div>
            )}
            <div
                className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                style={
                    kullanici
                        ? {
                              background: 'var(--tema-user-bg)',
                              border: '1px solid var(--tema-user-border)',
                              color: 'var(--tema-text)',
                              borderBottomRightRadius: '4px',
                          }
                        : {
                              background: 'var(--tema-surface)',
                              border: '1px solid var(--tema-border)',
                              color: 'var(--tema-text2)',
                              borderBottomLeftRadius: '4px',
                          }
                }
            >
                {renderIcerik(mesaj.icerik)}
            </div>
        </div>
    );
}

function DestekKarti({ metinler, onOpenSupport }) {
    return (
        <div
            className="rounded-xl px-3 py-3"
            style={{
                background: 'var(--tema-soft-bg-subtle)',
                border: '1px solid var(--tema-border-card)',
            }}
        >
            <div className="mb-2 flex items-start gap-2">
                <div
                    className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'var(--tema-soft-bg)' }}
                >
                    <LifeBuoy size={14} style={{ color: 'var(--tema-accent)' }} />
                </div>
                <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--tema-text)' }}>
                        {metinler.supportTitle}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--tema-text2)' }}>
                        {metinler.supportBody}
                    </p>
                </div>
            </div>

            <button
                onClick={onOpenSupport}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                style={{
                    background: 'var(--tema-send-btn)',
                    color: 'var(--tema-send-icon)',
                }}
            >
                {metinler.supportAction}
                <ArrowUpRight size={14} />
            </button>
        </div>
    );
}

export default function AsistanBot() {
    const { dil } = useDil();
    const [acik, setAcik] = useState(false);
    const [girdi, setGirdi] = useState('');
    const [mesajlar, setMesajlar] = useState([]);
    const [destekGoster, setDestekGoster] = useState(false);
    const mesajlarRef = useRef(null);
    const inputRef = useRef(null);

    const metinler = dil === 'en'
        ? {
              title: 'Support Assistant',
              subtitle: 'Answers approved product-help questions only',
              welcome:
                  'Hello! I only answer **approved support questions** about the product. Search while typing or choose one of the suggested questions below.',
              placeholder: 'Search in support questions...',
              suggestions: 'Suggested questions',
              matches: 'Matching questions',
              choosePrompt: 'Please choose one of the matching questions below.',
              noMatch:
                  'I could not find an approved answer for this topic. You can continue with online support.',
              supportTitle: 'Need a team member?',
              supportBody:
                  'If the support bank does not cover your issue, continue with online support and forward it to a staff member.',
              supportAction: 'Open online support',
              footer: 'This widget does not provide legal advice',
              openTitle: 'Support Assistant',
          }
        : {
              title: 'Destek Asistanı',
              subtitle: 'Sadece onaylı yardım sorularını yanıtlar',
              welcome:
                  'Merhaba! Ben yalnızca ürünle ilgili **onaylı destek sorularını** yanıtlarım. Yazarken arama yapabilir veya aşağıdaki önerilen sorulardan birini seçebilirsiniz.',
              placeholder: 'Destek sorularında ara...',
              suggestions: 'Önerilen sorular',
              matches: 'Eşleşen sorular',
              choosePrompt: 'Lütfen aşağıdaki eşleşen sorulardan birini seçin.',
              noMatch:
                  'Bu konu için onaylı bir yanıt bulamadım. İsterseniz çevrim içi desteğe geçebilirsiniz.',
              supportTitle: 'Bir ekip üyesi mi gerekiyor?',
              supportBody:
                  'Soru bankasında uygun yanıt yoksa çevrim içi desteğe geçip konuyu bir çalışanımıza yönlendirebilirsiniz.',
              supportAction: 'Çevrim içi desteği aç',
              footer: 'Bu widget hukuki danışmanlık vermez',
              openTitle: 'Destek Asistanı',
          };

    const soruBankasi = dil === 'en' ? destekSoruBankasi.en : destekSoruBankasi.tr;
    const normalizedQuery = normalizeText(girdi);

    const eslesenSorular = soruBankasi
        .map((item) => ({ ...item, score: scoreQuestion(item, normalizedQuery) }))
        .filter((item) => (normalizedQuery ? item.score > 0 : true))
        .sort((a, b) => b.score - a.score)
        .slice(0, normalizedQuery ? 6 : 4);

    useEffect(() => {
        setMesajlar([{ rol: 'asistan', icerik: metinler.welcome }]);
        setGirdi('');
        setDestekGoster(false);
    }, [metinler.welcome]);

    useEffect(() => {
        if (mesajlarRef.current) {
            mesajlarRef.current.scrollTop = mesajlarRef.current.scrollHeight;
        }
    }, [mesajlar, acik, destekGoster]);

    useEffect(() => {
        if (acik && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [acik]);

    const openSupport = () => {
        if (SUPPORT_URL.startsWith('mailto:')) {
            window.location.href = SUPPORT_URL;
            return;
        }
        window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer');
    };

    const soruSec = (soru) => {
        setGirdi('');
        setDestekGoster(false);
        setMesajlar((prev) => [
            ...prev,
            { rol: 'kullanici', icerik: soru.question },
            { rol: 'asistan', icerik: soru.answer },
        ]);
    };

    const gonder = () => {
        const soru = girdi.trim();
        if (!soru) return;

        const exactMatch = eslesenSorular.find(
            (item) => normalizeText(item.question) === normalizedQuery,
        );

        if (exactMatch) {
            soruSec(exactMatch);
            return;
        }

        if (eslesenSorular.length === 1) {
            soruSec(eslesenSorular[0]);
            return;
        }

        if (eslesenSorular.length > 1) {
            setDestekGoster(false);
            setMesajlar((prev) => [
                ...prev,
                { rol: 'kullanici', icerik: soru },
                { rol: 'asistan', icerik: metinler.choosePrompt },
            ]);
            return;
        }

        setDestekGoster(true);
        setMesajlar((prev) => [
            ...prev,
            { rol: 'kullanici', icerik: soru },
            { rol: 'asistan', icerik: metinler.noMatch },
        ]);
    };

    const tusTakip = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            gonder();
        }
    };

    return (
        <>
            {acik && (
                <div
                    className="fixed bottom-20 right-4 z-50 flex flex-col overflow-hidden rounded-xl animate-fade-in"
                    style={{
                        width: '360px',
                        height: '520px',
                        background: 'var(--tema-panel)',
                        border: '1px solid var(--tema-border)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    }}
                >
                    <div
                        className="flex flex-shrink-0 items-center justify-between px-4 py-3"
                        style={{ borderBottom: '1px solid var(--tema-border)', background: 'var(--tema-surface)' }}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="flex h-7 w-7 items-center justify-center rounded-full"
                                style={{ background: 'var(--tema-send-btn)' }}
                            >
                                <Bot size={14} style={{ color: 'var(--tema-send-icon)' }} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold" style={{ color: 'var(--tema-text)' }}>
                                    {metinler.title}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--tema-muted)' }}>
                                    {metinler.subtitle}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setAcik(false)}
                            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--tema-card-hover)]"
                            style={{ color: 'var(--tema-muted)' }}
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    <div
                        ref={mesajlarRef}
                        className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--tema-border) transparent' }}
                    >
                        {mesajlar.map((mesaj, index) => (
                            <MesajBalonu key={`${mesaj.rol}-${index}`} mesaj={mesaj} />
                        ))}

                        <div className="space-y-2">
                            <p
                                className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                                style={{ color: 'var(--tema-dimmer)' }}
                            >
                                {normalizedQuery ? metinler.matches : metinler.suggestions}
                            </p>

                            {eslesenSorular.length > 0 ? (
                                eslesenSorular.map((soru) => (
                                    <button
                                        key={soru.id}
                                        onClick={() => soruSec(soru)}
                                        className="w-full rounded-xl px-3 py-2 text-left text-xs leading-relaxed transition-colors hover:bg-[var(--tema-card-hover)]"
                                        style={{
                                            background: 'var(--tema-surface)',
                                            border: '1px solid var(--tema-border-card)',
                                            color: 'var(--tema-text2)',
                                        }}
                                    >
                                        {soru.question}
                                    </button>
                                ))
                            ) : (
                                <DestekKarti metinler={metinler} onOpenSupport={openSupport} />
                            )}
                        </div>

                        {destekGoster && eslesenSorular.length > 0 && (
                            <DestekKarti metinler={metinler} onOpenSupport={openSupport} />
                        )}
                    </div>

                    <div
                        className="flex-shrink-0 px-3 py-3"
                        style={{ borderTop: '1px solid var(--tema-border)' }}
                    >
                        <div
                            className="flex items-center gap-2 rounded-xl px-3 py-2"
                            style={{
                                background: 'var(--tema-surface)',
                                border: '1px solid var(--tema-border)',
                            }}
                        >
                            <Search size={14} style={{ color: 'var(--tema-muted)' }} />
                            <input
                                ref={inputRef}
                                value={girdi}
                                onChange={(e) => {
                                    setGirdi(e.target.value);
                                    setDestekGoster(false);
                                }}
                                onKeyDown={tusTakip}
                                placeholder={metinler.placeholder}
                                className="flex-1 bg-transparent text-xs leading-relaxed outline-none"
                                style={{
                                    color: 'var(--tema-text)',
                                    fontFamily: 'inherit',
                                }}
                            />
                            <button
                                onClick={gonder}
                                disabled={!girdi.trim()}
                                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all"
                                style={{
                                    background: girdi.trim() ? 'var(--tema-send-btn)' : 'var(--tema-card)',
                                    opacity: girdi.trim() ? 1 : 0.45,
                                }}
                            >
                                <Search
                                    size={12}
                                    style={{ color: girdi.trim() ? 'var(--tema-send-icon)' : 'var(--tema-muted)' }}
                                />
                            </button>
                        </div>
                        <p className="mt-1.5 text-center text-xs" style={{ color: 'var(--tema-dimmer)', fontSize: '10px' }}>
                            {metinler.footer}
                        </p>
                    </div>
                </div>
            )}

            <button
                onClick={() => setAcik((value) => !value)}
                className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105"
                style={{
                    background: acik ? 'var(--tema-surface)' : 'var(--tema-send-btn)',
                    border: '1px solid var(--tema-border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
                title={metinler.openTitle}
            >
                {acik ? (
                    <X size={18} style={{ color: 'var(--tema-accent)' }} />
                ) : (
                    <MessageCircle size={20} style={{ color: 'var(--tema-send-icon)' }} />
                )}
            </button>
        </>
    );
}
