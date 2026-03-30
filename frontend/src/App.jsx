import { useState, useCallback, useEffect, useRef } from 'react';
import {
    MessageSquare,
    Plus,
    FileText,
    BarChart2,
    Check,
    X,
    User,
    GitCompare,
    MoreHorizontal,
    BookOpen,
    Scale,
} from 'lucide-react';
import HukukiUyariModal from './components/HukukiUyariModal';
import AsistanBot from './components/AsistanBot';
import SohbetSayfasi from './pages/SohbetSayfasi';
import TaslakSayfasi from './pages/TaslakSayfasi';
import AdminSayfasi from './pages/AdminSayfasi';
import ProfilSayfasi from './pages/ProfilSayfasi';
import PaylasimSayfasi from './pages/PaylasimSayfasi';
import KarsilastirmaSayfasi from './pages/KarsilastirmaSayfasi';
import ForumSayfasi from './pages/ForumSayfasi';
import ForumBaslikSayfasi from './pages/ForumBaslikSayfasi';
import { TemaProvider, useTema } from './context/TemaContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DilProvider, useDil } from './context/DilContext';
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
} from './api/client';

function tarihKisa(isoStr) {
    if (!isoStr) return '';
    const gercekStr = isoStr.endsWith('Z') ? isoStr : `${isoStr}Z`;
    const tarih = new Date(gercekStr);
    const simdi = new Date();
    let fark = simdi - tarih;

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

function SidebarNavButton({ icon: Icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-150"
            style={{
                background: active ? 'var(--tema-soft-bg)' : 'transparent',
                color: active ? 'var(--tema-text)' : 'var(--tema-text2)',
                border: active ? '1px solid var(--tema-border-card)' : '1px solid transparent',
            }}
            onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--tema-soft-bg-subtle)';
            }}
            onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
            }}
        >
            <Icon size={16} style={{ color: active ? 'var(--tema-accent-soft)' : 'var(--tema-muted)' }} />
            <span>{label}</span>
        </button>
    );
}

