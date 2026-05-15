import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Lock, Unlock, Trash2, CheckCircle, ThumbsUp, ThumbsDown, BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useDil } from '../context/useDil';
import {
  forumThreadDetayAPI,
  forumThreadSilAPI,
  forumThreadKilitleAPI,
  forumYanitOlusturAPI,
  forumYanitSilAPI,
  forumYanitDogrulaAPI,
  forumThreadOyAPI,
  forumReplyOyAPI,
} from '../api/client';
import { togglePendingAction } from '../utils/phase2Flow';

function formatText(template, values = {}) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

function formatDate(iso, dil = 'tr') {
  if (!iso) return '';
  const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
  return new Date(normalized).toLocaleDateString(dil === 'en' ? 'en-US' : 'tr-TR');
}

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

function forumCategoryLabel(category, t) {
  return t(FORUM_CATEGORY_KEYS[category] || category);
}

function OyButonlari({ skor, onOy, disabled, t }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onOy(1)}
        disabled={disabled}
        className="p-1 rounded transition-colors hover:bg-green-500/10 text-ink-muted"
        title={t('forumLike')}
      >
        <ThumbsUp size={14} />
      </button>
      <span className="text-xs font-medium w-6 text-center" style={{ color: skor >= 0 ? 'var(--ink-soft)' : '#f87171' }}>
        {skor}
      </span>
      <button
        onClick={() => onOy(-1)}
        disabled={disabled}
        className="p-1 rounded transition-colors hover:bg-red-500/10 text-ink-muted"
        title={t('forumDislike')}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}

