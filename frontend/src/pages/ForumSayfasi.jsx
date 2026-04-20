import { useState } from 'react';
import { Icon, Avatar, SectionHeader, renderInline } from '../components/ui';
import { forumThreads, forumReplies } from '../data/mockData';
import { useAuth } from '../context/useAuth';

function ForumDetail({ thread, onBack }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button onClick={onBack} className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5 mb-6">
        <Icon name="arrow-left" size={14} /> Forum
      </button>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip text-[11px]">{thread.cat}</span>
        {thread.verified && (
          <span className="chip text-[11px]" style={{ color: 'var(--highlight)', borderColor: 'var(--highlight)' }}>
            <Icon name="badge-check" size={11} /> Avukat Onaylı
          </span>
        )}
      </div>
      <h1 className="font-display text-[38px] leading-[1.1] mb-5" style={{ letterSpacing: '-0.02em' }}>
        {thread.title}
      </h1>
      <div className="flex items-center gap-3 text-[13px] text-ink-muted mb-8">
        <Avatar name={thread.author} size={22} />
        <span className="text-ink">{thread.author}</span>
        <span>·</span>
        <span>{thread.time}</span>
      </div>
      <div className="text-[15px] leading-relaxed text-ink-soft mb-4">
        Merhaba, evimi kiraladığım kişi 3 ay boyunca oturduktan sonra taşındı. Depozitonu iadesi için defalarca
        mesaj attım ama yanıt vermiyor. Hangi yolları izlemem gerekiyor?
      </div>
      <div className="flex items-center gap-1 mb-10">
        <button className="btn btn-outline text-xs">
          <Icon name="chevron-up" size={14} /> {thread.votes}
        </button>
        <button className="btn btn-ghost text-xs"><Icon name="share-2" size={13} /> Paylaş</button>
        <button className="btn btn-ghost text-xs"><Icon name="bookmark" size={13} /> Kaydet</button>
      </div>

      <div className="label mb-3">{forumReplies.length} Yanıt · En çok oya göre</div>
      <div className="space-y-0">
        {forumReplies.map((r, i) => (
          <div
            key={i}
            className={'py-5 hairline-b flex gap-4 ' + (r.verified ? '-mx-4 px-4 rounded-lg' : '')}
            style={r.verified ? { background: 'color-mix(in srgb,var(--highlight) 8%,var(--surface))' } : {}}
          >
            <div className="flex flex-col items-center gap-1 w-10 shrink-0">
              <Icon name="chevron-up" size={16} className="text-ink-muted" />
              <span className="text-xs font-mono">{r.votes}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={r.author} size={22} role={r.role === 'lawyer' ? 'lawyer' : null} />
                <span className="text-sm font-medium">{r.author}</span>
                {r.verified && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--highlight)', color: '#fff' }}
                  >
                    AVUKAT ONAYLI
                  </span>
                )}
                <span className="text-[11px] text-ink-faint ml-1">{r.time}</span>
              </div>
              <div className="text-[14.5px] leading-relaxed text-ink-soft prose-mini">
                {renderInline(r.text)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 mt-8">
        <textarea rows={3} placeholder="Yanıtınızı yazın…" className="w-full bg-transparent text-sm resize-none" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-ink-faint">Markdown destekli</span>
          <button className="btn btn-primary text-xs">Yanıt Gönder</button>
        </div>
      </div>
    </div>
  );
}

export default function ForumSayfasi({ onThreadSec }) {
  const { kullanici } = useAuth();
  const [filter, setFilter] = useState('all');
  const [thread, setThread] = useState(null);

  const handleYeniSoru = () => {
    if (!kullanici) {
      alert('Soru sormak için lütfen giriş yapın.');
      return;
    }
    alert('Forum sorma özelliği yakında aktif olacak!');
  };

  const filtered =
    filter === 'unanswered' ? forumThreads.filter(t => !t.answered) :
    filter === 'verified'   ? forumThreads.filter(t => t.verified)  :
    forumThreads;

  const handleSelect = (t) => {
    if (onThreadSec) { onThreadSec(t.id); return; }
    setThread(t);
  };

  if (thread) return <ForumDetail thread={thread} onBack={() => setThread(null)} />;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      <SectionHeader
        eyebrow="Topluluk"
        title="Hukuki Forum"
        sub="Soru sorun, deneyim paylaşın. Avukat onaylı yanıtlara altın rozete bakın."
        actions={
          <button onClick={handleYeniSoru} className="btn btn-primary"><Icon name="plus" size={14} /> Yeni Soru Sor</button>
        }
      />

      {!kullanici && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm"
          style={{ background: 'color-mix(in srgb,var(--accent) 8%,var(--surface))', border: '1px solid color-mix(in srgb,var(--accent) 20%,var(--line))' }}
        >
          <Icon name="info" size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--ink-soft)' }}>
            Soru sormak veya yorum yapmak için <strong style={{ color: 'var(--accent)' }}>giriş yapın</strong>. Göz atmak için giriş gerekmez.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-1 hairline-b mb-2">
        {[
          ['all',        'Tümü',         forumThreads.length],
          ['unanswered', 'Yanıtsız',     forumThreads.filter(t => !t.answered).length],
          ['verified',   'Avukat Onaylı', forumThreads.filter(t => t.verified).length],
        ].map(([k, l, n]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={'px-4 py-2.5 text-sm -mb-px border-b-2 transition ' +
              (filter === k ? 'text-ink' : 'text-ink-muted border-transparent hover:text-ink')}
            style={filter === k ? { borderColor: 'var(--accent)' } : {}}
          >
            {l} <span className="text-ink-faint font-mono text-[11px] ml-0.5">{n}</span>
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div>
        {filtered.map(t => (
          <button
            key={t.id}
            onClick={() => handleSelect(t)}
            className="group w-full text-left flex items-start gap-4 py-5 hairline-b hover:bg-surface-muted px-4 -mx-4 transition"
          >
            <div className="flex flex-col items-center gap-0.5 pt-1 w-12 shrink-0">
              <Icon name="chevron-up" size={16} className="text-ink-muted" />
              <span className="text-sm font-medium font-mono">{t.votes}</span>
              <Icon name="chevron-down" size={16} className="text-ink-faint" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="chip text-[11px] py-0.5">{t.cat}</span>
                {t.verified && (
                  <span className="chip text-[11px] py-0.5" style={{ color: 'var(--highlight)', borderColor: 'var(--highlight)' }}>
                    <Icon name="badge-check" size={11} /> Avukat Onaylı
                  </span>
                )}
                {t.answered && (
                  <span className="chip text-[11px] py-0.5" style={{ color: 'var(--success)', borderColor: 'color-mix(in srgb,var(--success) 40%,var(--line))' }}>
                    Yanıtlandı
                  </span>
                )}
              </div>
              <div
                className="font-display text-[20px] leading-snug group-hover:text-accent transition"
                style={{ letterSpacing: '-0.01em' }}
              >
                {t.title}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[12px] text-ink-muted flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Avatar name={t.author} size={16} /> {t.author}
                </span>
                <span>·</span>
                <span>{t.time}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Icon name="message-square" size={12} /> {t.replies} yanıt
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
