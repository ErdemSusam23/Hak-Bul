import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon, Logo, Avatar, Kbd } from '../components/ui';
import { renderInline } from '../components/ui/renderInline';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/useAuth';
import { useDil } from '../context/useDil';
import { suggestedQuestions } from '../data/mockData';
import {
  sohbetGecmisiListeleAPI,
  sohbetDetayGetirAPI,
  misafirSohbetGecmisiListeleAPI,
  misafirSohbetDetayGetirAPI,
  sohbetSilAPI,
  misafirSohbetSilAPI,
  sohbetYenidenAdlandirAPI,
  sohbetPDFIndirAPI,
  sohbetPaylasAPI,
} from '../api/client';

function tarihKisa(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
  const fark = Math.max(0, Date.now() - d);
  const min = Math.floor(fark / 60000);
  const saat = Math.floor(fark / 3600000);
  const gun = Math.floor(fark / 86400000);
  if (min < 1) return 'Az önce';
  if (min < 60) return `${min}dk`;
  if (saat < 24) return `${saat}sa`;
  if (gun < 7) return `${gun}g`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/* ── Chat Sidebar ── */
function ChatSidebar({ open, activeId, onSelect, onNew }) {
  const { kullanici } = useAuth();
  const [sohbetler, setSohbetler] = useState([]);
  const [duzenleId, setDuzenleId] = useState(null);
  const [duzenleMetin, setDuzenleMetin] = useState('');
  const inputRef = useRef(null);

  const gecmisiCek = useCallback(async () => {
    try {
      const isAuth = kullanici?.token;
      const data = isAuth
        ? await sohbetGecmisiListeleAPI()
        : await misafirSohbetGecmisiListeleAPI();
      setSohbetler(
        (data.conversations || []).map(c => ({
          id: c.conversation_id,
          title: c.title || `Sohbet (${c.message_count} mesaj)`,
          tarih: c.last_message_at,
          misafir: !isAuth,
        }))
      );
    } catch { /* ignore */ }
  }, [kullanici]);

  useEffect(() => { gecmisiCek(); }, [gecmisiCek]);
  useEffect(() => {
    const h = () => gecmisiCek();
    window.addEventListener('gecmis-guncellendi', h);
    return () => window.removeEventListener('gecmis-guncellendi', h);
  }, [gecmisiCek]);

  const handleTikla = async (s) => {
    if (duzenleId === s.id) return;
    try {
      const detay = s.misafir
        ? await misafirSohbetDetayGetirAPI(s.id)
        : await sohbetDetayGetirAPI(s.id);
      onSelect({
        id: s.id,
        mesajlar: detay.messages.map(m => ({
          id: m.id,
          rol: m.role === 'user' ? 'kullanici' : 'asistan',
          icerik: m.content,
          kaynaklar: m.kaynaklar || [],
          zaman: m.created_at,
        })),
      });
    } catch { /* ignore */ }
  };

  const handleSil = async (e, s) => {
    e.stopPropagation();
    if (!confirm('Bu sohbeti silmek istiyor musunuz?')) return;
    try {
      s.misafir ? await misafirSohbetSilAPI(s.id) : await sohbetSilAPI(s.id);
      setSohbetler(p => p.filter(x => x.id !== s.id));
      window.dispatchEvent(new Event('gecmis-guncellendi'));
    } catch { /* ignore */ }
  };

  const handlePaylas = async (e, s) => {
    e.stopPropagation();
    try {
      const { share_token } = await sohbetPaylasAPI(s.id);
      await navigator.clipboard.writeText(`${window.location.origin}/#/shared/${share_token}`);
      alert('Paylaşım bağlantısı kopyalandı!');
    } catch { /* ignore */ }
  };

  const handleIndir = async (e, s) => {
    e.stopPropagation();
    try {
      const blob = await sohbetPDFIndirAPI(s.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `hak-bul-${s.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { alert('PDF indirilemedi.'); }
  };

  const startDuzenle = (e, s) => {
    e.stopPropagation();
    setDuzenleId(s.id); setDuzenleMetin(s.title || '');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const kaydetDuzenle = async (id) => {
    if (!duzenleMetin.trim()) { setDuzenleId(null); return; }
    try {
      await sohbetYenidenAdlandirAPI(id, duzenleMetin.trim());
      setSohbetler(p => p.map(s => s.id === id ? { ...s, title: duzenleMetin.trim() } : s));
    } catch { /* ignore */ } finally { setDuzenleId(null); }
  };

  const groups = {};
  sohbetler.forEach(c => { (groups[c.tarih ? tarihKisa(c.tarih) : 'Geçmiş'] ||= []).push(c); });

  if (!open) return null;

  return (
    <aside
      className="w-[280px] shrink-0 flex flex-col h-full"
      style={{ background: 'var(--surface-muted)', borderRight: '1px solid var(--line)' }}
    >
      {/* New chat */}
      <div className="p-3 hairline-b">
        <button onClick={onNew} className="btn btn-primary w-full justify-between">
          <span className="flex items-center gap-2"><Icon name="plus" size={15} /> Yeni Sohbet</span>
          <Kbd>⌘N</Kbd>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 hairline-b">
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="w-full pl-8 pr-2 py-2 text-sm bg-surface rounded-md border border-line"
            placeholder="Sohbetlerde ara…"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-auto py-2">
        {Object.keys(groups).length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-ink-muted text-center">
            {kullanici ? 'Henüz sohbet yok.' : 'Geçmiş için giriş yapın.'}
          </div>
        ) : (
          Object.entries(groups).map(([grp, items]) => (
            <div key={grp} className="mb-3">
              <div className="px-4 pt-2 pb-1.5 label">{grp}</div>
              {items.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleTikla(s)}
                  className="group relative w-full text-left px-3 mx-1 py-2 rounded-md flex items-start gap-2.5"
                  style={activeId === s.id
                    ? { background: 'var(--surface)', boxShadow: 'inset 2px 0 0 var(--accent)' }
                    : {}}
                >
                  <span className="text-[13px] leading-snug line-clamp-2 text-ink-soft flex-1">
                    {duzenleId === s.id ? (
                      <input
                        ref={inputRef}
                        value={duzenleMetin}
                        onChange={e => setDuzenleMetin(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') kaydetDuzenle(s.id);
                          if (e.key === 'Escape') setDuzenleId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-surface border border-line rounded px-1 py-0.5 text-xs"
                      />
                    ) : s.title}
                  </span>
                  {duzenleId !== s.id && (
                    <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <span onClick={(e) => startDuzenle(e, s)} title="Yeniden Adlandır" className="p-1 rounded hover:bg-surface-muted">
                        <Icon name="pencil" size={12} className="text-ink-muted" />
                      </span>
                      {!s.misafir && (
                        <>
                          <span onClick={(e) => handlePaylas(e, s)} title="Paylaş" className="p-1 rounded hover:bg-surface-muted">
                            <Icon name="link-2" size={12} className="text-ink-muted" />
                          </span>
                          <span onClick={(e) => handleIndir(e, s)} title="PDF İndir" className="p-1 rounded hover:bg-surface-muted">
                            <Icon name="download" size={12} className="text-ink-muted" />
                          </span>
                        </>
                      )}
                      <span onClick={(e) => handleSil(e, s)} title="Sil" className="p-1 rounded hover:bg-surface-muted">
                        <Icon name="trash-2" size={12} className="text-ink-muted" />
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* User footer */}
      <div className="hairline-t p-3 flex items-center gap-2.5">
        <Avatar name={kullanici?.email || 'Misafir'} size={30} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">
            {kullanici ? (kullanici.email?.split('@')[0] || 'Kullanıcı') : 'Misafir'}
          </div>
          <div className="text-[11px] text-ink-muted">{kullanici ? 'Üye' : 'Misafir oturumu'}</div>
        </div>
        <button className="p-1.5 rounded hover:bg-surface" title="Ayarlar">
          <Icon name="settings" size={15} className="text-ink-muted" />
        </button>
      </div>
    </aside>
  );
}

/* ── Source card ── */
function SourceCard({ s }) {
  const isCase = s.kind === 'case' || s.kaynak_turu === 'karar';
  const code = s.code || s.baslik || '';
  const title = s.title || s.baslik || '';
  const snippet = s.snippet || s.metin_ozet || '';
  return (
    <div className="p-3 rounded-lg border border-line hover:border-line-strong cursor-pointer">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon
          name={isCase ? 'gavel' : 'book-open'}
          size={12}
          style={{ color: isCase ? 'var(--highlight)' : 'var(--accent)' }}
        />
        <span
          className="font-mono text-[11px]"
          style={{ color: isCase ? 'var(--highlight)' : 'var(--accent)' }}
        >
          {code}
        </span>
        <span className="text-[11px] text-ink-faint ml-auto">{isCase ? 'Yargıtay' : 'Kanun'}</span>
      </div>
      <div className="text-[12.5px] font-medium mb-1">{title}</div>
      <div className="text-[12px] text-ink-muted leading-relaxed line-clamp-2">{snippet}</div>
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ m }) {
  const [feedback, setFeedback] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  if (m.rol === 'kullanici') {
    return (
      <div className="flex justify-end fade-in">
        <div
          className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-3 text-[14.5px] leading-relaxed"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          {m.icerik || m.text}
        </div>
      </div>
    );
  }

  const body = m.body || (m.icerik ? [{ type: 'p', text: m.icerik }] : []);
  const sources = m.sources || m.kaynaklar || [];

  return (
    <div className="fade-in">
      <div className="flex items-start gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          <Icon name="scale" size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[13px] font-medium">Hak-Bul</span>
            <span className="text-[11px] text-ink-faint">Türk Hukuk Asistanı</span>
          </div>

          {(m.alert || m.uyari) && (
            <div
              className="mb-3 p-3 rounded-lg flex items-start gap-2.5 text-[13px]"
              style={{ background: 'color-mix(in srgb,var(--warn) 10%,var(--surface))', borderLeft: '2px solid var(--warn)' }}
            >
              <Icon name="triangle-alert" size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
              <div>
                <strong>Ciddi konu uyarısı.</strong> Bu tür süreçlerde bir avukatla görüşmeniz önerilir.{' '}
                <span className="underline cursor-pointer" style={{ color: 'var(--accent)' }}>ALO 182</span>
              </div>
            </div>
          )}

          {m.streaming ? (
            <div className="flex items-center gap-1 text-ink-muted py-2">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="ml-2 text-[12px]">Kaynaklar taranıyor…</span>
            </div>
          ) : (
            <div className="prose-mini text-[14.5px] text-ink-soft">
              {body.map((b, i) => {
                if (b.type === 'p') return <p key={i}>{renderInline(b.text)}</p>;
                if (b.type === 'h') return <p key={i}><strong>{b.text}</strong></p>;
                if (b.type === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>;
                if (b.type === 'callout') return (
                  <div key={i} className="my-3 p-3 rounded-lg hairline text-[13.5px]" style={{ background: 'var(--surface-muted)' }}>
                    <Icon name="info" size={13} className="inline-block mr-1.5 -mt-0.5 text-accent" />
                    {renderInline(b.text)}
                  </div>
                );
                return null;
              })}
            </div>
          )}

          {sources.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setExpanded(v => !v)}
                className="label flex items-center gap-1.5"
              >
                <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={11} />
                {sources.length} Kaynak
              </button>
              {expanded && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sources.map((s, i) => <SourceCard key={i} s={s} />)}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-1">
            <button
              onClick={() => setFeedback('up')}
              className={'p-1.5 rounded hover:bg-surface-muted ' + (feedback === 'up' ? 'text-accent' : 'text-ink-muted')}
            >
              <Icon name="thumbs-up" size={14} />
            </button>
            <button
              onClick={() => setFeedback('down')}
              className={'p-1.5 rounded hover:bg-surface-muted ' + (feedback === 'down' ? 'text-accent' : 'text-ink-muted')}
            >
              <Icon name="thumbs-down" size={14} />
            </button>
            <button
              onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="p-1.5 rounded hover:bg-surface-muted text-ink-muted"
            >
              <Icon name={copied ? 'check' : 'copy'} size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ onPick }) {
  const quickCats = ['İş Hukuku', 'Kiracı Hakları', 'Boşanma', 'Tüketici', 'Trafik', 'Vergi'];
  return (
    <div className="py-12">
      <div className="flex flex-col items-center text-center mb-10">
        <Logo size={28} />
        <h2 className="font-display text-[42px] mt-6 leading-none" style={{ letterSpacing: '-0.02em' }}>
          <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Hoş geldiniz.</span>{' '}
          Nasıl yardımcı olabilirim?
        </h2>
        <p className="text-ink-muted mt-3 max-w-lg text-[14px]">
          Hukuki sorunuzu yazın; kanun maddeleri ve Yargıtay kararlarıyla desteklenmiş bir yanıt alın.
        </p>
      </div>

      <div className="label mb-3">Hızlı başla</div>
      <div className="flex flex-wrap gap-2 mb-8">
        {quickCats.map(c => (
          <button key={c} onClick={() => onPick(c + ' hakkında sorum var.')} className="chip text-[13px]">
            {c}
          </button>
        ))}
      </div>

      <div className="label mb-3">Örnek sorular</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => onPick(q.q)}
            className="card p-4 text-left hover:border-line-strong group"
          >
            <div className="label mb-1.5" style={{ fontSize: '10px' }}>{q.cat}</div>
            <div className="text-[14px] leading-relaxed text-ink-soft group-hover:text-ink flex items-start justify-between gap-3">
              <span>{q.q}</span>
              <Icon name="arrow-up-right" size={14} className="text-ink-faint mt-0.5 shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main Chat Page ── */
export default function SohbetSayfasi() {
  const { dil } = useDil();
  const {
    mesajlar, yukleniyor, mesajGonder, sohbetiTemizle, mesajlariYukle,
  } = useChat(dil);

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [convId, setConvId] = useState(null);
  const scrollRef = useRef(null);

  const guestSessionId = typeof window !== 'undefined'
    ? (localStorage.getItem('hakbul_guest_session_id') || undefined)
    : undefined;

  const sendMessage = async (text) => {
    if (!text?.trim()) return;
    setInput('');
    const result = await mesajGonder(text.trim(), {
      conversationId: convId || undefined,
      guestSessionId,
    });
    if (result?.conversation_id && !convId) {
      setConvId(result.conversation_id);
      setActiveId(result.conversation_id);
      window.dispatchEvent(new Event('gecmis-guncellendi'));
    }
    if (result?.guest_session_id) {
      localStorage.setItem('hakbul_guest_session_id', result.guest_session_id);
    }
  };

  const handleNew = () => {
    sohbetiTemizle();
    setConvId(null);
    setActiveId(null);
    setInput('');
  };

  const handleSelect = (sohbet) => {
    mesajlariYukle(sohbet.mesajlar);
    setConvId(sohbet.id);
    setActiveId(sohbet.id);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mesajlar, yukleniyor]);

  const handlePaylas = async () => {
    if (!convId) { alert('Önce bir sohbet başlatın.'); return; }
    try {
      const { share_token } = await sohbetPaylasAPI(convId);
      await navigator.clipboard.writeText(`${window.location.origin}/#/shared/${share_token}`);
      alert('Paylaşım bağlantısı panoya kopyalandı!');
    } catch { alert('Paylaşılamadı.'); }
  };

  const handlePDF = async () => {
    if (!convId) { alert('Önce bir sohbet başlatın.'); return; }
    try {
      const blob = await sohbetPDFIndirAPI(convId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `hak-bul-${convId.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { alert('PDF indirilemedi.'); }
  };

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ background: 'var(--surface)' }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={sidebarOpen ? 'z-20 md:relative md:z-auto fixed inset-y-0 left-0' : ''}>
        <ChatSidebar
          open={sidebarOpen}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="hairline-b px-6 h-12 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-1 rounded hover:bg-surface-muted"
          >
            <Icon
              name={sidebarOpen ? 'panel-left-close' : 'panel-left-open'}
              size={16}
              className="text-ink-muted"
            />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate text-ink-muted">
              {convId ? `Sohbet #${convId.slice(0, 8)}` : 'Yeni Sohbet'}
            </div>
          </div>
          <button onClick={handlePaylas} className="btn btn-ghost text-xs" title="Sohbet bağlantısını kopyala"><Icon name="link-2" size={14} /> Paylaş</button>
          <button onClick={handlePDF} className="btn btn-ghost text-xs" title="PDF olarak indir"><Icon name="download" size={14} /> PDF</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {mesajlar.length === 0 ? (
              <EmptyState onPick={sendMessage} />
            ) : (
              <div className="flex flex-col gap-6">
                {mesajlar.map((m, i) => (
                  <MessageBubble key={m.id || i} m={m} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 px-6 pb-6 pt-2" style={{ background: 'var(--surface)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="card p-3 shadow-sm" style={{ borderColor: 'var(--line-strong)' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                rows={2}
                placeholder="Hukuki sorunuzu yazın…"
                disabled={yukleniyor}
                className="w-full bg-transparent resize-none text-[15px] leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded hover:bg-surface-muted text-ink-muted" title="PDF yükle">
                    <Icon name="paperclip" size={15} />
                  </button>
                  <span className="text-[11px] text-ink-faint ml-2">{input.length}/2000</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-faint hidden md:block">
                    Enter ile gönder · Shift+Enter satır ekler
                  </span>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || yukleniyor}
                    className="btn btn-primary text-xs px-3 py-1.5"
                  >
                    Sor <Icon name="arrow-up" size={13} />
                  </button>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-ink-faint text-center mt-2">
              Yanıtlar bilgi amaçlıdır · Avukat görüşünün yerini tutmaz
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
