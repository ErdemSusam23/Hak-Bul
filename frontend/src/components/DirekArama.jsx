import { useState, useRef, useEffect } from 'react';
import { Search, X, BookOpen, Gavel, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function DirekArama({ onArama, yukleniyor, sonuclar, onTemizle }) {
    const [acik, setAcik] = useState(false);
    const [sorgu, setSorgu] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (acik) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [acik]);

    const ara = () => {
        if (sorgu.trim()) onArama(sorgu);
    };

    const temizle = () => {
        setSorgu('');
        onTemizle();
    };

    const kapat = () => {
        setAcik(false);
        temizle();
    };

    const kaynak_turu_ikon = (tur) =>
        tur === 'yargitay' ? (
            <Gavel size={13} className="text-blue-400" />
        ) : (
            <BookOpen size={13} className="text-gold-400" />
        );

    return (
        <div className="relative">
            {/* Tetikleyici buton */}
            <button
                onClick={() => setAcik(!acik)}
                className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    acik
                        ? 'bg-gold-400/10 text-gold-400 border border-gold-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                )}
            >
                <Search size={16} />
                <span className="hidden sm:inline">Hızlı Ara</span>
            </button>

            {/* Açılır panel */}
            {acik && (
                <div
                    className="absolute right-0 top-12 w-80 glass-card p-3 z-30 animate-slide-up"
                    style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                >
                    {/* Başlık */}
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                            Madde / Dava No Ara
                        </p>
                        <button onClick={kapat} className="text-slate-500 hover:text-slate-300">
                            <X size={14} />
                        </button>
                    </div>

                    {/* Arama inputu */}
                    <div className="flex gap-2 mb-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={sorgu}
                            onChange={(e) => setSorgu(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && ara()}
                            placeholder="örn: 4857 Md.17 veya 2021/1234"
                            className="input-field flex-1 text-sm py-2"
                        />
                        <button
                            onClick={ara}
                            disabled={!sorgu.trim() || yukleniyor}
                            className="send-btn py-2 px-3 text-sm"
                        >
                            {yukleniyor ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Search size={16} />
                            )}
                        </button>
                    </div>

                    {/* Sonuçlar */}
                    {sonuclar && (
                        <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-hide">
                            {sonuclar.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-4">
                                    Sonuç bulunamadı.
                                </p>
                            ) : (
                                sonuclar.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => s.url && window.open(s.url, '_blank', 'noopener,noreferrer')}
                                        className={clsx(
                                            'p-2.5 rounded-xl border border-white/8 transition-all duration-150',
                                            s.url ? 'cursor-pointer hover:bg-white/8 hover:border-white/15' : 'cursor-default'
                                        )}
                                        style={{ background: 'rgba(255,255,255,0.03)' }}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {kaynak_turu_ikon(s.kaynak_turu)}
                                            <span className="text-slate-200 text-xs font-medium line-clamp-1">
                                                {s.baslik}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 text-xs line-clamp-2 pl-5">{s.metin || s.metin_ozet}</p>
                                    </div>
                                ))
                            )}
                            <button
                                onClick={temizle}
                                className="w-full text-xs text-slate-600 hover:text-slate-400 py-1 transition-colors"
                            >
                                Sonuçları temizle
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
