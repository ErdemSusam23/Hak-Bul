import { useState, useCallback, useRef } from 'react';
import { soruSor, aramaYap } from '../api/client';

let mesajSayac = 0;
const yeniId = () => `msg_${++mesajSayac}_${Date.now()}`;

export function useChat() {
    const [mesajlar, setMesajlar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState(null);
    const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
    const [aramaSonuclari, setAramaSonuclari] = useState(null);
    const sonMesajRef = useRef(null);

    const mesajGonder = useCallback(async (metin) => {
        if (!metin.trim() || yukleniyor) return;

        // Soru min 10 karakter (backend validasyonu ile uyumlu)
        if (metin.trim().length < 10) {
            const hataMesaj = {
                id: yeniId(),
                rol: 'asistan',
                icerik: '⚠️ Sorunuz en az 10 karakter olmalıdır. Lütfen daha ayrıntılı yazın.',
                kaynaklar: [],
                hata: true,
                zaman: new Date(),
            };
            setMesajlar((onceki) => [...onceki, hataMesaj]);
            return;
        }

        setHata(null);

        // Kullanıcı mesajını ekle
        const kullaniciMesaj = {
            id: yeniId(),
            rol: 'kullanici',
            icerik: metin.trim(),
            kaynaklar: [],
            zaman: new Date(),
        };
        setMesajlar((onceki) => [...onceki, kullaniciMesaj]);
        setYukleniyor(true);

        try {
            const yanit = await soruSor(metin.trim());

            const asistanMesaj = {
                id: yeniId(),
                rol: 'asistan',
                icerik: yanit.yanit,
                kaynaklar: yanit.kaynaklar || [],
                uyari: yanit.uyari,
                zaman: new Date(),
            };
            setMesajlar((onceki) => [...onceki, asistanMesaj]);
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
