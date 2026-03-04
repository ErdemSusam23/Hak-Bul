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
        <div className="flex items-start gap-3 animate-slide-up">
            {/* Avatar */}
            <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    background: 'linear-gradient(135deg, rgba(212,168,83,0.22) 0%, rgba(212,168,83,0.06) 100%)',
                    border: '1px solid rgba(212,168,83,0.32)',
                }}
            >
                <Scale size={15} className="text-gold-400" />
            </div>

            {/* Yazıyor balonu */}
            <div
                className="rounded-2xl px-5 py-3.5"
                style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.07)',
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
                                    background: 'rgba(212,168,83,0.7)',
                                    animation: `bounceDot 1.2s infinite ease-in-out`,
                                    animationDelay: `${i * 0.2}s`,
                                }}
                            />
                        ))}
                    </div>
                    <span
                        key={mesajIndex}
                        className="text-sm animate-fade-in"
                        style={{ color: 'rgba(148,163,184,0.8)' }}
                    >
                        {MESAJLAR[mesajIndex]}
                    </span>
                </div>
            </div>
        </div>
    );
}
