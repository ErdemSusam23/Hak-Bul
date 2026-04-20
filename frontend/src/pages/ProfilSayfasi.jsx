import { useState } from 'react';
import { Icon, Avatar, SectionHeader, Field, Toggle } from '../components/ui';
import { useAuth } from '../context/useAuth';
import { conversations } from '../data/mockData';

export default function ProfilSayfasi({ onGeri }) {
  const { kullanici, cikis } = useAuth();
  const [tab, setTab] = useState('account');

  const email = kullanici?.email || 'kullanici@example.com';
  const isim = email.split('@')[0];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 overflow-auto h-full" style={{ background: 'var(--bg)' }}>
      {onGeri && (
        <button onClick={onGeri} className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5 mb-6">
          <Icon name="arrow-left" size={14} /> Geri
        </button>
      )}

      {/* Profile header */}
      <div className="flex items-center gap-5 mb-10">
        <div className="relative">
          <Avatar name={isim} size={72} />
          <button
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full border border-line flex items-center justify-center"
            style={{ background: 'var(--surface)' }}
          >
            <Icon name="camera" size={13} className="text-ink-muted" />
          </button>
        </div>
        <div>
          <div className="label mb-1">Kullanıcı</div>
          <h1 className="font-display text-[36px] leading-none" style={{ letterSpacing: '-0.02em' }}>
            {isim}
          </h1>
          <div className="text-sm text-ink-muted mt-1.5 flex items-center gap-3 flex-wrap">
            <span>{email}</span>
            <span className="chip text-[11px] py-0.5">{kullanici?.rol?.toUpperCase() || 'USER'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 hairline-b mb-8">
        {[['account', 'Hesap'], ['security', 'Güvenlik'], ['history', 'Sohbet Geçmişi']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={'px-4 py-2.5 text-sm -mb-px border-b-2 transition ' +
              (tab === k ? 'text-ink' : 'text-ink-muted border-transparent hover:text-ink')}
            style={tab === k ? { borderColor: 'var(--accent)' } : {}}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Account tab */}
      {tab === 'account' && (
        <div className="max-w-xl space-y-5">
          <Field label="Görünen Ad" ph={isim} />
          <Field label="E-posta" ph={email} type="email" />
          <Field label="Telefon (isteğe bağlı)" ph="+90 5XX XXX XX XX" />
          <div className="hairline-t pt-5 flex items-center gap-3">
            <button className="btn btn-primary">Değişiklikleri Kaydet</button>
            <button className="btn btn-ghost text-ink-muted">İptal</button>
          </div>

          <div className="hairline-t pt-6 mt-8">
            <div className="label mb-3" style={{ color: 'var(--danger)' }}>Tehlike Bölgesi</div>
            <div
              className="card p-5 flex items-center justify-between"
              style={{ borderColor: 'color-mix(in srgb,var(--danger) 30%,var(--line))' }}
            >
              <div>
                <div className="text-sm font-medium">Hesabı Sil</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Tüm sohbet geçmişi ve belgeleriniz silinir. Bu işlem geri alınamaz.
                </div>
              </div>
              <button
                className="btn btn-outline text-xs"
                style={{ color: 'var(--danger)', borderColor: 'color-mix(in srgb,var(--danger) 40%,var(--line))' }}
              >
                Hesabı Sil
              </button>
            </div>
          </div>

          {cikis && (
            <button onClick={cikis} className="btn btn-ghost text-ink-muted mt-2">
              <Icon name="log-out" size={14} /> Çıkış Yap
            </button>
          )}
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="max-w-xl space-y-5">
          <Field label="Mevcut Şifre" ph="••••••••••" type="password" />
          <Field label="Yeni Şifre" ph="En az 8 karakter" type="password" />
          <Field label="Yeni Şifre (Tekrar)" ph="••••••••••" type="password" />
          <button className="btn btn-primary mt-2">Şifreyi Güncelle</button>

          <div className="hairline-t pt-6 mt-8">
            <div className="label mb-3">İki Faktörlü Doğrulama</div>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">SMS ile 2FA</div>
                <div className="text-xs text-ink-muted mt-0.5">Girişte SMS doğrulama kodu istenir</div>
              </div>
              <Toggle />
            </div>
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="label">Sohbet Geçmişi · {conversations.length}</div>
            <button className="btn btn-outline text-xs">
              <Icon name="download" size={13} /> Tümünü Dışa Aktar
            </button>
          </div>
          <div className="card divide-y" style={{ borderColor: 'var(--line)' }}>
            {conversations.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-muted">
                <Icon name="message-circle" size={15} className="text-ink-muted shrink-0" />
                <div className="flex-1 min-w-0 text-sm truncate">{c.title}</div>
                <span className="text-xs text-ink-muted font-mono">{c.date}</span>
                <button className="p-1.5 rounded hover:bg-surface text-ink-muted">
                  <Icon name="download" size={13} />
                </button>
                <button className="p-1.5 rounded hover:bg-surface text-ink-muted">
                  <Icon name="trash-2" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
