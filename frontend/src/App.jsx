import { useState, useCallback } from 'react';
import { MessageSquare, Clock, Star } from 'lucide-react';
import HukukiUyariModal from './components/HukukiUyariModal';
import SohbetSayfasi from './pages/SohbetSayfasi';
import { TemaProvider, useTema } from './context/TemaContext';
import { AuthProvider } from './context/AuthContext';

function SolSidebar() {
    return (
        <aside
            className="flex flex-col w-64 flex-shrink-0 h-screen"
            style={{
                background: 'var(--tema-panel)',
                borderRight: '1px solid var(--tema-border)',
            }}
        >
            {/* Sidebar başlık */}
            <div
                className="px-4 py-4 flex items-center gap-2"
                style={{ borderBottom: '1px solid var(--tema-border)' }}
            >
                <MessageSquare size={15} style={{ color: 'var(--tema-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--tema-muted)' }}>
                    Önceki Sorularım
                </span>
            </div>

            {/* Boş durum */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'var(--tema-card)' }}
                >
                    <Clock size={18} style={{ color: 'var(--tema-dimmer)' }} />
                </div>
                <p className="text-xs" style={{ color: 'var(--tema-dimmer)' }}>
                    Henüz soru sorulmadı
                </p>
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
    const { tema } = useTema();

    const uyariKabul = useCallback(() => {
        setKabul(true);
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
                    <SolSidebar />

                    {/* Sohbet alanı */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <SohbetSayfasi />
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
