import { useEffect, useRef, useState } from 'react';
import { Field, FieldArea, Icon, Modal, SectionHeader } from '../components/ui';
import { useAuth } from '../context/useAuth';
import { forumThreadListesiAPI, forumThreadOlusturAPI } from '../api/client';
import {
  buildForumCreatePayload,
  FORUM_CATEGORIES,
  normalizeForumCategory,
  normalizeForumThread,
} from '../utils/forumFlow';
import { extractApiErrorMessage } from '../utils/apiError';

function formatForumDate(iso) {
  if (!iso) return '';
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

export default function ForumSayfasi({ onThreadSec, onOpenAuth, toast }) {
  const { kullanici } = useAuth();
  const categoryScrollRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerState, setComposerState] = useState({
    title: '',
    category: 'Genel',
    content: '',
  });
  const [composerError, setComposerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadThreads = async () => {
      setLoading(true);
      setError('');
      try {
        const normalizedCategory = normalizeForumCategory(selectedCategory);
        const categoryParam = selectedCategory === 'all'
          ? null
          : (FORUM_CATEGORIES.includes(normalizedCategory) ? normalizedCategory : null);
        const response = await forumThreadListesiAPI({
          category: categoryParam,
          page: 1,
          size: 20,
        });
        if (!active) return;
        setThreads((response.threads || []).map(normalizeForumThread));
      } catch (loadError) {
        if (!active) return;
        setError(extractApiErrorMessage(loadError, 'Forum başlıkları yüklenemedi. Lütfen tekrar deneyin.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadThreads();
    return () => {
      active = false;
    };
  }, [selectedCategory]);

  const handleYeniSoru = () => {
    if (!kullanici) {
      onOpenAuth?.('login');
      return;
    }
    setComposerOpen(true);
  };

  const scrollCategories = (direction) => {
    categoryScrollRef.current?.scrollBy({ left: direction * 240, behavior: 'smooth' });
  };

  const handleComposerSubmit = async () => {
    setComposerError('');
    setSubmitting(true);
    try {
      const payload = buildForumCreatePayload(composerState);
      const createdThread = await forumThreadOlusturAPI(payload);
      const createdThreadId = createdThread?.id;
      if (!createdThreadId) {
        throw new Error('Thread response invalid');
      }
      setComposerOpen(false);
      setComposerState({
        title: '',
        category: 'Genel',
        content: '',
      });
      toast?.('Forum başlığı oluşturuldu.');
      onThreadSec?.(createdThreadId);
    } catch (submitError) {
      setComposerError(extractApiErrorMessage(submitError, 'Başlık oluşturulamadı.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 h-full min-h-0 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <SectionHeader
        eyebrow="Topluluk"
        title="Hukuki Forum"
        sub="Soru sorun, deneyim paylaşın. Detay sayfaları gerçek forum API akışıyla çalışır."
        actions={(
          <button onClick={handleYeniSoru} className="btn btn-primary">
            <Icon name="plus" size={14} /> Yeni Soru Sor
          </button>
        )}
      />

      {!kullanici && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm"
          style={{ background: 'color-mix(in srgb,var(--accent) 8%,var(--surface))', border: '1px solid color-mix(in srgb,var(--accent) 20%,var(--line))' }}
        >
          <Icon name="info" size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--ink-soft)' }}>
            Soru sormak veya yorum yapmak için{' '}
            <button
              onClick={() => onOpenAuth?.('login')}
              className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              giriş yapın
            </button>
            . Göz atmak için giriş gerekmez.
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 hairline-b mb-2">
        <button
          type="button"
          onClick={() => scrollCategories(-1)}
          className="btn btn-ghost px-2 shrink-0 text-ink-muted"
          title="Kategorileri sola kaydır"
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div ref={categoryScrollRef} className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth">
            {[{ key: 'all', label: 'Tümü' }, ...FORUM_CATEGORIES.map((category) => ({ key: category, label: category }))].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={'px-4 py-2.5 text-sm -mb-px border-b-2 transition whitespace-nowrap shrink-0 ' +
                  (selectedCategory === key ? 'text-ink' : 'text-ink-muted border-transparent hover:text-ink')}
                style={selectedCategory === key ? { borderColor: 'var(--accent)' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => scrollCategories(1)}
          className="btn btn-ghost px-2 shrink-0 text-ink-muted"
          title="Kategorileri sağa kaydır"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading && <div className="py-10 text-sm text-ink-muted">Forum başlıkları yükleniyor…</div>}
        {!loading && error && (
          <div className="card p-4 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        )}
        {!loading && !error && threads.length === 0 && (
          <div className="card p-6 text-sm text-ink-muted">
            Bu filtre için henüz forum başlığı yok.
          </div>
        )}
        {!loading && !error && threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onThreadSec?.(thread.id)}
            className="group w-full text-left flex items-start gap-4 py-5 hairline-b hover:bg-surface-muted px-4 -mx-4 transition"
          >
            <div className="flex flex-col items-center gap-0.5 pt-1 w-12 shrink-0">
              <Icon name="chevron-up" size={16} className="text-ink-muted" />
              <span className="text-sm font-medium font-mono">{thread.voteScore}</span>
              <Icon name="message-square" size={14} className="text-ink-faint mt-1" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="chip text-[11px] py-0.5">{thread.category}</span>
                {thread.isLocked && (
                  <span className="chip text-[11px] py-0.5">
                    <Icon name="lock" size={11} /> Kilitli
                  </span>
                )}
              </div>
              <div className="font-display text-[20px] leading-snug group-hover:text-accent transition" style={{ letterSpacing: '-0.01em' }}>
                {thread.title}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[12px] text-ink-muted flex-wrap">
                <span>{thread.displayName}</span>
                <span>·</span>
                <span>{formatForumDate(thread.createdAt)}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Icon name="message-square" size={12} /> {thread.replyCount} yanıt
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Modal open={composerOpen} onClose={() => setComposerOpen(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="label mb-2">Forum</div>
              <h2 className="font-display text-[28px]" style={{ letterSpacing: '-0.02em' }}>
                Yeni Başlık Oluştur
              </h2>
            </div>
            <button onClick={() => setComposerOpen(false)} className="p-1 rounded hover:bg-surface-muted">
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <Field
              label="Başlık"
              ph="Sorunuzu kısa ve açık yazın"
              value={composerState.title}
              onChange={(event) => setComposerState((current) => ({ ...current, title: event.target.value }))}
            />

            <label className="flex flex-col gap-1.5">
              <span className="label">Kategori</span>
              <select
                value={composerState.category}
                onChange={(event) => setComposerState((current) => ({ ...current, category: event.target.value }))}
                className="border border-line rounded-md bg-surface-muted px-3 py-2 text-sm focus:bg-surface focus:border-line-strong"
              >
                {FORUM_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <FieldArea
              label="Detay"
              ph="Durumu, zaman çizelgesini ve ne öğrenmek istediğinizi yazın"
              rows={6}
              value={composerState.content}
              onChange={(event) => setComposerState((current) => ({ ...current, content: event.target.value }))}
            />
          </div>

          {composerError && (
            <div className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
              {composerError}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button onClick={() => setComposerOpen(false)} className="btn btn-ghost">
              Vazgeç
            </button>
            <button onClick={handleComposerSubmit} disabled={submitting} className="btn btn-primary">
              {submitting ? 'Oluşturuluyor…' : 'Başlığı Yayınla'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
