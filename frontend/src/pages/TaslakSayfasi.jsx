import { useEffect, useMemo, useState } from 'react';
import { Field, FieldArea, Icon, SectionHeader } from '../components/ui';
import { useDil } from '../context/useDil';
import { taslakListesiAPI, taslakPdfUretAPI } from '../api/client';
import {
  buildTemplateDownloadName,
  buildTemplateFieldState,
  buildTemplatePayload,
} from '../utils/templateFlow';

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isLongField(field) {
  return /adres|metin|gerekce|talep|kapsam|konu/i.test(field.ad);
}

export default function TaslakSayfasi({ toast }) {
  const { dil } = useDil();
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastDownloaded, setLastDownloaded] = useState('');

  useEffect(() => {
    let active = true;

    const loadTemplates = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await taslakListesiAPI(dil);
        const nextTemplates = response.taslaklar || response || [];
        if (!active) return;

        setTemplates(nextTemplates);
        if (nextTemplates[0]) {
          setSelectedId(nextTemplates[0].id);
          setFieldValues(buildTemplateFieldState(nextTemplates[0]));
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.response?.data?.detail || loadError.message || 'Taslak listesi yüklenemedi.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      active = false;
    };
  }, [dil]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) || null,
    [selectedId, templates],
  );

  const handleTemplateSelect = (template) => {
    setSelectedId(template.id);
    setFieldValues(buildTemplateFieldState(template));
    setLastDownloaded('');
    setError('');
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = buildTemplatePayload({ fields: fieldValues });
      const blob = await taslakPdfUretAPI(selectedTemplate.id, payload, dil);
      const fileName = buildTemplateDownloadName(selectedTemplate.id);
      downloadBlob(blob, fileName);
      setLastDownloaded(fileName);
      toast?.('PDF oluşturuldu ve indirildi.');
    } catch (generateError) {
      const detail = generateError?.response?.data?.detail || generateError.message || 'PDF oluşturulamadı.';
      setError(detail);
      toast?.(detail, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      <SectionHeader
        eyebrow="Belge Taslakları"
        title="Hukuki belgenizi gerçek şablonlarla hazırlayın"
        sub="Taslak listesi ve PDF üretimi doğrudan backend template API sözleşmesiyle çalışır."
        actions={(
          <button
            className="btn btn-outline"
            onClick={() => toast?.('Özel şablonlar henüz ürün akışına eklenmedi.', 'info')}
          >
            <Icon name="plus" size={14} /> Özel Şablon
          </button>
        )}
      />

      {loading && (
        <div className="card p-4 text-sm text-ink-muted mb-6">
          Taslaklar yükleniyor…
        </div>
      )}

      {!loading && error && !selectedTemplate && (
        <div className="card p-4 text-sm mb-6" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-5">
            <div className="card p-5">
              <div className="label mb-4">Mevcut Taslaklar · {templates.length}</div>
              <div className="space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full card p-4 text-left hover:border-line-strong transition"
                    style={selectedTemplate?.id === template.id
                      ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)' }
                      : {}}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-[24px] leading-tight mb-1" style={{ letterSpacing: '-0.01em' }}>
                          {template.baslik}
                        </div>
                        <div className="text-[13px] text-ink-muted leading-relaxed">{template.aciklama}</div>
                      </div>
                      <span className="chip text-[10px] py-0.5 px-1.5">{template.alanlar.length} alan</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            {selectedTemplate ? (
              <div className="card p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <div className="label">Seçili Taslak</div>
                    <div className="font-display text-[30px] mt-1" style={{ letterSpacing: '-0.02em' }}>
                      {selectedTemplate.baslik}
                    </div>
                    <p className="text-sm text-ink-muted mt-2 max-w-2xl">{selectedTemplate.aciklama}</p>
                  </div>
                  <span className="chip text-[11px] py-1 px-2">{selectedTemplate.alanlar.length} alan</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTemplate.alanlar.map((field) => (
                    <div key={field.ad} className={isLongField(field) ? 'md:col-span-2' : ''}>
                      {isLongField(field) ? (
                        <FieldArea
                          label={`${field.etiket}${field.zorunlu ? ' *' : ''}`}
                          ph={field.etiket}
                          rows={4}
                          value={fieldValues[field.ad] || ''}
                          onChange={(event) => setFieldValues((current) => ({ ...current, [field.ad]: event.target.value }))}
                        />
                      ) : (
                        <Field
                          label={`${field.etiket}${field.zorunlu ? ' *' : ''}`}
                          ph={field.etiket}
                          value={fieldValues[field.ad] || ''}
                          onChange={(event) => setFieldValues((current) => ({ ...current, [field.ad]: event.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-4 rounded-lg text-sm" style={{ background: 'var(--surface-muted)' }}>
                  PDF doğrudan backend tarafından üretilir ve cihazınıza indirilir. Boş bırakılan zorunlu alanlar
                  backend doğrulamasında hata döndürür.
                </div>

                {error && (
                  <div className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
                    {error}
                  </div>
                )}

                {lastDownloaded && (
                  <div className="mt-4 text-sm" style={{ color: 'var(--success)' }}>
                    Son indirilen dosya: <strong>{lastDownloaded}</strong>
                  </div>
                )}

                <div className="hairline-t mt-6 pt-5 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setFieldValues(buildTemplateFieldState(selectedTemplate))}
                    className="btn btn-ghost"
                  >
                    Formu Temizle
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting ? (
                      <><span className="dot" /><span className="dot" /><span className="dot" /> PDF oluşturuluyor…</>
                    ) : (
                      <><Icon name="file-down" size={15} /> PDF Oluştur</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card p-10 text-center" style={{ background: 'var(--surface-muted)' }}>
                <div
                  className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'var(--surface)', color: 'var(--ink-muted)' }}
                >
                  <Icon name="file-text" size={20} />
                </div>
                <div className="font-display text-[22px] mb-1">Kullanılabilir bir taslak bulunamadı</div>
                <div className="text-[13px] text-ink-muted max-w-xs mx-auto">
                  Backend template servisi yanıt vermediğinde taslak formu burada görünür.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
