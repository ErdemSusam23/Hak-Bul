import { useState, useRef } from 'react';
import { GitCompare, Upload, RotateCcw, FileText, AlertTriangle } from 'lucide-react';
import { dokumanKarsilastirAPI } from '../api/client';
import ReactMarkdown from 'react-markdown';

export default function KarsilastirmaSayfasi() {
    const [dosya1, setDosya1] = useState(null);
    const [dosya2, setDosya2] = useState(null);
    const [soru, setSoru] = useState('Bu iki belge arasındaki temel farklar ve dikkat etmem gereken maddeler nelerdir?');
    const [sonuc, setSonuc] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState(null);
    const ref1 = useRef();
    const ref2 = useRef();

    const handleKarsilastir = async () => {
        if (!dosya1 || !dosya2) {
            setHata('İki PDF dosyası da seçilmelidir.');
            return;
        }
        setHata(null);
        setSonuc(null);
        setYukleniyor(true);
        try {
            const data = await dokumanKarsilastirAPI({ dosya1, dosya2, soru });
            setSonuc(data);
        } catch (err) {
            setHata(err?.response?.data?.detail || 'Karşılaştırma yapılamadı.');
        } finally {
            setYukleniyor(false);
        }
    };

    const DosyaSecici = ({ label, dosya, setDosya, inputRef }) => (
        <div
            className="flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
            style={{
                borderColor: dosya ? 'var(--tema-accent)' : 'var(--tema-border)',
                background: dosya ? 'var(--tema-card)' : 'transparent',
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f?.type === 'application/pdf') setDosya(f);
            }}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setDosya(e.target.files[0] || null)}
            />
            {dosya ? (
                <>
                    <FileText size={28} style={{ color: 'var(--tema-accent)' }} />
                    <div className="text-center">
                        <p className="text-sm font-medium" style={{ color: 'var(--tema-text)' }}>{dosya.name}</p>
                        <p className="text-xs" style={{ color: 'var(--tema-muted)' }}>
                            {(dosya.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDosya(null); }}
                        className="text-xs px-2 py-1 rounded transition-colors"
                        style={{ color: 'var(--tema-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
                    >
                        Kaldır
                    </button>
                </>
            ) : (
                <>
                    <Upload size={24} style={{ color: 'var(--tema-dimmer)' }} />
                    <div className="text-center">
                        <p className="text-sm font-medium" style={{ color: 'var(--tema-text2)' }}>{label}</p>
                        <p className="text-xs" style={{ color: 'var(--tema-dimmer)' }}>PDF sürükle veya tıkla</p>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
            <header
                className="flex-shrink-0 flex items-center gap-3 px-6 py-4"
                style={{ background: 'var(--tema-panel)', borderBottom: '1px solid var(--tema-border)' }}
            >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(var(--a), 0.12)', border: '1px solid rgba(var(--a), 0.25)' }}>
                    <GitCompare size={18} style={{ color: 'var(--tema-accent)' }} />
                </div>
                <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--tema-text)' }}>Belge Karşılaştırma</h2>
                    <p className="text-xs" style={{ color: 'var(--tema-dimmer)' }}>İki PDF'i yükleyip AI ile karşılaştırın</p>
                </div>
            </header>

            <main className="flex-1 p-6 flex flex-col gap-5 max-w-4xl mx-auto w-full">
                {/* Dosya seçiciler */}
                <div className="flex gap-4">
                    <DosyaSecici label="1. Belge" dosya={dosya1} setDosya={setDosya1} inputRef={ref1} />
                    <DosyaSecici label="2. Belge" dosya={dosya2} setDosya={setDosya2} inputRef={ref2} />
                </div>

                {/* Soru alanı */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium" style={{ color: 'var(--tema-muted)' }}>
                        Karşılaştırma sorusu
                    </label>
                    <textarea
                        value={soru}
                        onChange={(e) => setSoru(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all"
                        style={{
                            background: 'var(--tema-surface)',
                            color: 'var(--tema-text)',
                            border: '1px solid var(--tema-border)',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--tema-border-focus)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--tema-border)'; }}
                    />
                </div>

                {/* Buton */}
                <button
                    onClick={handleKarsilastir}
                    disabled={yukleniyor || !dosya1 || !dosya2}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                        background: 'var(--tema-send-btn)',
                        color: 'var(--tema-send-icon)',
                        opacity: (yukleniyor || !dosya1 || !dosya2) ? 0.5 : 1,
                        cursor: (yukleniyor || !dosya1 || !dosya2) ? 'not-allowed' : 'pointer',
                    }}
                >
                    {yukleniyor ? (
                        <><RotateCcw size={16} className="animate-spin" /> Karşılaştırılıyor...</>
                    ) : (
                        <><GitCompare size={16} /> Karşılaştır</>
                    )}
                </button>

                {/* Hata */}
                {hata && (
                    <div className="flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                        <p className="text-sm" style={{ color: '#f87171' }}>{hata}</p>
                    </div>
                )}

                {/* Sonuç */}
                {sonuc && (
                    <div className="flex flex-col gap-4">
                        {/* Belge özetleri */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { baslik: `📄 ${dosya1?.name}`, ozet: sonuc.belge1_ozet },
                                { baslik: `📄 ${dosya2?.name}`, ozet: sonuc.belge2_ozet },
                            ].map((b, i) => (
                                <div key={i} className="rounded-xl p-4 border" style={{ background: 'var(--tema-card)', borderColor: 'var(--tema-border)' }}>
                                    <p className="text-xs font-semibold mb-2 truncate" style={{ color: 'var(--tema-accent)' }}>{b.baslik}</p>
                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--tema-muted)' }}>{b.ozet}</p>
                                </div>
                            ))}
                        </div>

                        {/* AI analiz */}
                        <div className="rounded-xl p-5 border" style={{ background: 'var(--tema-panel)', borderColor: 'var(--tema-border)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <GitCompare size={14} style={{ color: 'var(--tema-accent)' }} />
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--tema-text)' }}>Karşılaştırma Analizi</h3>
                                <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tema-surface)', color: 'var(--tema-muted)' }}>
                                    {sonuc.kategori}
                                </span>
                            </div>
                            <div className="prose prose-sm max-w-none text-sm" style={{ color: 'var(--tema-text)' }}>
                                <ReactMarkdown>{sonuc.yanit}</ReactMarkdown>
                            </div>
                        </div>

                        <p className="text-xs text-center" style={{ color: 'var(--tema-dimmer)' }}>
                            Bu analiz bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
