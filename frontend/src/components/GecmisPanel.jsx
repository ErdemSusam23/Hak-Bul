import { useState, useEffect } from 'react';
import { History, ChevronRight, X, Clock, Tag, Trash2 } from 'lucide-react';

import { sohbetleriGetir, sohbetSil } from '../utils/sohbetStore';

// Hukuki kategoriler
const KATEGORILER = ['Tümü', 'İş Hukuku', 'Ceza Hukuku', 'Aile Hukuku', 'Tüketici Hukuku', 'Kira Hukuku', 'İdare Hukuku', 'Genel'];

// Kategori renkleri
const KATEGORI_RENK = {
    'İş Hukuku':      { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  text: '#93c5fd' },
    'Ceza Hukuku':    { bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.3)',    text: '#fca5a5' },
    'Aile Hukuku':    { bg: 'rgba(217,70,239,0.13)',  border: 'rgba(217,70,239,0.3)',   text: '#e879f9' },
    'Tüketici Hukuku':{ bg: 'rgba(34,197,94,0.13)',   border: 'rgba(34,197,94,0.3)',    text: '#86efac' },
    'Kira Hukuku':    { bg: 'rgba(251,146,60,0.13)',  border: 'rgba(251,146,60,0.3)',   text: '#fdba74' },
    'İdare Hukuku':   { bg: 'rgba(168,162,158,0.15)', border: 'rgba(168,162,158,0.3)', text: '#d6d3d1' },
    'Genel':          { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' },
};

// ... existing code ...

export default function GecmisPanel({ email, onSoruSec, onKapat }) {
    const [aktifKategori, setAktifKategori] = useState('Tümü');
    const [gecmisListe, setGecmisListe] = useState([]);

    // İlk açılışta ve window 'gecmis-guncellendi' eventinde listeyi yükleyelim
    const listeyiYenile = () => {
        setGecmisListe(gecmisGetir(email));
    };

    useEffect(() => {
        listeyiYenile();
        window.addEventListener('gecmis-guncellendi', listeyiYenile);
        return () => window.removeEventListener('gecmis-guncellendi', listeyiYenile);
    }, [email]);

    const handleSil = (e, id) => {
        e.stopPropagation(); // Butona tıklanınca sohbeti secme eventini engelle
        sohbetSil(email, id);
        listeyiYenile();
    };

    const filtreliGecmis = aktifKategori === 'Tümü'
        ? gecmisListe
        : gecmisListe.filter((g) => g.kategori === aktifKategori);

    return (
        <div
            className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden animate-fade-in"
            style={{
                zIndex: 9999,
                background: 'linear-gradient(135deg, rgba(10,22,40,0.98) 0%, rgba(15,31,56,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
        >
            {/* ... */}
            {/* Liste */}
            <div className="max-h-72 overflow-y-auto">
                {filtreliGecmis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Clock size={24} className="text-slate-600 mb-2" />
                        <p className="text-slate-500 text-sm">
                            {aktifKategori === 'Tümü' ? 'Henüz arama geçmişi yok.' : `"${aktifKategori}" kategorisinde geçmiş yok.`}
                        </p>
                        <p className="text-slate-600 text-xs mt-1">Soru sorduğunuzda burada görünür.</p>
                    </div>
                ) : (
                    filtreliGecmis.map((kayit) => (
                        <div key={kayit.id} className="relative group border-b border-white/4 last:border-0 hover:bg-white/5 transition-colors">
                            <button
                                onClick={() => onSoruSec(kayit.soru)}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left "
                            >
                                <ChevronRight size={14} className="text-gold-400/40 group-hover:text-gold-400 flex-shrink-0 mt-0.5 transition-colors" />
                                <div className="flex-1 min-w-0 pr-6"> {/* Sil butonu için sağdan boşluk */}
                                    <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 group-hover:text-white transition-colors mb-1">
                                        {kayit.soru}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {kayit.kategori && kayit.kategori !== 'Genel' && (
                                            <KategoriBadge kategori={kayit.kategori} />
                                        )}
                                        <span className="text-slate-600 text-[10px]">{tarihFormatla(kayit.tarih)}</span>
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={(e) => handleSil(e, kayit.id)}
                                title="Geçmişten sil"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
