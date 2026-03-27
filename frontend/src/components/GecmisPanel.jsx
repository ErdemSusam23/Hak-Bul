import { useEffect, useReducer } from 'react';
import { ChevronRight, Clock, Trash2 } from 'lucide-react';

import { sohbetleriGetir, sohbetSil } from '../utils/sohbetStore';

function tarihFormatla(tarih) {
    if (!tarih) return '';
    const date = new Date(tarih);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function GecmisPanel({ email, onSoruSec }) {
    const [, yenidenCiz] = useReducer((v) => v + 1, 0);
    const gecmisListe = sohbetleriGetir(email);

    useEffect(() => {
        const handler = () => yenidenCiz();
        window.addEventListener('gecmis-guncellendi', handler);
        return () => window.removeEventListener('gecmis-guncellendi', handler);
    }, []);

    const handleSil = (event, id) => {
        event.stopPropagation();
        sohbetSil(email, id);
        yenidenCiz();
    };

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
            <div className="max-h-72 overflow-y-auto">
                {gecmisListe.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Clock size={24} className="text-slate-600 mb-2" />
                        <p className="text-slate-500 text-sm">Henüz arama geçmişi yok.</p>
                        <p className="text-slate-600 text-xs mt-1">Soru sorduğunuzda burada görünür.</p>
                    </div>
                ) : (
                    gecmisListe.map((kayit) => (
                        <div key={kayit.id} className="relative group border-b border-white/4 last:border-0 hover:bg-white/5 transition-colors">
                            <button
                                onClick={() => onSoruSec(kayit.soru)}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left"
                            >
                                <ChevronRight size={14} className="text-gold-400/40 group-hover:text-gold-400 flex-shrink-0 mt-0.5 transition-colors" />
                                <div className="flex-1 min-w-0 pr-6">
                                    <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 group-hover:text-white transition-colors mb-1">
                                        {kayit.soru}
                                    </p>
                                    <span className="text-slate-600 text-[10px]">{tarihFormatla(kayit.tarih)}</span>
                                </div>
                            </button>
                            <button
                                onClick={(event) => handleSil(event, kayit.id)}
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
