import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon, SectionHeader } from '../components/ui';
import { useDil } from '../context/useDil';
import { dokumanKarsilastirAPI } from '../api/client';
import { buildCompareRequest, pickFirstPdfFile, shouldClearCompareResult } from '../utils/compareFlow';

function formatFileSize(size) {
  if (!size && size !== 0) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DropZone({ label, file, setFile, t }) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef(null);

  const handleSelectedFiles = (fileList) => {
    const fileObject = pickFirstPdfFile(fileList);
    if (fileObject) {
      setFile(fileObject);
    }
  };

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(event) => {
        event.preventDefault();
        setHover(false);
        handleSelectedFiles(event.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={'card p-8 h-48 flex flex-col items-center justify-center text-center cursor-pointer transition ' + (hover ? 'border-accent' : '')}
      style={hover
        ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' }
        : file ? { background: 'var(--surface-muted)' } : {}}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => handleSelectedFiles(event.target.files)}
      />
      <div className="label mb-2">{label}</div>
      {file ? (
        <>
          <Icon name="file-text" size={28} className="mb-2 text-accent" />
          <div className="text-sm font-medium">{file.name}</div>
          <div className="text-xs text-ink-muted mt-0.5">{formatFileSize(file.size)}</div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setFile(null);
            }}
            className="mt-2 text-xs text-ink-muted underline"
          >
            {t('removeFile')}
          </button>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ background: 'var(--surface)' }}>
            <Icon name="upload-cloud" size={18} className="text-ink-muted" />
          </div>
          <div className="text-sm">{t('dragPdfPrefix')} <span className="underline">{t('dragPdfClick')}</span></div>
          <div className="text-[11px] text-ink-faint mt-1">{t('maxFileSize')}</div>
        </>
      )}
    </div>
  );
}

function CompareResult({ file1, file2, result, t }) {
  return (
    <div className="fade-in space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="sparkles" size={15} className="text-accent" />
          <span className="label">{t('compareAiSummary')}</span>
        </div>
        <div className="prose prose-sm max-w-none text-ink-soft">
          <ReactMarkdown>{result.yanit}</ReactMarkdown>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { file: file1, summary: result.belge1_ozet, label: t('documentOne') },
          { file: file2, summary: result.belge2_ozet, label: t('documentTwo') },
        ].map((item) => (
          <div key={item.label} className="card overflow-hidden">
            <div className="hairline-b px-4 py-2.5 flex items-center justify-between bg-surface-muted">
              <div className="text-sm font-medium font-mono">{item.file.name}</div>
              <span className="label">{item.label}</span>
            </div>
            <div className="p-5 text-[13px] leading-relaxed text-ink-soft">
              {item.summary}
            </div>
          </div>
        ))}
      </div>

      {result.kaynaklar?.length > 0 && (
        <div className="card p-6">
          <div className="label mb-4">{t('kaynaklar')}</div>
          <div className="space-y-3">
            {result.kaynaklar.map((kaynak, index) => (
              <div key={`${kaynak.id || kaynak.baslik}-${index}`} className="py-3 hairline-b last:border-b-0">
                <div className="text-sm font-medium">{kaynak.baslik}</div>
                <div className="text-[12px] text-ink-muted mt-1">{kaynak.metin_ozet}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.uyari && (
        <div className="card p-5 text-sm" style={{ color: 'var(--warn)' }}>
          {result.uyari}
        </div>
      )}
    </div>
  );
}

export default function KarsilastirmaSayfasi() {
  const { dil, t } = useDil();
  const [f1, setF1] = useState(null);
  const [f2, setF2] = useState(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetFile1 = (nextFile) => {
    setF1((previousFile) => {
      if (shouldClearCompareResult({ previousFile, nextFile })) {
        setResult(null);
      }
      return nextFile;
    });
  };

  const handleSetFile2 = (nextFile) => {
    setF2((previousFile) => {
      if (shouldClearCompareResult({ previousFile, nextFile })) {
        setResult(null);
      }
      return nextFile;
    });
  };

  const run = async () => {
    if (!f1 || !f2) return;

    setLoading(true);
    setError('');

    try {
      const payload = buildCompareRequest({
        file1: f1,
        file2: f2,
        question,
        language: dil,
      });
      const response = await dokumanKarsilastirAPI(payload);
      setResult(response);
    } catch (compareError) {
      setError(compareError?.response?.data?.detail || compareError.message || t('compareFailed'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      <SectionHeader
        eyebrow={t('compareTitle')}
        title={t('compareHeroTitle')}
        sub={t('compareHeroSubtitle')}
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <DropZone label={t('documentOne')} file={f1} setFile={handleSetFile1} t={t} />
        <DropZone label={t('documentTwo')} file={f2} setFile={handleSetFile2} t={t} />
      </div>

      <div className="card p-5 mb-8">
        <div className="label mb-2">{t('compareQuestionOptional')}</div>
        <textarea
          rows={2}
          placeholder={t('compareQuestionExample')}
          className="w-full bg-transparent text-sm resize-none"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-ink-faint">{t('compareDefaultHint')}</span>
          <button onClick={run} disabled={!f1 || !f2 || loading} className="btn btn-primary">
            {loading ? (
              <><span className="dot" /><span className="dot" /><span className="dot" /> {t('compareAnalyzing')}</>
            ) : (
              <><Icon name="git-compare" size={15} /> {t('compareAnalyze')}</>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>

      {result && f1 && f2 && <CompareResult file1={f1} file2={f2} result={result} t={t} />}
    </div>
  );
}