export default function ForumBaslikSayfasi({ threadId, onGeri, toast }) {
  const { kullanici } = useAuth();
  const { dil, t } = useDil();
  const [detay, setDetay] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yanitMetin, setYanitMetin] = useState('');
  const [yanitGonderiliyor, setYanitGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [threadSilOnayli, setThreadSilOnayli] = useState(false);
  const [yanitSilOnayId, setYanitSilOnayId] = useState(null);

  const isModerator = kullanici?.rol === 'lawyer' || kullanici?.rol === 'admin';

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const data = await forumThreadDetayAPI(threadId);
      setDetay(data);
      setHata('');
    } catch (error) {
      console.error('Thread yuklenemedi:', error);
      setDetay(null);
      setHata(t('forumThreadLoadFailed'));
    } finally {
      setYukleniyor(false);
    }
  }, [threadId, t]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const handleThreadSil = async () => {
    if (!threadSilOnayli) {
      setThreadSilOnayli(true);
      setYanitSilOnayId(null);
      toast?.(t('forumDeleteThreadClickAgain'), 'info');
      return;
    }

    try {
      await forumThreadSilAPI(threadId);
      setThreadSilOnayli(false);
      toast?.(t('forumThreadDeleted'));
      onGeri();
    } catch (error) {
      setHata(error.response?.data?.detail || t('forumThreadDeleteFailed'));
      toast?.(t('forumThreadDeleteFailed'), 'error');
    }
  };

  const handleKilitle = async () => {
    const yeniDurum = !detay.thread.is_locked;
    try {
      const guncellenen = await forumThreadKilitleAPI(threadId, yeniDurum);
      setDetay((prev) => ({ ...prev, thread: guncellenen }));
      setThreadSilOnayli(false);
      setYanitSilOnayId(null);
      toast?.(yeniDurum ? t('forumThreadLocked') : t('forumThreadUnlocked'));
    } catch (error) {
      setHata(error.response?.data?.detail || t('forumActionFailed'));
      toast?.(t('forumThreadUpdateFailed'), 'error');
    }
  };

  const handleYanitGonder = async (event) => {
    event.preventDefault();
    if (!yanitMetin.trim()) return;
    setYanitGonderiliyor(true);
    setHata('');
    try {
      const yeniYanit = await forumYanitOlusturAPI(threadId, yanitMetin.trim());
      setDetay((prev) => ({ ...prev, replies: [...prev.replies, yeniYanit] }));
      setYanitMetin('');
      setThreadSilOnayli(false);
      setYanitSilOnayId(null);
      toast?.(t('forumReplyAdded'));
    } catch (error) {
      setHata(error.response?.data?.detail || t('forumReplySendFailed'));
    } finally {
      setYanitGonderiliyor(false);
    }
  };

  const handleYanitSil = async (replyId) => {
    if (yanitSilOnayId !== replyId) {
      setYanitSilOnayId(togglePendingAction(yanitSilOnayId, replyId));
      setThreadSilOnayli(false);
      toast?.(t('forumDeleteReplyClickAgain'), 'info');
      return;
    }

    try {
      await forumYanitSilAPI(replyId);
      setDetay((prev) => ({ ...prev, replies: prev.replies.filter((reply) => reply.id !== replyId) }));
      setYanitSilOnayId(null);
      toast?.(t('forumReplyDeleted'));
    } catch (error) {
      setHata(error.response?.data?.detail || t('forumReplyDeleteFailed'));
      toast?.(t('forumReplyDeleteFailed'), 'error');
    }
  };

  const handleYanitDogrula = async (replyId, mevcutDurum) => {
    try {
      const guncellenen = await forumYanitDogrulaAPI(replyId, !mevcutDurum);
      setDetay((prev) => ({
        ...prev,
        replies: prev.replies.map((reply) => (reply.id === replyId ? guncellenen : reply)),
      }));
      toast?.(!mevcutDurum ? t('forumReplyVerified') : t('forumReplyUnverified'));
    } catch (error) {
      setHata(error.response?.data?.detail || t('forumActionFailed'));
      toast?.(t('forumReplyVerifyFailed'), 'error');
    }
  };

  const handleThreadOy = async (value) => {
    if (!kullanici) return;
    try {
      const { yeni_skor: yeniSkor } = await forumThreadOyAPI(threadId, value);
      setDetay((prev) => ({ ...prev, thread: { ...prev.thread, vote_score: yeniSkor } }));
    } catch (error) {
      console.error('Oy gonderilemedi:', error);
      toast?.(t('forumVoteFailed'), 'error');
    }
  };

  const handleReplyOy = async (replyId, value) => {
    if (!kullanici) return;
    try {
      const { yeni_skor: yeniSkor } = await forumReplyOyAPI(replyId, value);
      setDetay((prev) => ({
        ...prev,
        replies: prev.replies.map((reply) => (reply.id === replyId ? { ...reply, vote_score: yeniSkor } : reply)),
      }));
    } catch (error) {
      console.error('Oy gonderilemedi:', error);
      toast?.(t('forumVoteFailed'), 'error');
    }
  };

  if (yukleniyor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-ink-muted">{t('forumLoading')}</p>
      </div>
    );
  }

  if (!detay) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-ink-muted">{t('forumThreadNotFound')}</p>
        <button onClick={onGeri} className="text-xs text-accent">← {t('forumBack')}</button>
      </div>
    );
  }

  const { thread, replies } = detay;
  const isOwner = kullanici && kullanici.id === thread.user_id;

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto">
      <button onClick={onGeri} className="flex items-center gap-1 text-sm mb-4 self-start text-ink-muted">
        <ArrowLeft size={14} /> {t('forumBackToForum')}
      </button>

      {hata && (
        <div className="mb-4 card px-4 py-3 text-sm" style={{ color: 'var(--danger)' }}>
          {hata}
        </div>
      )}

      <div className="card p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {forumCategoryLabel(thread.category, t)}
              </span>
              {thread.is_locked && (
                <span className="flex items-center gap-1 text-xs text-ink-muted">
                  <Lock size={12} /> {t('forumLocked')}
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-ink">{thread.title}</h1>
            <p className="text-xs mt-1 text-ink-muted">
              {thread.display_name} · {formatDate(thread.created_at, dil)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <OyButonlari skor={thread.vote_score} onOy={handleThreadOy} disabled={!kullanici} t={t} />
            {isModerator && (
              <button onClick={handleKilitle} className="p-1.5 rounded-lg text-ink-muted" title={thread.is_locked ? t('forumUnlock') : t('forumLock')}>
                {thread.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
              </button>
            )}
            {(isOwner || isModerator) && (
              <button onClick={handleThreadSil} className="p-1.5 rounded-lg hover:text-red-400 text-ink-muted" title={threadSilOnayli ? t('forumConfirmDelete') : t('forumDelete')}>
                {threadSilOnayli ? <CheckCircle size={14} /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">{thread.content}</p>
      </div>

      <h2 className="text-sm font-semibold mb-3 text-ink-muted">
        {formatText(t('forumReplyCountTitle'), { count: replies.length })}
      </h2>

      <div className="flex flex-col gap-3 mb-6">
        {replies.map((reply) => {
          const isReplyOwner = kullanici && kullanici.id === reply.user_id;
          const deleteArmed = yanitSilOnayId === reply.id;
          return (
            <div
              key={reply.id}
              className="rounded-xl p-4"
              style={{
                background: reply.is_verified ? 'rgba(34,197,94,0.08)' : 'var(--surface-muted)',
                border: `1px solid ${reply.is_verified ? 'rgba(34,197,94,0.3)' : 'var(--line)'}`,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-ink-soft">{reply.display_name}</span>
                  {reply.user_role === 'lawyer' && (
                    <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                      <BadgeCheck size={10} /> {t('forumLawyer')}
                    </span>
                  )}
                  {reply.is_verified && (
                    <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                      <CheckCircle size={10} /> {t('forumVerifiedAnswer')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <OyButonlari skor={reply.vote_score} onOy={(value) => handleReplyOy(reply.id, value)} disabled={!kullanici} t={t} />
                  {isModerator && (
                    <button
                      onClick={() => handleYanitDogrula(reply.id, reply.is_verified)}
                      className="p-1 rounded"
                      style={{ color: reply.is_verified ? '#4ade80' : 'var(--ink-muted)' }}
                      title={reply.is_verified ? t('forumUnverify') : t('forumVerify')}
                    >
                      <CheckCircle size={14} />
                    </button>
                  )}
                  {(isReplyOwner || isModerator) && (
                    <button
                      onClick={() => handleYanitSil(reply.id)}
                      className="p-1 rounded hover:text-red-400"
                      style={{ color: deleteArmed ? 'var(--accent)' : 'var(--ink-muted)' }}
                      title={deleteArmed ? t('forumConfirmDelete') : t('forumDelete')}
                    >
                      {deleteArmed ? <CheckCircle size={14} /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">{reply.content}</p>
              <p className="text-xs mt-2 text-ink-faint">
                {formatDate(reply.created_at, dil)}
              </p>
            </div>
          );
        })}
      </div>

      {kullanici && !thread.is_locked && (
        <form onSubmit={handleYanitGonder} className="flex flex-col gap-2">
          <textarea
            className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
            style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--line)', minHeight: '80px' }}
            placeholder={t('forumReplyPlaceholder')}
            value={yanitMetin}
            onChange={(event) => setYanitMetin(event.target.value)}
            required
            minLength={5}
          />
          {hata && <p className="text-xs text-red-400">{hata}</p>}
          <button
            type="submit"
            disabled={yanitGonderiliyor}
            className="btn btn-primary self-end"
            style={{ opacity: yanitGonderiliyor ? 0.7 : 1 }}
          >
            {yanitGonderiliyor ? t('forumReplying') : t('forumReplyButton')}
          </button>
        </form>
      )}

      {!kullanici && (
        <p className="text-sm text-center py-3 text-ink-muted">
          {t('forumLoginToReply')}
        </p>
      )}

      {kullanici && thread.is_locked && (
        <p className="text-sm text-center py-3 text-ink-muted">
          {t('forumLockedNoReply')}
        </p>
      )}
    </div>
  );
}
