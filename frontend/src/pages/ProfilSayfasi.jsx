import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Mail, Trash2, User } from 'lucide-react';

import { hesapSilAPI, profilGetirAPI, profilGuncelleAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDil } from '../context/DilContext';

function InputAlan({ label, type = 'text', value, onChange, placeholder, disabled, showToggle, onToggle }) {
    return (
        <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--tema-muted)' }}>
                {label}
            </label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                        background: 'var(--tema-surface)',
                        border: '1px solid var(--tema-border)',
                        color: 'var(--tema-text)',
                        opacity: disabled ? 0.5 : 1,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--tema-border-focus)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--tema-border)'; }}
                />
                {showToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--tema-muted)' }}
                    >
                        {type === 'password' ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ProfilSayfasi({ onGeri }) {
    const { kullanici, cikis } = useAuth();
    const { t } = useDil();
    const [profil, setProfil] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [yeniEmail, setYeniEmail] = useState('');
    const [mevcutSifre, setMevcutSifre] = useState('');
    const [yeniSifre, setYeniSifre] = useState('');
    const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
    const [showSifre, setShowSifre] = useState(false);
    const [silModu, setSilModu] = useState(false);
    const [silSifre, setSilSifre] = useState('');
    const [mesaj, setMesaj] = useState(null);
    const [kaydetYukleniyor, setKaydetYukleniyor] = useState(false);

    useEffect(() => {
        profilGetirAPI()
            .then((data) => {
                setProfil(data);
                setYeniEmail(data.email);
            })
            .catch(() => setMesaj({ tip: 'hata', metin: t('profileLoadFailed') }))
            .finally(() => setYukleniyor(false));
    }, [t]);

    const handleKaydet = async (e) => {
        e.preventDefault();
        setMesaj(null);

        if (yeniSifre && yeniSifre !== yeniSifreTekrar) {
            setMesaj({ tip: 'hata', metin: t('passwordsMismatch') });
            return;
        }
        if (!mevcutSifre) {
            setMesaj({ tip: 'hata', metin: t('currentPasswordPrompt') });
            return;
        }

        setKaydetYukleniyor(true);
        try {
            const payload = { mevcut_sifre: mevcutSifre };
            if (yeniEmail !== profil?.email) payload.email = yeniEmail;
            if (yeniSifre) payload.yeni_sifre = yeniSifre;

            const updated = await profilGuncelleAPI(payload);
            setProfil(updated);
            setMevcutSifre('');
            setYeniSifre('');
            setYeniSifreTekrar('');
            setMesaj({ tip: 'basari', metin: t('profileUpdated') });
        } catch (err) {
            const status = err?.response?.status;
            const metin =
                status === 401 ? t('wrongCurrentPassword') :
                status === 409 ? t('emailInUse') :
                t('profileUpdateFailed');
            setMesaj({ tip: 'hata', metin });
        } finally {
            setKaydetYukleniyor(false);
        }
    };

    const handleHesapSil = async () => {
        if (!silSifre) {
            setMesaj({ tip: 'hata', metin: t('enterPassword') });
            return;
        }

        setKaydetYukleniyor(true);
        try {
            await hesapSilAPI(silSifre);
            await cikis();
        } catch (err) {
            const status = err?.response?.status;
            setMesaj({ tip: 'hata', metin: status === 401 ? t('passwordWrong') : t('deleteFailed') });
            setKaydetYukleniyor(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <header
                className="flex-shrink-0 flex items-center gap-3 px-6 py-4"
                style={{ background: 'var(--tema-panel)', borderBottom: '1px solid var(--tema-border)' }}
            >
                <button
                    onClick={onGeri}
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: 'var(--tema-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tema-card-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(var(--a), 0.1)', border: '1px solid rgba(var(--a), 0.2)' }}
                >
                    <User size={18} style={{ color: 'var(--tema-accent)' }} />
                </div>
                <div>
                    <h1 className="font-semibold text-base leading-none" style={{ color: 'var(--tema-text)' }}>
                        {t('profileTitle')}
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tema-muted)' }}>
                        {profil?.email || kullanici?.email}
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-lg mx-auto space-y-6">
                    {yukleniyor ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--tema-accent)', borderTopColor: 'transparent' }} />
                        </div>
                    ) : (
                        <>
                            {mesaj && (
                                <div
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                                    style={{
                                        background: mesaj.tip === 'basari' ? 'rgba(166,227,161,0.1)' : 'rgba(243,139,168,0.1)',
                                        border: `1px solid ${mesaj.tip === 'basari' ? 'rgba(166,227,161,0.3)' : 'rgba(243,139,168,0.3)'}`,
                                        color: mesaj.tip === 'basari' ? '#a6e3a1' : '#f38ba8',
                                    }}
                                >
                                    {mesaj.tip === 'basari' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                                    {mesaj.metin}
                                </div>
                            )}

                            <div
                                className="rounded-2xl p-5 space-y-4"
                                style={{ background: 'var(--tema-card)', border: '1px solid var(--tema-border)' }}
                            >
                                <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--tema-text)' }}>
                                    <Mail size={15} style={{ color: 'var(--tema-accent)' }} />
                                    {t('profileInfo')}
                                </h2>

                                <form onSubmit={handleKaydet} className="space-y-3">
                                    <InputAlan
                                        label={t('emailAddress')}
                                        type="email"
                                        value={yeniEmail}
                                        onChange={(e) => setYeniEmail(e.target.value)}
                                        placeholder="ornek@email.com"
                                        disabled={kaydetYukleniyor}
                                    />

                                    <div className="pt-1 border-t" style={{ borderColor: 'var(--tema-border)' }}>
                                        <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: 'var(--tema-muted)' }}>
                                            <Lock size={11} />
                                            {t('passwordChange')}
                                        </p>
                                        <div className="space-y-3">
                                            <InputAlan
                                                label={t('newPassword')}
                                                type={showSifre ? 'text' : 'password'}
                                                value={yeniSifre}
                                                onChange={(e) => setYeniSifre(e.target.value)}
                                                placeholder="En az 8 karakter"
                                                disabled={kaydetYukleniyor}
                                                showToggle
                                                onToggle={() => setShowSifre((value) => !value)}
                                            />
                                            <InputAlan
                                                label={t('newPasswordRepeat')}
                                                type={showSifre ? 'text' : 'password'}
                                                value={yeniSifreTekrar}
                                                onChange={(e) => setYeniSifreTekrar(e.target.value)}
                                                placeholder={t('newPasswordRepeat')}
                                                disabled={kaydetYukleniyor}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-1 border-t" style={{ borderColor: 'var(--tema-border)' }}>
                                        <InputAlan
                                            label={t('currentPasswordRequired')}
                                            type="password"
                                            value={mevcutSifre}
                                            onChange={(e) => setMevcutSifre(e.target.value)}
                                            placeholder={t('currentPasswordRequired')}
                                            disabled={kaydetYukleniyor}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={kaydetYukleniyor}
                                        className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                                        style={{
                                            background: 'var(--tema-send-btn)',
                                            color: 'var(--tema-send-icon)',
                                            opacity: kaydetYukleniyor ? 0.6 : 1,
                                        }}
                                    >
                                        {kaydetYukleniyor ? t('saving') : t('saveChanges')}
                                    </button>
                                </form>
                            </div>

                            <div
                                className="rounded-2xl p-5 space-y-3"
                                style={{ background: 'rgba(243,139,168,0.05)', border: '1px solid rgba(243,139,168,0.2)' }}
                            >
                                <h2 className="font-semibold text-sm flex items-center gap-2 text-red-400">
                                    <Trash2 size={15} />
                                    {t('deleteAccount')}
                                </h2>
                                <p className="text-xs" style={{ color: 'var(--tema-muted)' }}>
                                    {t('deleteAccountWarning')}
                                </p>
                                {!silModu ? (
                                    <button
                                        onClick={() => setSilModu(true)}
                                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                                        style={{ background: 'rgba(243,139,168,0.1)', color: '#f38ba8', border: '1px solid rgba(243,139,168,0.3)' }}
                                    >
                                        {t('deleteAccount')}
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <InputAlan
                                            label={t('confirmPassword')}
                                            type="password"
                                            value={silSifre}
                                            onChange={(e) => setSilSifre(e.target.value)}
                                            placeholder={t('confirmPassword')}
                                            disabled={kaydetYukleniyor}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleHesapSil}
                                                disabled={kaydetYukleniyor}
                                                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                                                style={{ background: '#f38ba8', color: '#1e1e2e' }}
                                            >
                                                {t('confirmDelete')}
                                            </button>
                                            <button
                                                onClick={() => { setSilModu(false); setSilSifre(''); }}
                                                className="flex-1 py-2 rounded-xl text-sm font-medium"
                                                style={{ background: 'var(--tema-card)', color: 'var(--tema-text2)', border: '1px solid var(--tema-border)' }}
                                            >
                                                {t('cancel')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
