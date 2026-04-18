'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarCheck,
  Activity,
  MessageSquare,
  LineChart,
  Dumbbell,
  Smartphone,
} from 'lucide-react';
import { useT, useI18n } from '@/lib/i18n/client';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OwlLogo } from '@/components/brand/OwlLogo';
import { cn } from '@/lib/utils';

export default function MarketingHomePage() {
  const t = useT();
  const { dir } = useI18n();
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && user) router.replace('/dashboard');
  }, [isHydrated, user, router]);
  const ArrowIcon = ({ className }: { className?: string }) => (
    <ArrowRight className={cn('size-4', dir === 'rtl' && 'rotate-180', className)} />
  );

  const features = [
    { key: 'programs', icon: CalendarCheck },
    { key: 'compliance', icon: Activity },
    { key: 'messaging', icon: MessageSquare },
    { key: 'metrics', icon: LineChart },
    { key: 'library', icon: Dumbbell },
    { key: 'mobile', icon: Smartphone },
  ] as const;

  const faqItems = [0, 1, 2] as const;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="aurora absolute inset-0 -z-10 opacity-50" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="default" className="mb-4">
              {t('marketing.hero.eyebrow')}
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t('marketing.hero.title')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              {t('marketing.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="gradient" size="xl">
                <Link href="/register" className="gap-2">
                  {t('marketing.hero.ctaPrimary')}
                  <ArrowIcon />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link href="#features">{t('marketing.hero.ctaSecondary')}</Link>
              </Button>
            </div>
          </div>

          {/* Hero "screenshot" mock */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-destructive/60" />
                <span className="size-2.5 rounded-full bg-warning/70" />
                <span className="size-2.5 rounded-full bg-success/70" />
                <div className="ms-3 h-5 flex-1 rounded-md bg-muted/60" />
              </div>
              <div className="grid grid-cols-12 gap-0 p-0">
                <div className="col-span-3 hidden border-e border-border bg-sidebar p-3 md:block">
                  <OwlLogo variant="lockup" />
                  <div className="mt-6 space-y-1.5">
                    {['Dashboard', 'Clients', 'Programs', 'Exercises', 'Messages'].map((l, i) => (
                      <div
                        key={l}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                          i === 0
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-sidebar-foreground/70',
                        )}
                      >
                        <span className="size-3 rounded bg-current opacity-40" />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-12 space-y-4 p-5 md:col-span-9">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { label: 'Active', value: '24', tone: 'brand' },
                      { label: 'Attention', value: '3', tone: 'warning' },
                      { label: '7-day', value: '82%', tone: 'success' },
                      { label: '30-day', value: '76%', tone: 'info' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-border bg-card p-3">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Active clients</p>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-accent"
                      >
                        <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                          {String.fromCharCode(64 + i)}{String.fromCharCode(74 + i)}
                        </span>
                        <div className="flex-1 truncate">Client {i}</div>
                        <span className="font-semibold tabular-nums text-success">{90 - i * 7}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-success"
                            style={{ width: `${90 - i * 7}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-border bg-card/20 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t('marketing.features.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('marketing.features.subtitle')}
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.key} className="group transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-900/40 dark:text-brand-200">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-foreground">
                      {t(`marketing.features.items.${f.key}.title`)}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {t(`marketing.features.items.${f.key}.desc`)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t('marketing.how.title')}
          </h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {(['one', 'two', 'three'] as const).map((step, i) => (
              <div key={step} className="relative rounded-xl border border-border bg-card p-6">
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {t(`marketing.how.steps.${step}.title`)}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t(`marketing.how.steps.${step}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t('marketing.faq.title')}
          </h2>
          <div className="mt-10 space-y-3">
            {faqItems.map((i) => (
              <details
                key={i}
                className="group rounded-xl border border-border bg-card p-5 transition-shadow open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-foreground">
                  {t(`marketing.faq.items.${i}.q`)}
                  <span className="text-muted-foreground transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t(`marketing.faq.items.${i}.a`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="aurora absolute inset-0 -z-10 opacity-60" aria-hidden="true" />

        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t('marketing.cta.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            {t('marketing.cta.subtitle')}
          </p>
          <Button asChild variant="gradient" size="xl" className="mt-8">
            <Link href="/register" className="gap-2">
              {t('marketing.cta.button')}
              <ArrowIcon />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
