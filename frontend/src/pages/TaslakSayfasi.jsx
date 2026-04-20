import { useState } from 'react';
import { Icon, SectionHeader, Field, FieldArea } from '../components/ui';
import { templates } from '../data/mockData';

export default function TaslakSayfasi() {
  const [selected, setSelected] = useState(null);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const startGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      <SectionHeader
        eyebrow="Belge Taslakları"
        title="Hukuki belgenizi dakikalar içinde hazırlayın"
        sub="Profesyonel avukatlar tarafından hazırlanmış şablonlarla, alanları doldurarak anında PDF elde edin."
        actions={
          <button className="btn btn-outline">
            <Icon name="plus" size={14} /> Özel Şablon
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Template grid */}
        <div className="col-span-12 lg:col-span-7">
          <div className="label mb-4">Mevcut Taslaklar · {templates.length}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setGenerated(false); }}
                className="card p-5 text-left hover:border-line-strong transition group relative"
                style={selected?.id === t.id
                  ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)' }
                  : {}}
              >
                {t.popular && (
                  <span
                    className="absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--highlight)', color: '#fff' }}
                  >
                    POPÜLER
                  </span>
                )}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Icon name={t.icon} size={18} />
                </div>
                <div className="font-display text-[22px] leading-tight mb-1" style={{ letterSpacing: '-0.01em' }}>
                  {t.name}
                </div>
                <div className="text-[13px] text-ink-muted leading-relaxed">{t.desc}</div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-ink-faint">
                  <span className="font-mono">{t.fields} alan</span>
                  <span className="flex items-center gap-1 group-hover:text-ink-soft">
                    Oluştur <Icon name="arrow-right" size={11} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="col-span-12 lg:col-span-5">
          <div className="sticky top-20">
            {selected ? (
              <div className="card p-6 slide-in">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="label">Şablon</div>
                    <div className="font-display text-[26px] mt-1" style={{ letterSpacing: '-0.01em' }}>
                      {selected.name}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded hover:bg-surface-muted">
                    <Icon name="x" size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-3.5 text-sm">
                  {selected.id === 't1' && (
                    <>
                      <Field label="Kiraya veren" ph="Mehmet Yılmaz" />
                      <Field label="Kiracı" ph="Ayşe Kaya" />
                      <Field label="Taşınmaz adresi" ph="Cumhuriyet Cad. No:14/5, Çankaya/Ankara" />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Aylık kira" ph="25.000" suffix="₺" />
                        <Field label="Depozito" ph="50.000" suffix="₺" />
                      </div>
                      <Field label="Başlangıç tarihi" ph="01.05.2026" type="date" />
                      <Field label="Süre (ay)" ph="12" type="number" />
                    </>
                  )}
                  {selected.id === 't3' && (
                    <>
                      <Field label="İhtar eden" ph="Ad Soyad" />
                      <Field label="İhtar edilen" ph="Ad Soyad" />
                      <Field label="Konu" ph="Ödenmemiş kira bedeli" />
                      <FieldArea label="İhtarın esası" ph="Ödenmesi gereken meblağ ve dayanak…" />
                      <Field label="Tanınan süre (gün)" ph="30" type="number" />
                    </>
                  )}
                  {selected.id !== 't1' && selected.id !== 't3' && (
                    <div className="p-8 rounded-lg placeholder-stripe text-center text-[12px] text-ink-muted font-mono">
                      [ {selected.fields} alanlı form ]
                    </div>
                  )}
                </div>

                <div className="hairline-t mt-5 pt-5 flex items-center gap-3">
                  <button
                    onClick={startGenerate}
                    disabled={generating}
                    className="btn btn-primary flex-1 justify-center py-2.5"
                  >
                    {generating ? (
                      <><span className="dot" /><span className="dot" /><span className="dot" /> Hazırlanıyor…</>
                    ) : (
                      <><Icon name="file-down" size={15} /> PDF Oluştur</>
                    )}
                  </button>
                  <button className="btn btn-outline"><Icon name="eye" size={14} /> Önizle</button>
                </div>

                {generated && (
                  <div
                    className="mt-4 p-4 rounded-lg flex items-center gap-3 fade-in"
                    style={{
                      background: 'color-mix(in srgb,var(--success) 10%,var(--surface))',
                      border: '1px solid color-mix(in srgb,var(--success) 25%,var(--line))',
                    }}
                  >
                    <Icon name="file-check-2" size={20} style={{ color: 'var(--success)' }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Belgeniz hazır</div>
                      <div className="text-xs text-ink-muted">
                        {selected.name.toLowerCase().replace(' ', '-')}-{Date.now().toString().slice(-4)}.pdf · 42 KB
                      </div>
                    </div>
                    <button className="btn btn-outline text-xs"><Icon name="download" size={13} /> İndir</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-10 text-center" style={{ background: 'var(--surface-muted)' }}>
                <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'var(--surface)', color: 'var(--ink-muted)' }}>
                  <Icon name="file-text" size={20} />
                </div>
                <div className="font-display text-[22px] mb-1">Soldan bir taslak seçiniz</div>
                <div className="text-[13px] text-ink-muted max-w-xs mx-auto">
                  Alanları doldurarak profesyonel hukuki belgenizi anında PDF olarak oluşturabilirsiniz.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
