'use client';

import { OwlLogo } from '@/components/brand/OwlLogo';
import { BrandWatermark } from '@/components/brand/BrandWatermark';
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
        <div
          className="absolute inset-0 opacity-[0.08]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <OwlLogo variant="lockup" />
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <p className="text-eyebrow !text-white/60">
            {t('brand.short')} · {t('brand.tagline')}
          </p>
          <h2 className="text-3xl font-semibold leading-tight text-white">
            {t('marketing.hero.title')}
          </h2>
          <p className="text-base text-white/70">{t('marketing.hero.subtitle')}</p>

          {/* Mini mock preview */}
          <div className="anim-fade-up anim-fade-up-delay-2 mt-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: t('dashboard.stats.activeClients'), v: '24' },
                { l: t('dashboard.stats.avgCompliance7'), v: '82%' },
                { l: t('dashboard.stats.needsAttention'), v: '3' },
              ].map((s) => (
                <div
                  key={s.l as string}
                  className="rounded-lg border border-white/10 bg-white/5 p-2.5"
                >
                  <p className="truncate text-[10px] text-white/50">{s.l}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">
                    {s.v}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {[72, 88, 61].map((pct, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold">
                    {['DN', 'MR', 'TL'][i]}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-300 to-accent-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-end tabular-nums text-white/70">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} {t('brand.name')}
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col">
        <BrandWatermark />
        <header className="relative z-[2] flex items-center justify-between p-4 lg:hidden">
          <OwlLogo variant="lockup" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </header>

        <div className="absolute end-4 top-4 z-[3] hidden lg:flex lg:items-center lg:gap-1">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>

        <div className="relative z-[2] flex flex-1 items-center justify-center px-4 py-10">
          <div className="anim-fade-up w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
