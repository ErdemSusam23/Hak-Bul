import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon, Logo, Avatar } from '../components/ui';
import { renderInline } from '../components/ui/renderInline';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/useAuth';
import { useDil } from '../context/useDil';
import { SOHBET_ONERILEN_SORULAR } from '../content/productContent';
import { normalizeRoleName } from '../utils/adminFlow';
import { CHAT_COMPOSER_MAX_LENGTH, prepareComposerSubmission } from '../utils/chatUi';
import { buildSharedConversationUrl, togglePendingAction } from '../utils/phase2Flow';
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
  const date = new Date(isoStr.endsWith('Z') ? isoStr : `${isoStr}Z`);
  const diff = Math.max(0, Date.now() - date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Az once';
  if (minutes < 60) return `${minutes}dk`;
  if (hours < 24) return `${hours}sa`;
  if (days < 7) return `${days}g`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function kullaniciRolEtiketi(kullanici) {
  if (!kullanici) return 'Misafir';

  switch (normalizeRoleName(kullanici.rol || kullanici.role)) {
    case 'admin':
      return 'Admin';
    case 'lawyer':
      return 'Avukat';
    default:
      return 'Kullanıcı';
  }
}

function ChatSidebar({ open, activeId, onSelect, onNew, toast }) {
  const { kullanici } = useAuth();
  const [sohbetler, setSohbetler] = useState([]);
  const [duzenleId, setDuzenleId] = useState(null);
  const [duzenleMetin, setDuzenleMetin] = useState('');
  const [silOnayId, setSilOnayId] = useState(null);
  const inputRef = useRef(null);

  const gecmisiCek = useCallback(async () => {
    try {
      const isAuth = kullanici?.token;
      const data = isAuth
        ? await sohbetGecmisiListeleAPI()
        : await misafirSohbetGecmisiListeleAPI();
      setSohbetler(
        (data.conversations || []).map((conversation) => ({
          id: conversation.conversation_id,
          title: conversation.title || `Sohbet (${conversation.message_count} mesaj)`,
          tarih: conversation.last_message_at,
          misafir: !isAuth,
        })),
      );
    } catch {
      // ignore sidebar refresh failures
    }
  }, [kullanici]);

  useEffect(() => { gecmisiCek(); }, [gecmisiCek]);

  useEffect(() => {
    const handleRefresh = () => gecmisiCek();
    window.addEventListener('gecmis-guncellendi', handleRefresh);
    return () => window.removeEventListener('gecmis-guncellendi', handleRefresh);
  }, [gecmisiCek]);

  const handleTikla = async (sohbet) => {
    if (duzenleId === sohbet.id) return;

    try {
      const detay = sohbet.misafir
        ? await misafirSohbetDetayGetirAPI(sohbet.id)
        : await sohbetDetayGetirAPI(sohbet.id);

      onSelect({
        id: sohbet.id,
        title: sohbet.title,
        mesajlar: detay.messages.map((message) => ({
          id: message.id,
          rol: message.role === 'user' ? 'kullanici' : 'asistan',
          icerik: message.content,
          kaynaklar: message.kaynaklar || [],
          zaman: message.created_at,
        })),
      });
      setSilOnayId(null);
    } catch {
      toast?.('Sohbet detaylari yuklenemedi.', 'error');
    }
  };

  const handleSil = async (event, sohbet) => {
    event.stopPropagation();
    if (silOnayId !== sohbet.id) {
      setSilOnayId(togglePendingAction(silOnayId, sohbet.id));
      toast?.('Sohbeti silmek icin tekrar tiklayin.', 'info');
      return;
    }

    try {
      if (sohbet.misafir) {
        await misafirSohbetSilAPI(sohbet.id);
      } else {
        await sohbetSilAPI(sohbet.id);
      }
      setSohbetler((prev) => prev.filter((item) => item.id !== sohbet.id));
      setSilOnayId(null);
      window.dispatchEvent(new Event('gecmis-guncellendi'));
      toast?.('Sohbet silindi.');
    } catch {
      toast?.('Sohbet silinemedi.', 'error');
    }
  };

  const handlePaylas = async (event, sohbet) => {
    event.stopPropagation();
    try {
      const { share_token: shareToken } = await sohbetPaylasAPI(sohbet.id);
      const shareUrl = buildSharedConversationUrl(window.location.origin, shareToken);
      await navigator.clipboard.writeText(shareUrl);
      toast?.('Paylasim baglantisi panoya kopyalandi.');
    } catch {
      toast?.('Paylasim baglantisi kopyalanamadi.', 'error');
    }
  };

  const handleIndir = async (event, sohbet) => {
    event.stopPropagation();
    try {
      const blob = await sohbetPDFIndirAPI(sohbet.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `hak-bul-${sohbet.id.slice(0, 8)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast?.('PDF indiriliyor.');
    } catch {
      toast?.('PDF indirilemedi.', 'error');
    }
  };

  const startDuzenle = (event, sohbet) => {
    event.stopPropagation();
    setSilOnayId(null);
    setDuzenleId(sohbet.id);
    setDuzenleMetin(sohbet.title || '');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const kaydetDuzenle = async (id) => {
    if (!duzenleMetin.trim()) {
      setDuzenleId(null);
      return;
    }

    try {
      await sohbetYenidenAdlandirAPI(id, duzenleMetin.trim());
      setSohbetler((prev) => prev.map((sohbet) => (
        sohbet.id === id ? { ...sohbet, title: duzenleMetin.trim() } : sohbet
      )));
      toast?.('Sohbet adi guncellendi.');
    } catch {
      toast?.('Sohbet adi guncellenemedi.', 'error');
    } finally {
      setDuzenleId(null);
    }
  };

  const groups = {};
  sohbetler.forEach((conversation) => {
    const label = conversation.tarih ? tarihKisa(conversation.tarih) : 'Gecmis';
    (groups[label] ||= []).push(conversation);
  });

  if (!open) return null;

  return (
    <aside
      className="w-[280px] shrink-0 flex flex-col h-full"
      style={{ background: 'var(--surface-muted)', borderRight: '1px solid var(--line)' }}
    >
      <div className="p-3 hairline-b">
        <button onClick={onNew} className="btn btn-primary w-full justify-center">
          <span className="flex items-center gap-2"><Icon name="plus" size={15} /> Yeni Sohbet</span>
        </button>
      </div>

      <div className="px-3 py-2.5 hairline-b">
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="w-full pl-8 pr-2 py-2 text-sm bg-surface rounded-md border border-line"
            placeholder="Sohbetlerde ara..."
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {Object.keys(groups).length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-ink-muted text-center">
            {kullanici ? 'Henuz sohbet yok.' : 'Gecmis icin giris yapin.'}
          </div>
        ) : (
          Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-3">
              <div className="px-4 pt-2 pb-1.5 label">{group}</div>
              {items.map((sohbet) => (
                <button
                  key={sohbet.id}
                  onClick={() => handleTikla(sohbet)}
                  className="group relative w-full text-left px-3 mx-1 py-2 rounded-md flex items-start gap-2.5"
                  style={activeId === sohbet.id
                    ? { background: 'var(--surface)', boxShadow: 'inset 2px 0 0 var(--accent)' }
                    : {}}
                >
                  <span className="text-[13px] leading-snug line-clamp-2 text-ink-soft flex-1">
                    {duzenleId === sohbet.id ? (
                      <input
                        ref={inputRef}
                        value={duzenleMetin}
                        onChange={(event) => setDuzenleMetin(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') kaydetDuzenle(sohbet.id);
                          if (event.key === 'Escape') setDuzenleId(null);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full bg-surface border border-line rounded px-1 py-0.5 text-xs"
                      />
                    ) : sohbet.title}
                  </span>
                  {duzenleId !== sohbet.id && (
                    <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <span onClick={(event) => startDuzenle(event, sohbet)} title="Yeniden Adlandir" className="p-1 rounded hover:bg-surface-muted">
                        <Icon name="pencil" size={12} className="text-ink-muted" />
                      </span>
                      {!sohbet.misafir && (
                        <>
                          <span onClick={(event) => handlePaylas(event, sohbet)} title="Paylas" className="p-1 rounded hover:bg-surface-muted">
                            <Icon name="link-2" size={12} className="text-ink-muted" />
                          </span>
                          <span onClick={(event) => handleIndir(event, sohbet)} title="PDF Indir" className="p-1 rounded hover:bg-surface-muted">
                            <Icon name="download" size={12} className="text-ink-muted" />
                          </span>
                        </>
                      )}
                      <span onClick={(event) => handleSil(event, sohbet)} title={silOnayId === sohbet.id ? 'Silmeyi Onayla' : 'Sil'} className="p-1 rounded hover:bg-surface-muted">
                        <Icon name={silOnayId === sohbet.id ? 'check' : 'trash-2'} size={12} className={silOnayId === sohbet.id ? 'text-accent' : 'text-ink-muted'} />
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="hairline-t p-3 flex items-center gap-2.5">
        <Avatar name={kullanici?.email || 'Misafir'} size={30} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">
            {kullanici ? (kullanici.email?.split('@')[0] || 'Kullanici') : 'Misafir'}
          </div>
          <div className="text-[11px] text-ink-muted">{kullaniciRolEtiketi(kullanici)}</div>
        </div>
      </div>
    </aside>
  );
}

function SourceCard({ s }) {
  const isCase = s.kind === 'case' || s.kaynak_turu === 'karar';
  const code = s.code || s.baslik || '';
  const title = s.title || s.baslik || '';
  const snippet = s.snippet || s.metin_ozet || '';
  const sourceUrl = s.url;

  const openSourceUrl = (event) => {
    event.stopPropagation();
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  };

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
        <span className="text-[11px] text-ink-faint ml-auto">{isCase ? 'Yargitay' : 'Kanun'}</span>
        {sourceUrl && (
          <button
            type="button"
            onClick={openSourceUrl}
            className="p-1 -mr-1 rounded hover:bg-surface-muted text-ink-muted hover:text-accent"
            title="Kaynağı aç"
          >
            <Icon name="external-link" size={12} />
          </button>
        )}
      </div>
      <div className="text-[12.5px] font-medium mb-1">{title}</div>
      <div className="text-[12px] text-ink-muted leading-relaxed line-clamp-2">{snippet}</div>
    </div>
  );
}

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
            <span className="text-[11px] text-ink-faint">Hukuki Bilgi Platformu</span>
          </div>

          {(m.alert || m.uyari) && (
            <div
              className="mb-3 p-3 rounded-lg flex items-start gap-2.5 text-[13px]"
              style={{ background: 'color-mix(in srgb,var(--warn) 10%,var(--surface))', borderLeft: '2px solid var(--warn)' }}
            >
              <Icon name="triangle-alert" size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
              <div>
                <strong>Ciddi konu uyarisi.</strong> Bu tur sureclerde bir avukatla gorusmeniz onerilir.
              </div>
            </div>
          )}

          {m.streaming ? (
            <div className="flex items-center gap-1 text-ink-muted py-2">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="ml-2 text-[12px]">Kaynaklar taraniyor...</span>
            </div>
          ) : (
            <div className="prose-mini text-[14.5px] text-ink-soft">
              {body.map((block, index) => {
                if (block.type === 'p') return <p key={index}>{renderInline(block.text)}</p>;
                if (block.type === 'h') return <p key={index}><strong>{block.text}</strong></p>;
                if (block.type === 'ul') return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
                if (block.type === 'callout') {
                  return (
                    <div key={index} className="my-3 p-3 rounded-lg hairline text-[13.5px]" style={{ background: 'var(--surface-muted)' }}>
                      <Icon name="info" size={13} className="inline-block mr-1.5 -mt-0.5 text-accent" />
                      {renderInline(block.text)}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {sources.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setExpanded((value) => !value)} className="label flex items-center gap-1.5">
                <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={11} />
                {sources.length} Kaynak
              </button>
              {expanded && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sources.map((source, index) => <SourceCard key={index} s={source} />)}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-1">
            <button
              onClick={() => setFeedback('up')}
              className={`p-1.5 rounded hover:bg-surface-muted ${feedback === 'up' ? 'text-accent' : 'text-ink-muted'}`}
            >
              <Icon name="thumbs-up" size={14} />
            </button>
            <button
              onClick={() => setFeedback('down')}
              className={`p-1.5 rounded hover:bg-surface-muted ${feedback === 'down' ? 'text-accent' : 'text-ink-muted'}`}
            >
              <Icon name="thumbs-down" size={14} />
            </button>
            <button
              onClick={() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
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

function EmptyState({ onPick }) {
  return (
    <div className="py-12">
      <div className="flex flex-col items-center text-center mb-10">
        <Logo size={28} />
        <h2 className="font-display text-[42px] mt-6 leading-none" style={{ letterSpacing: '-0.02em' }}>
          <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Hos geldiniz.</span>{' '}
          Nasil yardimci olabilirim?
        </h2>
        <p className="text-ink-muted mt-3 max-w-lg text-[14px]">
          Hukuki sorunuzu yazin; kanun maddeleri ve Yargitay kararlariyla desteklenmis bir yanit alin.
        </p>
      </div>

      <div className="label mb-3">Ornek sorular</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SOHBET_ONERILEN_SORULAR.map((question, index) => (
          <button
            key={index}
            onClick={() => onPick(question.q)}
            className="card p-4 text-left hover:border-line-strong group"
          >
            <div className="label mb-1.5" style={{ fontSize: '10px' }}>{question.cat}</div>
            <div className="text-[14px] leading-relaxed text-ink-soft group-hover:text-ink flex items-start justify-between gap-3">
              <span>{question.q}</span>
              <Icon name="arrow-up-right" size={14} className="text-ink-faint mt-0.5 shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SohbetSayfasi({ toast }) {
  const { dil } = useDil();
  const {
    mesajlar, yukleniyor, mesajGonder, sohbetiTemizle, mesajlariYukle,
  } = useChat(dil);

  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [convId, setConvId] = useState(null);
  const [selectedConversationTitle, setSelectedConversationTitle] = useState('');
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const guestSessionId = typeof window !== 'undefined'
    ? (localStorage.getItem('hakbul_guest_session_id') || undefined)
    : undefined;

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const sendMessage = async (nextInput = input) => {
    const submission = prepareComposerSubmission({
      girdi: nextInput,
      secilenDosya: selectedFile,
      yukleniyor,
    });
    if (!submission) return;

    setInput(submission.nextGirdi);
    clearSelectedFile();

    const result = await mesajGonder(submission.metin.trim(), {
      conversationId: convId || undefined,
      guestSessionId,
      dosya: submission.dosya || undefined,
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
    setSelectedConversationTitle('');
    setInput('');
    clearSelectedFile();
  };

  const handleSelect = (sohbet) => {
    mesajlariYukle(sohbet.mesajlar);
    setConvId(sohbet.id);
    setActiveId(sohbet.id);
    setSelectedConversationTitle(sohbet.title || '');
    clearSelectedFile();
  };

  const handleFileSelect = (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      clearSelectedFile();
      toast?.('Lutfen yalnizca PDF dosyasi yukleyin.', 'error');
      return;
    }

    setSelectedFile(file);
  };

  const canSubmit = Boolean(prepareComposerSubmission({
    girdi: input,
    secilenDosya: selectedFile,
    yukleniyor,
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mesajlar, yukleniyor]);

  const handlePaylas = async () => {
    if (!convId) {
      toast?.('Once bir sohbet baslatin.', 'info');
      return;
    }

    try {
      const { share_token: shareToken } = await sohbetPaylasAPI(convId);
      const shareUrl = buildSharedConversationUrl(window.location.origin, shareToken);
      await navigator.clipboard.writeText(shareUrl);
      toast?.('Paylasim baglantisi panoya kopyalandi.');
    } catch {
      toast?.('Paylasim baglantisi olusturulamadi.', 'error');
    }
  };

  const handlePDF = async () => {
    if (!convId) {
      toast?.('Once bir sohbet baslatin.', 'info');
      return;
    }

    try {
      const blob = await sohbetPDFIndirAPI(convId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `hak-bul-${convId.slice(0, 8)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast?.('PDF indiriliyor.');
    } catch {
      toast?.('PDF indirilemedi.', 'error');
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ background: 'var(--surface)' }}>
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
          toast={toast}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="hairline-b px-6 h-12 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen((value) => !value)} className="p-1 rounded hover:bg-surface-muted">
            <Icon
              name={sidebarOpen ? 'panel-left-close' : 'panel-left-open'}
              size={16}
              className="text-ink-muted"
            />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate text-ink-muted">
              {selectedConversationTitle || (convId ? 'Sohbet' : 'Yeni Sohbet')}
            </div>
          </div>
          <button onClick={handlePaylas} className="btn btn-ghost text-xs" title="Sohbet baglantisini kopyala">
            <Icon name="link-2" size={14} /> Paylas
          </button>
          <button onClick={handlePDF} className="btn btn-ghost text-xs" title="PDF olarak indir">
            <Icon name="download" size={14} /> PDF
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {mesajlar.length === 0 ? (
              <EmptyState onPick={sendMessage} />
            ) : (
              <div className="flex flex-col gap-6">
                {mesajlar.map((message, index) => (
                  <MessageBubble key={message.id || index} m={message} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 px-6 pb-6 pt-2" style={{ background: 'var(--surface)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="card p-3 shadow-sm" style={{ borderColor: 'var(--line-strong)' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, CHAT_COMPOSER_MAX_LENGTH))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && canSubmit) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows={2}
                placeholder="Hukuki sorunuzu yazin..."
                disabled={yukleniyor}
                maxLength={CHAT_COMPOSER_MAX_LENGTH}
                className="w-full bg-transparent resize-none text-[15px] leading-relaxed"
              />
              {selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-[12px]">
                  <span className="chip inline-flex items-center gap-1.5">
                    <Icon name="file-text" size={12} />
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="text-ink-muted hover:text-ink"
                    title="PDF secimini kaldir"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded hover:bg-surface-muted text-ink-muted"
                    title="PDF yukle"
                  >
                    <Icon name="paperclip" size={15} />
                  </button>
                  <span className="text-[11px] text-ink-faint ml-2">{input.length}/{CHAT_COMPOSER_MAX_LENGTH}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-faint hidden md:block">
                    Enter ile gonder · Shift+Enter satir ekler
                  </span>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!canSubmit}
                    className="btn btn-primary text-xs px-3 py-1.5"
                  >
                    Sor <Icon name="arrow-up" size={13} />
                  </button>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-ink-faint text-center mt-2">
              Yanitlar bilgi amaclidir · Avukat gorusunun yerini tutmaz
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
