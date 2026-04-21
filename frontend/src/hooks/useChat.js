import { useState, useCallback, useRef } from 'react';
import { apiStream, dokumanAnalizAPI } from '../api/client';

const MOCK_MODE = import.meta.env?.VITE_MOCK_MODE === 'true';
const PERF_LOG = import.meta.env?.VITE_PERF_LOG === 'true';

let mesajSayac = 0;
const yeniId = () => `msg_${++mesajSayac}_${Date.now()}`;

const MOCK_YANIT = {
    yanit: `**4857 SayÄ±lÄ± Ä°ÅŸ Kanunu** kapsamÄ±nda kÄ±dem tazminatÄ± alabilmek iÃ§in iÅŸ sÃ¶zleÅŸmenizin asgari **1 yÄ±l** sÃ¼rmÃ¼ÅŸ olmasÄ± ve iÅŸveren tarafÄ±ndan haksÄ±z fesih gibi kanunda sayÄ±lan hallerden biriyle sona ermesi gerekmektedir.`,
    kaynaklar: [
        { kaynak_turu: 'kanun', baslik: '4857 SayÄ±lÄ± Ä°ÅŸ Kanunu â€” Madde 17', metin_ozet: 'Belirsiz sÃ¼reli iÅŸ sÃ¶zleÅŸmelerinin feshinde bildirim ÅŸartÄ±.', skor: 0.94, url: null },
    ],
    kategori: 'Ä°ÅŸ Hukuku',
    uyari: 'Bu yanÄ±t bilgi amaÃ§lÄ±dÄ±r ve hukuki tavsiye niteliÄŸi taÅŸÄ±maz.',
};

const CHAT_COPY = {
    tr: {
        minLength: 'âš ï¸ Sorunuz en az 10 karakter olmalÄ±dÄ±r. LÃ¼tfen daha ayrÄ±ntÄ±lÄ± yazÄ±n.',
        tooManyRequests: (retryAfter) => `â³ Ã‡ok fazla istek gÃ¶nderildi. ${retryAfter ? `${retryAfter} saniye` : '1 dakika'} bekleyip tekrar deneyin.`,
        unavailable: 'ğŸ”§ Sunucu geÃ§ici olarak eriÅŸilemiyor. LÃ¼tfen 30 saniye sonra tekrar deneyin.',
        generic: 'âš ï¸ YanÄ±t alÄ±namadÄ±. LÃ¼tfen baÄŸlantÄ±nÄ±zÄ± kontrol edip tekrar deneyin.',
    },
    en: {
        minLength: 'âš ï¸ Your question must be at least 10 characters long. Please provide a bit more detail.',
        tooManyRequests: (retryAfter) => `â³ Too many requests were sent. Please wait ${retryAfter ? `${retryAfter} seconds` : '1 minute'} and try again.`,
        unavailable: 'ğŸ”§ The server is temporarily unavailable. Please try again in 30 seconds.',
        generic: 'âš ï¸ No response was received. Please check your connection and try again.',
    },
};

const getChatCopy = (language) => CHAT_COPY[language] || CHAT_COPY.tr;

function logPerf(event, details = {}) {
    if (!PERF_LOG) return;
    console.info(`[perf][chat] ${event}`, details);
}

