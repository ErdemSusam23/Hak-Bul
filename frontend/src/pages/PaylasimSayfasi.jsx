import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, RotateCcw, Share2 } from 'lucide-react';

import { paylasimSohbetGetirAPI } from '../api/client';
import { useDil } from '../context/useDil';

export default function PaylasimSayfasi({ shareToken }) {
  const { t } = useDil();
  const [mesajlar, setMesajlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    if (!shareToken) return;
    paylasimSohbetGetirAPI(shareToken)
      .then((data) => setMesajlar(data.messages || []))
      .catch(() => setHata(t('sharedNotFound')))
      .finally(() => setYukleniyor(false));
  }, [shareToken, t]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <Share2 size={18} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t('sharedChatTitle')}</h1>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t('sharedChatSubtitle')}</p>
        </div>
        <a
          href="/"
          className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          {t('goToApp')}
        </a>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        {yukleniyor ? (
          <div className="flex justify-center py-16">
            <RotateCcw size={28} className="animate-spin" style={{ color: 'var(--ink-muted)' }} />
          </div>
        ) : hata ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <AlertTriangle size={32} style={{ color: 'var(--warn)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>{hata}</p>
          </div>
        ) : mesajlar.length === 0 ? (
          <p className="text-sm text-center py-16" style={{ color: 'var(--ink-muted)' }}>{t('sharedEmpty')}</p>
        ) : (
          mesajlar.map((mesaj) => (
            <div key={mesaj.id} className={`flex ${mesaj.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-xl rounded-xl px-4 py-3"
                style={{
                  background: mesaj.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                  color: mesaj.role === 'user' ? 'var(--accent-ink)' : 'var(--ink)',
                  border: mesaj.role !== 'user' ? '1px solid var(--line)' : 'none',
                }}
              >
                <div className="text-xs mb-1 font-medium" style={{ opacity: 0.6 }}>
                  {mesaj.role === 'user' ? t('userLabel') : 'Hak-Bul'}
                </div>
                <div className="text-sm prose prose-sm max-w-none" style={{ color: 'inherit' }}>
                  <ReactMarkdown>{mesaj.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <footer className="text-center py-4 text-xs" style={{ color: 'var(--ink-faint)', borderTop: '1px solid var(--line)' }}>
        {t('sharedFooter')}
      </footer>
    </div>
  );
}
