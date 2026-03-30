import { useState, useRef, useEffect } from 'react';
import { Search, X, BookOpen, Gavel, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useDil } from '../context/DilContext';

export default function DirekArama({ onArama, yukleniyor, sonuclar, onTemizle }) {
    const [acik, setAcik] = useState(false);
    const [sorgu, setSorgu] = useState('');
    const inputRef = useRef(null);
    const { t } = useDil();

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

    const kaynakTuruIkon = (tur) =>
        tur === 'yargitay' ? (
            <Gavel size={13} style={{ color: 'var(--yargitay-icon)' }} />
        ) : (
            <BookOpen size={13} style={{ color: 'var(--kanun-icon)' }} />
        );

    return (
        <div className="relative">
            <button
                onClick={() => setAcik(!acik)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200"
                style={
                    acik
                        ? {
                            background: 'rgba(var(--a), 0.1)',
                            color: 'var(--tema-accent)',
                            border: '1px solid rgba(var(--a), 0.24)',
                        }
                        : {
                            color: 'var(--tema-muted)',
                            border: '1px solid transparent',
                        }
                }
                onMouseEnter={(e) => {
                    if (!acik) {
                        e.currentTarget.style.color = 'var(--tema-text)';
                        e.currentTarget.style.background = 'var(--tema-soft-bg-subtle)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!acik) {
                        e.currentTarget.style.color = 'var(--tema-muted)';
                        e.currentTarget.style.background = 'transparent';
                    }
                }}
            >
                <Search size={16} />
                <span className="hidden sm:inline">{t('fastSearch')}</span>
            </button>

            {acik && (
                <div
                    className="absolute right-0 top-12 z-30 w-80 glass-card p-3 animate-slide-up"
                    style={{ boxShadow: '0 20px 40px rgba(0, 0, 0, 0.32)' }}
                >
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                            {t('searchByArticleOrCase')}
                        </p>
                        <button
                            onClick={kapat}
                            style={{ color: 'var(--tema-dimmer)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--tema-text)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-dimmer)'; }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="mb-3 flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={sorgu}
                            onChange={(e) => setSorgu(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && ara()}
                            placeholder={t('searchPlaceholder')}
                            className="input-field flex-1 py-2 text-sm"
                        />
                        <button
                            onClick={ara}
                            disabled={!sorgu.trim() || yukleniyor}
                            className="send-btn px-3 py-2 text-sm"
                        >
                            {yukleniyor ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Search size={16} />
                            )}
                        </button>
                    </div>

                    {sonuclar && (
                        <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-hide">
                            {sonuclar.length === 0 ? (
                                <p className="py-4 text-center text-sm" style={{ color: 'var(--tema-dimmer)' }}>
                                    {t('searchNoResults')}
                                </p>
                            ) : (
                                sonuclar.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => s.url && window.open(s.url, '_blank', 'noopener,noreferrer')}
                                        className={clsx('rounded-xl p-2.5 transition-all duration-150', s.url ? 'cursor-pointer' : 'cursor-default')}
                                        style={{
                                            background: 'var(--tema-card)',
                                            border: '1px solid var(--tema-border-card)',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!s.url) return;
                                            e.currentTarget.style.background = 'var(--tema-card-hover)';
                                            e.currentTarget.style.borderColor = 'rgba(var(--a), 0.18)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!s.url) return;
                                            e.currentTarget.style.background = 'var(--tema-card)';
                                            e.currentTarget.style.borderColor = 'var(--tema-border-card)';
                                        }}
                                    >
                                        <div className="mb-1 flex items-center gap-2">
                                            {kaynakTuruIkon(s.kaynak_turu)}
                                            <span className="line-clamp-1 text-xs font-medium" style={{ color: 'var(--tema-text)' }}>
                                                {s.baslik}
                                            </span>
                                        </div>
                                        <p className="line-clamp-2 pl-5 text-xs" style={{ color: 'var(--tema-dimmer)' }}>
                                            {s.metin || s.metin_ozet}
                                        </p>
                                    </div>
                                ))
                            )}
                            <button
                                onClick={temizle}
                                className="w-full py-1 text-xs transition-colors"
                                style={{ color: 'var(--tema-dimmer)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--tema-accent)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-dimmer)'; }}
                            >
                                {t('clearSearchResults')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
