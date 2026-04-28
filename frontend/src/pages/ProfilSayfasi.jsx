import { useEffect, useState } from 'react';
import { Avatar, Field, Icon } from '../components/ui';
import { useAuth } from '../context/useAuth';
import { hesapSilAPI, profilGetirAPI, profilGuncelleAPI } from '../api/client';
import {
  buildAccountUpdatePayload,
  buildPasswordUpdatePayload,
  normalizeProfileState,
} from '../utils/profileFlow';

export default function ProfilSayfasi({ onGeri, toast }) {
  const { kullanici, cikis } = useAuth();
  const [tab, setTab] = useState('account');
  const [profile, setProfile] = useState(() => normalizeProfileState({ profile: null, authUser: kullanici }));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [accountEmail, setAccountEmail] = useState(profile.email);
  const [accountPassword, setAccountPassword] = useState('');
  const [securityCurrentPassword, setSecurityCurrentPassword] = useState('');
  const [securityNextPassword, setSecurityNextPassword] = useState('');
  const [securityConfirmPassword, setSecurityConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const response = await profilGetirAPI();
        if (!active) return;

        const normalized = normalizeProfileState({ profile: response, authUser: kullanici });
        setProfile(normalized);
        setAccountEmail(normalized.email);
      } catch {
        if (!active) return;
        setLoadError('Profil bilgileri yuklenemedi.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [kullanici]);

  const email = profile.email;
  const avatarLabel = email.split('@')[0] || 'Kullanici';

  const handleAccountSave = async () => {
    setAccountMessage('');
    setSavingAccount(true);

    try {
      const payload = buildAccountUpdatePayload({
        email: accountEmail,
        currentPassword: accountPassword,
      });
      const response = await profilGuncelleAPI(payload);
      const normalized = normalizeProfileState({ profile: response, authUser: kullanici });
      setProfile(normalized);
      setAccountEmail(normalized.email);
      setAccountPassword('');
      setAccountMessage('Profil bilgileri guncellendi. Guvenlik nedeniyle yeniden giris yapiliyor.');
      toast?.('Profil bilgileri guncellendi. Lutfen yeniden giris yapin.', 'info');
      await cikis?.();
    } catch (error) {
      setAccountMessage(error?.response?.data?.detail || error.message || 'Profil guncellenemedi.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSecuritySave = async () => {
    setSecurityMessage('');
    setSavingSecurity(true);

    try {
      const payload = buildPasswordUpdatePayload({
        currentPassword: securityCurrentPassword,
        nextPassword: securityNextPassword,
        confirmPassword: securityConfirmPassword,
      });
      await profilGuncelleAPI(payload);
      setSecurityCurrentPassword('');
      setSecurityNextPassword('');
      setSecurityConfirmPassword('');
      setSecurityMessage('Sifre guncellendi. Guvenlik nedeniyle yeniden giris yapiliyor.');
      toast?.('Sifreniz guncellendi. Lutfen yeniden giris yapin.', 'info');
      await cikis?.();
    } catch (error) {
      setSecurityMessage(error?.response?.data?.detail || error.message || 'Sifre guncellenemedi.');
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteMessage('');
    setDeletingAccount(true);

    try {
      if (!deletePassword.trim()) {
        throw new Error('Hesabi silmek icin mevcut sifre gerekli.');
      }

      await hesapSilAPI(deletePassword.trim());
      await cikis?.();
      onGeri?.();
    } catch (error) {
      setDeleteMessage(error?.response?.data?.detail || error.message || 'Hesap silinemedi.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      {onGeri && (
        <button onClick={onGeri} className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5 mb-6">
          <Icon name="arrow-left" size={14} /> Geri
        </button>
      )}

      <div className="flex items-center gap-5 mb-10">
        <Avatar name={avatarLabel} size={72} />
        <div className="text-sm text-ink-muted flex items-center gap-3 flex-wrap">
          <span>{email}</span>
          <span className="chip text-[11px] py-0.5">{profile.role?.toUpperCase() || 'USER'}</span>
        </div>
      </div>

      {loading && <div className="text-sm text-ink-muted mb-6">Profil yukleniyor...</div>}
      {loadError && <div className="text-sm mb-6" style={{ color: 'var(--danger)' }}>{loadError}</div>}

      <div className="flex items-center gap-1 hairline-b mb-8">
        {[['account', 'Hesap'], ['security', 'Guvenlik']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={'px-4 py-2.5 text-sm -mb-px border-b-2 transition ' +
              (tab === key ? 'text-ink' : 'text-ink-muted border-transparent hover:text-ink')}
            style={tab === key ? { borderColor: 'var(--accent)' } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {!loading && tab === 'account' && (
        <div className="max-w-xl space-y-5">
          <Field label="E-posta" ph={email} type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} />
          <Field
            label="Mevcut Sifre"
            ph="Kimlik dogrulama icin gerekli"
            type="password"
            value={accountPassword}
            onChange={(event) => setAccountPassword(event.target.value)}
            inputProps={{
              autoComplete: 'new-password',
              name: 'profile-current-password',
            }}
          />
          <div className="hairline-t pt-5 flex items-center gap-3">
            <button onClick={handleAccountSave} disabled={savingAccount} className="btn btn-primary">
              {savingAccount ? 'Kaydediliyor...' : 'Degisiklikleri Kaydet'}
            </button>
            <button
              onClick={() => {
                setAccountEmail(profile.email);
                setAccountPassword('');
                setAccountMessage('');
              }}
              className="btn btn-ghost text-ink-muted"
            >
              Iptal
            </button>
          </div>
          {accountMessage && (
            <p className="text-sm" style={{ color: accountMessage.includes('guncellendi') ? 'var(--success)' : 'var(--danger)' }}>
              {accountMessage}
            </p>
          )}

          <div className="hairline-t pt-6 mt-8">
            <div className="label mb-3" style={{ color: 'var(--danger)' }}>Tehlike Bolgesi</div>
            <div
              className="card p-5 flex items-center justify-between gap-6"
              style={{ borderColor: 'color-mix(in srgb,var(--danger) 30%,var(--line))' }}
            >
              <div className="flex-1">
                <div className="text-sm font-medium">Hesabi Sil</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Tum sohbet gecmisi ve belgeleriniz silinir. Bu islem geri alinamaz.
                </div>
                <div className="mt-3 max-w-sm">
                  <Field
                    label="Mevcut Sifre"
                    ph="Hesabi kalici olarak sil"
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    inputProps={{
                      autoComplete: 'new-password',
                      name: 'delete-account-password',
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="btn btn-outline text-xs"
                style={{ color: 'var(--danger)', borderColor: 'color-mix(in srgb,var(--danger) 40%,var(--line))' }}
              >
                {deletingAccount ? 'Siliniyor...' : 'Hesabi Sil'}
              </button>
            </div>
            {deleteMessage && <p className="text-sm mt-3" style={{ color: 'var(--danger)' }}>{deleteMessage}</p>}
          </div>

          {cikis && (
            <button onClick={cikis} className="btn btn-ghost text-ink-muted mt-2">
              <Icon name="log-out" size={14} /> Cikis Yap
            </button>
          )}
        </div>
      )}

      {!loading && tab === 'security' && (
        <div className="max-w-xl space-y-5">
          <Field
            label="Mevcut Sifre"
            ph="**********"
            type="password"
            value={securityCurrentPassword}
            onChange={(event) => setSecurityCurrentPassword(event.target.value)}
            inputProps={{
              autoComplete: 'new-password',
              name: 'security-current-password',
            }}
          />
          <Field
            label="Yeni Sifre"
            ph="En az 8 karakter"
            type="password"
            value={securityNextPassword}
            onChange={(event) => setSecurityNextPassword(event.target.value)}
            inputProps={{
              autoComplete: 'new-password',
              name: 'security-new-password',
            }}
          />
          <Field
            label="Yeni Sifre (Tekrar)"
            ph="**********"
            type="password"
            value={securityConfirmPassword}
            onChange={(event) => setSecurityConfirmPassword(event.target.value)}
            inputProps={{
              autoComplete: 'new-password',
              name: 'security-confirm-password',
            }}
          />
          <button onClick={handleSecuritySave} disabled={savingSecurity} className="btn btn-primary mt-2">
            {savingSecurity ? 'Guncelleniyor...' : 'Sifreyi Guncelle'}
          </button>
          {securityMessage && (
            <p className="text-sm" style={{ color: securityMessage.includes('guncellendi') ? 'var(--success)' : 'var(--danger)' }}>
              {securityMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
