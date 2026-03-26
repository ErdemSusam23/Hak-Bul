import { BookOpen, Gavel, ExternalLink, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const KAYNAK_TURU_KONFIG = {
    kanun: {
        etiket: 'Kanun',
        solSerit: 'var(--kanun-strip)',
        ikonArka: 'var(--kanun-icon-bg)',
        ikonRenk: 'var(--kanun-icon)',
        rozetArka: 'var(--kanun-badge-bg)',
        rozetMetin: 'var(--kanun-badge-text)',
        acikArka: 'var(--kanun-expand-bg)',
        acikSerit: 'var(--kanun-expand-border)',
        acikMetin: 'var(--kanun-expand-text)',
        Ikon: BookOpen,
    },
    yargitay_karari: {
        etiket: 'Yargıtay Kararı',
        solSerit: 'var(--yargitay-strip)',
        ikonArka: 'var(--yargitay-icon-bg)',
        ikonRenk: 'var(--yargitay-icon)',
        rozetArka: 'var(--yargitay-badge-bg)',
        rozetMetin: 'var(--yargitay-badge-text)',
        acikArka: 'var(--yargitay-expand-bg)',
        acikSerit: 'var(--yargitay-expand-border)',
        acikMetin: 'var(--yargitay-expand-text)',
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
    let bgColor = '#f59e0b'; // amber-500
    if (yuzde >= 85) bgColor = '#34d399'; // emerald-400
    else if (yuzde >= 70) bgColor = 'var(--tema-accent)';

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--tema-border)' }}>
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${yuzde}%`, background: bgColor }}
                />
            </div>
            <span className="text-xs tabular-nums" style={{ color: 'var(--tema-muted)' }}>
                {yuzde}%
            </span>
        </div>
    );
}

export default function KaynakKarti({ kaynak }) {
    const [acik, setAcik] = useState(false);
    const konfig = KAYNAK_TURU_KONFIG[kaynak.kaynak_turu] || KAYNAK_TURU_KONFIG.kanun;
    const { Ikon } = konfig;
    const gosterilecekMetin = kaynak.metin || kaynak.metin_ozet;

    const linkAc = (e) => {
        e.stopPropagation();
        window.open(kaynak.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            className="rounded-xl cursor-pointer group transition-all duration-200"
            style={{
                background: 'var(--tema-card)',
                border: '1px solid var(--tema-border-card)',
                borderLeft: `3px solid ${konfig.solSerit}`,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--tema-card-hover)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--tema-card)';
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
                            <p className="text-sm font-medium leading-snug transition-colors" style={{ color: 'var(--tema-text)' }}>
                                {kaynak.baslik}
                            </p>
                            <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                                {kaynak.url && (
                                    <button
                                        onClick={linkAc}
                                        className="p-1 rounded-md transition-colors"
                                        style={{ color: 'var(--tema-muted)' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = konfig.ikonRenk; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
                                        title="mevzuat.gov.tr'de aç"
                                    >
                                        <ExternalLink size={12} />
                                    </button>
                                )}
                                <div
                                    className="p-1 transition-transform duration-200"
                                    style={{
                                        color: 'var(--tema-muted)',
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
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {gosterilecekMetin}
                        </div>
                        {kaynak.url && (
                            <button
                                onClick={linkAc}
                                className="mt-2 flex items-center gap-1.5 text-xs transition-colors px-0.5"
                                style={{ color: 'var(--tema-muted)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = konfig.ikonRenk; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
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
