import { useState, useCallback, useEffect } from 'react';
import { MessageSquare, Clock, Star, Plus, ChevronRight } from 'lucide-react';
import HukukiUyariModal from './components/HukukiUyariModal';
import SohbetSayfasi from './pages/SohbetSayfasi';
import { TemaProvider, useTema } from './context/TemaContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { sohbetleriGetir } from './utils/sohbetStore';

function tarihKisa(isoStr) {
    const tarih = new Date(isoStr);
    const simdi = new Date();
    const fark = simdi - tarih;
    const dakika = Math.floor(fark / 60000);
    const saat = Math.floor(fark / 3600000);
    const gun = Math.floor(fark / 86400000);
    if (dakika < 1) return 'Az önce';
    if (dakika < 60) return `${dakika}dk`;
    if (saat < 24) return `${saat}sa`;
    if (gun < 7) return `${gun}g`;
    return tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function SolSidebar({ onSohbetSec, onYeniSohbet }) {
    const { kullanici } = useAuth();
    const [sohbetler, setSohbetler] = useState([]);

    // İlk yükleme + kullanıcı değişince sohbetleri çek
    useEffect(() => {
        setSohbetler(kullanici?.email ? sohbetleriGetir(kullanici.email) : []);
    }, [kullanici]);

    // Sohbet kaydedilince güncelle (custom event)
    useEffect(() => {
        const handler = () => {
            if (kullanici?.email) setSohbetler(sohbetleriGetir(kullanici.email));
        };
        window.addEventListener('gecmis-guncellendi', handler);
        return () => window.removeEventListener('gecmis-guncellendi', handler);
    }, [kullanici]);

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
                            onClick={() => onSohbetSec(sohbet)}
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
                className="px-4 py-3"
                style={{ borderTop: '1px solid var(--tema-border)' }}
            >
                <div className="flex items-center gap-2">
                    <Star size={13} style={{ color: 'var(--tema-dimmer)' }} />
                    <span className="text-xs" style={{ color: 'var(--tema-dimmer)' }}>
                        Yakında: Favori sorular
                    </span>
                </div>
            </div>
        </aside>
    );
}

function AppIcerik() {
    const [kabul, setKabul] = useState(false);
    const [secilenSohbet, setSecilenSohbet] = useState(null);
    const [temizleSinyali, setTemizleSinyali] = useState(0);
    const { tema } = useTema();

    const uyariKabul = useCallback(() => {
        setKabul(true);
    }, []);

    const handleYeniSohbet = useCallback(() => {
        setTemizleSinyali((v) => v + 1);
    }, []);

    const handleSohbetSec = useCallback((sohbet) => {
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
                    />

                    {/* Sohbet alanı */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <SohbetSayfasi
                            secilenSohbet={secilenSohbet}
                            onSoruIslendi={() => setSecilenSohbet(null)}
                            temizleSinyali={temizleSinyali}
                        />
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
