import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, Lock, Unlock, Trash2, CheckCircle, ThumbsUp, ThumbsDown, BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

function formatDate(iso) {
    if (!iso) return '';
    const str = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
    return new Date(str).toLocaleDateString('tr-TR');
}

function OyButonlari({ skor, onOy, disabled }) {
    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => onOy(1)}
                disabled={disabled}
                className="p-1 rounded transition-colors hover:bg-green-500/10"
                style={{ color: 'var(--tema-muted)' }}
                title="Beğen"
            >
                <ThumbsUp size={14} />
            </button>
            <span className="text-xs font-medium w-6 text-center" style={{ color: skor >= 0 ? 'var(--tema-text2)' : '#f87171' }}>
                {skor}
            </span>
            <button
                onClick={() => onOy(-1)}
                disabled={disabled}
                className="p-1 rounded transition-colors hover:bg-red-500/10"
                style={{ color: 'var(--tema-muted)' }}
                title="Beğenme"
            >
                <ThumbsDown size={14} />
            </button>
        </div>
    );
}

export default function ForumBaslikSayfasi({ threadId, onGeri }) {
    const { kullanici } = useAuth();
    const [detay, setDetay] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [yanitMetin, setYanitMetin] = useState('');
    const [yanitGonderiliyor, setYanitGonderiliyor] = useState(false);
    const [hata, setHata] = useState('');

    const isModerator = kullanici?.rol === 'lawyer' || kullanici?.rol === 'admin';

    const yukle = useCallback(async () => {
        setYukleniyor(true);
        try {
            const data = await forumThreadDetayAPI(threadId);
            setDetay(data);
        } catch (e) {
            console.error('Thread yüklenemedi:', e);
            setDetay(null);
        } finally {
            setYukleniyor(false);
        }
    }, [threadId]);

    useEffect(() => {
        yukle();
    }, [yukle]);

    const handleThreadSil = async () => {
        if (!confirm('Bu başlığı silmek istediğinizden emin misiniz?')) return;
        try {
            await forumThreadSilAPI(threadId);
            onGeri();
        } catch (e) {
            alert(e.response?.data?.detail || 'Silinemedi.');
        }
    };

    const handleKilitle = async () => {
        const yeniDurum = !detay.thread.is_locked;
        try {
            const guncellenen = await forumThreadKilitleAPI(threadId, yeniDurum);
            setDetay((prev) => ({ ...prev, thread: guncellenen }));
        } catch (e) {
            alert(e.response?.data?.detail || 'İşlem başarısız.');
        }
    };

    const handleYanitGonder = async (e) => {
        e.preventDefault();
        if (!yanitMetin.trim()) return;
        setYanitGonderiliyor(true);
        setHata('');
        try {
            const yeniYanit = await forumYanitOlusturAPI(threadId, yanitMetin.trim());
            setDetay((prev) => ({ ...prev, replies: [...prev.replies, yeniYanit] }));
            setYanitMetin('');
        } catch (err) {
            setHata(err.response?.data?.detail || 'Yanıt gönderilemedi.');
        } finally {
            setYanitGonderiliyor(false);
        }
    };

    const handleYanitSil = async (replyId) => {
        if (!confirm('Bu yanıtı silmek istediğinizden emin misiniz?')) return;
        try {
            await forumYanitSilAPI(replyId);
            setDetay((prev) => ({ ...prev, replies: prev.replies.filter((r) => r.id !== replyId) }));
        } catch (e) {
            alert(e.response?.data?.detail || 'Silinemedi.');
        }
    };

    const handleYanitDogrula = async (replyId, mevcutDurum) => {
        try {
            const guncellenen = await forumYanitDogrulaAPI(replyId, !mevcutDurum);
            setDetay((prev) => ({
                ...prev,
                replies: prev.replies.map((r) => (r.id === replyId ? guncellenen : r)),
            }));
        } catch (e) {
            alert(e.response?.data?.detail || 'İşlem başarısız.');
        }
    };

    const handleThreadOy = async (value) => {
        if (!kullanici) return;
        try {
            const { yeni_skor } = await forumThreadOyAPI(threadId, value);
            setDetay((prev) => ({ ...prev, thread: { ...prev.thread, vote_score: yeni_skor } }));
        } catch (e) {
            console.error('Oy gönderilemedi:', e);
        }
    };

    const handleReplyOy = async (replyId, value) => {
        if (!kullanici) return;
        try {
            const { yeni_skor } = await forumReplyOyAPI(replyId, value);
            setDetay((prev) => ({
                ...prev,
                replies: prev.replies.map((r) => (r.id === replyId ? { ...r, vote_score: yeni_skor } : r)),
            }));
        } catch (e) {
            console.error('Oy gönderilemedi:', e);
        }
    };

    if (yukleniyor) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>Yükleniyor...</p>
            </div>
        );
    }

    if (!detay) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>Başlık bulunamadı.</p>
                <button onClick={onGeri} className="text-xs" style={{ color: 'var(--tema-accent)' }}>← Geri dön</button>
            </div>
        );
    }

    const { thread, replies } = detay;
    const isOwner = kullanici && kullanici.email === thread.user_email;

    return (
        <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto">
            <button
                onClick={onGeri}
                className="flex items-center gap-1 text-sm mb-4 self-start"
                style={{ color: 'var(--tema-muted)' }}
            >
                <ArrowLeft size={14} /> Forum'a dön
            </button>

            <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--tema-card)', border: '1px solid var(--tema-border)' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tema-surface)', color: 'var(--tema-accent)' }}>
                                {thread.category}
                            </span>
                            {thread.is_locked && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tema-muted)' }}>
                                    <Lock size={12} /> Kilitli
                                </span>
                            )}
                        </div>
                        <h1 className="text-lg font-bold" style={{ color: 'var(--tema-text)' }}>{thread.title}</h1>
                        <p className="text-xs mt-1" style={{ color: 'var(--tema-muted)' }}>
                            {thread.user_email} · {formatDate(thread.created_at)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <OyButonlari skor={thread.vote_score} onOy={handleThreadOy} disabled={!kullanici} />
                        {isModerator && (
                            <button onClick={handleKilitle} className="p-1.5 rounded-lg" style={{ color: 'var(--tema-muted)' }} title={thread.is_locked ? 'Kilidi Aç' : 'Kilitle'}>
                                {thread.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                            </button>
                        )}
                        {(isOwner || isModerator) && (
                            <button onClick={handleThreadSil} className="p-1.5 rounded-lg hover:text-red-400" style={{ color: 'var(--tema-muted)' }} title="Sil">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--tema-text2)' }}>{thread.content}</p>
            </div>

            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tema-muted)' }}>
                {replies.length} Yanıt
            </h2>

            <div className="flex flex-col gap-3 mb-6">
                {replies.map((reply) => {
                    const isReplyOwner = kullanici && kullanici.email === reply.user_email;
                    return (
                        <div
                            key={reply.id}
                            className="rounded-xl p-4"
                            style={{
                                background: reply.is_verified ? 'rgba(34,197,94,0.08)' : 'var(--tema-surface)',
                                border: `1px solid ${reply.is_verified ? 'rgba(34,197,94,0.3)' : 'var(--tema-border)'}`,
                            }}
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium" style={{ color: 'var(--tema-text2)' }}>{reply.user_email}</span>
                                    {reply.user_role === 'lawyer' && (
                                        <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                                            <BadgeCheck size={10} /> Avukat
                                        </span>
                                    )}
                                    {reply.is_verified && (
                                        <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                                            <CheckCircle size={10} /> Onaylı Cevap
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <OyButonlari skor={reply.vote_score} onOy={(v) => handleReplyOy(reply.id, v)} disabled={!kullanici} />
                                    {isModerator && (
                                        <button
                                            onClick={() => handleYanitDogrula(reply.id, reply.is_verified)}
                                            className="p-1 rounded"
                                            style={{ color: reply.is_verified ? '#4ade80' : 'var(--tema-muted)' }}
                                            title={reply.is_verified ? 'Onayı Kaldır' : 'Onaylı İşaretle'}
                                        >
                                            <CheckCircle size={14} />
                                        </button>
                                    )}
                                    {(isReplyOwner || isModerator) && (
                                        <button
                                            onClick={() => handleYanitSil(reply.id)}
                                            className="p-1 rounded hover:text-red-400"
                                            style={{ color: 'var(--tema-muted)' }}
                                            title="Sil"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--tema-text2)' }}>{reply.content}</p>
                            <p className="text-xs mt-2" style={{ color: 'var(--tema-dimmer)' }}>
                                {formatDate(reply.created_at)}
                            </p>
                        </div>
                    );
                })}
            </div>

            {kullanici && !thread.is_locked && (
                <form onSubmit={handleYanitGonder} className="flex flex-col gap-2">
                    <textarea
                        className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                        style={{ background: 'var(--tema-surface)', color: 'var(--tema-text)', border: '1px solid var(--tema-border)', minHeight: '80px' }}
                        placeholder="Yanıtınızı yazın..."
                        value={yanitMetin}
                        onChange={(e) => setYanitMetin(e.target.value)}
                        required
                        minLength={5}
                    />
                    {hata && <p className="text-xs text-red-400">{hata}</p>}
                    <button
                        type="submit"
                        disabled={yanitGonderiliyor}
                        className="self-end px-4 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)', opacity: yanitGonderiliyor ? 0.7 : 1 }}
                    >
                        {yanitGonderiliyor ? 'Gönderiliyor...' : 'Yanıtla'}
                    </button>
                </form>
            )}

            {!kullanici && (
                <p className="text-sm text-center py-3" style={{ color: 'var(--tema-muted)' }}>
                    Yanıt yazmak için giriş yapın.
                </p>
            )}

            {kullanici && thread.is_locked && (
                <p className="text-sm text-center py-3" style={{ color: 'var(--tema-muted)' }}>
                    Bu başlık kilitli, yeni yanıt yazılamaz.
                </p>
            )}
        </div>
    );
}
