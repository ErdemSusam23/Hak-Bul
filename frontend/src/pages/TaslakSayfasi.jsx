import { useEffect, useMemo, useState } from 'react';
import { Field, FieldArea, Icon, SectionHeader } from '../components/ui';
import { useDil } from '../context/useDil';
import { taslakListesiAPI, taslakPdfUretAPI } from '../api/client';
import {
  buildTemplateDownloadName,
  buildTemplateFieldState,
  buildTemplatePayload,
  getMissingRequiredTemplateFields,
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
  const { dil, t } = useDil();
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastDownloaded, setLastDownloaded] = useState('');
  const [missingFields, setMissingFields] = useState([]);
  const [clearPending, setClearPending] = useState(false);

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
        setError(loadError?.response?.data?.detail || loadError.message || t('templatesLoadFailed'));
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
  }, [dil, t]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) || null,
    [selectedId, templates],
  );

  const handleTemplateSelect = (template) => {
    setSelectedId(template.id);
    setFieldValues(buildTemplateFieldState(template));
    setLastDownloaded('');
    setMissingFields([]);
    setError('');
    setClearPending(false);
  };

  const handleFieldChange = (field, value) => {
    setFieldValues((current) => ({ ...current, [field.ad]: value }));
    setMissingFields((current) => current.filter((item) => item !== (field.etiket || field.ad)));
    setClearPending(false);
  };

  const handleClearForm = () => {
    if (!selectedTemplate) return;

    if (!clearPending) {
      setClearPending(true);
      return;
    }

    setFieldValues(buildTemplateFieldState(selectedTemplate));
    setMissingFields([]);
    setError('');
    setLastDownloaded('');
    setClearPending(false);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setClearPending(false);
    const nextMissingFields = getMissingRequiredTemplateFields(selectedTemplate, fieldValues);
    if (nextMissingFields.length) {
      const detail = `${t('templatesFillRequiredFields')} ${nextMissingFields.join(', ')}`;
      setMissingFields(nextMissingFields);
      setError(detail);
      toast?.(detail, 'error');
      return;
    }

    setSubmitting(true);
    setError('');
    setMissingFields([]);

    try {
      const payload = buildTemplatePayload({ fields: fieldValues });
      const blob = await taslakPdfUretAPI(selectedTemplate.id, payload, dil);
      const fileName = buildTemplateDownloadName(selectedTemplate.id);
      downloadBlob(blob, fileName);
      setLastDownloaded(fileName);
      toast?.(t('templatesPdfDownloaded'));
    } catch (generateError) {
      const detail = generateError?.response?.data?.detail || generateError.message || t('templatesPdfFailed');
      setError(detail);
      toast?.(detail, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      <SectionHeader
        eyebrow={t('templatesTitle')}
        title={t('templatesHeroTitle')}
        sub={t('templatesHeroSubtitle')}
      />

      {loading && (
        <div className="card p-4 text-sm text-ink-muted mb-6">
          {t('templatesLoading')}
        </div>
      )}

      {!loading && error && !selectedTemplate && (
        <div className="card p-4 text-sm mb-6" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-5">
            <div className="card p-5">
              <div className="label mb-4">{t('templatesAvailable')} · {templates.length}</div>
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
                      <span className="chip text-[10px] py-0.5 px-1.5">{template.alanlar.length} {t('templatesFieldCount')}</span>
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
                    <div className="label">{t('templatesSelected')}</div>
                    <div className="font-display text-[30px] mt-1" style={{ letterSpacing: '-0.02em' }}>
                      {selectedTemplate.baslik}
                    </div>
                    <p className="text-sm text-ink-muted mt-2 max-w-2xl">{selectedTemplate.aciklama}</p>
                  </div>
                  <span className="chip text-[11px] py-1 px-2">{selectedTemplate.alanlar.length} {t('templatesFieldCount')}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTemplate.alanlar.map((field) => {
                    const isMissing = missingFields.includes(field.etiket || field.ad);
                    const fieldLabel = `${field.etiket}${field.zorunlu ? ' *' : ''}`;
                    const fieldClassName = isMissing ? 'border-[var(--danger)]' : '';

                    return (
                      <div key={field.ad} className={isLongField(field) ? 'md:col-span-2' : ''}>
                        {isLongField(field) ? (
                          <FieldArea
                            label={fieldLabel}
                            ph={field.etiket}
                            rows={4}
                            value={fieldValues[field.ad] || ''}
                            onChange={(event) => handleFieldChange(field, event.target.value)}
                            className={fieldClassName}
                          />
                        ) : (
                          <Field
                            label={fieldLabel}
                            ph={field.etiket}
                            value={fieldValues[field.ad] || ''}
                            onChange={(event) => handleFieldChange(field, event.target.value)}
                            className={fieldClassName}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 p-4 rounded-lg text-sm" style={{ background: 'var(--surface-muted)' }}>
                  {t('templatesBackendNotice')}
                </div>

                {error && (
                  <div className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
                    {error}
                  </div>
                )}

                {lastDownloaded && (
                  <div className="mt-4 text-sm" style={{ color: 'var(--success)' }}>
                    {t('templatesLastDownloaded')} <strong>{lastDownloaded}</strong>
                  </div>
                )}

                <div className="hairline-t mt-6 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <button
                    onClick={handleClearForm}
                    className="btn btn-ghost"
                    style={clearPending ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}}
                  >
                    {clearPending ? t('templatesConfirmClear') : t('templatesClearForm')}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={submitting}
                    className="btn btn-primary sm:ml-auto"
                  >
                    {submitting ? (
                      <><span className="dot" /><span className="dot" /><span className="dot" /> {t('templatesCreatingPdf')}</>
                    ) : (
                      <><Icon name="file-down" size={15} /> {t('templatesCreatePdf')}</>
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
                <div className="font-display text-[22px] mb-1">{t('templatesNoneAvailable')}</div>
                <div className="text-[13px] text-ink-muted max-w-xs mx-auto">
                  {t('templatesNoneHint')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
