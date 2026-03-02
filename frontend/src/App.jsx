import { useState, useCallback } from 'react';
import HukukiUyariModal from './components/HukukiUyariModal';
import SohbetSayfasi from './pages/SohbetSayfasi';

export default function App() {
  const [kabul, setKabul] = useState(false);

  const uyariKabul = useCallback(() => {
    setKabul(true);
  }, []);

  return (
    <div className="min-h-screen navy-gradient-bg flex flex-col">
      {/* Arkaplan dekoratif gradyanlar */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center top, rgba(212,168,83,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 opacity-10"
          style={{
            background: 'radial-gradient(ellipse at bottom right, rgba(59,130,246,0.2) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Disclaimer modal */}
      <HukukiUyariModal onKabul={uyariKabul} />

      {/* Ana içerik — modal kapanınca görünür */}
      {kabul && (
        <div className="relative flex flex-col h-screen max-w-4xl mx-auto w-full">
          <SohbetSayfasi />
        </div>
      )}
    </div>
  );
}
