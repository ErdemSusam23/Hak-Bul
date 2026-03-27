import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { feedbackGonder } from '../api/client';

export default function FeedbackButonlari({ mesajId }) {
    const [secim, setSecim] = useState(null); // 1, -1, veya null
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
            <span className="text-xs mr-1" style={{ color: 'var(--tema-dimmer)' }}>Bu yanıt yardımcı oldu mu?</span>
            <button
                onClick={() => handleFeedback(1)}
                disabled={gonderiliyor}
                title="Beğendim"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-150"
                style={{
                    background: secim === 1 ? 'rgba(34,197,94,0.18)' : 'transparent',
                    border: secim === 1 ? '1px solid rgba(34,197,94,0.4)' : '1px solid transparent',
                    color: secim === 1 ? '#4ade80' : 'var(--tema-dimmer)',
                    opacity: gonderiliyor ? 0.6 : 1,
                }}
                onMouseEnter={(e) => { if (secim !== 1) e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; }}
                onMouseLeave={(e) => { if (secim !== 1) e.currentTarget.style.background = 'transparent'; }}
            >
                <ThumbsUp size={13} />
                {secim === 1 && <span>Teşekkürler!</span>}
            </button>
            <button
                onClick={() => handleFeedback(-1)}
                disabled={gonderiliyor}
                title="Beğenmedim"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-150"
                style={{
                    background: secim === -1 ? 'rgba(239,68,68,0.15)' : 'transparent',
                    border: secim === -1 ? '1px solid rgba(239,68,68,0.35)' : '1px solid transparent',
                    color: secim === -1 ? '#f87171' : 'var(--tema-dimmer)',
                    opacity: gonderiliyor ? 0.6 : 1,
                }}
                onMouseEnter={(e) => { if (secim !== -1) e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
                onMouseLeave={(e) => { if (secim !== -1) e.currentTarget.style.background = 'transparent'; }}
            >
                <ThumbsDown size={13} />
                {secim === -1 && <span>Kaydedildi</span>}
            </button>
        </div>
    );
}
