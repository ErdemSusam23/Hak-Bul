import { useState, useEffect } from 'react';
import { Share2, RotateCcw, AlertTriangle } from 'lucide-react';
import { paylasimSohbetGetirAPI } from '../api/client';
import ReactMarkdown from 'react-markdown';

export default function PaylasimSayfasi({ shareToken }) {
    const [mesajlar, setMesajlar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState(null);

    useEffect(() => {
        if (!shareToken) return;
        paylasimSohbetGetirAPI(shareToken)
            .then(data => setMesajlar(data.messages || []))
            .catch(() => setHata('Bu paylaşım bağlantısı bulunamadı veya devre dışı bırakıldı.'))
            .finally(() => setYukleniyor(false));
    }, [shareToken]);

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--tema-bg)', color: 'var(--tema-text)' }}>
            {/* Header */}
            <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: 'var(--tema-panel)', borderColor: 'var(--tema-border)' }}>
                <Share2 size={18} style={{ color: 'var(--tema-accent)' }} />
                <div>
                    <h1 className="text-sm font-semibold" style={{ color: 'var(--tema-text)' }}>Hak-Bul — Paylaşılan Sohbet</h1>
                    <p className="text-xs" style={{ color: 'var(--tema-dimmer)' }}>Bu sohbet salt okunur olarak paylaşıldı</p>
                </div>
                <a
                    href="/"
                    className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--tema-send-btn)', color: 'var(--tema-send-icon)' }}
                >
                    Uygulamaya Git
                </a>
            </header>

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
                {yukleniyor ? (
                    <div className="flex justify-center py-16">
                        <RotateCcw size={28} className="animate-spin" style={{ color: 'var(--tema-muted)' }} />
                    </div>
                ) : hata ? (
                    <div className="flex flex-col items-center py-16 gap-3">
                        <AlertTriangle size={32} style={{ color: '#f59e0b' }} />
                        <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>{hata}</p>
                    </div>
                ) : mesajlar.length === 0 ? (
                    <p className="text-sm text-center py-16" style={{ color: 'var(--tema-muted)' }}>Sohbet boş.</p>
                ) : (
                    mesajlar.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className="max-w-xl rounded-xl px-4 py-3"
                                style={{
                                    background: msg.role === 'user' ? 'var(--tema-send-btn)' : 'var(--tema-panel)',
                                    color: msg.role === 'user' ? 'var(--tema-send-icon)' : 'var(--tema-text)',
                                    border: msg.role !== 'user' ? '1px solid var(--tema-border)' : 'none',
                                }}
                            >
                                <div className="text-xs mb-1 font-medium" style={{ opacity: 0.6 }}>
                                    {msg.role === 'user' ? 'Kullanıcı' : 'Hak-Bul'}
                                </div>
                                <div className="text-sm prose prose-sm max-w-none" style={{ color: 'inherit' }}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            <footer className="text-center py-4 text-xs" style={{ color: 'var(--tema-dimmer)', borderTop: '1px solid var(--tema-border)' }}>
                Bu içerik bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz.
            </footer>
        </div>
    );
}
