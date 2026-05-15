import { Scale } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDil } from '../context/useDil';

const MESAJ_ANAHTARLARI = ['chatScanningSources', 'chatSearchingLaws', 'chatGeneratingAnswer'];

export default function YukleniyorGostergesi() {
  const { t } = useDil();
  const [mesajIndex, setMesajIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMesajIndex((index) => (index + 1) % MESAJ_ANAHTARLARI.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--accent-soft)',
          border: '1px solid color-mix(in srgb, var(--accent) 22%, var(--line))',
        }}
      >
        <Scale size={15} style={{ color: 'var(--accent)' }} />
      </div>

      <div
        className="rounded-xl px-5 py-3.5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--accent)',
                  animation: 'bounceDot 1.2s infinite ease-in-out',
                  animationDelay: `${index * 0.2}s`,
                }}
              />
            ))}
          </div>
          <span
            key={mesajIndex}
            className="text-sm fade-in"
            style={{ color: 'var(--ink-soft)' }}
          >
            {t(MESAJ_ANAHTARLARI[mesajIndex])}
          </span>
        </div>
      </div>
    </div>
  );
}