export function useChat(language = 'tr') {
    const [mesajlar, setMesajlar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState(null);
    const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
    const [aramaSonuclari, setAramaSonuclari] = useState(null);
    const sonMesajRef = useRef(null);
    // Aktif streaming abortController
    const abortRef = useRef(null);
    const ui = getChatCopy(language);

    const mesajGonder = useCallback(async (metin, config = {}) => {
        const metinVar = metin ? metin.trim() : '';
        const dosyaVar = config.dosya;

        if ((!metinVar && !dosyaVar) || yukleniyor) return null;

        if (!dosyaVar && metinVar.length < 10) {
            const hataMesaj = {
                id: yeniId(),
                rol: 'asistan',
                icerik: ui.minLength,
                kaynaklar: [],
                hata: true,
                zaman: new Date(),
            };
            setMesajlar((onceki) => [...onceki, hataMesaj]);
            return null;
        }

        setHata(null);

        const kullaniciMesaj = {
            id: yeniId(),
            rol: 'kullanici',
            icerik: dosyaVar ? `[PDF: ${dosyaVar.name}] ${metinVar}` : metinVar,
            kaynaklar: [],
            zaman: new Date(),
        };
        setMesajlar((onceki) => [...onceki, kullaniciMesaj]);
        setYukleniyor(true);

        // PDF analizi â€” streaming yok, normal POST
        if (dosyaVar) {
            try {
                const yanit = await dokumanAnalizAPI({
                    dosya: dosyaVar,
                    soru: metinVar || undefined,
                    language,
                    conversation_id: config.conversationId,
                    guest_session_id: config.guestSessionId,
                });
                const asistanMesaj = {
                    id: yanit.message_id || yeniId(),
                    rol: 'asistan',
                    icerik: yanit.yanit,
                    kaynaklar: yanit.kaynaklar || [],
                    uyari: yanit.uyari,
                    kategori: yanit.kategori || 'Genel Hukuk',
                    zaman: new Date(),
                };
                setMesajlar((onceki) => [...onceki, asistanMesaj]);
                return { conversation_id: yanit.conversation_id, guest_session_id: yanit.guest_session_id };
            } catch (err) {
                _hataEkle(err, setHata, setMesajlar, language);
            } finally {
                setYukleniyor(false);
            }
            return null;
        }

        // Mock mode
        if (MOCK_MODE) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            const asistanMesaj = {
                id: yeniId(),
                rol: 'asistan',
                icerik: MOCK_YANIT.yanit,
                kaynaklar: MOCK_YANIT.kaynaklar,
                uyari: MOCK_YANIT.uyari,
                kategori: MOCK_YANIT.kategori,
                zaman: new Date(),
            };
            setMesajlar((onceki) => [...onceki, asistanMesaj]);
            setYukleniyor(false);
            return { conversation_id: 'mock-conv-id', guest_session_id: null };
        }

        // SSE Streaming
        const streamMesajId = yeniId();

        // Placeholder asistan mesajÄ± â€” boÅŸ, streaming baÅŸlayÄ±nca dolacak
        setMesajlar((onceki) => [
            ...onceki,
            {
                id: streamMesajId,
                rol: 'asistan',
                icerik: '',
                kaynaklar: [],
                kategori: 'Genel Hukuk',
                streaming: true,
                zaman: new Date(),
            },
        ]);

        const payload = {
            soru: metinVar,
            max_kaynak: 5,
            language,
        };
        if (config.conversationId) payload.conversation_id = config.conversationId;
        if (config.guestSessionId) payload.guest_session_id = config.guestSessionId;

        const controller = new AbortController();
        abortRef.current = controller;

        let resultConvId = null;
        let resultGuestId = null;
        const timings = {
            startedAt: performance.now(),
            responseAt: null,
            firstChunkAt: null,
            firstMetaAt: null,
            firstTokenAt: null,
            doneAt: null,
            tokenCount: 0,
        };

        try {
            await apiStream('/ask/stream', {
                init: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                },
                onResponse: (resp) => {
                    timings.responseAt = performance.now();
                    logPerf('response_headers', {
                        durationMs: Number((timings.responseAt - timings.startedAt).toFixed(1)),
                        status: resp.status,
                    });
                },
                onChunk: () => {
                    if (timings.firstChunkAt === null) {
                        timings.firstChunkAt = performance.now();
                        logPerf('first_chunk', {
                            durationMs: Number((timings.firstChunkAt - timings.startedAt).toFixed(1)),
                        });
                    }
                },
                onEvent: (event) => {
                    if (event.type === 'meta') {
                        if (timings.firstMetaAt === null) {
                            timings.firstMetaAt = performance.now();
                            logPerf('meta', {
                                durationMs: Number((timings.firstMetaAt - timings.startedAt).toFixed(1)),
                                sources: (event.kaynaklar || []).length,
                            });
                        }
                        resultConvId = event.conversation_id;
                        resultGuestId = event.guest_session_id;
                        setMesajlar((onceki) =>
                            onceki.map((m) =>
                                m.id === streamMesajId
                                    ? { ...m, kaynaklar: event.kaynaklar || [], kategori: event.kategori }
                                    : m
                            )
                        );
                        return;
                    }

                    if (event.type === 'token') {
                        timings.tokenCount += 1;
                        if (timings.firstTokenAt === null) {
                            timings.firstTokenAt = performance.now();
                            logPerf('first_token', {
                                durationMs: Number((timings.firstTokenAt - timings.startedAt).toFixed(1)),
                            });
                        }
                        setMesajlar((onceki) =>
                            onceki.map((m) =>
                                m.id === streamMesajId
                                    ? { ...m, icerik: m.icerik + event.text }
                                    : m
                            )
                        );
                        return;
                    }

                    if (event.type === 'done') {
                        timings.doneAt = performance.now();
                        logPerf('done', {
                            totalMs: Number((timings.doneAt - timings.startedAt).toFixed(1)),
                            tokenCount: timings.tokenCount,
                        });
                        setMesajlar((onceki) =>
                            onceki.map((m) =>
                                m.id === streamMesajId
                                    ? {
                                        ...m,
                                        id: event.message_id || m.id,
                                        streaming: false,
                                        uyari: event.uyari,
                                    }
                                    : m
                            )
                        );
                        return;
                    }

                    if (event.type === 'error') {
                        throw new Error(event.detail || 'Streaming hatasÄ±');
                    }
                },
            });
        } catch (err) {
            if (err.name === 'AbortError') {
                // KullanÄ±cÄ± iptal etti â€” mesajÄ± olduÄŸu gibi bÄ±rak
                setMesajlar((onceki) =>
                    onceki.map((m) =>
                        m.id === streamMesajId ? { ...m, streaming: false } : m
                    )
                );
            } else {
                // Streaming baÅŸlamÄ±ÅŸsa placeholder'Ä± hata mesajÄ±na dÃ¶nÃ¼ÅŸtÃ¼r
                setMesajlar((onceki) =>
                    onceki.map((m) => {
                        if (m.id !== streamMesajId) return m;
                        const hataMetni = _hataMetniOlustur(err, language);
                        return { ...m, icerik: hataMetni, streaming: false, hata: true };
                    })
                );
                setHata(_hataMetniOlustur(err, language));
            }
        } finally {
            abortRef.current = null;
            setYukleniyor(false);
        }

        return resultConvId ? { conversation_id: resultConvId, guest_session_id: resultGuestId } : null;
    }, [language, ui.minLength, yukleniyor]);

    const aramayiCalistir = useCallback(async (sorgu) => {
        if (!sorgu.trim()) return;
        setAramaYukleniyor(true);
        setAramaSonuclari(null);
        try {
            const { aramaYap } = await import('../api/client');
            const veri = await aramaYap(sorgu.trim());
            setAramaSonuclari(veri.sonuclar || []);
        } catch {
            setAramaSonuclari([]);
        } finally {
            setAramaYukleniyor(false);
        }
    }, []);

    const aramayiTemizle = useCallback(() => setAramaSonuclari(null), []);

    const sohbetiTemizle = useCallback(() => {
        abortRef.current?.abort();
        setMesajlar([]);
        setHata(null);
    }, []);

    const mesajlariYukle = useCallback((yeniMesajlar) => {
        setMesajlar(
            yeniMesajlar.map((m) => ({
                ...m,
                zaman: typeof m.zaman === 'string' ? new Date(m.zaman) : m.zaman,
            }))
        );
        setHata(null);
    }, []);

    return {
        mesajlar,
        yukleniyor,
        hata,
        aramaYukleniyor,
        aramaSonuclari,
        sonMesajRef,
        mesajGonder,
        aramayiCalistir,
        aramayiTemizle,
        sohbetiTemizle,
        mesajlariYukle,
    };
}

function _hataMetniOlustur(err, language = 'tr') {
    const ui = getChatCopy(language);
    const status = err?.response?.status;
    const retryAfter = err?.response?.data?.retry_after;
    if (status === 429)
        return ui.tooManyRequests(retryAfter);
    if (status === 503)
        return ui.unavailable;
    return ui.generic;
}

function _hataEkle(err, setHata, setMesajlar, language = 'tr') {
    const hataMetni = _hataMetniOlustur(err, language);
    setHata(hataMetni);
    setMesajlar((onceki) => [
        ...onceki,
        { id: `err_${Date.now()}`, rol: 'asistan', icerik: hataMetni, kaynaklar: [], hata: true, zaman: new Date() },
    ]);
}
