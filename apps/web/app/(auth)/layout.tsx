'use client';

import { OwlLogo } from '@/components/brand/OwlLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher';
import { useT } from '@/lib/i18n/client';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Branded panel */}
      <div className="relative hidden overflow-hidden bg-brand-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="aurora absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative z-10 flex items-center gap-3">
          <OwlLogo variant="lockup" />
        </div>
        <div className="relative z-10 max-w-md space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">
            {t('brand.short')} · {t('brand.tagline')}
          </p>
          <h2 className="text-3xl font-semibold leading-tight text-white">
            {t('marketing.hero.title')}
          </h2>
          <p className="text-base text-white/70">{t('marketing.hero.subtitle')}</p>
        </div>
        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} {t('brand.name')}
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col">
        <header className="flex items-center justify-between p-4 lg:hidden">
          <OwlLogo variant="lockup" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </header>

        <div className="absolute end-4 top-4 hidden lg:flex lg:items-center lg:gap-1">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
