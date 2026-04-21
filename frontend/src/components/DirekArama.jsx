import { useState, useRef, useEffect } from 'react';
import { Search, X, BookOpen, Gavel, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useDil } from '../context/useDil';

const INPUT_CLASS = 'flex-1 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm focus:bg-surface focus:border-line-strong';

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

  const kaynakTuruIkon = (tur) => (
    tur === 'yargitay'
      ? <Gavel size={13} style={{ color: 'var(--highlight)' }} />
      : <BookOpen size={13} style={{ color: 'var(--accent)' }} />
  );

  return (
    <div className="relative">
      <button
        onClick={() => setAcik((value) => !value)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 hover:text-ink hover:bg-accent-soft"
        style={
          acik
            ? {
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 24%, var(--line))',
            }
            : {
              color: 'var(--ink-muted)',
              border: '1px solid transparent',
            }
        }
      >
        <Search size={16} />
        <span className="hidden sm:inline">{t('fastSearch')}</span>
      </button>

      {acik && (
        <div
          className="absolute right-0 top-12 z-30 w-80 card p-3 fade-in"
          style={{ boxShadow: '0 12px 30px rgba(0, 0, 0, 0.16)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              {t('searchByArticleOrCase')}
            </p>
            <button
              onClick={kapat}
              className="transition-colors hover:text-ink"
              style={{ color: 'var(--ink-faint)' }}
            >
              <X size={14} />
            </button>
          </div>

          <div className="mb-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={sorgu}
              onChange={(event) => setSorgu(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && ara()}
              placeholder={t('searchPlaceholder')}
              className={INPUT_CLASS}
            />
            <button
              onClick={ara}
              disabled={!sorgu.trim() || yukleniyor}
              className="btn btn-primary px-3 py-2 text-sm"
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
                <p className="py-4 text-center text-sm" style={{ color: 'var(--ink-faint)' }}>
                  {t('searchNoResults')}
                </p>
              ) : (
                sonuclar.map((sonuc) => (
                  <div
                    key={sonuc.id}
                    onClick={() => sonuc.url && window.open(sonuc.url, '_blank', 'noopener,noreferrer')}
                    className={clsx(
                      'rounded-xl p-2.5 transition-all duration-150',
                      sonuc.url ? 'cursor-pointer hover:bg-surface-muted' : 'cursor-default',
                    )}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line-strong)',
                    }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {kaynakTuruIkon(sonuc.kaynak_turu)}
                      <span className="line-clamp-1 text-xs font-medium" style={{ color: 'var(--ink)' }}>
                        {sonuc.baslik}
                      </span>
                    </div>
                    <p className="line-clamp-2 pl-5 text-xs" style={{ color: 'var(--ink-faint)' }}>
                      {sonuc.metin || sonuc.metin_ozet}
                    </p>
                  </div>
                ))
              )}
              <button
                onClick={temizle}
                className="w-full py-1 text-xs transition-colors hover:text-accent"
                style={{ color: 'var(--ink-faint)' }}
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
