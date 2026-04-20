import { useState, useEffect, useCallback } from 'react';
import { Plus, Lock, MessageSquare, ThumbsUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { forumThreadListesiAPI, forumThreadOlusturAPI } from '../api/client';

const KATEGORILER = [
    'Tümü', 'İş Hukuku', 'Kira Hukuku', 'Tüketici Hukuku',
    'Aile Hukuku', 'Ceza Hukuku', 'İdare Hukuku', 'Ticaret Hukuku', 'Genel Hukuk',
];

function YeniThreadModal({ onKapat, onOlusturuldu }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('Genel Hukuk');
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState('');

    const handleGonder = async (e) => {
        e.preventDefault();
        setHata('');
        setYukleniyor(true);
        try {
            const thread = await forumThreadOlusturAPI({ title, content, category });
            onOlusturuldu(thread);
        } catch (err) {
            setHata(err.response?.data?.detail || 'Bir hata oluştu.');
        } finally {
            setYukleniyor(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'var(--tema-panel)', border: '1px solid var(--tema-border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--tema-text)' }}>Yeni Başlık Aç</h2>
                <form onSubmit={handleGonder} className="flex flex-col gap-3">
                    <input
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text)', border: '1px solid var(--tema-border)' }}
                        placeholder="Başlık (en az 5 karakter)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        minLength={5}
                        maxLength={200}
                    />
                    <select
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text)', border: '1px solid var(--tema-border)' }}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {KATEGORILER.filter((k) => k !== 'Tümü').map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                    <textarea
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text)', border: '1px solid var(--tema-border)', minHeight: '120px' }}
                        placeholder="Sorunuzu veya konunuzu detaylı açıklayın (en az 10 karakter)"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        minLength={10}
                    />
                    {hata && <p className="text-xs text-red-400">{hata}</p>}
                    <div className="flex gap-2 justify-end mt-2">
                        <button
                            type="button"
                            onClick={onKapat}
                            className="px-4 py-2 rounded-xl text-sm"
                            style={{ background: 'var(--tema-surface)', color: 'var(--tema-muted)' }}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={yukleniyor}
                            className="px-4 py-2 rounded-xl text-sm font-medium"
                            style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)', opacity: yukleniyor ? 0.7 : 1 }}
                        >
                            {yukleniyor ? 'Gönderiliyor...' : 'Başlık Aç'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ThreadKarti({ thread, onClick }) {
    return (
        <div
            className="p-4 rounded-xl cursor-pointer transition-all"
            style={{ background: 'var(--tema-card)', border: '1px solid var(--tema-border)' }}
            onClick={() => onClick(thread.id)}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--tema-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--tema-border)'; }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tema-surface)', color: 'var(--tema-accent)' }}>
                            {thread.category}
                        </span>
                        {thread.is_locked && <Lock size={12} style={{ color: 'var(--tema-muted)' }} />}
                    </div>
                    <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--tema-text)' }}>{thread.title}</p>
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--tema-muted)' }}>{thread.display_name}</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--tema-dimmer)', flexShrink: 0 }} />
            </div>
            <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tema-muted)' }}>
                    <MessageSquare size={12} /> {thread.reply_count}
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: thread.vote_score >= 0 ? 'var(--tema-muted)' : '#f87171' }}>
                    <ThumbsUp size={12} /> {thread.vote_score}
                </span>
            </div>
        </div>
    );
}

export default function ForumSayfasi({ onThreadSec }) {
    const { kullanici } = useAuth();
    const [threads, setThreads] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [secilenKategori, setSecilenKategori] = useState('Tümü');
    const [yukleniyor, setYukleniyor] = useState(false);
    const [modalAcik, setModalAcik] = useState(false);

    const yukle = useCallback(async () => {
        setYukleniyor(true);
        try {
            const category = secilenKategori === 'Tümü' ? null : secilenKategori;
            const data = await forumThreadListesiAPI({ category, page, size: 20 });
            setThreads(data.threads);
            setTotal(data.total);
        } catch (e) {
            console.error('Forum yüklenemedi:', e);
        } finally {
            setYukleniyor(false);
        }
    }, [secilenKategori, page]);

    useEffect(() => {
        yukle();
    }, [yukle]);

    const handleKategoriDegis = (kat) => {
        setSecilenKategori(kat);
        setPage(1);
    };

    const handleOlusturuldu = () => {
        setModalAcik(false);
        setPage(1);
        yukle();
    };

    const toplamSayfa = Math.ceil(total / 20);

    return (
        <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto">
            {modalAcik && (
                <YeniThreadModal onKapat={() => setModalAcik(false)} onOlusturuldu={handleOlusturuldu} />
            )}

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--tema-text)' }}>Forum</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tema-muted)' }}>
                        {total} başlık · Hukuki sorularınızı toplulukla paylaşın
                    </p>
                </div>
                {kullanici && (
                    <button
                        onClick={() => setModalAcik(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)' }}
                    >
                        <Plus size={14} /> Yeni Başlık
                    </button>
                )}
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
                {KATEGORILER.map((kat) => (
                    <button
                        key={kat}
                        onClick={() => handleKategoriDegis(kat)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{
                            background: secilenKategori === kat ? 'var(--tema-accent)' : 'var(--tema-surface)',
                            color: secilenKategori === kat ? '#fff' : 'var(--tema-text2)',
                        }}
                    >
                        {kat}
                    </button>
                ))}
            </div>

            {yukleniyor ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>Yükleniyor...</p>
                </div>
            ) : threads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>Bu kategoride henüz başlık yok.</p>
                    {kullanici && (
                        <button onClick={() => setModalAcik(true)} className="text-xs" style={{ color: 'var(--tema-accent)' }}>
                            İlk başlığı sen aç →
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {threads.map((t) => (
                        <ThreadKarti key={t.id} thread={t} onClick={onThreadSec} />
                    ))}
                </div>
            )}

            {toplamSayfa > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text2)', opacity: page === 1 ? 0.4 : 1 }}
                    >
                        ← Önceki
                    </button>
                    <span className="px-3 py-1.5 text-xs" style={{ color: 'var(--tema-muted)' }}>
                        {page} / {toplamSayfa}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(toplamSayfa, p + 1))}
                        disabled={page === toplamSayfa}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text2)', opacity: page === toplamSayfa ? 0.4 : 1 }}
                    >
                        Sonraki →
                    </button>
                </div>
            )}
        </div>
    );
}
