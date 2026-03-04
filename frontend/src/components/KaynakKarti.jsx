import { BookOpen, Gavel, ExternalLink, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const KAYNAK_TURU_KONFIG = {
    kanun: {
        etiket: 'Kanun',
        solSerit: 'rgba(212,168,83,0.55)',
        ikonArka: 'rgba(212,168,83,0.1)',
        ikonRenk: '#d4a853',
        rozetArka: 'rgba(212,168,83,0.12)',
        rozetMetin: 'rgba(212,168,83,0.9)',
        acikArka: 'rgba(212,168,83,0.06)',
        acikSerit: 'rgba(212,168,83,0.35)',
        acikMetin: 'rgba(240,201,106,0.85)',
        Ikon: BookOpen,
    },
    yargitay_karari: {
        etiket: 'Yargıtay Kararı',
        solSerit: 'rgba(96,165,250,0.55)',
        ikonArka: 'rgba(96,165,250,0.1)',
        ikonRenk: '#60a5fa',
        rozetArka: 'rgba(96,165,250,0.12)',
        rozetMetin: 'rgba(96,165,250,0.9)',
        acikArka: 'rgba(59,130,246,0.06)',
        acikSerit: 'rgba(96,165,250,0.35)',
        acikMetin: 'rgba(147,197,253,0.85)',
        Ikon: Gavel,
    },
    yonetmelik: {
        etiket: 'Yönetmelik',
        solSerit: 'rgba(52,211,153,0.55)',
        ikonArka: 'rgba(52,211,153,0.1)',
        ikonRenk: '#34d399',
        rozetArka: 'rgba(52,211,153,0.12)',
        rozetMetin: 'rgba(52,211,153,0.9)',
        acikArka: 'rgba(16,185,129,0.06)',
        acikSerit: 'rgba(52,211,153,0.35)',
        acikMetin: 'rgba(110,231,183,0.85)',
        Ikon: BookOpen,
    },
};

function SkorCubugu({ skor }) {
    const yuzde = Math.round(skor * 100);
    let renkClass = 'bg-amber-500';
    if (yuzde >= 85) renkClass = 'bg-emerald-400';
    else if (yuzde >= 70) renkClass = 'bg-gold-400';

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                    className={`h-full rounded-full transition-all duration-700 ${renkClass}`}
                    style={{ width: `${yuzde}%` }}
                />
            </div>
            <span className="text-xs tabular-nums" style={{ color: 'rgba(148,163,184,0.7)' }}>
                {yuzde}%
            </span>
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
            className="rounded-xl cursor-pointer group transition-all duration-200"
            style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${konfig.solSerit}`,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.045)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
            }}
            onClick={() => setAcik(!acik)}
        >
            <div className="p-3">
                <div className="flex items-start gap-2.5">
                    {/* İkon */}
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: konfig.ikonArka }}
                    >
                        <Ikon size={13} style={{ color: konfig.ikonRenk }} />
                    </div>

                    {/* İçerik */}
                    <div className="flex-1 min-w-0">
                        {/* Başlık + Butonlar */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-slate-200 text-sm font-medium leading-snug group-hover:text-white transition-colors">
                                {kaynak.baslik}
                            </p>
                            <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                                {kaynak.url && (
                                    <button
                                        onClick={linkAc}
                                        className="p-1 rounded-md transition-colors"
                                        style={{ color: 'rgba(148,163,184,0.5)' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = konfig.ikonRenk; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; }}
                                        title="mevzuat.gov.tr'de aç"
                                    >
                                        <ExternalLink size={12} />
                                    </button>
                                )}
                                <div
                                    className="p-1 transition-transform duration-200"
                                    style={{
                                        color: 'rgba(148,163,184,0.5)',
                                        transform: acik ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                >
                                    <ChevronDown size={13} />
                                </div>
                            </div>
                        </div>

                        {/* Rozet + Skor */}
                        <div className="flex items-center gap-2.5">
                            <span
                                className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{
                                    background: konfig.rozetArka,
                                    color: konfig.rozetMetin,
                                }}
                            >
                                {konfig.etiket}
                            </span>
                            <div className="flex-1">
                                <SkorCubugu skor={kaynak.skor} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Genişletilmiş metin */}
                {acik && (
                    <div className="mt-3 animate-fade-in">
                        <div
                            className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                            style={{
                                background: konfig.acikArka,
                                borderLeft: `2px solid ${konfig.acikSerit}`,
                                color: konfig.acikMetin,
                            }}
                        >
                            {kaynak.metin_ozet}
                        </div>
                        {kaynak.url && (
                            <button
                                onClick={linkAc}
                                className="mt-2 flex items-center gap-1.5 text-xs transition-colors px-0.5"
                                style={{ color: 'rgba(148,163,184,0.5)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = konfig.ikonRenk; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; }}
                            >
                                <ExternalLink size={11} />
                                Tam metni mevzuat.gov.tr'de görüntüle
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
