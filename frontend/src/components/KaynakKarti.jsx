import { BookOpen, Gavel, ExternalLink, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { CHAT_TEXT_WRAP_STYLE, getKaynakPreviewText, scoreToBandLabel, scoreToPercentage } from '../utils/chatUi';
import { useDil } from '../context/useDil';

const KAYNAK_TURU_KONFIG = {
  kanun: {
    etiketKey: 'sourceLaw',
    solSerit: 'var(--accent)',
    ikonArka: 'var(--accent-soft)',
    ikonRenk: 'var(--accent)',
    rozetArka: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
    rozetMetin: 'var(--accent)',
    acikArka: 'color-mix(in srgb, var(--accent) 6%, var(--surface))',
    acikSerit: 'color-mix(in srgb, var(--accent) 32%, var(--line))',
    acikMetin: 'var(--ink-soft)',
    Ikon: BookOpen,
  },
  yargitay_karari: {
    etiketKey: 'sourceCase',
    solSerit: 'var(--highlight)',
    ikonArka: 'color-mix(in srgb, var(--highlight) 18%, var(--surface))',
    ikonRenk: 'var(--highlight)',
    rozetArka: 'color-mix(in srgb, var(--highlight) 16%, var(--surface))',
    rozetMetin: 'var(--highlight)',
    acikArka: 'color-mix(in srgb, var(--highlight) 9%, var(--surface))',
    acikSerit: 'color-mix(in srgb, var(--highlight) 30%, var(--line))',
    acikMetin: 'var(--ink-soft)',
    Ikon: Gavel,
  },
  yonetmelik: {
    etiketKey: 'sourceRegulation',
    solSerit: 'var(--success)',
    ikonArka: 'color-mix(in srgb, var(--success) 12%, var(--surface))',
    ikonRenk: 'var(--success)',
    rozetArka: 'color-mix(in srgb, var(--success) 14%, var(--surface))',
    rozetMetin: 'var(--success)',
    acikArka: 'color-mix(in srgb, var(--success) 8%, var(--surface))',
    acikSerit: 'color-mix(in srgb, var(--success) 28%, var(--line))',
    acikMetin: 'var(--ink-soft)',
    Ikon: BookOpen,
  },
};

function SkorCubugu({ skor, dil, t }) {
  const yuzde = scoreToPercentage(skor);
  const etiket = scoreToBandLabel(skor, dil);
  let bgColor = 'var(--warn)';
  if (yuzde >= 85) bgColor = 'var(--success)';
  else if (yuzde >= 70) bgColor = 'var(--accent)';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${yuzde}%`, background: bgColor }}
        />
      </div>
      <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
        {t('sourceConfidence').replace('{label}', etiket)}
      </span>
    </div>
  );
}

export default function KaynakKarti({ kaynak }) {
  const { dil, t } = useDil();
  const [acik, setAcik] = useState(false);
  const konfig = KAYNAK_TURU_KONFIG[kaynak.kaynak_turu] || KAYNAK_TURU_KONFIG.kanun;
  const { Ikon } = konfig;
  const gosterilecekMetin = getKaynakPreviewText(kaynak);

  const linkAc = (event) => {
    event.stopPropagation();
    window.open(kaynak.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="rounded-xl cursor-pointer group transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-strong)',
        borderLeft: `3px solid ${konfig.solSerit}`,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'var(--surface-muted)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'var(--surface)';
      }}
      onClick={() => setAcik((value) => !value)}
    >
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: konfig.ikonArka }}
          >
            <Ikon size={13} style={{ color: konfig.ikonRenk }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p
                className="text-sm font-medium leading-snug transition-colors"
                style={{ color: 'var(--ink)', ...CHAT_TEXT_WRAP_STYLE }}
              >
                {kaynak.baslik}
              </p>
              <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                {kaynak.url && (
                  <button
                    onClick={linkAc}
                    className="p-1 rounded-md transition-colors"
                    style={{ color: 'var(--ink-muted)' }}
                    onMouseEnter={(event) => { event.currentTarget.style.color = konfig.ikonRenk; }}
                    onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--ink-muted)'; }}
                    title={t('sourceOpenTitle')}
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
                <div
                  className="p-1 transition-transform duration-200"
                  style={{
                    color: 'var(--ink-muted)',
                    transform: acik ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: konfig.rozetArka,
                  color: konfig.rozetMetin,
                }}
              >
                {t(konfig.etiketKey)}
              </span>
              <div className="flex-1">
                <SkorCubugu skor={kaynak.skor} dil={dil} t={t} />
              </div>
            </div>
          </div>
        </div>

        {acik && (
          <div className="mt-3 fade-in">
            <div
              className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
              style={{
                background: konfig.acikArka,
                borderLeft: `2px solid ${konfig.acikSerit}`,
                color: konfig.acikMetin,
                whiteSpace: 'pre-wrap',
                ...CHAT_TEXT_WRAP_STYLE,
              }}
            >
              {gosterilecekMetin}
            </div>
            {kaynak.url && (
              <button
                onClick={linkAc}
                className="mt-2 flex items-center gap-1.5 text-xs transition-colors px-0.5"
                style={{ color: 'var(--ink-muted)' }}
                onMouseEnter={(event) => { event.currentTarget.style.color = konfig.ikonRenk; }}
                onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--ink-muted)'; }}
              >
                <ExternalLink size={11} />
                {t('sourceOpenFullText')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
