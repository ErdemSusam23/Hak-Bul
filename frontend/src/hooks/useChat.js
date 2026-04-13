import { useState, useCallback, useRef } from 'react';

import { dokumanAnalizAPI } from '../api/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';
export const MAX_QUESTION_LENGTH = 1000;

let mesajSayac = 0;
const yeniId = () => `msg_${++mesajSayac}_${Date.now()}`;

const MOCK_YANIT = {
    yanit: `**4857 Sayılı İş Kanunu** kapsamında kıdem tazminatı alabilmek için iş sözleşmenizin asgari **1 yıl** sürmüş olması ve işveren tarafından haksız fesih gibi kanunda sayılan hallerden biriyle sona ermesi gerekmektedir.`,
    kaynaklar: [
        { kaynak_turu: 'kanun', baslik: '4857 Sayılı İş Kanunu - Madde 17', metin_ozet: 'Belirsiz süreli iş sözleşmelerinin feshinde bildirim şartı.', skor: 0.94, url: null },
    ],
    kategori: 'İş Hukuku',
    uyari: 'Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz.',
};

const CHAT_COPY = {
    tr: {
        minLength: 'Sorunuz en az 10 karakter olmalıdır. Lütfen daha ayrıntılı yazın.',
        maxLength: 'Sorunuz en fazla 1000 karakter olabilir.',
        unsupportedFileType: 'Yalnızca PDF dosyası yükleyebilirsiniz.',
        tooManyRequests: (retryAfter) => `Çok fazla istek gönderildi. ${retryAfter ? `${retryAfter} saniye` : '1 dakika'} bekleyip tekrar deneyin.`,
        unavailable: 'Sunucu geçici olarak erişilemiyor. Lütfen 30 saniye sonra tekrar deneyin.',
        generic: 'Yanıt alınamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
    },
    en: {
        minLength: 'Your question must be at least 10 characters long. Please provide a bit more detail.',
        maxLength: 'Your question can be at most 1000 characters.',
        unsupportedFileType: 'Only PDF files can be uploaded.',
        tooManyRequests: (retryAfter) => `Too many requests were sent. Please wait ${retryAfter ? `${retryAfter} seconds` : '1 minute'} and try again.`,
        unavailable: 'The server is temporarily unavailable. Please try again in 30 seconds.',
        generic: 'No response was received. Please check your connection and try again.',
    },
};

const getChatCopy = (language) => CHAT_COPY[language] || CHAT_COPY.tr;

export function useChat(language = 'tr') {
    const [mesajlar, setMesajlar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState(null);
    const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
    const [aramaSonuclari, setAramaSonuclari] = useState(null);
    const sonMesajRef = useRef(null);
    const abortRef = useRef(null);
    const ui = getChatCopy(language);

    const mesajGonder = useCallback(async (metin, config = {}) => {
        const metinVar = metin ? metin.trim() : '';
        const dosyaVar = config.dosya;

        if ((!metinVar && !dosyaVar) || yukleniyor) return null;

        if (!dosyaVar && metinVar.length < 10) {
            _hataEkleMetin(ui.minLength, setHata, setMesajlar);
            return null;
        }

        if (!dosyaVar && metinVar.length > MAX_QUESTION_LENGTH) {
            _hataEkleMetin(ui.maxLength, setHata, setMesajlar);
            return null;
        }

        if (dosyaVar && !/\.pdf$/i.test(dosyaVar.name) && dosyaVar.type !== 'application/pdf') {
            _hataEkleMetin(ui.unsupportedFileType, setHata, setMesajlar);
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

        const streamMesajId = yeniId();
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

        const accessToken = sessionStorage.getItem('hakbul_access');
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

        try {
            const resp = await fetch(`${API_URL}/ask/stream`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                const detail = typeof errData.detail === 'string' ? errData.detail : errData.detail?.detail || 'Sunucu hatasi';
                throw Object.assign(new Error(detail), { response: { status: resp.status, data: errData } });
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const raw = line.slice(6).trim();
                    if (!raw) continue;

                    let event;
                    try { event = JSON.parse(raw); } catch { continue; }

                    if (event.type === 'meta') {
                        resultConvId = event.conversation_id;
                        resultGuestId = event.guest_session_id;
                        setMesajlar((onceki) =>
                            onceki.map((mesaj) => (
                                mesaj.id === streamMesajId
                                    ? { ...mesaj, kaynaklar: event.kaynaklar || [], kategori: event.kategori }
                                    : mesaj
                            )),
                        );
                    } else if (event.type === 'token') {
                        setMesajlar((onceki) =>
                            onceki.map((mesaj) => (
                                mesaj.id === streamMesajId
                                    ? { ...mesaj, icerik: mesaj.icerik + event.text }
                                    : mesaj
                            )),
                        );
                    } else if (event.type === 'done') {
                        setMesajlar((onceki) =>
                            onceki.map((mesaj) => (
                                mesaj.id === streamMesajId
                                    ? { ...mesaj, id: event.message_id || mesaj.id, streaming: false, uyari: event.uyari }
                                    : mesaj
                            )),
                        );
                    } else if (event.type === 'error') {
                        throw new Error(event.detail || 'Streaming hatasi');
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                setMesajlar((onceki) =>
                    onceki.map((mesaj) => (mesaj.id === streamMesajId ? { ...mesaj, streaming: false } : mesaj)),
                );
            } else {
                const hataMetni = _hataMetniOlustur(err, language);
                setMesajlar((onceki) =>
                    onceki.map((mesaj) => (mesaj.id === streamMesajId ? { ...mesaj, icerik: hataMetni, streaming: false, hata: true } : mesaj)),
                );
                setHata(hataMetni);
            }
        } finally {
            abortRef.current = null;
            setYukleniyor(false);
        }

        return resultConvId ? { conversation_id: resultConvId, guest_session_id: resultGuestId } : null;
    }, [language, ui, yukleniyor]);

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
            yeniMesajlar.map((mesaj) => ({
                ...mesaj,
                zaman: typeof mesaj.zaman === 'string' ? new Date(mesaj.zaman) : mesaj.zaman,
            })),
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
    const errorCode = err?.response?.data?.detail?.error || err?.response?.data?.error;

    if (status === 429) return ui.tooManyRequests(retryAfter);
    if (status === 503) return ui.unavailable;
    if (errorCode === 'unsupported_file_type') return ui.unsupportedFileType;
    if (errorCode === 'question_too_long') return ui.maxLength;
    return ui.generic;
}

function _hataEkle(err, setHata, setMesajlar, language = 'tr') {
    const hataMetni = _hataMetniOlustur(err, language);
    _hataEkleMetin(hataMetni, setHata, setMesajlar);
}

function _hataEkleMetin(hataMetni, setHata, setMesajlar) {
    setHata(hataMetni);
    setMesajlar((onceki) => [
        ...onceki,
        { id: `err_${Date.now()}`, rol: 'asistan', icerik: hataMetni, kaynaklar: [], hata: true, zaman: new Date() },
    ]);
}
