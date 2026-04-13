import { useState, useEffect, useCallback } from 'react';
import { Plus, Lock, MessageSquare, ThumbsUp, ChevronRight } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useDil } from '../context/DilContext';
import { forumThreadListesiAPI, forumThreadOlusturAPI } from '../api/client';

const KATEGORI_KEYS = [
    { value: 'T\u00fcm\u00fc', labelTr: 'T\u00fcm\u00fc', labelEn: 'All' },
    { value: '\u0130\u015f Hukuku', labelTr: '\u0130\u015f Hukuku', labelEn: 'Labor Law' },
    { value: 'Kira Hukuku', labelTr: 'Kira Hukuku', labelEn: 'Tenancy Law' },
    { value: 'T\u00fcketici Hukuku', labelTr: 'T\u00fcketici Hukuku', labelEn: 'Consumer Law' },
    { value: 'Aile Hukuku', labelTr: 'Aile Hukuku', labelEn: 'Family Law' },
    { value: 'Ceza Hukuku', labelTr: 'Ceza Hukuku', labelEn: 'Criminal Law' },
    { value: '\u0130dare Hukuku', labelTr: '\u0130dare Hukuku', labelEn: 'Administrative Law' },
    { value: 'Ticaret Hukuku', labelTr: 'Ticaret Hukuku', labelEn: 'Commercial Law' },
    { value: 'Genel Hukuk', labelTr: 'Genel Hukuk', labelEn: 'General Law' },
];

function YeniThreadModal({ onKapat, onOlusturuldu, t, dil }) {
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
            setHata(err.response?.data?.detail || t('forumActionFailed'));
        } finally {
            setYukleniyor(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'var(--tema-panel)', border: '1px solid var(--tema-border)' }}>
                <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--tema-text)' }}>{t('forumCreateTitle')}</h2>
                <form onSubmit={handleGonder} className="flex flex-col gap-3">
                    <input
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text)', border: '1px solid var(--tema-border)' }}
                        placeholder={t('forumTitlePlaceholder')}
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
                        {KATEGORI_KEYS.filter((k) => k.value !== 'T\u00fcm\u00fc').map((k) => (
                            <option key={k.value} value={k.value}>{dil === 'en' ? k.labelEn : k.labelTr}</option>
                        ))}
                    </select>
                    <textarea
                        className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text)', border: '1px solid var(--tema-border)', minHeight: '120px' }}
                        placeholder={t('forumContentPlaceholder')}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        minLength={10}
                    />
                    {hata && <p className="text-xs text-red-400">{hata}</p>}
                    <div className="mt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onKapat}
                            className="rounded-xl px-4 py-2 text-sm"
                            style={{ background: 'var(--tema-surface)', color: 'var(--tema-muted)' }}
                        >
                            {t('forumCancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={yukleniyor}
                            className="rounded-xl px-4 py-2 text-sm font-medium"
                            style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)', opacity: yukleniyor ? 0.7 : 1 }}
                        >
                            {yukleniyor ? t('forumSubmitting') : t('forumCreateSubmit')}
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
            className="cursor-pointer rounded-xl p-4 transition-all"
            style={{ background: 'var(--tema-card)', border: '1px solid var(--tema-border)' }}
            onClick={() => onClick(thread.id)}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--tema-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--tema-border)'; }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--tema-surface)', color: 'var(--tema-accent)' }}>
                            {thread.category}
                        </span>
                        {thread.is_locked && <Lock size={12} style={{ color: 'var(--tema-muted)' }} />}
                    </div>
                    <p className="line-clamp-2 text-sm font-medium" style={{ color: 'var(--tema-text)' }}>{thread.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'var(--tema-muted)' }}>{thread.user_email}</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--tema-dimmer)', flexShrink: 0 }} />
            </div>
            <div className="mt-3 flex items-center gap-4">
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
    const { t, dil } = useDil();
    const [threads, setThreads] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [secilenKategori, setSecilenKategori] = useState('T\u00fcm\u00fc');
    const [yukleniyor, setYukleniyor] = useState(false);
    const [modalAcik, setModalAcik] = useState(false);

    const kategoriler = KATEGORI_KEYS.map((k) => ({
        value: k.value,
        label: dil === 'en' ? k.labelEn : k.labelTr,
    }));

    const yukle = useCallback(async () => {
        setYukleniyor(true);
        try {
            const category = secilenKategori === 'T\u00fcm\u00fc' ? null : secilenKategori;
            const data = await forumThreadListesiAPI({ category, page, size: 20 });
            setThreads(data.threads);
            setTotal(data.total);
        } catch (e) {
            console.error('Forum yuklenemedi:', e);
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
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto p-6">
            {modalAcik && (
                <YeniThreadModal onKapat={() => setModalAcik(false)} onOlusturuldu={handleOlusturuldu} t={t} dil={dil} />
            )}

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--tema-text)' }}>{t('forumTitle')}</h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--tema-muted)' }}>
                        {t('forumSubtitle', { total })}
                    </p>
                </div>
                {kullanici && (
                    <button
                        onClick={() => setModalAcik(true)}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
                        style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)' }}
                    >
                        <Plus size={14} /> {t('forumNewThread')}
                    </button>
                )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                {kategoriler.map((kat) => (
                    <button
                        key={kat.value}
                        onClick={() => handleKategoriDegis(kat.value)}
                        className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                            background: secilenKategori === kat.value ? 'var(--tema-accent)' : 'var(--tema-surface)',
                            color: secilenKategori === kat.value ? '#fff' : 'var(--tema-text2)',
                        }}
                    >
                        {kat.label}
                    </button>
                ))}
            </div>

            {yukleniyor ? (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>{t('forumLoading')}</p>
                </div>
            ) : threads.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2">
                    <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>{t('forumEmptyCategory')}</p>
                    {kullanici && (
                        <button onClick={() => setModalAcik(true)} className="text-xs" style={{ color: 'var(--tema-accent)' }}>
                            {t('forumFirstThread')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {threads.map((thread) => (
                        <ThreadKarti key={thread.id} thread={thread} onClick={onThreadSec} />
                    ))}
                </div>
            )}

            {toplamSayfa > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-lg px-3 py-1.5 text-xs"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text2)', opacity: page === 1 ? 0.4 : 1 }}
                    >
                        {t('forumPrev')}
                    </button>
                    <span className="px-3 py-1.5 text-xs" style={{ color: 'var(--tema-muted)' }}>
                        {page} / {toplamSayfa}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(toplamSayfa, p + 1))}
                        disabled={page === toplamSayfa}
                        className="rounded-lg px-3 py-1.5 text-xs"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text2)', opacity: page === toplamSayfa ? 0.4 : 1 }}
                    >
                        {t('forumNext')}
                    </button>
                </div>
            )}
        </div>
    );
}
