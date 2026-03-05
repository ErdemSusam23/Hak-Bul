import { Scale } from 'lucide-react';

export default function YukleniyorGostergesi() {
    return (
        <div className="flex items-start gap-3 animate-slide-up">
            {/* Asistan avatarı */}
            <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    background: 'linear-gradient(135deg, rgba(212,168,83,0.2) 0%, rgba(212,168,83,0.05) 100%)',
                    border: '1px solid rgba(212,168,83,0.3)',
                }}
            >
                <Scale size={16} className="text-gold-400" />
            </div>

            {/* Yazıyor balonu */}
            <div
                className="glass-card px-5 py-3.5 max-w-xs"
                style={{ background: 'rgba(255,255,255,0.04)' }}
            >
                <div className="flex items-center gap-3">
                    {/* Animasyonlu noktalar */}
                    <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <span
                                key={i}
                                className="w-2 h-2 bg-gold-400 rounded-full"
                                style={{
                                    animation: `bounceDot 1.4s infinite ease-in-out`,
                                    animationDelay: `${i * 0.16}s`,
                                }}
                            />
                        ))}
                    </div>
                    <span className="text-slate-400 text-sm">Hak-Bul yanıtlıyor...</span>
                </div>
            </div>
        </div>
    );
}
