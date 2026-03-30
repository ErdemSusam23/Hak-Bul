import { Scale } from 'lucide-react';
import { useState, useEffect } from 'react';

const MESAJLAR = [
    'Kaynaklar taranıyor…',
    'Kanun maddeleri aranıyor…',
    'Yanıt oluşturuluyor…',
];

export default function YukleniyorGostergesi() {
    const [mesajIndex, setMesajIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMesajIndex((i) => (i + 1) % MESAJLAR.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                    background: `rgba(var(--a), 0.1)`,
                    border: `1px solid rgba(var(--a), 0.22)`,
                }}
            >
                <Scale size={15} style={{ color: 'var(--tema-accent)' }} />
            </div>

            {/* Yazıyor balonu */}
            <div
                className="rounded-xl px-5 py-3.5"
                style={{
                    background: 'var(--tema-bubble)',
                    border: '1px solid var(--tema-border)',
                }}
            >
                <div className="flex items-center gap-3">
                    {/* Animasyonlu noktalar */}
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <span
                                key={i}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                    background: `rgba(var(--a), 0.7)`,
                                    animation: `bounceDot 1.2s infinite ease-in-out`,
                                    animationDelay: `${i * 0.2}s`,
                                }}
                            />
                        ))}
                    </div>
                    <span
                        key={mesajIndex}
                        className="text-sm animate-fade-in"
                        style={{ color: 'var(--tema-text2)' }}
                    >
                        {MESAJLAR[mesajIndex]}
                    </span>
                </div>
            </div>
        </div>
    );
}
