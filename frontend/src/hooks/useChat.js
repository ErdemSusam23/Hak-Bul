import { useState, useCallback, useRef } from 'react';
import { apiFetch, dokumanAnalizAPI } from '../api/client';

const MOCK_MODE = import.meta.env?.VITE_MOCK_MODE === 'true';
const PERF_LOG = import.meta.env?.VITE_PERF_LOG === 'true';

let mesajSayac = 0;
const yeniId = () => `msg_${++mesajSayac}_${Date.now()}`;

const MOCK_YANIT = {
    yanit: `**4857 Sayılı İş Kanunu** kapsamında kıdem tazminatı alabilmek için iş sözleşmenizin asgari **1 yıl** sürmüş olması ve işveren tarafından haksız fesih gibi kanunda sayılan hallerden biriyle sona ermesi gerekmektedir.`,
    kaynaklar: [
        { kaynak_turu: 'kanun', baslik: '4857 Sayılı İş Kanunu — Madde 17', metin_ozet: 'Belirsiz süreli iş sözleşmelerinin feshinde bildirim şartı.', skor: 0.94, url: null },
    ],
    kategori: 'İş Hukuku',
    uyari: 'Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz.',
};

const CHAT_COPY = {
    tr: {
        minLength: '⚠️ Sorunuz en az 10 karakter olmalıdır. Lütfen daha ayrıntılı yazın.',
        tooManyRequests: (retryAfter) => `⏳ Çok fazla istek gönderildi. ${retryAfter ? `${retryAfter} saniye` : '1 dakika'} bekleyip tekrar deneyin.`,
        unavailable: '🔧 Sunucu geçici olarak erişilemiyor. Lütfen 30 saniye sonra tekrar deneyin.',
        generic: '⚠️ Yanıt alınamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
    },
    en: {
        minLength: '⚠️ Your question must be at least 10 characters long. Please provide a bit more detail.',
        tooManyRequests: (retryAfter) => `⏳ Too many requests were sent. Please wait ${retryAfter ? `${retryAfter} seconds` : '1 minute'} and try again.`,
        unavailable: '🔧 The server is temporarily unavailable. Please try again in 30 seconds.',
        generic: '⚠️ No response was received. Please check your connection and try again.',
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

        // PDF analizi — streaming yok, normal POST
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
            await new Promise(r => setTimeout(r, 1200));
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

        // Placeholder asistan mesajı — boş, streaming başlayınca dolacak
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
            const resp = await apiFetch('/ask/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            timings.responseAt = performance.now();
            logPerf('response_headers', {
                durationMs: Number((timings.responseAt - timings.startedAt).toFixed(1)),
                status: resp.status,
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                const detail = typeof errData.detail === 'string' ? errData.detail : errData.detail?.detail || 'Sunucu hatası';
                throw Object.assign(new Error(detail), { response: { status: resp.status, data: errData } });
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (timings.firstChunkAt === null) {
                    timings.firstChunkAt = performance.now();
                    logPerf('first_chunk', {
                        durationMs: Number((timings.firstChunkAt - timings.startedAt).toFixed(1)),
                    });
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Son satır tamamlanmamış olabilir

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const raw = line.slice(6).trim();
                    if (!raw) continue;

                    let event;
                    try { event = JSON.parse(raw); } catch { continue; }

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
                    } else if (event.type === 'token') {
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
                    } else if (event.type === 'done') {
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
                    } else if (event.type === 'error') {
                        throw new Error(event.detail || 'Streaming hatası');
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                // Kullanıcı iptal etti — mesajı olduğu gibi bırak
                setMesajlar((onceki) =>
                    onceki.map((m) =>
                        m.id === streamMesajId ? { ...m, streaming: false } : m
                    )
                );
            } else {
                // Streaming başlamışsa placeholder'ı hata mesajına dönüştür
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
