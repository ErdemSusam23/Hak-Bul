import { useState, useEffect } from 'react';
import { FileText, Download, RotateCcw } from 'lucide-react';
import { taslakListesiAPI, taslakPdfUretAPI } from '../api/client';
import { useTema } from '../context/TemaContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';

export default function TaslakSayfasi() {
    const { tema } = useTema();
    const { kullanici } = useAuth();
    const [taslaklar, setTaslaklar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [secilenTaslak, setSecilenTaslak] = useState(null);
    const [formVerileri, setFormVerileri] = useState({});
    const [pdfUretiliyor, setPdfUretiliyor] = useState(false);
    const [authModalAcik, setAuthModalAcik] = useState(false);

    useEffect(() => {
        taslakListesiAPI().then((data) => {
            // Backend: { taslaklar: [{id, baslik, aciklama, alanlar:[{ad,etiket,zorunlu}]}] }
            const liste = Array.isArray(data) ? data : (data.taslaklar || []);
            setTaslaklar(liste);
            setYukleniyor(false);
        }).catch(err => {
            console.error(err);
            setYukleniyor(false);
        });
    }, []);

    const handleAlanDegistir = (ad, deger) => {
        setFormVerileri(prev => ({ ...prev, [ad]: deger }));
    };

    const handlePdfUret = async () => {
        if (!kullanici) {
            setAuthModalAcik(true);
            return;
        }

        // Zorunlu alan kontrolü
        for (let alan of secilenTaslak.alanlar) {
            if (alan.zorunlu && (!formVerileri[alan.ad] || formVerileri[alan.ad].trim() === '')) {
                alert(`Lütfen "${alan.etiket}" alanını doldurun.`);
                return;
            }
        }


        setPdfUretiliyor(true);
        try {
            const blob = await taslakPdfUretAPI(secilenTaslak.id, { alanlar: formVerileri });
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${secilenTaslak.baslik.replace(/\s+/g, '_')}_Taslak.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error('PDF üretilirken hata:', error);
            alert('Belge üretilemedi. Lütfen tekrar deneyin.');
        } finally {
            setPdfUretiliyor(false);
        }
    };

    if (yukleniyor) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
                <RotateCcw size={32} className="animate-spin text-gray-400 mb-4" />
                <p className="text-sm text-gray-500">Taslaklar yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto">
            {/* Navigasyon Çubuğu */}
            <header
                className="flex-shrink-0 flex items-center justify-between px-5 py-4"
                style={{
                    background: 'var(--tema-panel)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid var(--tema-border)',
                }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--tema-card)' }}
                    >
                        <FileText size={18} style={{ color: 'var(--tema-accent)' }} />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold tracking-wide" style={{ color: 'var(--tema-text)' }}>
                            Hukuki Belge Taslakları
                        </h2>
                        <div className="text-xs mt-0.5 font-medium flex items-center gap-1.5" style={{ color: 'var(--tema-dimmer)' }}>
                            Dilekçe ve sözleşme şablonlarını saniyeler içinde hazırlayın
                        </div>
                    </div>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className="flex-1 p-6 md:p-8 flex gap-6 max-w-6xl mx-auto w-full">
                
                {/* Sol Taraf: Taslak Listesi */}
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                    <h3 className="text-sm font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--tema-muted)' }}>Mevcut Taslaklar</h3>
                    {taslaklar.map((taslak) => (
                        <button
                            key={taslak.id}
                            onClick={() => {
                                setSecilenTaslak(taslak);
                                setFormVerileri({});
                            }}
                            className="p-4 rounded-xl text-left border transition-all duration-200"
                            style={{
                                background: secilenTaslak?.id === taslak.id ? 'var(--tema-surface)' : 'var(--tema-panel)',
                                borderColor: secilenTaslak?.id === taslak.id ? 'var(--tema-border-focus)' : 'var(--tema-border)',
                                boxShadow: secilenTaslak?.id === taslak.id ? 'var(--tema-shadow-focus)' : 'none'
                            }}
                        >
                            <h4 className="text-md font-semibold mb-1" style={{ color: 'var(--tema-text)' }}>{taslak.baslik}</h4>
                            <p className="text-xs line-clamp-2" style={{ color: 'var(--tema-dimmer)' }}>{taslak.aciklama}</p>
                        </button>
                    ))}
                    {taslaklar.length === 0 && (
                        <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>Şu an için taslak bulunmuyor.</p>
                    )}
                </div>

                {/* Sağ Taraf: Form Doldurma */}
                <div className="flex-1 rounded-xl border p-6 flex flex-col"
                     style={{
                         background: 'var(--tema-panel)',
                         borderColor: 'var(--tema-border)'
                     }}>
                    {secilenTaslak ? (
                        <>
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold mb-1" style={{ color: 'var(--tema-text)' }}>{secilenTaslak.baslik}</h3>
                                <p className="text-sm" style={{ color: 'var(--tema-dimmer)' }}>{secilenTaslak.aciklama}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto mb-6 flex flex-col gap-4">
                                {secilenTaslak.alanlar.map((alan, idx) => (
                                    <div key={idx} className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium" style={{ color: 'var(--tema-text2)' }}>
                                            {alan.etiket}{alan.zorunlu && <span style={{ color: 'var(--tema-accent)' }}> *</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={formVerileri[alan.ad] || ''}
                                            onChange={(e) => handleAlanDegistir(alan.ad, e.target.value)}
                                            className="px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                                            style={{
                                                background: 'var(--tema-surface)',
                                                borderColor: 'var(--tema-border)',
                                                color: 'var(--tema-text)'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--tema-border-focus)'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--tema-border)'}
                                            placeholder={`${alan.etiket} giriniz...`}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--tema-border)' }}>
                                <button
                                    onClick={handlePdfUret}
                                    disabled={pdfUretiliyor}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200"
                                    style={{
                                        background: 'var(--tema-accent)',
                                        color: '#fff',
                                        opacity: pdfUretiliyor ? 0.7 : 1
                                    }}
                                >
                                    {pdfUretiliyor ? (
                                        <>
                                            <RotateCcw size={18} className="animate-spin" />
                                            Hazırlanıyor...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} />
                                            PDF Olarak İndir
                                        </>
                                    )}
                                </button>
                                {!kullanici && (
                                    <p className="text-xs text-center mt-3" style={{ color: 'var(--tema-dimmer)' }}>
                                        PDF indirebilmek için giriş yapmanız gerekmektedir.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                            <FileText size={48} className="mb-4" style={{ color: 'var(--tema-muted)' }} />
                            <p className="text-md font-medium" style={{ color: 'var(--tema-text2)' }}>Soldan bir taslak seçiniz</p>
                            <p className="text-sm mt-2 max-w-xs" style={{ color: 'var(--tema-dimmer)' }}>
                                Seçtiğiniz taslak formunu doldurarak anında profesyonel hukuki belgenizi PDF olarak oluşturabilirsiniz.
                            </p>
                        </div>
                    )}
                </div>
            </main>
            {authModalAcik && <AuthModal onKapat={() => setAuthModalAcik(false)} />}
        </div>
    );
}
