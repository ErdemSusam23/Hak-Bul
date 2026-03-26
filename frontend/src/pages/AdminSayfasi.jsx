import { useState, useEffect } from 'react';
import { BarChart2, Users, MessageSquare, ThumbsUp, TrendingUp, RotateCcw, ShieldCheck, ShieldOff, UserCheck, AlertTriangle } from 'lucide-react';
import {
    adminIstatistikAPI,
    adminKategoriDagilimiAPI,
    adminFeedbackOzetiAPI,
    adminGunlukAktiviteAPI,
    adminKullaniciListesiAPI,
    adminRolGuncelleAPI,
    adminKullaniciDurumAPI,
    adminZayifSorguListesiAPI,
} from '../api/client';

function StatKarti({ ikon: Ikon, baslik, deger, renk }) {
    return (
        <div
            className="rounded-xl p-5 border flex items-center gap-4"
            style={{ background: 'var(--tema-panel)', borderColor: 'var(--tema-border)' }}
        >
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${renk}20`, border: `1px solid ${renk}40` }}
            >
                <Ikon size={22} style={{ color: renk }} />
            </div>
            <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--tema-muted)' }}>{baslik}</p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--tema-text)' }}>
                    {deger !== null && deger !== undefined ? deger.toLocaleString('tr-TR') : '—'}
                </p>
            </div>
        </div>
    );
}

function KullaniciYonetimi() {
    const [kullanicilar, setKullanicilar] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);

    useEffect(() => {
        adminKullaniciListesiAPI()
            .then(data => setKullanicilar(data.kullanicilar || []))
            .catch(() => {})
            .finally(() => setYukleniyor(false));
    }, []);

    const handleRolDegistir = async (userId, mevcutRol) => {
        const yeniRol = mevcutRol === 'admin' ? 'user' : 'admin';
        if (!confirm(`${yeniRol === 'admin' ? 'Admin' : 'Kullanıcı'} rolüne geçirilsin mi?`)) return;
        try {
            const updated = await adminRolGuncelleAPI(userId, yeniRol);
            setKullanicilar(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
        } catch (err) {
            alert('Rol güncellenemedi: ' + (err?.response?.data?.detail || err.message));
        }
    };

    const handleDurumDegistir = async (userId, aktif) => {
        if (!confirm(aktif ? 'Hesap aktif edilsin mi?' : 'Hesap askıya alınsın mı?')) return;
        try {
            const updated = await adminKullaniciDurumAPI(userId, aktif);
            setKullanicilar(prev => prev.map(u => u.id === userId ? { ...u, is_active: updated.is_active } : u));
        } catch (err) {
            alert('Durum güncellenemedi: ' + (err?.response?.data?.detail || err.message));
        }
    };

    if (yukleniyor) return <div className="flex justify-center py-8"><RotateCcw size={20} className="animate-spin" style={{ color: 'var(--tema-muted)' }} /></div>;

    return (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--tema-panel)', borderColor: 'var(--tema-border)' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--tema-border)' }}>
                <UserCheck size={16} style={{ color: 'var(--tema-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--tema-text)' }}>Kullanıcı Yönetimi</h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tema-surface)', color: 'var(--tema-muted)' }}>
                    {kullanicilar.length} kullanıcı
                </span>
            </div>
            {kullanicilar.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: 'var(--tema-muted)' }}>Henüz kayıtlı kullanıcı yok.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--tema-border)', background: 'var(--tema-surface)' }}>
                                <th className="text-left px-5 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>E-posta</th>
                                <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>Rol</th>
                                <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>Durum</th>
                                <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>Kayıt</th>
                                <th className="text-right px-5 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kullanicilar.map((u) => (
                                <tr key={u.id} className="border-b transition-colors" style={{ borderColor: 'var(--tema-border)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <td className="px-5 py-3" style={{ color: 'var(--tema-text)' }}>{u.email}</td>
                                    <td className="px-3 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.role === 'admin' ? 'text-yellow-400' : ''}`}
                                            style={{ background: u.role === 'admin' ? 'rgba(250,204,21,0.15)' : 'var(--tema-surface)', color: u.role === 'admin' ? '#facc15' : 'var(--tema-muted)' }}>
                                            {u.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className="text-xs font-medium" style={{ color: u.is_active ? '#a6e3a1' : '#f38ba8' }}>
                                            {u.is_active ? 'Aktif' : 'Askıda'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--tema-dimmer)' }}>
                                        {new Date(u.created_at).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => handleRolDegistir(u.id, u.role)}
                                                title={u.role === 'admin' ? 'Admin yetkisini kaldır' : 'Admin yap'}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ color: 'var(--tema-muted)' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#facc15'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
                                            >
                                                <ShieldCheck size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDurumDegistir(u.id, !u.is_active)}
                                                title={u.is_active ? 'Askıya al' : 'Aktif et'}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ color: 'var(--tema-muted)' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = u.is_active ? '#f38ba8' : '#a6e3a1'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--tema-muted)'; }}
                                            >
                                                <ShieldOff size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function ZayifSorgular() {
    const [sorgular, setSorgular] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);

    useEffect(() => {
        adminZayifSorguListesiAPI()
            .then(data => setSorgular(data || []))
            .catch(() => {})
            .finally(() => setYukleniyor(false));
    }, []);

    if (yukleniyor) return <div className="flex justify-center py-8"><RotateCcw size={20} className="animate-spin" style={{ color: 'var(--tema-muted)' }} /></div>;

    return (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--tema-panel)', borderColor: 'var(--tema-border)' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--tema-border)' }}>
                <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--tema-text)' }}>Zayıf Sorgular</h3>
                <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: 'var(--tema-surface)', color: 'var(--tema-muted)' }}>
                    {sorgular.length} sorgu
                </span>
            </div>
            <p className="px-5 py-2 text-xs" style={{ color: 'var(--tema-dimmer)', borderBottom: '1px solid var(--tema-border)' }}>
                Kaynak bulunamayan veya düşük skorlu sorgular — içerik zenginleştirmesi için fırsat.
            </p>
            {sorgular.length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: 'var(--tema-muted)' }}>Henüz zayıf sorgu kaydı yok.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--tema-border)', background: 'var(--tema-surface)' }}>
                                <th className="text-left px-5 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>Sorgu</th>
                                <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>Maks. Skor</th>
                                <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>Kategori</th>
                                <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--tema-muted)' }}>Tarih</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorgular.map((s) => (
                                <tr key={s.id} className="border-b" style={{ borderColor: 'var(--tema-border)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <td className="px-5 py-3 max-w-xs" style={{ color: 'var(--tema-text)' }}>
                                        <span className="line-clamp-2">{s.soru}</span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
                                            background: s.max_skor < 0.2 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: s.max_skor < 0.2 ? '#f87171' : '#fbbf24',
                                        }}>
                                            {s.max_skor.toFixed(3)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--tema-muted)' }}>{s.kategori || '—'}</td>
                                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--tema-dimmer)' }}>
                                        {new Date(s.created_at).toLocaleDateString('tr-TR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function AdminSayfasi() {
    const [istatistik, setIstatistik] = useState(null);
    const [kategoriler, setKategoriler] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [gunluk, setGunluk] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [aktifSekme, setAktifSekme] = useState('istatistik');

    useEffect(() => {
        Promise.all([
            adminIstatistikAPI(),
            adminKategoriDagilimiAPI(),
            adminFeedbackOzetiAPI(),
            adminGunlukAktiviteAPI(7),
        ]).then(([ist, kat, fb, gun]) => {
            setIstatistik(ist);
            setKategoriler(kat);
            setFeedback(fb);
            setGunluk(gun);
            setYukleniyor(false);
        }).catch(err => {
            console.error('Admin istatistikleri yüklenemedi:', err);
            setYukleniyor(false);
        });
    }, []);

    if (yukleniyor) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <RotateCcw size={28} className="animate-spin" style={{ color: 'var(--tema-muted)' }} />
            </div>
        );
    }

    const begenOrani = feedback?.toplam > 0
        ? Math.round((feedback.begeni / feedback.toplam) * 100)
        : 0;

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <header
                className="flex-shrink-0 flex items-center gap-3 px-6 py-4"
                style={{
                    background: 'var(--tema-panel)',
                    borderBottom: '1px solid var(--tema-border)',
                }}
            >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(var(--a), 0.12)', border: '1px solid rgba(var(--a), 0.25)' }}>
                    <BarChart2 size={18} style={{ color: 'var(--tema-accent)' }} />
                </div>
                <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--tema-text)' }}>Admin Paneli</h2>
                    <p className="text-xs" style={{ color: 'var(--tema-dimmer)' }}>Sistem istatistikleri</p>
                </div>
            </header>

            {/* Sekmeler */}
            <div className="flex gap-1 px-6 pt-4" style={{ borderBottom: '1px solid var(--tema-border)' }}>
                {[{ id: 'istatistik', label: 'İstatistikler' }, { id: 'kullanicilar', label: 'Kullanıcılar' }, { id: 'zayif', label: 'Zayıf Sorgular' }].map(s => (
                    <button
                        key={s.id}
                        onClick={() => setAktifSekme(s.id)}
                        className="px-4 py-2 text-sm font-medium rounded-t-xl transition-all"
                        style={{
                            background: aktifSekme === s.id ? 'var(--tema-surface)' : 'transparent',
                            color: aktifSekme === s.id ? 'var(--tema-accent)' : 'var(--tema-muted)',
                            borderBottom: aktifSekme === s.id ? '2px solid var(--tema-accent)' : '2px solid transparent',
                        }}
                    >{s.label}</button>
                ))}
            </div>

            <main className="flex-1 p-6 flex flex-col gap-6 max-w-5xl mx-auto w-full">
                {aktifSekme === 'kullanicilar' ? (
                    <KullaniciYonetimi />
                ) : aktifSekme === 'zayif' ? (
                    <ZayifSorgular />
                ) : null}

                {aktifSekme !== 'istatistik' ? null : <>
                {/* İstatistik Kartları */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatKarti ikon={Users} baslik="Toplam Kullanıcı" deger={istatistik?.toplam_kullanici} renk="#6366f1" />
                    <StatKarti ikon={MessageSquare} baslik="Toplam Mesaj" deger={istatistik?.toplam_mesaj} renk="#22c55e" />
                    <StatKarti ikon={TrendingUp} baslik="Konuşma" deger={istatistik?.toplam_konusma} renk="#f59e0b" />
                    <StatKarti ikon={ThumbsUp} baslik="Feedback" deger={feedback ? feedback.toplam : null} renk="#ec4899" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Kategori Dağılımı */}
                    <div className="rounded-xl border p-5" style={{ background: 'var(--tema-panel)', borderColor: 'var(--tema-border)' }}>
                        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--tema-text)' }}>Kategori Dağılımı</h3>
                        {kategoriler.length === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>Henüz veri yok.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {kategoriler.map((kat, i) => {
                                    const maks = Math.max(...kategoriler.map(k => k.sayi));
                                    const yuzde = maks > 0 ? (kat.sayi / maks) * 100 : 0;
                                    return (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--tema-text2)' }}>
                                                <span>{kat.kategori}</span>
                                                <span className="font-semibold">{kat.sayi}</span>
                                            </div>
                                            <div className="w-full rounded-full h-1.5" style={{ background: 'var(--tema-border)' }}>
                                                <div
                                                    className="h-1.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${yuzde}%`, background: 'var(--tema-accent)' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Feedback Özeti */}
                    <div className="rounded-xl border p-5" style={{ background: 'var(--tema-panel)', borderColor: 'var(--tema-border)' }}>
                        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--tema-text)' }}>Geri Bildirim Özeti</h3>
                        {!feedback || feedback.toplam === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>Henüz geri bildirim yok.</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-center">
                                    <div className="relative w-28 h-28">
                                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--tema-border)" strokeWidth="12" />
                                            <circle
                                                cx="50" cy="50" r="40" fill="none"
                                                stroke="var(--tema-accent)" strokeWidth="12"
                                                strokeDasharray={`${2 * Math.PI * 40 * begenOrani / 100} ${2 * Math.PI * 40 * (1 - begenOrani / 100)}`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl font-bold" style={{ color: 'var(--tema-text)' }}>{begenOrani}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="rounded-xl p-3" style={{ background: 'var(--tema-surface)' }}>
                                        <p className="text-xl font-bold text-green-500">👍 {feedback.begeni}</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--tema-dimmer)' }}>Beğendi</p>
                                    </div>
                                    <div className="rounded-xl p-3" style={{ background: 'var(--tema-surface)' }}>
                                        <p className="text-xl font-bold text-red-400">👎 {feedback.begenmeme}</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--tema-dimmer)' }}>Beğenmedi</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Günlük Aktivite */}
                <div className="rounded-xl border p-5" style={{ background: 'var(--tema-panel)', borderColor: 'var(--tema-border)' }}>
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--tema-text)' }}>Son 7 Gün — Günlük Aktivite</h3>
                    {gunluk.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--tema-muted)' }}>Henüz aktivite verisi yok.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--tema-border)' }}>
                                        <th className="text-left pb-2 font-medium" style={{ color: 'var(--tema-muted)' }}>Tarih</th>
                                        <th className="text-right pb-2 font-medium" style={{ color: 'var(--tema-muted)' }}>Mesaj</th>
                                        <th className="text-right pb-2 font-medium" style={{ color: 'var(--tema-muted)' }}>Konuşma</th>
                                        <th className="text-right pb-2 font-medium" style={{ color: 'var(--tema-muted)' }}>Kullanıcı</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gunluk.map((g, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--tema-border)' }}>
                                            <td className="py-2" style={{ color: 'var(--tema-text2)' }}>{g.tarih}</td>
                                            <td className="py-2 text-right" style={{ color: 'var(--tema-text)' }}>{g.mesaj_sayisi ?? '—'}</td>
                                            <td className="py-2 text-right" style={{ color: 'var(--tema-text)' }}>{g.konusma_sayisi ?? '—'}</td>
                                            <td className="py-2 text-right" style={{ color: 'var(--tema-text)' }}>{g.kullanici_sayisi ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                </>}
            </main>
        </div>
    );
}
