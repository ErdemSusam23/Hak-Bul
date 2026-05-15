import { useState } from 'react';
import { Icon, Logo } from '../components/ui';
import { useDil } from '../context/useDil';
import { LANDING_CATEGORY_KEYS } from '../content/productContent';
import { createNewsletterNotice } from '../utils/phase2Flow';

export default function LandingPage({ onOpenAuth, setPage }) {
  const { t } = useDil();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterNotice, setNewsletterNotice] = useState(null);

  const scrollToHowItWorks = () => {
    document.getElementById('landing-nasil-calisir')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleNewsletterSubmit = () => {
    setNewsletterNotice(createNewsletterNotice(newsletterEmail, {
      required: t('newsletterEmailRequired'),
      info: t('newsletterComingSoon'),
    }));
  };

  const featureCards = [
    {
      icon: 'message-circle',
      kicker: '01',
      title: t('landingFeatureLegalAnswersTitle'),
      desc: t('landingFeatureLegalAnswersDesc'),
    },
    {
      icon: 'file-search',
      kicker: '02',
      title: t('landingFeatureDocumentTitle'),
      desc: t('landingFeatureDocumentDesc'),
    },
    {
      icon: 'users',
      kicker: '03',
      title: t('landingFeatureForumTitle'),
      desc: t('landingFeatureForumDesc'),
    },
  ];

  const productLinks = [
    t('navChat'),
    t('navTemplates'),
    t('navCompare'),
    t('navForum'),
  ];

  const corporateLinks = [
    t('footerAbout'),
    t('footerKvkk'),
    t('footerDisclosure'),
    t('footerContact'),
  ];

  return (
    <div className="bg-bg text-ink">
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-8">
            <div className="label mb-5 flex items-center gap-2">
              <span className="w-8 h-px" style={{ background: 'var(--ink-faint)' }} />
              {t('landingEyebrow')}
            </div>
            <h1
              className="font-display text-[58px] leading-[0.98] text-ink"
              style={{ letterSpacing: '-0.025em' }}
            >
              {t('landingHeroTitleLine1')}
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{t('landingHeroTitleAccent')} </span>
              <span style={{ fontStyle: 'italic' }}>{t('landingHeroTitleProof')}</span> {t('landingHeroTitleSuffix')}
            </h1>
            <p className="text-ink-muted mt-6 text-[17px] leading-relaxed max-w-xl">
              {t('landingHeroSubtitle')}
            </p>
            <div className="mt-8 flex items-center gap-3">
              <button onClick={() => onOpenAuth('register')} className="btn btn-primary text-[15px] px-5 py-3">
                {t('authTryFree')}
                <Icon name="arrow-right" size={16} />
              </button>
              <button onClick={scrollToHowItWorks} className="btn btn-outline text-[15px] px-5 py-3">
                {t('landingHowItWorks')}
              </button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5"><Icon name="scale" size={14} /> {t('landingMetricAreas')}</span>
              <span className="flex items-center gap-1.5"><Icon name="book-open" size={14} /> {t('landingMetricLaws')}</span>
              <span className="flex items-center gap-1.5"><Icon name="message-circle" size={14} /> {t('landingMetricGuest')}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="landing-nasil-calisir" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="hairline-t pt-12 grid grid-cols-1 md:grid-cols-3 gap-0">
          {featureCards.map((feature, index) => (
            <div key={feature.kicker} className={`p-8 ${index < 2 ? 'md:border-r md:border-line ' : ''}`}>
              <div className="label mb-3">{feature.kicker}</div>
              <Icon name={feature.icon} size={22} className="text-accent" />
              <h3 className="font-display text-2xl mt-4 mb-2" style={{ letterSpacing: '-0.01em' }}>
                {feature.title}
              </h3>
              <p className="text-ink-muted text-[14px] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-3xl" style={{ letterSpacing: '-0.02em' }}>{t('landingMetricAreas')}</h2>
          <span className="text-xs text-ink-muted">{t('landingAreasSubtitle')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {LANDING_CATEGORY_KEYS.map((key) => (
            <button key={key} onClick={() => setPage('sohbet')} className="chip text-[13px] py-2 px-3.5">
              {t(key)}
            </button>
          ))}
        </div>
      </section>

      <footer className="hairline-t">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <Logo size={20} />
            <p className="text-ink-muted text-sm mt-3 max-w-sm leading-relaxed">
              {t('footerDisclaimer')}
            </p>
          </div>
          <div className="col-span-6 md:col-span-2">
            <div className="label mb-3">{t('footerProduct')}</div>
            <ul className="text-sm text-ink-muted space-y-2">
              {productLinks.map((label) => (
                <li key={label}><a href="#" className="hover:text-ink">{label}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-span-6 md:col-span-2">
            <div className="label mb-3">{t('footerCorporate')}</div>
            <ul className="text-sm text-ink-muted space-y-2">
              {corporateLinks.map((label) => (
                <li key={label}><a href="#" className="hover:text-ink">{label}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-span-12 md:col-span-3">
            <div className="label mb-3">{t('footerNewsletter')}</div>
            <div className="flex gap-0 border border-line rounded-lg overflow-hidden">
              <input
                className="flex-1 min-w-0 px-3 py-2 bg-transparent text-sm"
                placeholder={t('emailAddress')}
                value={newsletterEmail}
                onChange={(event) => {
                  setNewsletterEmail(event.target.value);
                  if (newsletterNotice) {
                    setNewsletterNotice(null);
                  }
                }}
              />
              <button
                className="px-4 py-2 text-sm shrink-0 whitespace-nowrap font-medium"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                onClick={handleNewsletterSubmit}
              >
                {t('newsletterSubscribe')}
              </button>
            </div>
            {newsletterNotice && (
              <p
                className="mt-3 text-sm"
                style={{ color: newsletterNotice.kind === 'error' ? 'var(--danger)' : 'var(--ink-muted)' }}
              >
                {newsletterNotice.text}
              </p>
            )}
          </div>
        </div>
        <div className="hairline-t">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-ink-muted">
            <span>{t('footerRights')}</span>
            <span className="font-mono">v2.0 · new-ui</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