function SolSidebar({
    onSohbetSec,
    onYeniSohbet,
    onTaslakAc,
    onAdminAc,
    onProfilAc,
    onKarsilastirAc,
    onForumAc,
    aktifSayfa,
    aktifSohbetId,
    onSohbetSilindi,
}) {
    const { kullanici } = useAuth();
    const { t, dil, dilDegistir } = useDil();
    const [sohbetler, setSohbetler] = useState([]);
    const [duzenleId, setDuzenleId] = useState(null);
    const [duzenleMetin, setDuzenleMetin] = useState('');
    const [menuAcikId, setMenuAcikId] = useState(null);
    const duzenleInputRef = useRef(null);

    const gecmisiCek = useCallback(async () => {
        try {
            if (kullanici?.token) {
                const data = await sohbetGecmisiListeleAPI();
                setSohbetler(
                    data.conversations.map((c) => ({
                        id: c.conversation_id,
                        title: c.title || `Sohbet (${c.message_count} mesaj)`,
                        tarih: c.last_message_at,
                    })),
                );
                return;
            }

            const data = await misafirSohbetGecmisiListeleAPI();
            setSohbetler(
                (data.conversations || []).map((c) => ({
                    id: c.conversation_id,
                    title: c.title || `Sohbet (${c.message_count} mesaj)`,
                    tarih: c.last_message_at,
                    misafir: true,
                })),
            );
        } catch (e) {
            console.error('Gecmis cekilemedi:', e);
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

    useEffect(() => {
        if (!menuAcikId) return;
        const closeMenu = () => setMenuAcikId(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, [menuAcikId]);

    const handleSohbetTikla = async (sohbet) => {
        if (duzenleId === sohbet.id) return;
        try {
            const detay = sohbet.misafir
                ? await misafirSohbetDetayGetirAPI(sohbet.id)
                : await sohbetDetayGetirAPI(sohbet.id);

            onSohbetSec({
                id: sohbet.id,
                mesajlar: detay.messages.map((m) => ({
                    id: m.id,
                    rol: m.role === 'user' ? 'kullanici' : 'asistan',
                    icerik: m.content,
                    kategori: 'Geçmiş',
                    zaman: m.created_at,
                    kaynaklar: m.kaynaklar || [],
                })),
            });
        } catch (e) {
            console.error('Sohbet detayi cekilemedi:', e);
        }
    };

    const handleSil = async (e, sohbet) => {
        e.stopPropagation();
        if (!confirm(t('silOnay'))) return;

        try {
            if (sohbet.misafir) {
                await misafirSohbetSilAPI(sohbet.id);
            } else {
                await sohbetSilAPI(sohbet.id);
            }

            setSohbetler((prev) => prev.filter((s) => s.id !== sohbet.id));
            setMenuAcikId(null);
            onSohbetSilindi?.(sohbet.id);
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
            setMenuAcikId(null);
        } catch (err) {
            console.error('Paylasim olusturulamadi:', err);
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
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setMenuAcikId(null);
        } catch (err) {
            console.error('PDF indirilemedi:', err);
                            alert('PDF indirilemedi. Lütfen tekrar deneyin.');
        }
    };

    const handleDuzenleBaslat = (e, sohbet) => {
        e.stopPropagation();
        setDuzenleId(sohbet.id);
        setDuzenleMetin(sohbet.title || '');
        setMenuAcikId(null);
        setTimeout(() => duzenleInputRef.current?.focus(), 50);
    };

    const handleDuzenleKaydet = async (sohbetId) => {
        if (!duzenleMetin.trim()) {
            setDuzenleId(null);
            return;
        }

        try {
            await sohbetYenidenAdlandirAPI(sohbetId, duzenleMetin.trim());
            setSohbetler((prev) => prev.map((s) => (s.id === sohbetId ? { ...s, title: duzenleMetin.trim() } : s)));
        } catch (err) {
            console.error('Yeniden adlandirilamadi:', err);
        } finally {
            setDuzenleId(null);
        }
    };

    const navItems = [
        { key: 'forum', icon: BookOpen, label: 'Forum', onClick: onForumAc },
        { key: 'taslak', icon: FileText, label: t('belgeTaslaklari'), onClick: onTaslakAc },
        { key: 'karsilastir', icon: GitCompare, label: t('belgeKarsilastir'), onClick: onKarsilastirAc },
        ...(kullanici ? [{ key: 'profil', icon: User, label: t('profilim'), onClick: onProfilAc }] : []),
        ...(kullanici?.rol === 'admin' ? [{ key: 'admin', icon: BarChart2, label: t('adminPaneli'), onClick: onAdminAc }] : []),
    ];

    return (
        <aside
            className="flex h-screen w-[282px] shrink-0 flex-col px-3 pb-3 pt-4"
            style={{
                background: 'var(--tema-panel)',
                borderRight: '1px solid var(--tema-border-strong)',
                backdropFilter: 'blur(18px)',
            }}
        >
            <div className="mb-4 px-3">
                <div className="mb-4 flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-2xl"
                        style={{
                            background: 'var(--tema-soft-bg-subtle)',
                            border: '1px solid var(--tema-border-card)',
                        }}
                    >
                        <Scale size={18} style={{ color: 'var(--tema-accent-soft)' }} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-serif text-[1.56rem] leading-[0.98] tracking-[-0.02em]" style={{ color: 'var(--tema-text)' }}>
                            Hak-Bul
                        </h1>
                        <p className="mt-1 text-[11px]" style={{ color: 'var(--tema-muted)' }}>
                            {t('turkHukukAsistani')}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onYeniSohbet}
                        className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-3 text-[13.5px] font-medium transition-all duration-150"
                        style={{
                            background: 'var(--tema-soft-bg-subtle)',
                            border: '1px solid var(--tema-border-card)',
                            color: 'var(--tema-text)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--tema-soft-bg)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--tema-soft-bg-subtle)';
                        }}
                    >
                        <Plus size={16} />
                        {t('yeniSohbet')}
                    </button>
                    <button
                        onClick={() => dilDegistir(dil === 'tr' ? 'en' : 'tr')}
                        className="rounded-2xl px-3 text-xs font-semibold tracking-[0.12em]"
                        style={{
                            background: 'var(--tema-soft-bg-subtle)',
                            border: '1px solid var(--tema-border-card)',
                            color: 'var(--tema-muted)',
                        }}
                    >
                        {dil === 'tr' ? 'EN' : 'TR'}
                    </button>
                </div>
            </div>

            <div className="mb-5 space-y-1 px-2">
                <SidebarNavButton
                    icon={MessageSquare}
                    label={t('oncekiSorularim')}
                    active={aktifSayfa === 'sohbet'}
                    onClick={onYeniSohbet}
                />
                {navItems.map((item) => (
                    <SidebarNavButton
                        key={item.key}
                        icon={item.icon}
                        label={item.label}
                        active={aktifSayfa === item.key}
                        onClick={item.onClick}
                    />
                ))}
            </div>

            <div className="px-3 pb-2">
                <p
                    className="text-[11px] font-medium uppercase tracking-[0.22em]"
                    style={{ color: 'var(--tema-dimmer)' }}
                >
                    {t('recentChats')}
                </p>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto px-1">
                {sohbetler.length === 0 ? (
                    <div
                        className="mx-2 rounded-3xl px-4 py-5 text-[13.5px]"
                        style={{
                            background: 'var(--tema-soft-bg-subtle)',
                            border: '1px solid var(--tema-border-card)',
                            color: 'var(--tema-dimmer)',
                        }}
                    >
                        {kullanici ? t('henuzSohbet') : t('gecmisIcinGiris')}
                    </div>
                ) : (
                    sohbetler.map((sohbet) => {
                        const aktif = aktifSayfa === 'sohbet' && aktifSohbetId === sohbet.id;

                        return (
                            <div
                                key={sohbet.id}
                                className="group relative rounded-2xl px-3 py-3 transition-all duration-150"
                                style={{
                                    background: aktif ? 'var(--tema-soft-bg)' : 'transparent',
                                    border: aktif ? '1px solid var(--tema-border-card)' : '1px solid transparent',
                                }}
                                onClick={() => handleSohbetTikla(sohbet)}
                                onMouseEnter={(e) => {
                                    if (!aktif) e.currentTarget.style.background = 'var(--tema-soft-bg-subtle)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!aktif) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div className="flex items-start gap-2">
                                    <div
                                        className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                                        style={{ background: aktif ? 'var(--tema-accent)' : 'var(--tema-border-strong)' }}
                                    />

                                    <div className="min-w-0 flex-1">
                                        {duzenleId === sohbet.id ? (
                                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    ref={duzenleInputRef}
                                                    value={duzenleMetin}
                                                    onChange={(e) => setDuzenleMetin(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleDuzenleKaydet(sohbet.id);
                                                        if (e.key === 'Escape') setDuzenleId(null);
                                                    }}
                                                    className="flex-1 rounded-xl px-2 py-1.5 text-xs outline-none"
                                                    style={{
                                                        background: 'var(--tema-surface)',
                                                        color: 'var(--tema-text)',
                                                        border: '1px solid var(--tema-border-focus)',
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleDuzenleKaydet(sohbet.id)}
                                                    className="p-1"
                                                    style={{ color: 'var(--tema-muted)' }}
                                                >
                                                    <Check size={12} />
                                                </button>
                                                <button
                                                    onClick={() => setDuzenleId(null)}
                                                    className="p-1"
                                                    style={{ color: 'var(--tema-muted)' }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="line-clamp-2 text-[13px] leading-[1.45]" style={{ color: 'var(--tema-text2)' }}>
                                                    {sohbet.title}
                                                </p>
                                                <p className="mt-1 text-[11px]" style={{ color: 'var(--tema-dimmer)' }}>
                                                    {tarihKisa(sohbet.tarih)}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {duzenleId !== sohbet.id && (
                                        <div className="relative flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuAcikId((onceki) => (onceki === sohbet.id ? null : sohbet.id));
                                                }}
                                                className="rounded-xl p-1.5"
                                                style={{ color: 'var(--tema-muted)' }}
                                            >
                                                <MoreHorizontal size={14} />
                                            </button>

                                            {menuAcikId === sohbet.id && (
                                                <div
                                                    className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-2xl py-1"
                                                    style={{
                                                        background: 'var(--tema-surface)',
                                                        border: '1px solid var(--tema-border-card)',
                                                        boxShadow: '0 16px 30px rgba(0,0,0,0.26)',
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {!sohbet.misafir && (
                                                        <>
                                                            <button
                                                                onClick={(e) => handlePaylas(e, sohbet)}
                                                                className="w-full px-3 py-2 text-left text-xs transition-colors"
                                                                style={{ color: 'var(--tema-text2)' }}
                                                            >
                                                                {t('paylas')}
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleIndir(e, sohbet)}
                                                                className="w-full px-3 py-2 text-left text-xs transition-colors"
                                                                style={{ color: 'var(--tema-text2)' }}
                                                            >
                                                                {t('pdfIndir')}
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDuzenleBaslat(e, sohbet)}
                                                                className="w-full px-3 py-2 text-left text-xs transition-colors"
                                                                style={{ color: 'var(--tema-text2)' }}
                                                            >
                                                                {t('yenidenAdlandir')}
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleSil(e, sohbet)}
                                                        className="w-full px-3 py-2 text-left text-xs transition-colors"
                                                        style={{ color: 'var(--tema-text2)' }}
                                                    >
                                                        {t('sil')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div
                className="mt-3 flex items-center gap-3 rounded-3xl px-3 py-3"
                style={{
                    background: 'var(--tema-soft-bg-subtle)',
                    border: '1px solid var(--tema-border-card)',
                }}
            >
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                        background: 'var(--tema-soft-bg-strong)',
                        color: 'var(--tema-text)',
                    }}
                >
                    {(kullanici?.email || 'M').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px]" style={{ color: 'var(--tema-text)' }}>
                        {kullanici?.email || 'Misafir'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--tema-dimmer)' }}>
                        {kullanici ? t('accountOwned') : t('guestSession')}
                    </p>
                </div>
            </div>
        </aside>
    );
}

function AppIcerik() {
    const [kabul, setKabul] = useState(false);
    const [secilenSohbet, setSecilenSohbet] = useState(null);
    const [aktifSohbetId, setAktifSohbetId] = useState(null);
    const [temizleSinyali, setTemizleSinyali] = useState(0);
    const [aktifSayfa, setAktifSayfa] = useState('sohbet');
    const [aktifForumThread, setAktifForumThread] = useState(null);
    const { tema } = useTema();

    const uyariKabul = useCallback(() => {
        setKabul(true);
    }, []);

    const handleYeniSohbet = useCallback(() => {
        setAktifSayfa('sohbet');
        setAktifForumThread(null);
        setSecilenSohbet(null);
        setAktifSohbetId(null);
        setTemizleSinyali((v) => v + 1);
    }, []);

    const handleSohbetSec = useCallback((sohbet) => {
        setAktifSayfa('sohbet');
        setAktifForumThread(null);
        setSecilenSohbet(sohbet);
        setAktifSohbetId(sohbet?.id || null);
    }, []);

    const handleSohbetSilindi = useCallback((silinenId) => {
        if (aktifSohbetId !== silinenId) return;
        setSecilenSohbet(null);
        setAktifSohbetId(null);
        setTemizleSinyali((v) => v + 1);
    }, [aktifSohbetId]);

    useEffect(() => {
        const handleAuthCikis = () => {
            setAktifSayfa('sohbet');
            setAktifForumThread(null);
            setSecilenSohbet(null);
            setAktifSohbetId(null);
            setTemizleSinyali((v) => v + 1);
        };
        window.addEventListener('auth-cikis', handleAuthCikis);
        return () => window.removeEventListener('auth-cikis', handleAuthCikis);
    }, []);

    return (
        <div className={`min-h-screen navy-gradient-bg ${tema === 'acik' ? 'tema-acik' : ''}`}>
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute left-1/2 top-0 h-[340px] w-[780px] -translate-x-1/2 opacity-80"
                    style={{ background: 'radial-gradient(circle at top, var(--tema-glow-top) 0%, transparent 72%)' }}
                />
                <div
                    className="absolute bottom-[-120px] left-1/3 h-[320px] w-[520px] opacity-70"
                    style={{ background: 'radial-gradient(circle, var(--tema-glow-bottom) 0%, transparent 74%)' }}
                />
            </div>

            <HukukiUyariModal onKabul={uyariKabul} />
            {kabul && <AsistanBot />}

            {kabul && (
                <div className="relative flex h-screen w-full overflow-hidden">
                    <SolSidebar
                        onSohbetSec={handleSohbetSec}
                        onYeniSohbet={handleYeniSohbet}
                        onTaslakAc={() => setAktifSayfa('taslak')}
                        onAdminAc={() => setAktifSayfa('admin')}
                        onProfilAc={() => setAktifSayfa('profil')}
                        onKarsilastirAc={() => setAktifSayfa('karsilastir')}
                        onForumAc={() => {
                            setAktifSayfa('forum');
                            setAktifForumThread(null);
                        }}
                        aktifSayfa={aktifSayfa}
                        aktifSohbetId={aktifSohbetId}
                        onSohbetSilindi={handleSohbetSilindi}
                    />

                    <div className="flex min-w-0 flex-1 flex-col">
                        {aktifSayfa === 'admin' ? (
                            <AdminSayfasi />
                        ) : aktifSayfa === 'taslak' ? (
                            <TaslakSayfasi />
                        ) : aktifSayfa === 'profil' ? (
                            <ProfilSayfasi onGeri={() => setAktifSayfa('sohbet')} />
                        ) : aktifSayfa === 'karsilastir' ? (
                            <KarsilastirmaSayfasi />
                        ) : aktifSayfa === 'forum' ? (
                            aktifForumThread ? (
                                <ForumBaslikSayfasi
                                    threadId={aktifForumThread}
                                    onGeri={() => setAktifForumThread(null)}
                                />
                            ) : (
                                <ForumSayfasi onThreadSec={(id) => setAktifForumThread(id)} />
                            )
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
