import { BookOpen, Gavel, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const KAYNAK_TURU_KONFIG = {
    kanun: {
        etiket: 'Kanun',
        renk: 'text-gold-400',
        kenarlık: 'border-gold-400/60',
        arkaplan: 'bg-gold-400/8',
        rozetRenk: 'bg-gold-400/15 text-gold-300',
        Ikon: BookOpen,
    },
    yargitay_karari: {
        etiket: 'Yargıtay',
        renk: 'text-blue-400',
        kenarlık: 'border-blue-400/60',
        arkaplan: 'bg-blue-400/8',
        rozetRenk: 'bg-blue-400/15 text-blue-300',
        Ikon: Gavel,
    },
    yonetmelik: {
        etiket: 'Yönetmelik',
        renk: 'text-emerald-400',
        kenarlık: 'border-emerald-400/60',
        arkaplan: 'bg-emerald-400/8',
        rozetRenk: 'bg-emerald-400/15 text-emerald-300',
        Ikon: BookOpen,
    },
};

function SkorCubugu({ skor }) {
    const yuzde = Math.round(skor * 100);
    const renk = yuzde >= 90 ? 'bg-emerald-400' : yuzde >= 75 ? 'bg-gold-400' : 'bg-amber-500';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${renk} transition-all duration-700`} style={{ width: `${yuzde}%` }} />
            </div>
            <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{yuzde}%</span>
        </div>
    );
}

export default function KaynakKarti({ kaynak }) {
    const [acik, setAcik] = useState(false);
    const konfig = KAYNAK_TURU_KONFIG[kaynak.kaynak_turu] || KAYNAK_TURU_KONFIG.kanun;
    const { Ikon } = konfig;

    const linkAc = (e) => {
        e.stopPropagation();
        window.open(kaynak.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            className={clsx('source-card border-l-2 group cursor-pointer', konfig.kenarlık)}
            style={{ background: 'rgba(255,255,255,0.03)' }}
            onClick={() => setAcik(!acik)}
        >
            <div className="flex items-start gap-3">
                {/* İkon */}
                <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', konfig.arkaplan)}>
                    <Ikon size={14} className={konfig.renk} />
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-slate-200 text-sm font-medium leading-snug group-hover:text-white transition-colors line-clamp-2">
                            {kaynak.baslik}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                            {kaynak.url && (
                                <button onClick={linkAc} className="text-slate-500 hover:text-gold-400 transition-colors p-0.5" title="mevzuat.gov.tr'de aç">
                                    <ExternalLink size={13} />
                                </button>
                            )}
                            <button className="text-slate-500 hover:text-slate-300 transition-colors p-0.5">
                                {acik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Rozet + Skor */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('badge', konfig.rozetRenk)}>{konfig.etiket}</span>
                        <div className="flex-1"><SkorCubugu skor={kaynak.skor} /></div>
                    </div>

                    {/* Madde metni — kırmızı highlight */}
                    {acik && (
                        <div className="mt-2 animate-fade-in">
                            <p
                                className="text-xs leading-relaxed rounded px-2 py-1.5"
                                style={{
                                    background: 'rgba(239,68,68,0.12)',
                                    borderLeft: '2px solid rgba(239,68,68,0.7)',
                                    color: 'rgba(252,165,165,0.95)',
                                }}
                            >
                                {kaynak.metin_ozet}
                            </p>
                            {kaynak.url && (
                                <button
                                    onClick={linkAc}
                                    className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 hover:text-gold-400 transition-colors"
                                >
                                    <ExternalLink size={11} />
                                    Tam metni mevzuat.gov.tr'de görüntüle
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
