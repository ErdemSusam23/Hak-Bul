import { useState } from 'react';
import { Icon, SectionHeader } from '../components/ui';

function DropZone({ label, file, setFile }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={e => {
        e.preventDefault(); setHover(false);
        setFile({ name: e.dataTransfer.files[0]?.name || 'belge.pdf', size: '146 KB' });
      }}
      onClick={() => !file && setFile({ name: label === '1. Belge' ? 'sozlesme-v1.pdf' : 'sozlesme-v2.pdf', size: '132 KB' })}
      className={'card p-8 h-48 flex flex-col items-center justify-center text-center cursor-pointer transition ' + (hover ? 'border-accent' : '')}
      style={hover
        ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' }
        : file ? { background: 'var(--surface-muted)' } : {}}
    >
      <div className="label mb-2">{label}</div>
      {file ? (
        <>
          <Icon name="file-text" size={28} className="mb-2 text-accent" />
          <div className="text-sm font-medium">{file.name}</div>
          <div className="text-xs text-ink-muted mt-0.5">{file.size}</div>
          <button
            onClick={e => { e.stopPropagation(); setFile(null); }}
            className="mt-2 text-xs text-ink-muted underline"
          >
            Kaldır
          </button>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ background: 'var(--surface)' }}>
            <Icon name="upload-cloud" size={18} className="text-ink-muted" />
          </div>
          <div className="text-sm">PDF sürükle veya <span className="underline">tıkla</span></div>
          <div className="text-[11px] text-ink-faint mt-1">Maks. 10 MB</div>
        </>
      )}
    </div>
  );
}

function CompareResult({ f1, f2 }) {
  return (
    <div className="fade-in space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="sparkles" size={15} className="text-accent" />
          <span className="label">Yapay Zeka Özeti</span>
        </div>
        <div className="font-display text-[22px] leading-snug mb-2">
          İki belge arasında <span style={{ color: 'var(--accent)' }}>7 önemli</span> ve{' '}
          <span className="text-ink-muted">12 yüzeysel</span> fark tespit edildi.
        </div>
        <p className="text-ink-muted text-sm leading-relaxed">
          Başlıca değişiklikler fesih prosedürü (md. 14), kira artış oranı (md. 6) ve depozito iade süresi (md. 11)
          etrafında yoğunlaşıyor. Fesih tarafı için cezai şart kaldırılmış.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[f1, f2].map((f, idx) => (
          <div key={idx} className="card overflow-hidden">
            <div className="hairline-b px-4 py-2.5 flex items-center justify-between bg-surface-muted">
              <div className="text-sm font-medium font-mono">{f.name}</div>
              <span className="label">{idx === 0 ? 'eski' : 'yeni'}</span>
            </div>
            <div className="p-5 text-[13px] leading-relaxed space-y-3">
              <div className="font-mono text-[11px] text-ink-muted">MADDE 6 — Kira Artışı</div>
              <p style={idx === 0
                ? { background: 'color-mix(in srgb,var(--danger) 15%,transparent)', padding: '2px 4px' }
                : { background: 'color-mix(in srgb,var(--success) 15%,transparent)', padding: '2px 4px' }}>
                {idx === 0
                  ? 'Kira bedeli her yıl TÜFE oranında artırılır.'
                  : "Kira bedeli her yıl TÜFE oranında artırılır, ancak %25'i geçemez."}
              </p>
              <div className="font-mono text-[11px] text-ink-muted mt-4">MADDE 11 — Depozito İadesi</div>
              <p style={idx === 0
                ? { background: 'color-mix(in srgb,var(--danger) 15%,transparent)', padding: '2px 4px' }
                : { background: 'color-mix(in srgb,var(--success) 15%,transparent)', padding: '2px 4px' }}>
                {idx === 0
                  ? 'Sözleşme sona erdiğinde 60 gün içinde iade edilir.'
                  : 'Sözleşme sona erdiğinde 30 gün içinde iade edilir.'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="label mb-4">Önemli Farklar</div>
        <div className="space-y-3">
          {[
            { md: 'Madde 6',  title: 'Kira artış tavanı eklendi',  note: '%25 sınır, kiracı lehine', tone: 'good' },
            { md: 'Madde 11', title: 'Depozito iade süresi kısaldı', note: '60 gün → 30 gün',         tone: 'good' },
            { md: 'Madde 14', title: 'Cezai şart kaldırıldı',       note: 'Kiraya veren aleyhine',    tone: 'warn' },
            { md: 'Madde 17', title: 'Tebligat adresi güncellendi', note: 'Yapısal değişiklik',       tone: 'info' },
          ].map((d, i) => (
            <div key={i} className="flex items-start gap-4 py-3 hairline-b last:border-b-0">
              <span className="font-mono text-[11px] text-ink-muted w-16 pt-0.5">{d.md}</span>
              <div className="flex-1">
                <div className="text-sm">{d.title}</div>
                <div className="text-[12px] text-ink-muted">{d.note}</div>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: d.tone === 'good' ? 'color-mix(in srgb,var(--success) 15%,transparent)'
                    : d.tone === 'warn' ? 'color-mix(in srgb,var(--warn) 15%,transparent)'
                    : 'var(--accent-soft)',
                  color: d.tone === 'good' ? 'var(--success)'
                    : d.tone === 'warn' ? 'var(--warn)'
                    : 'var(--accent)',
                }}
              >
                {d.tone === 'good' ? 'Lehine' : d.tone === 'warn' ? 'Aleyhine' : 'Bilgi'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function KarsilastirmaSayfasi() {
  const [f1, setF1] = useState(null);
  const [f2, setF2] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);

  const run = () => {
    if (!f1 || !f2) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setAnalyzed(true); }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      <SectionHeader
        eyebrow="Belge Karşılaştırma"
        title="İki belgeyi yükleyin, farkları dakikalar içinde görün."
        sub="Sözleşme revizyonları, iki teklif, taslak ve son versiyon — Hak-Bul yapısal farklılıkları ve hukuki önemi birlikte raporlar."
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <DropZone label="1. Belge" file={f1} setFile={setF1} />
        <DropZone label="2. Belge" file={f2} setFile={setF2} />
      </div>

      <div className="card p-5 mb-8">
        <div className="label mb-2">Karşılaştırma sorusu (opsiyonel)</div>
        <textarea
          rows={2}
          placeholder="Örn. Feshe ilişkin madde değişmiş mi? Kira artış oranı nasıl değişmiş?"
          className="w-full bg-transparent text-sm resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-ink-faint">Boş bırakırsanız varsayılan analiz yapılır.</span>
          <button onClick={run} disabled={!f1 || !f2 || loading} className="btn btn-primary">
            {loading ? (
              <><span className="dot" /><span className="dot" /><span className="dot" /> Analiz ediliyor…</>
            ) : (
              <><Icon name="git-compare" size={15} /> Analiz Et</>
            )}
          </button>
        </div>
      </div>

      {analyzed && <CompareResult f1={f1} f2={f2} />}
    </div>
  );
}
