import { useState, useCallback, useRef } from 'react';
import { soruSor, aramaYap, dokumanAnalizAPI } from '../api/client';

let mesajSayac = 0;
const yeniId = () => `msg_${++mesajSayac}_${Date.now()}`;

export function useChat() {
    const [mesajlar, setMesajlar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState(null);
    const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
    const [aramaSonuclari, setAramaSonuclari] = useState(null);
    const sonMesajRef = useRef(null);

    const mesajGonder = useCallback(async (metin, config = {}) => {
        const metinVar = metin ? metin.trim() : '';
        const dosyaVar = config.dosya;

        if ((!metinVar && !dosyaVar) || yukleniyor) return null;

        // Soru min 10 karakter (Eğer dosya yollanmıyorsa)
        if (!dosyaVar && metinVar.length < 10) {
            const hataMesaj = {
                id: yeniId(),
                rol: 'asistan',
                icerik: '⚠️ Sorunuz en az 10 karakter olmalıdır. Lütfen daha ayrıntılı yazın.',
                kaynaklar: [],
                hata: true,
                zaman: new Date(),
            };
            setMesajlar((onceki) => [...onceki, hataMesaj]);
            return null;
        }

        setHata(null);

        // Kullanıcı mesajını ekle
        const kullaniciMesicb = {
            id: yeniId(),
            rol: 'kullanici',
            icerik: dosyaVar ? `[PDF: ${dosyaVar.name}] ${metinVar}` : metinVar,
            kaynaklar: [],
            zaman: new Date(),
        };
        setMesajlar((onceki) => [...onceki, kullaniciMesicb]);
        setYukleniyor(true);

        try {
            let yanit;
            if (dosyaVar) {
                yanit = await dokumanAnalizAPI({
                    dosya: dosyaVar,
                    soru: metinVar || undefined,
                    conversation_id: config.conversationId,
                    guest_session_id: config.guestSessionId,
                });
            } else {
                yanit = await soruSor({
                    soru: metinVar,
                    conversation_id: config.conversationId,
                    guest_session_id: config.guestSessionId,
                });
            }

            const asistanMesaj = {
                id: yanit.message_id || yeniId(),
                rol: 'asistan',
                icerik: yanit.yanit,
                kaynaklar: yanit.kaynaklar || [],
                uyari: yanit.uyari,
                kategori: yanit.kategori || 'Genel Hukuk',
                guest_session_id: yanit.guest_session_id || null,
                zaman: new Date(),
            };
            setMesajlar((onceki) => [...onceki, asistanMesaj]);
            
            return {
                conversation_id: yanit.conversation_id,
                guest_session_id: yanit.guest_session_id
            };
        } catch (err) {
            const status = err?.response?.status;
            const retryAfter = err?.response?.data?.retry_after;

            let hataMetni;
            if (status === 429) {
                hataMetni = `⏳ Çok fazla istek gönderildi. ${retryAfter ? `${retryAfter} saniye` : '1 dakika'} bekleyip tekrar deneyin.`;
            } else if (status === 503) {
                hataMetni = '🔧 Sunucu geçici olarak erişilemiyor (Groq veya Qdrant sorunu). Lütfen 30 saniye sonra tekrar deneyin.';
            } else {
                hataMetni = '⚠️ Yanıt alınamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
            }

            setHata(hataMetni);
            const hataMesaj = {
                id: yeniId(),
                rol: 'asistan',
                icerik: hataMetni,
                kaynaklar: [],
                hata: true,
                zaman: new Date(),
            };
            setMesajlar((onceki) => [...onceki, hataMesaj]);
        } finally {
            setYukleniyor(false);
        }
    }, [yukleniyor]);

    const aramayiCalistir = useCallback(async (sorgu) => {
        if (!sorgu.trim()) return;
        setAramaYukleniyor(true);
        setAramaSonuclari(null);
        try {
            const veri = await aramaYap(sorgu.trim());
            setAramaSonuclari(veri.sonuclar || []);
        } catch {
            setAramaSonuclari([]);
        } finally {
            setAramaYukleniyor(false);
        }
    }, []);

    const aramayiTemizle = useCallback(() => {
        setAramaSonuclari(null);
    }, []);

    const sohbetiTemizle = useCallback(() => {
        setMesajlar([]);
        setHata(null);
    }, []);

    // Kaydedilmiş sohbeti geri yükle (zaman string → Date dönüşümü dahil)
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
