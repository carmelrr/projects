'use client';

import Link from 'next/link';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { useT } from '@/lib/i18n/client';

export function MarketingFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  const cols = [
    {
      title: t('marketing.footer.product'),
      links: [
        { href: '#features', label: t('marketing.navFeatures') },
        { href: '#how', label: t('marketing.navHow') },
      ],
    },
    {
      title: t('marketing.footer.company'),
      links: [
        { href: '#', label: t('marketing.navAbout') },
        { href: '#', label: t('marketing.footer.contact') },
      ],
    },
    {
      title: t('marketing.footer.legal'),
      links: [
        { href: '/privacy', label: t('marketing.footer.privacy') },
        { href: '/terms', label: t('marketing.footer.terms') },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <OwlLogo variant="lockup" />
            <p className="text-sm text-muted-foreground">{t('brand.tagline')}</p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            {t('marketing.footer.rights', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
