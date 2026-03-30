import { useEffect, useState } from 'react';
import { Download, FileText, RotateCcw } from 'lucide-react';

import AuthModal from '../components/AuthModal';
import { taslakListesiAPI, taslakPdfUretAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDil } from '../context/DilContext';

export default function TaslakSayfasi() {
    const { kullanici } = useAuth();
    const { t, dil } = useDil();
    const [taslaklar, setTaslaklar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [secilenTaslak, setSecilenTaslak] = useState(null);
    const [formVerileri, setFormVerileri] = useState({});
    const [pdfUretiliyor, setPdfUretiliyor] = useState(false);
    const [authModalAcik, setAuthModalAcik] = useState(false);

    useEffect(() => {
        setYukleniyor(true);
        taslakListesiAPI(dil)
            .then((data) => {
                const liste = Array.isArray(data) ? data : (data.taslaklar || []);
                setTaslaklar(liste);
                setSecilenTaslak((onceki) => {
                    if (!onceki) return null;
                    return liste.find((item) => item.id === onceki.id) || null;
                });
            })
            .catch((err) => {
                console.error(err);
                setTaslaklar([]);
            })
            .finally(() => setYukleniyor(false));
    }, [dil]);

    const handleAlanDegistir = (ad, deger) => {
        setFormVerileri((prev) => ({ ...prev, [ad]: deger }));
    };

    const handlePdfUret = async () => {
        if (!kullanici) {
            setAuthModalAcik(true);
            return;
        }

        for (const alan of secilenTaslak.alanlar) {
            if (alan.zorunlu && (!formVerileri[alan.ad] || formVerileri[alan.ad].trim() === '')) {
                alert(`${t('templatesFillField')} "${alan.etiket}"`);
                return;
            }
        }

        setPdfUretiliyor(true);
        try {
            const blob = await taslakPdfUretAPI(secilenTaslak.id, { alanlar: formVerileri }, dil);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${secilenTaslak.baslik.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF üretilirken hata:', error);
            alert(t('templatesGenerateFailed'));
        } finally {
            setPdfUretiliyor(false);
        }
    };

    if (yukleniyor) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
                <RotateCcw size={32} className="animate-spin text-gray-400 mb-4" />
                <p className="text-sm text-gray-500">{t('templatesLoading')}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto">
            <header
                className="flex-shrink-0 flex items-center justify-between px-5 py-4"
                style={{
                    background: 'var(--tema-panel)',
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
                            {t('templatesTitle')}
                        </h2>
                        <div className="text-xs mt-0.5 font-medium flex items-center gap-1.5" style={{ color: 'var(--tema-dimmer)' }}>
                            {t('templatesSubtitle')}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 md:p-8 flex gap-6 max-w-6xl mx-auto w-full">
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                    <h3 className="text-sm font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--tema-muted)' }}>
                        {t('templatesAvailable')}
                    </h3>
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
                                boxShadow: secilenTaslak?.id === taslak.id ? 'var(--tema-shadow-focus)' : 'none',
                            }}
                        >
                            <h4 className="text-md font-semibold mb-1" style={{ color: 'var(--tema-text)' }}>{taslak.baslik}</h4>
                            <p className="text-xs line-clamp-2" style={{ color: 'var(--tema-dimmer)' }}>{taslak.aciklama}</p>
                        </button>
                    ))}
                    {taslaklar.length === 0 && (
                        <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>{t('templatesEmpty')}</p>
                    )}
                </div>

                <div
                    className="flex-1 rounded-xl border p-6 flex flex-col"
                    style={{
                        background: 'var(--tema-panel)',
                        borderColor: 'var(--tema-border)',
                    }}
                >
                    {secilenTaslak ? (
                        <>
                            <div className="mb-6">
                                <h3 className="text-xl font-semibold mb-1" style={{ color: 'var(--tema-text)' }}>
                                    {secilenTaslak.baslik}
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--tema-dimmer)' }}>{secilenTaslak.aciklama}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto mb-6 flex flex-col gap-4">
                                {secilenTaslak.alanlar.map((alan, index) => (
                                    <div key={index} className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium" style={{ color: 'var(--tema-text2)' }}>
                                            {alan.etiket}{alan.zorunlu && <span style={{ color: 'var(--tema-accent)' }}> *</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={formVerileri[alan.ad] || ''}
                                            onChange={(e) => handleAlanDegistir(alan.ad, e.target.value)}
                                            className="px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-[var(--tema-border-focus)]"
                                            style={{
                                                background: 'var(--tema-surface)',
                                                borderColor: 'var(--tema-border)',
                                                color: 'var(--tema-text)',
                                            }}
                                            placeholder={`${alan.etiket} ${t('templatesPlaceholderSuffix')}`}
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
                                        opacity: pdfUretiliyor ? 0.7 : 1,
                                    }}
                                >
                                    {pdfUretiliyor ? (
                                        <>
                                            <RotateCcw size={18} className="animate-spin" />
                                            {t('templatesPreparing')}
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} />
                                            {t('templatesDownloadPdf')}
                                        </>
                                    )}
                                </button>
                                {!kullanici && (
                                    <p className="text-xs text-center mt-3" style={{ color: 'var(--tema-dimmer)' }}>
                                        {t('templatesLoginRequired')}
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                            <FileText size={48} className="mb-4" style={{ color: 'var(--tema-muted)' }} />
                            <p className="text-md font-medium" style={{ color: 'var(--tema-text2)' }}>
                                {t('templatesSelectPrompt')}
                            </p>
                            <p className="text-sm mt-2 max-w-xs" style={{ color: 'var(--tema-dimmer)' }}>
                                {t('templatesSelectHint')}
                            </p>
                        </div>
                    )}
                </div>
            </main>
            {authModalAcik && <AuthModal onKapat={() => setAuthModalAcik(false)} />}
        </div>
    );
}
