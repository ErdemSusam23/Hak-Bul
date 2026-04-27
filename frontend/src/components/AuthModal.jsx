import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';

const SIFRE_KURALLARI = [
  { test: (value) => value.length >= 8, label: 'En az 8 karakter' },
  { test: (value) => /[A-Z]/.test(value), label: 'En az 1 büyük harf' },
  { test: (value) => /[0-9]/.test(value), label: 'En az 1 rakam' },
];

const INPUT_CLASS = 'w-full rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm focus:bg-surface focus:border-line-strong';

export default function AuthModal({ onKapat }) {
  const { giris, kayit, yukleniyor } = useAuth();
  const [sekme, setSekme] = useState('giris');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreTekrar, setSifreTekrar] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [sifreTekrarGoster, setSifreTekrarGoster] = useState(false);
  const [hata, setHata] = useState('');
  const [basarili, setBasarili] = useState(false);

  const temizle = (yeniSekme) => {
    setSekme(yeniSekme);
    setEmail('');
    setSifre('');
    setSifreTekrar('');
    setSifreGoster(false);
    setSifreTekrarGoster(false);
    setHata('');
    setBasarili(false);
  };

  const sifreGecerli = SIFRE_KURALLARI.every((kural) => kural.test(sifre));
  const sifrelerEsit = sifre === sifreTekrar && sifreTekrar.length > 0;

  const gonder = async (event) => {
    event.preventDefault();
    setHata('');

    if (sekme === 'giris') {
      const sonuc = await giris(email, sifre);
      if (sonuc.basarili) {
        onKapat();
      } else {
        setHata(sonuc.mesaj);
      }
      return;
    }

    if (!sifreGecerli) {
      const eksikKural = SIFRE_KURALLARI.find((kural) => !kural.test(sifre));
      setHata(eksikKural ? `Şifre ${eksikKural.label.toLocaleLowerCase('tr-TR')} olmalıdır.` : 'Şifre gereksinimleri karşılanmıyor.');
      return;
    }

    if (!sifrelerEsit) {
      setHata('Şifreler eşleşmiyor.');
      return;
    }

    const sonuc = await kayit(email, sifre);
    if (sonuc.basarili) {
      setBasarili(true);
      setTimeout(() => temizle('giris'), 1800);
    } else {
      setHata(sonuc.mesaj);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 10, 10, 0.42)', backdropFilter: 'blur(4px)' }}
      onClick={(event) => event.target === event.currentTarget && onKapat()}
    >
      <div
        className="relative w-full max-w-sm fade-in rounded-xl p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.18)',
        }}
      >
        <button
          onClick={onKapat}
          className="absolute top-4 right-4 transition-colors hover:text-ink"
          style={{ color: 'var(--ink-muted)' }}
        >
          <X size={18} />
        </button>

        <div className="mb-6 flex" style={{ borderBottom: '1px solid var(--line)' }}>
          {['giris', 'kayit'].map((item) => (
            <button
              key={item}
              onClick={() => temizle(item)}
              className="flex-1 -mb-px border-b-2 py-2.5 text-sm font-medium transition-all hover:text-ink"
              style={
                sekme === item
                  ? {
                    borderColor: 'var(--accent)',
                    color: 'var(--accent)',
                    background: 'var(--accent-soft)',
                  }
                  : {
                    borderColor: 'transparent',
                    color: 'var(--ink-muted)',
                  }
              }
            >
              {item === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          ))}
        </div>

        {basarili && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl p-3 fade-in"
            style={{
              background: 'color-mix(in srgb, var(--success) 10%, var(--surface))',
              border: '1px solid color-mix(in srgb, var(--success) 22%, var(--line))',
            }}
          >
            <CheckCircle size={15} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <p className="text-sm" style={{ color: 'var(--success)' }}>Hesap oluşturuldu. Giriş sekmesine geçiliyor...</p>
          </div>
        )}

        {hata && !basarili && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl p-3 fade-in"
            style={{
              background: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
              border: '1px solid color-mix(in srgb, var(--danger) 22%, var(--line))',
            }}
          >
            <AlertCircle size={15} className="flex-shrink-0" style={{ color: 'var(--danger)' }} />
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{hata}</p>
          </div>
        )}

        <form onSubmit={gonder} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              E-posta
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--ink-faint)' }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@email.com"
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              Şifre
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--ink-faint)' }}
              />
              <input
                type={sifreGoster ? 'text' : 'password'}
                required
                value={sifre}
                onChange={(event) => setSifre(event.target.value)}
                placeholder="••••••••"
                className={`${INPUT_CLASS} pl-9 pr-9`}
              />
              <button
                type="button"
                onClick={() => setSifreGoster((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-ink"
                style={{ color: 'var(--ink-faint)' }}
              >
                {sifreGoster ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {sekme === 'kayit' && sifre && (
              <ul className="mt-1.5 space-y-0.5">
                {SIFRE_KURALLARI.map((kural) => {
                  const aktif = kural.test(sifre);
                  return (
                    <li key={kural.label} className="flex items-center gap-1.5">
                      <CheckCircle size={11} style={{ color: aktif ? 'var(--success)' : 'var(--ink-faint)' }} />
                      <span className="text-xs" style={{ color: aktif ? 'var(--success)' : 'var(--ink-faint)' }}>
                        {kural.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {sekme === 'kayit' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-faint)' }}
                />
                <input
                  type={sifreTekrarGoster ? 'text' : 'password'}
                  required
                  value={sifreTekrar}
                  onChange={(event) => setSifreTekrar(event.target.value)}
                  placeholder="••••••••"
                  className={`${INPUT_CLASS} pl-9 pr-9 ${sifreTekrar && !sifrelerEsit ? 'border-red-500/40' : sifreTekrar && sifrelerEsit ? 'border-emerald-500/40' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setSifreTekrarGoster((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-ink"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  {sifreTekrarGoster ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={yukleniyor || !email || !sifre || (sekme === 'kayit' && (!sifreGecerli || !sifrelerEsit)) || basarili}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            {yukleniyor ? (
              <><Loader2 size={16} className="animate-spin" />{sekme === 'giris' ? 'Giriş yapılıyor...' : 'Kayıt oluşturuluyor...'}</>
            ) : (
              sekme === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
