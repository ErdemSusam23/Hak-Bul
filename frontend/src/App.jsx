import { useState, useCallback, useEffect } from 'react';
import { MessageSquare, Clock, Star, Plus, ChevronRight, FileText, BarChart2 } from 'lucide-react';
import HukukiUyariModal from './components/HukukiUyariModal';
import SohbetSayfasi from './pages/SohbetSayfasi';
import TaslakSayfasi from './pages/TaslakSayfasi';
import AdminSayfasi from './pages/AdminSayfasi';
import { TemaProvider, useTema } from './context/TemaContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
    sohbetGecmisiListeleAPI,
    sohbetDetayGetirAPI,
    misafirSohbetGecmisiListeleAPI,
    misafirSohbetDetayGetirAPI,
} from './api/client';

function tarihKisa(isoStr) {
    if (!isoStr) return '';
    // Backend'den gelen tarih UTC ancak sonunda 'Z' olmayabilir,
    // Türkiye +3 saat olduğu için tarayıcı bunu yerel saat sanarsa '3 saat uzaklıkta' görünür.
    const gercekStr = isoStr.endsWith('Z') ? isoStr : `${isoStr}Z`;
    const tarih = new Date(gercekStr);
    const simdi = new Date();
    let fark = simdi - tarih;
    
    // Eğer hafif senkron farkı varsa negatif olabilir
    if (fark < 0) fark = 0;

    const dakika = Math.floor(fark / 60000);
    const saat = Math.floor(fark / 3600000);
    const gun = Math.floor(fark / 86400000);

    if (dakika < 1) return 'Az önce';
    if (dakika < 60) return `${dakika}dk`;
    if (saat < 24) return `${saat}sa`;
    if (gun < 7) return `${gun}g`;
    return tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function SolSidebar({ onSohbetSec, onYeniSohbet, onTaslakAc, onAdminAc, aktifSayfa }) {
    const { kullanici } = useAuth();
    const [sohbetler, setSohbetler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);

    const gecmisiCek = async () => {
        setYukleniyor(true);
        try {
            if (kullanici?.token) {
                // Giriş yapmış kullanıcı geçmişi
                const data = await sohbetGecmisiListeleAPI();
                const formatli = data.conversations.map(c => ({
                    id: c.conversation_id,
                    title: c.title || `Sohbet (${c.message_count} mesaj)`,
                    tarih: c.last_message_at,
                }));
                setSohbetler(formatli);
            } else {
                // Misafir kullanıcı geçmişi
                const guestId = localStorage.getItem('hakbul_guest_session_id');
                if (guestId) {
                    const data = await misafirSohbetGecmisiListeleAPI(guestId);
                    const formatli = (data.conversations || []).map(c => ({
                        id: c.conversation_id,
                        title: c.title || `Sohbet (${c.message_count} mesaj)`,
                        tarih: c.last_message_at,
                        misafir: true,
                    }));
                    setSohbetler(formatli);
                } else {
                    setSohbetler([]);
                }
            }
        } catch (e) {
            console.error('Geçmiş çekilemedi:', e);
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => {
        gecmisiCek();
    }, [kullanici]);

    useEffect(() => {
        const handler = () => gecmisiCek();
        window.addEventListener('gecmis-guncellendi', handler);
        return () => window.removeEventListener('gecmis-guncellendi', handler);
    }, [kullanici]);

    const handleSohbetTikla = async (sohbet) => {
        try {
            let detay;
            if (sohbet.misafir) {
                const guestId = localStorage.getItem('hakbul_guest_session_id');
                detay = await misafirSohbetDetayGetirAPI(sohbet.id, guestId);
            } else {
                detay = await sohbetDetayGetirAPI(sohbet.id);
            }
            onSohbetSec({
                id: sohbet.id,
                mesajlar: detay.messages.map(m => ({
                    id: m.id,
                    rol: m.role === 'user' ? 'kullanici' : 'asistan',
                    icerik: m.content,
                    kategori: 'Geçmiş',
                    zaman: m.created_at,
                    kaynaklar: m.kaynaklar || []
                }))
            });
        } catch (e) {
            console.error('Sohbet detayı çekilemedi:', e);
        }
    };

    return (
        <aside
            className="flex flex-col w-64 flex-shrink-0 h-screen"
            style={{
                background: 'var(--tema-panel)',
                borderRight: '1px solid var(--tema-border)',
            }}
        >
            {/* Yeni Sohbet butonu */}
            <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--tema-border)' }}>
                <button
                    onClick={onYeniSohbet}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                        background: 'var(--tema-send-btn)',
                        color: 'var(--tema-send-icon)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                    <Plus size={14} />
                    Yeni Sohbet
                </button>
            </div>

            {/* Sidebar başlık */}
            <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid var(--tema-border)' }}
            >
                <MessageSquare size={14} style={{ color: 'var(--tema-muted)' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                    Önceki Sorularım
                </span>
            </div>

            {/* Sohbet listesi */}
            <div className="flex-1 overflow-y-auto">
                {sohbetler.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                            style={{ background: 'var(--tema-card)' }}
                        >
                            <Clock size={18} style={{ color: 'var(--tema-dimmer)' }} />
                        </div>
                        <p className="text-xs" style={{ color: 'var(--tema-dimmer)' }}>
                            {kullanici ? 'Henüz sohbet başlatılmadı' : 'Geçmişi görmek için\ngiriş yapın'}
                        </p>
                    </div>
                ) : (
                    sohbetler.map((sohbet) => (
                        <button
                            key={sohbet.id}
                            onClick={() => handleSohbetTikla(sohbet)}
                            className="w-full flex items-start gap-2 px-3 py-2.5 text-left transition-all duration-150 group border-b"
                            style={{ borderColor: 'var(--tema-border)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <ChevronRight
                                size={12}
                                className="flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity"
                                style={{ color: 'var(--tema-accent)' }}
                            />
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-xs leading-relaxed line-clamp-2"
                                    style={{ color: 'var(--tema-text2)' }}
                                >
                                    {sohbet.title}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--tema-dimmer)' }}>
                                    {tarihKisa(sohbet.tarih)}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Alt kısım */}
            <div
                className="px-3 py-3 flex flex-col gap-1"
                style={{ borderTop: '1px solid var(--tema-border)' }}
            >
                <button
                    onClick={onTaslakAc}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                        background: aktifSayfa === 'taslak' ? 'var(--tema-surface)' : 'transparent',
                        color: aktifSayfa === 'taslak' ? 'var(--tema-accent)' : 'var(--tema-text2)',
                    }}
                    onMouseEnter={(e) => { if (aktifSayfa !== 'taslak') e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                    onMouseLeave={(e) => { if (aktifSayfa !== 'taslak') e.currentTarget.style.background = 'transparent'; }}
                >
                    <FileText size={16} />
                    Belge Taslakları
                </button>
                {kullanici?.rol === 'admin' && (
                    <button
                        onClick={onAdminAc}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                        style={{
                            background: aktifSayfa === 'admin' ? 'var(--tema-surface)' : 'transparent',
                            color: aktifSayfa === 'admin' ? 'var(--tema-accent)' : 'var(--tema-text2)',
                        }}
                        onMouseEnter={(e) => { if (aktifSayfa !== 'admin') e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                        onMouseLeave={(e) => { if (aktifSayfa !== 'admin') e.currentTarget.style.background = 'transparent'; }}
                    >
                        <BarChart2 size={16} />
                        Admin Paneli
                    </button>
                )}
            </div>
        </aside>
    );
}

function AppIcerik() {
    const [kabul, setKabul] = useState(false);
    const [secilenSohbet, setSecilenSohbet] = useState(null);
    const [temizleSinyali, setTemizleSinyali] = useState(0);
    const [aktifSayfa, setAktifSayfa] = useState('sohbet'); // 'sohbet' | 'taslak' | 'admin'
    const { tema } = useTema();

    const uyariKabul = useCallback(() => {
        setKabul(true);
    }, []);

    const handleYeniSohbet = useCallback(() => {
        setAktifSayfa('sohbet');
        setTemizleSinyali((v) => v + 1);
    }, []);

    const handleSohbetSec = useCallback((sohbet) => {
        setAktifSayfa('sohbet');
        setSecilenSohbet(sohbet);
    }, []);

    return (
        <div className={`min-h-screen navy-gradient-bg ${tema === 'acik' ? 'tema-acik' : ''}`}>
            {/* Arkaplan dekoratif gradyanlar */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20"
                    style={{ background: `radial-gradient(ellipse at center top, var(--tema-glow-top) 0%, transparent 70%)` }}
                />
                <div
                    className="absolute bottom-0 right-0 w-80 h-80 opacity-10"
                    style={{ background: `radial-gradient(ellipse at bottom right, var(--tema-glow-bottom) 0%, transparent 70%)` }}
                />
            </div>

            {/* Disclaimer modal */}
            <HukukiUyariModal onKabul={uyariKabul} />

            {/* Ana içerik — modal kapanınca görünür */}
            {kabul && (
                <div className="relative flex h-screen w-full">
                    {/* Sol sidebar */}
                    <SolSidebar
                        onSohbetSec={handleSohbetSec}
                        onYeniSohbet={handleYeniSohbet}
                        onTaslakAc={() => setAktifSayfa('taslak')}
                        onAdminAc={() => setAktifSayfa('admin')}
                        aktifSayfa={aktifSayfa}
                    />

                    {/* Ana alan */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {aktifSayfa === 'admin' ? (
                            <AdminSayfasi />
                        ) : aktifSayfa === 'taslak' ? (
                            <TaslakSayfasi />
                        ) : (
                            <SohbetSayfasi
                                secilenSohbet={secilenSohbet}
                                onSoruIslendi={() => setSecilenSohbet(null)}
                                temizleSinyali={temizleSinyali}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function App() {
    return (
        <TemaProvider>
            <AuthProvider>
                <AppIcerik />
            </AuthProvider>
        </TemaProvider>
    );
}
