import { History, ChevronRight, X, Clock } from 'lucide-react';

// Kullanıcının localStorage'daki sohbet geçmişini döndürür
export function gecmisGetir(email) {
    if (!email) return [];
    try {
        return JSON.parse(localStorage.getItem(`hakbul_gecmis_${email}`) || '[]');
    } catch {
        return [];
    }
}

// Yeni bir soruyu geçmişe ekler
export function gecmiseEkle(email, soru) {
    if (!email || !soru?.trim()) return;
    const mevcut = gecmisGetir(email);
    const yeni = {
        id: Date.now(),
        soru: soru.trim(),
        tarih: new Date().toISOString(),
    };
    // Aynı soru varsa eski kaydı sil
    const filtrelenmis = mevcut.filter((g) => g.soru !== soru.trim());
    const guncellenmis = [yeni, ...filtrelenmis].slice(0, 50); // max 50
    localStorage.setItem(`hakbul_gecmis_${email}`, JSON.stringify(guncellenmis));
}

function tarihFormatla(isoStr) {
    const tarih = new Date(isoStr);
    const simdi = new Date();
    const fark = simdi - tarih;
    const dakika = Math.floor(fark / 60000);
    const saat = Math.floor(fark / 3600000);
    const gun = Math.floor(fark / 86400000);
    if (dakika < 1) return 'Az önce';
    if (dakika < 60) return `${dakika}dk önce`;
    if (saat < 24) return `${saat}sa önce`;
    if (gun < 7) return `${gun}g önce`;
    return tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function GecmisPanel({ email, onSoruSec, onKapat }) {
    const gecmis = gecmisGetir(email);

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
            {/* Başlık */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                <div className="flex items-center gap-2">
                    <History size={14} className="text-gold-400" />
                    <span className="text-white text-sm font-medium">Arama Geçmişi</span>
                </div>
                <button onClick={onKapat} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X size={15} />
                </button>
            </div>

            {/* Liste */}
            <div className="max-h-80 overflow-y-auto">
                {gecmis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Clock size={24} className="text-slate-600 mb-2" />
                        <p className="text-slate-500 text-sm">Henüz arama geçmişi yok.</p>
                        <p className="text-slate-600 text-xs mt-1">Soru sorduğunuzda burada görünür.</p>
                    </div>
                ) : (
                    gecmis.map((kayit) => (
                        <button
                            key={kayit.id}
                            onClick={() => onSoruSec(kayit.soru)}
                            className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/4 last:border-0 group"
                        >
                            <ChevronRight size={14} className="text-gold-400/40 group-hover:text-gold-400 flex-shrink-0 mt-0.5 transition-colors" />
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 group-hover:text-white transition-colors">
                                    {kayit.soru}
                                </p>
                                <p className="text-slate-600 text-xs mt-0.5">{tarihFormatla(kayit.tarih)}</p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
