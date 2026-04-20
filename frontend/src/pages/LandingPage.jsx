import { Icon, Logo } from '../components/ui';
import { categories } from '../data/mockData';

export default function LandingPage({ onOpenAuth, setPage }) {
  return (
    <div className="bg-bg text-ink">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-7">
            <div className="label mb-5 flex items-center gap-2">
              <span className="w-8 h-px" style={{ background: 'var(--ink-faint)' }} />
              Türk Hukuku · Yapay Zeka Destekli
            </div>
            <h1
              className="font-display text-[58px] leading-[0.98] text-ink"
              style={{ letterSpacing: '-0.025em' }}
            >
              Hukuki sorularına<br />
              <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>anında, </span>
              <span style={{ fontStyle: 'italic' }}>kanun dayanaklı</span> yanıt.
            </h1>
            <p className="text-ink-muted mt-6 text-[17px] leading-relaxed max-w-xl">
              Hak-Bul, her yanıtı ilgili kanun maddesi ve Yargıtay kararıyla birlikte sunan bir hukuki asistandır.
              Bilgi verir — avukatın yerini tutmaz.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <button onClick={() => onOpenAuth('register')} className="btn btn-primary text-[15px] px-5 py-3">
                Ücretsiz Dene
                <Icon name="arrow-right" size={16} />
              </button>
              <button onClick={() => setPage('sohbet')} className="btn btn-outline text-[15px] px-5 py-3">
                Nasıl Çalışır?
              </button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5"><Icon name="scale" size={14} /> 14 Hukuki Alan</span>
              <span className="flex items-center gap-1.5"><Icon name="book-open" size={14} /> 200+ Kanun Taraması</span>
              <span className="flex items-center gap-1.5"><Icon name="shield-check" size={14} /> KVKK Uyumlu</span>
            </div>
          </div>

          {/* Mock preview */}
          <div className="col-span-12 lg:col-span-5">
            <div className="card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-xs text-ink-muted">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Canlı örnek
              </div>
              <div
                className="text-sm mb-3 p-3 rounded-lg"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                İşten çıkarılırken haklarım nelerdir?
              </div>
              <div className="text-[13.5px] text-ink-soft leading-relaxed">
                4857 sayılı İş Kanunu kapsamında, <strong>geçerli bir neden gösterilmeksizin</strong> iş akdinizin
                feshedilmesi halinde şu haklara sahipsinizdir:
                <ul className="mt-2 space-y-1 list-disc pl-4 text-ink-muted">
                  <li>İhbar tazminatı (çalışma süresine göre 2–8 hafta)</li>
                  <li>Kıdem tazminatı (her yıl için 30 günlük ücret)</li>
                  <li>İşe iade davası (6 ay içinde)</li>
                </ul>
              </div>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className="chip font-mono text-[10.5px]"><Icon name="book-open" size={11} /> İK md. 18</span>
                <span className="chip font-mono text-[10.5px]"><Icon name="book-open" size={11} /> İK md. 20</span>
                <span
                  className="chip font-mono text-[10.5px]"
                  style={{ color: 'var(--highlight)', borderColor: 'var(--highlight)' }}
                >
                  <Icon name="gavel" size={11} /> Y. 9. HD. 2021/4287
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="hairline-t pt-12 grid grid-cols-1 md:grid-cols-3 gap-0">
          {[
            { icon: 'message-circle', kicker: '01', title: 'Kanun Dayanaklı Yanıtlar', desc: 'Her cevap ilgili madde ve karar özetiyle birlikte gelir. Kaynaksız spekülasyon yok.' },
            { icon: 'file-search',    kicker: '02', title: 'Belge Analizi & Karşılaştırma', desc: 'İki sözleşmeyi yükleyin, Hak-Bul farklılıkları ve önemli hükümleri sizin için çıkarsın.' },
            { icon: 'users',          kicker: '03', title: 'Avukat Onaylı Forum', desc: 'Topluluk yanıtlarını lisanslı avukatlar inceleyip onaylar. Altın rozetlere dikkat edin.' },
          ].map((f, i) => (
            <div key={i} className={'p-8 ' + (i < 2 ? 'md:border-r md:border-line ' : '')}>
              <div className="label mb-3">{f.kicker}</div>
              <Icon name={f.icon} size={22} className="text-accent" />
              <h3 className="font-display text-2xl mt-4 mb-2" style={{ letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p className="text-ink-muted text-[14px] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-3xl" style={{ letterSpacing: '-0.02em' }}>14 Hukuki Alan</h2>
          <span className="text-xs text-ink-muted">her alanda binlerce emsal karar</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button key={c.key} onClick={() => setPage('sohbet')} className="chip text-[13px] py-2 px-3.5">
              {c.label}
              <span className="text-ink-faint font-mono text-[11px]">{c.count.toLocaleString('tr-TR')}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="hairline-t">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <Logo size={20} />
            <p className="text-ink-muted text-sm mt-3 max-w-sm leading-relaxed">
              Hak-Bul bilgi verir, hukuki tavsiye vermez. Ciddi hukuki konularda bir avukata danışmanız önerilir.
            </p>
            <div
              className="mt-4 text-xs flex items-center gap-2 p-3 rounded-lg"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Icon name="phone" size={14} />
              <span>Avukat yönlendirme hattı: <strong>ALO 182</strong> · Türkiye Barolar Birliği</span>
            </div>
          </div>
          <div className="col-span-6 md:col-span-2">
            <div className="label mb-3">Ürün</div>
            <ul className="text-sm text-ink-muted space-y-2">
              {['Sohbet', 'Taslak', 'Karşılaştır', 'Forum'].map(l => (
                <li key={l}><a href="#" className="hover:text-ink">{l}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-span-6 md:col-span-2">
            <div className="label mb-3">Kurumsal</div>
            <ul className="text-sm text-ink-muted space-y-2">
              {['Hakkında', 'KVKK', 'Aydınlatma', 'İletişim'].map(l => (
                <li key={l}><a href="#" className="hover:text-ink">{l}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-span-12 md:col-span-3">
            <div className="label mb-3">Bülten</div>
            <div className="flex gap-0 border border-line rounded-lg overflow-hidden">
              <input className="flex-1 px-3 py-2 bg-transparent text-sm" placeholder="E-posta" />
              <button className="px-3 text-sm" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
                Abone ol
              </button>
            </div>
          </div>
        </div>
        <div className="hairline-t">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-ink-muted">
            <span>© 2026 Hak-Bul. Tüm hakları saklıdır.</span>
            <span className="font-mono">v2.0 · new-ui</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
