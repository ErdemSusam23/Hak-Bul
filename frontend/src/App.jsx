import { useState, useCallback, useEffect, useRef } from 'react';
import { MessageSquare, Clock, Plus, ChevronRight, FileText, BarChart2, Trash2, Pencil, Check, X, User, Download, Share2, GitCompare } from 'lucide-react';
import HukukiUyariModal from './components/HukukiUyariModal';
import AsistanBot from './components/AsistanBot';
import SohbetSayfasi from './pages/SohbetSayfasi';
import TaslakSayfasi from './pages/TaslakSayfasi';
import AdminSayfasi from './pages/AdminSayfasi';
import ProfilSayfasi from './pages/ProfilSayfasi';
import PaylasimSayfasi from './pages/PaylasimSayfasi';
import KarsilastirmaSayfasi from './pages/KarsilastirmaSayfasi';
import { TemaProvider, useTema } from './context/TemaContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DilProvider, useDil } from './context/DilContext';
import {
    sohbetGecmisiListeleAPI,
    sohbetDetayGetirAPI,
    misafirSohbetGecmisiListeleAPI,
    misafirSohbetDetayGetirAPI,
    sohbetSilAPI,
    sohbetYenidenAdlandirAPI,
    sohbetPDFIndirAPI,
    sohbetPaylasAPI,
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

function SolSidebar({ onSohbetSec, onYeniSohbet, onTaslakAc, onAdminAc, onProfilAc, onKarsilastirAc, aktifSayfa }) {
    const { kullanici } = useAuth();
    const { t, dil, dilDegistir } = useDil();
    const [sohbetler, setSohbetler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [duzenleId, setDuzenleId] = useState(null);
    const [duzenleMetin, setDuzenleMetin] = useState('');
    const duzenleInputRef = useRef(null);

    const gecmisiCek = useCallback(async () => {
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
    }, [kullanici]);

    useEffect(() => {
        gecmisiCek();
    }, [gecmisiCek]);

    useEffect(() => {
        const handler = () => gecmisiCek();
        window.addEventListener('gecmis-guncellendi', handler);
        return () => window.removeEventListener('gecmis-guncellendi', handler);
    }, [gecmisiCek]);

    const handleSohbetTikla = async (sohbet) => {
        if (duzenleId === sohbet.id) return;
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

    const handleSil = async (e, sohbetId) => {
        e.stopPropagation();
        if (!confirm(t('silOnay'))) return;
        try {
            await sohbetSilAPI(sohbetId);
            setSohbetler(prev => prev.filter(s => s.id !== sohbetId));
            window.dispatchEvent(new Event('gecmis-guncellendi'));
        } catch (err) {
            console.error('Sohbet silinemedi:', err);
        }
    };

    const handlePaylas = async (e, sohbet) => {
        e.stopPropagation();
        try {
            const { share_token } = await sohbetPaylasAPI(sohbet.id);
            const url = `${window.location.origin}/#/shared/${share_token}`;
            await navigator.clipboard.writeText(url);
            alert(t('paylasimKopyalandi'));
        } catch (err) {
            console.error('Paylaşım oluşturulamadı:', err);
        }
    };

    const handleIndir = async (e, sohbet) => {
        e.stopPropagation();
        try {
            const blob = await sohbetPDFIndirAPI(sohbet.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hak-bul-${sohbet.title?.slice(0, 30).replace(/\s+/g, '_') || sohbet.id.slice(0, 8)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF indirilemedi:', err);
        }
    };

    const handleDuzenleBaslat = (e, sohbet) => {
        e.stopPropagation();
        setDuzenleId(sohbet.id);
        setDuzenleMetin(sohbet.title || '');
        setTimeout(() => duzenleInputRef.current?.focus(), 50);
    };

    const handleDuzenleKaydet = async (sohbetId) => {
        if (!duzenleMetin.trim()) { setDuzenleId(null); return; }
        try {
            await sohbetYenidenAdlandirAPI(sohbetId, duzenleMetin.trim());
            setSohbetler(prev => prev.map(s => s.id === sohbetId ? { ...s, title: duzenleMetin.trim() } : s));
        } catch (err) {
            console.error('Yeniden adlandırılamadı:', err);
        } finally {
            setDuzenleId(null);
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
                <div className="flex gap-2">
                <button
                    onClick={onYeniSohbet}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                        background: 'var(--tema-send-btn)',
                        color: 'var(--tema-send-icon)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                    <Plus size={14} />
                    {t('yeniSohbet')}
                </button>
                <button
                    onClick={() => dilDegistir(dil === 'tr' ? 'en' : 'tr')}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150"
                    title={dil === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
                    style={{ background: 'var(--tema-surface)', color: 'var(--tema-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--tema-accent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
                >
                    {dil === 'tr' ? 'EN' : 'TR'}
                </button>
                </div>
            </div>

            {/* Sidebar başlık */}
            <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid var(--tema-border)' }}
            >
                <MessageSquare size={14} style={{ color: 'var(--tema-muted)' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>
                    {t('oncekiSorularim')}
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
                            {kullanici ? t('henuzSohbet') : t('gecmisIcinGiris')}
                        </p>
                    </div>
                ) : (
                    sohbetler.map((sohbet) => (
                        <div
                            key={sohbet.id}
                            className="group flex items-start gap-1 px-2 py-2 border-b transition-all duration-150 cursor-pointer"
                            style={{ borderColor: 'var(--tema-border)' }}
                            onClick={() => handleSohbetTikla(sohbet)}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <ChevronRight
                                size={12}
                                className="flex-shrink-0 mt-1 opacity-40 group-hover:opacity-100 transition-opacity"
                                style={{ color: 'var(--tema-accent)' }}
                            />
                            <div className="flex-1 min-w-0">
                                {duzenleId === sohbet.id ? (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                        <input
                                            ref={duzenleInputRef}
                                            value={duzenleMetin}
                                            onChange={e => setDuzenleMetin(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleDuzenleKaydet(sohbet.id);
                                                if (e.key === 'Escape') setDuzenleId(null);
                                            }}
                                            className="flex-1 text-xs rounded px-1.5 py-0.5 outline-none"
                                            style={{ background: 'var(--tema-surface)', color: 'var(--tema-text)', border: '1px solid var(--tema-border-focus)' }}
                                        />
                                        <button onClick={() => handleDuzenleKaydet(sohbet.id)} className="p-0.5 hover:text-green-400" style={{ color: 'var(--tema-muted)' }}><Check size={12} /></button>
                                        <button onClick={() => setDuzenleId(null)} className="p-0.5 hover:text-red-400" style={{ color: 'var(--tema-muted)' }}><X size={12} /></button>
                                    </div>
                                ) : (
                                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--tema-text2)' }}>
                                        {sohbet.title}
                                    </p>
                                )}
                                <p className="text-xs mt-0.5" style={{ color: 'var(--tema-dimmer)' }}>
                                    {tarihKisa(sohbet.tarih)}
                                </p>
                            </div>
                            {/* Düzenle / Sil butonları — sadece giriş yapmış kullanıcıda */}
                            {kullanici && !sohbet.misafir && duzenleId !== sohbet.id && (
                                <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handlePaylas(e, sohbet)}
                                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                        title={t('paylas')}
                                        style={{ color: 'var(--tema-muted)' }}
                                    ><Share2 size={11} /></button>
                                    <button
                                        onClick={(e) => handleIndir(e, sohbet)}
                                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                        title={t('pdfIndir')}
                                        style={{ color: 'var(--tema-muted)' }}
                                    ><Download size={11} /></button>
                                    <button
                                        onClick={(e) => handleDuzenleBaslat(e, sohbet)}
                                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                        title={t('yenidenAdlandir')}
                                        style={{ color: 'var(--tema-muted)' }}
                                    ><Pencil size={11} /></button>
                                    <button
                                        onClick={(e) => handleSil(e, sohbet.id)}
                                        className="p-1 rounded hover:text-red-400 transition-colors"
                                        title={t('sil')}
                                        style={{ color: 'var(--tema-muted)' }}
                                    ><Trash2 size={11} /></button>
                                </div>
                            )}
                        </div>
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
                    {t('belgeTaslaklari')}
                </button>
                <button
                    onClick={onKarsilastirAc}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                        background: aktifSayfa === 'karsilastir' ? 'var(--tema-surface)' : 'transparent',
                        color: aktifSayfa === 'karsilastir' ? 'var(--tema-accent)' : 'var(--tema-text2)',
                    }}
                    onMouseEnter={(e) => { if (aktifSayfa !== 'karsilastir') e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                    onMouseLeave={(e) => { if (aktifSayfa !== 'karsilastir') e.currentTarget.style.background = 'transparent'; }}
                >
                    <GitCompare size={16} />
                    {t('belgeKarsilastir')}
                </button>
                {kullanici && (
                    <button
                        onClick={onProfilAc}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                        style={{
                            background: aktifSayfa === 'profil' ? 'var(--tema-surface)' : 'transparent',
                            color: aktifSayfa === 'profil' ? 'var(--tema-accent)' : 'var(--tema-text2)',
                        }}
                        onMouseEnter={(e) => { if (aktifSayfa !== 'profil') e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                        onMouseLeave={(e) => { if (aktifSayfa !== 'profil') e.currentTarget.style.background = 'transparent'; }}
                    >
                        <User size={16} />
                        {t('profilim')}
                    </button>
                )}
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
                        {t('adminPaneli')}
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
    const [aktifSayfa, setAktifSayfa] = useState('sohbet'); // 'sohbet' | 'taslak' | 'admin' | 'profil'
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

            {/* Asistan bot — her zaman görünür */}
            {kabul && <AsistanBot />}

            {/* Ana içerik — modal kapanınca görünür */}
            {kabul && (
                <div className="relative flex h-screen w-full">
                    {/* Sol sidebar */}
                    <SolSidebar
                        onSohbetSec={handleSohbetSec}
                        onYeniSohbet={handleYeniSohbet}
                        onTaslakAc={() => setAktifSayfa('taslak')}
                        onAdminAc={() => setAktifSayfa('admin')}
                        onProfilAc={() => setAktifSayfa('profil')}
                        onKarsilastirAc={() => setAktifSayfa('karsilastir')}
                        aktifSayfa={aktifSayfa}
                    />

                    {/* Ana alan */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {aktifSayfa === 'admin' ? (
                            <AdminSayfasi />
                        ) : aktifSayfa === 'taslak' ? (
                            <TaslakSayfasi />
                        ) : aktifSayfa === 'profil' ? (
                            <ProfilSayfasi onGeri={() => setAktifSayfa('sohbet')} />
                        ) : aktifSayfa === 'karsilastir' ? (
                            <KarsilastirmaSayfasi />
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

function SharedRoute() {
    // Hash-based routing: /#/shared/TOKEN
    const hash = window.location.hash;
    const match = hash.match(/^#\/shared\/([A-Za-z0-9_-]+)$/);
    if (match) {
        return <PaylasimSayfasi shareToken={match[1]} />;
    }
    return null;
}

export default function App() {
    const hash = window.location.hash;
    const isSharedRoute = /^#\/shared\//.test(hash);

    if (isSharedRoute) {
        return (
            <TemaProvider>
                <DilProvider>
                    <SharedRoute />
                </DilProvider>
            </TemaProvider>
        );
    }

    return (
        <TemaProvider>
            <DilProvider>
                <AuthProvider>
                    <AppIcerik />
                </AuthProvider>
            </DilProvider>
        </TemaProvider>
    );
}
