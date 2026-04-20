import { useEffect, useState } from 'react';
import { TemaProvider } from './context/TemaContext';
import { AuthProvider } from './context/AuthContext';
import { DilProvider } from './context/DilContext';
import { useTema } from './context/useTema';
import { useAuth } from './context/useAuth';
import { useAuth as useAuthInModal } from './context/useAuth';
import { Icon, Logo, Avatar, Modal, Toast } from './components/ui';
import { submitAuthModal } from './utils/authFlow';
import LandingPage from './pages/LandingPage';
import SohbetSayfasi from './pages/SohbetSayfasi';
import TaslakSayfasi from './pages/TaslakSayfasi';
import AdminSayfasi from './pages/AdminSayfasi';
import ProfilSayfasi from './pages/ProfilSayfasi';
import PaylasimSayfasi from './pages/PaylasimSayfasi';
import KarsilastirmaSayfasi from './pages/KarsilastirmaSayfasi';
import ForumSayfasi from './pages/ForumSayfasi';

/* ── Navbar ── */
function Navbar({ page, setPage, onOpenAuth, theme, setTheme }) {
  const { kullanici, cikis } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { key: 'sohbet', label: 'Sohbet' },
    { key: 'taslak', label: 'Taslak' },
    { key: 'forum', label: 'Forum' },
    { key: 'karsilastir', label: 'Karşılaştır' },
  ];

  return (
    <header
      className="h-14 hairline-b sticky top-0 z-30"
      style={{ background: 'color-mix(in srgb,var(--surface) 85%,transparent)', backdropFilter: 'saturate(180%) blur(8px)' }}
    >
      <div className="h-full px-5 flex items-center gap-6">
        <button onClick={() => setPage('landing')} className="flex items-center gap-2">
          <Logo size={18} />
        </button>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {links.map((link) => (
            <button
              key={link.key}
              onClick={() => setPage(link.key)}
              className={
                'px-3 py-1.5 rounded-md text-sm transition ' +
                (page === link.key ? 'text-ink' : 'text-ink-muted hover:text-ink')
              }
            >
              {link.label}
              {page === link.key && (
                <span className="block h-[2px] -mb-[3px] mt-[4px]" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn btn-ghost text-ink-muted"
            title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>

          {kullanici ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((value) => !value)}
                className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-surface-muted"
              >
                <Avatar name={kullanici.email || 'U'} size={26} />
                <Icon name="chevron-down" size={14} className="text-ink-muted" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 card py-1.5 shadow-sm"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-3 py-2 hairline-b">
                    <div className="text-sm font-medium">{kullanici.email?.split('@')[0]}</div>
                    <div className="text-xs text-ink-muted">{kullanici.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setPage('profil');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted flex items-center gap-2"
                  >
                    <Icon name="user" size={14} /> Profilim
                  </button>
                  {kullanici.rol === 'admin' && (
                    <button
                      onClick={() => {
                        setPage('admin');
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted flex items-center gap-2"
                    >
                      <Icon name="shield" size={14} /> Admin Paneli
                    </button>
                  )}
                  <div className="hairline-t my-1" />
                  <button
                    onClick={() => {
                      cikis?.();
                      setMenuOpen(false);
                      setPage('landing');
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted flex items-center gap-2 text-ink-soft"
                  >
                    <Icon name="log-out" size={14} /> Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button onClick={() => onOpenAuth('login')} className="btn btn-ghost text-sm">
                Giriş Yap
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="btn btn-primary text-sm"
                title="Ücretsiz hesap oluştur"
              >
                Ücretsiz Dene
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Auth Modal ── */
function AuthModal({ mode, setMode, onClose, onSuccess }) {
  const { giris, kayit } = useAuthInModal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await submitAuthModal({
        mode,
        email,
        password,
        confirm,
        giris,
        kayit,
      });

      setError(result.error);
      setSuccess(result.success);

      if (result.nextMode !== mode) {
        setMode(result.nextMode);
        setPassword('');
        setConfirm('');
      }

      if (result.shouldClose) {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <Logo size={20} />
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-muted">
            <Icon name="x" size={16} />
          </button>
        </div>
        <h2 className="font-display text-[32px] leading-none mb-2" style={{ letterSpacing: '-0.02em' }}>
          {mode === 'login' ? 'Tekrar hoş geldiniz' : 'Hesap oluştur'}
        </h2>
        <p className="text-ink-muted text-sm mb-6">
          {mode === 'login' ? 'E-posta ve şifrenizle giriş yapın.' : 'Saniyeler içinde kaydolun; ücretsiz.'}
        </p>

        <div className="flex items-center gap-1 hairline-b mb-6">
          {[['login', 'Giriş Yap'], ['register', 'Kayıt Ol']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setMode(key);
                setError('');
                setSuccess('');
              }}
              className={
                'px-3 py-2 text-sm -mb-px border-b-2 ' +
                (mode === key ? 'text-ink' : 'text-ink-muted border-transparent')
              }
              style={mode === key ? { borderColor: 'var(--accent)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="label">E-posta</span>
            <input
              type="email"
              placeholder="ad.soyad@eposta.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border border-line rounded-md bg-surface-muted px-3 py-2 text-sm focus:bg-surface focus:border-line-strong"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="label">Şifre</span>
            <div className="flex items-center border border-line rounded-md bg-surface-muted focus-within:bg-surface focus-within:border-line-strong">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
                className="flex-1 bg-transparent px-3 py-2 text-sm"
              />
              <button onClick={() => setShowPw((value) => !value)} type="button" className="pr-3 text-ink-muted">
                <Icon name={showPw ? 'eye-off' : 'eye'} size={14} />
              </button>
            </div>
          </label>

          {mode === 'register' && (
            <label className="flex flex-col gap-1.5">
              <span className="label">Şifre (Tekrar)</span>
              <input
                type="password"
                placeholder="••••••••••"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="border border-line rounded-md bg-surface-muted px-3 py-2 text-sm focus:bg-surface focus:border-line-strong"
              />
            </label>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <a className="text-xs hover:underline" style={{ color: 'var(--accent)' }} href="#">
                Şifremi unuttum
              </a>
            </div>
          )}
        </div>

        {error && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{ background: 'color-mix(in srgb,var(--danger) 10%,var(--surface))', color: 'var(--danger)' }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{ background: 'color-mix(in srgb,var(--success) 10%,var(--surface))', color: 'var(--success)' }}
          >
            {success}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary w-full justify-center py-2.5 mt-6"
        >
          {loading ? (
            <>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </>
          ) : (
            mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'
          )}
        </button>

        <button onClick={onClose} className="btn btn-ghost w-full justify-center py-2 mt-2 text-ink-muted">
          Misafir olarak devam et
        </button>

        <div className="hairline-t mt-6 pt-4 text-center">
          <div className="text-[11px] text-ink-faint">
            Devam ederek <a className="underline" href="#">Kullanım Şartları</a> ve{' '}
            <a className="underline" href="#">KVKK</a> metnini kabul etmiş olursunuz.
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Disclaimer bar ── */
function DisclaimerBar() {
  const [visible, setVisible] = useState(!localStorage.getItem('hb_disclaimer_dismissed'));
  if (!visible) return null;

  return (
    <div className="sticky bottom-0 z-20 hairline-t" style={{ background: 'var(--surface)' }}>
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3 text-sm">
        <Icon name="info" size={14} className="text-accent shrink-0" />
        <span className="flex-1 text-ink-soft">
          Hak-Bul <strong>bilgi verir, hukuki tavsiye vermez</strong>. Avukat yönlendirme için:{' '}
          <strong>ALO 182</strong> (Türkiye Barolar Birliği)
        </span>
        <button
          onClick={() => {
            setVisible(false);
            localStorage.setItem('hb_disclaimer_dismissed', '1');
          }}
          className="p-1 rounded hover:bg-surface-muted"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Main app shell ── */
function AppIcerik() {
  const { tema, toggleTema } = useTema();
  const [page, setPage] = useState(() => localStorage.getItem('hb_page') || 'landing');
  const [authModal, setAuthModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  const theme = tema === 'acik' ? 'light' : 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', 'navy');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('hb_page', page);
  }, [page]);

  useEffect(() => {
    const handleCikis = () => {
      setPage('landing');
      setAuthModal(null);
    };

    window.addEventListener('auth-cikis', handleCikis);
    return () => window.removeEventListener('auth-cikis', handleCikis);
  }, []);

  const toast = (text, kind = 'success') => {
    const id = Math.random();
    setToasts((current) => [...current, { id, text, kind }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 2400);
  };

  const onAuthSuccess = () => {
    setAuthModal(null);
    setPage('sohbet');
    toast('Hoş geldiniz!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      <Navbar
        page={page}
        setPage={setPage}
        onOpenAuth={setAuthModal}
        theme={theme}
        setTheme={() => toggleTema()}
      />

      <main className="flex-1 min-h-0">
        {page === 'landing' && <LandingPage onOpenAuth={setAuthModal} setPage={setPage} />}
        {page === 'sohbet' && <SohbetSayfasi />}
        {page === 'taslak' && <TaslakSayfasi />}
        {page === 'karsilastir' && <KarsilastirmaSayfasi />}
        {page === 'forum' && <ForumSayfasi />}
        {page === 'profil' && <ProfilSayfasi onGeri={() => setPage('sohbet')} />}
        {page === 'admin' && <AdminSayfasi />}
      </main>

      {page === 'landing' && <DisclaimerBar />}

      {authModal && (
        <AuthModal
          mode={authModal}
          setMode={setAuthModal}
          onClose={() => setAuthModal(null)}
          onSuccess={onAuthSuccess}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}

function SharedRoute() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/shared\/([A-Za-z0-9_-]+)$/);
  if (match) return <PaylasimSayfasi shareToken={match[1]} />;
  return null;
}

export default function App() {
  const isShared = /^#\/shared\//.test(window.location.hash);

  if (isShared) {
    return (
      <TemaProvider>
        <DilProvider>
          <SharedRoute />
        </DilProvider>
      </TemaProvider>
    );
  }

  return (
    <TemaProvider>
      <DilProvider>
        <AuthProvider>
          <AppIcerik />
        </AuthProvider>
      </DilProvider>
    </TemaProvider>
  );
}
