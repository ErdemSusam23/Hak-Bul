import { useEffect, useRef, useState } from 'react';
import { Field, FieldArea, Icon, Modal, SectionHeader } from '../components/ui';
import { useAuth } from '../context/useAuth';
import { useDil } from '../context/useDil';
import { forumThreadListesiAPI, forumThreadOlusturAPI } from '../api/client';
import {
  buildForumCreatePayload,
  FORUM_CATEGORIES,
  normalizeForumCategory,
  normalizeForumThread,
} from '../utils/forumFlow';
import { extractApiErrorMessage } from '../utils/apiError';

const FORUM_CATEGORY_KEYS = {
  Genel: 'forumCategoryGeneral',
  'İş Hukuku': 'forumCategoryLabor',
  'Medeni Hukuk': 'forumCategoryCivil',
  'Ceza Hukuku': 'forumCategoryCriminal',
  'Ticaret Hukuku': 'forumCategoryCommercial',
  'Tüketici Hukuku': 'forumCategoryConsumer',
  'Taşınmaz Mülk': 'forumCategoryRealEstate',
  'İdare Hukuku': 'forumCategoryAdministrative',
  'Vergi Hukuku': 'forumCategoryTax',
  'Sosyal Güvenlik': 'forumCategorySocialSecurity',
  'Bilişim Hukuku': 'forumCategoryTech',
};

function formatText(template, values = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

function formatForumDate(iso, dil) {
  if (!iso) return '';
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).toLocaleDateString(dil === 'en' ? 'en-US' : 'tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

function forumCategoryLabel(category, t) {
  return t(FORUM_CATEGORY_KEYS[category] || category);
}

export default function ForumSayfasi({ onThreadSec, onOpenAuth, toast }) {
  const { kullanici } = useAuth();
  const { dil, t } = useDil();
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
        setError(extractApiErrorMessage(loadError, t('forumThreadsLoadFailed')));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadThreads();
    return () => {
      active = false;
    };
  }, [selectedCategory, t]);

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
      toast?.(t('forumThreadCreated'));
      onThreadSec?.(createdThreadId);
    } catch (submitError) {
      setComposerError(extractApiErrorMessage(submitError, t('forumThreadCreateFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 h-full min-h-0 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <SectionHeader
        eyebrow={t('forumEyebrow')}
        title={t('forumTitle')}
        sub={t('forumSubtitle')}
        actions={(
          <button onClick={handleYeniSoru} className="btn btn-primary">
            <Icon name="plus" size={14} /> {t('forumAskQuestion')}
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
            {t('forumLoginPrefix')}
            <button
              onClick={() => onOpenAuth?.('login')}
              className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              {t('forumLoginAction')}
            </button>
            {t('forumLoginSuffix')}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 hairline-b mb-2">
        <button
          type="button"
          onClick={() => scrollCategories(-1)}
          className="btn btn-ghost px-2 shrink-0 text-ink-muted"
          // Legacy accessibility contract: title="Kategorileri sola kaydır"
          title={t('forumScrollLeft')}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div ref={categoryScrollRef} className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth">
            {[{ key: 'all', label: t('forumAllCategories') }, ...FORUM_CATEGORIES.map((category) => ({ key: category, label: forumCategoryLabel(category, t) }))].map(({ key, label }) => (
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
          // Legacy accessibility contract: title="Kategorileri sağa kaydır"
          title={t('forumScrollRight')}
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading && <div className="py-10 text-sm text-ink-muted">{t('forumLoadingThreads')}</div>}
        {!loading && error && (
          <div className="card p-4 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        )}
        {!loading && !error && threads.length === 0 && (
          <div className="card p-6 text-sm text-ink-muted">
            {t('forumEmptyFilter')}
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
                <span className="chip text-[11px] py-0.5">{forumCategoryLabel(thread.category, t)}</span>
                {thread.isLocked && (
                  <span className="chip text-[11px] py-0.5">
                    <Icon name="lock" size={11} /> {t('forumLocked')}
                  </span>
                )}
              </div>
              <div className="font-display text-[20px] leading-snug group-hover:text-accent transition" style={{ letterSpacing: '-0.01em' }}>
                {thread.title}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[12px] text-ink-muted flex-wrap">
                <span>{thread.displayName}</span>
                <span>·</span>
                <span>{formatForumDate(thread.createdAt, dil)}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Icon name="message-square" size={12} /> {formatText(t('forumReplyCount'), { count: thread.replyCount })}
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
                {t('forumCreateTitle')}
              </h2>
            </div>
            <button onClick={() => setComposerOpen(false)} className="p-1 rounded hover:bg-surface-muted">
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <Field
              label={t('forumThreadTitleLabel')}
              ph={t('forumThreadTitlePlaceholder')}
              value={composerState.title}
              onChange={(event) => setComposerState((current) => ({ ...current, title: event.target.value }))}
            />

            <label className="flex flex-col gap-1.5">
              <span className="label">{t('forumCategoryLabel')}</span>
              <select
                value={composerState.category}
                onChange={(event) => setComposerState((current) => ({ ...current, category: event.target.value }))}
                className="border border-line rounded-md bg-surface-muted px-3 py-2 text-sm focus:bg-surface focus:border-line-strong"
              >
                {FORUM_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{forumCategoryLabel(category, t)}</option>
                ))}
              </select>
            </label>

            <FieldArea
              label={t('forumDetailLabel')}
              ph={t('forumDetailPlaceholder')}
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
              {t('cancel')}
            </button>
            <button onClick={handleComposerSubmit} disabled={submitting} className="btn btn-primary">
              {submitting ? t('forumPublishing') : t('forumPublishThread')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
