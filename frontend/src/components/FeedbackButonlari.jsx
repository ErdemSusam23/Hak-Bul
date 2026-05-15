import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { feedbackGonder } from '../api/client';
import { useDil } from '../context/useDil';

export default function FeedbackButonlari({ mesajId }) {
  const { t } = useDil();
  const [secim, setSecim] = useState(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function handleFeedback(puan) {
    if (secim === puan || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      await feedbackGonder({ message_id: mesajId, puan });
      setSecim(puan);
    } catch (err) {
      console.error('Feedback gönderilemedi:', err);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      <span className="text-xs mr-1" style={{ color: 'var(--ink-faint)' }}>{t('feedbackQuestion')}</span>
      <button
        onClick={() => handleFeedback(1)}
        disabled={gonderiliyor}
        title={t('feedbackLike')}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-150"
        style={{
          background: secim === 1 ? 'rgba(34,197,94,0.18)' : 'transparent',
          border: secim === 1 ? '1px solid rgba(34,197,94,0.4)' : '1px solid transparent',
          color: secim === 1 ? '#4ade80' : 'var(--ink-faint)',
          opacity: gonderiliyor ? 0.6 : 1,
        }}
        onMouseEnter={(event) => { if (secim !== 1) event.currentTarget.style.background = 'rgba(34,197,94,0.08)'; }}
        onMouseLeave={(event) => { if (secim !== 1) event.currentTarget.style.background = 'transparent'; }}
      >
        <ThumbsUp size={13} />
        {secim === 1 && <span>{t('feedbackThanks')}</span>}
      </button>
      <button
        onClick={() => handleFeedback(-1)}
        disabled={gonderiliyor}
        title={t('feedbackDislike')}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-150"
        style={{
          background: secim === -1 ? 'rgba(239,68,68,0.15)' : 'transparent',
          border: secim === -1 ? '1px solid rgba(239,68,68,0.35)' : '1px solid transparent',
          color: secim === -1 ? '#f87171' : 'var(--ink-faint)',
          opacity: gonderiliyor ? 0.6 : 1,
        }}
        onMouseEnter={(event) => { if (secim !== -1) event.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
        onMouseLeave={(event) => { if (secim !== -1) event.currentTarget.style.background = 'transparent'; }}
      >
        <ThumbsDown size={13} />
        {secim === -1 && <span>{t('feedbackSaved')}</span>}
      </button>
    </div>
  );
}
