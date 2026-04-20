'use client';

import { Smartphone, Apple, Play, MessageSquare, Activity, LineChart } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useT } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ClientHomePage() {
  const t = useT();
  const { user } = useAuthStore();

  const tiles = [
    { icon: Activity, title: t('client.tiles.workouts.title'), desc: t('client.tiles.workouts.desc') },
    { icon: LineChart, title: t('client.tiles.metrics.title'), desc: t('client.tiles.metrics.desc') },
    { icon: MessageSquare, title: t('client.tiles.messages.title'), desc: t('client.tiles.messages.desc') },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6 lg:py-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="aurora absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center lg:p-10">
          <div className="space-y-3">
            <p className="text-eyebrow">{t('client.welcomeEyebrow')}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {user?.firstName ? t('client.hello', { name: user.firstName }) : t('client.helloNoName')}
            </h1>
            <p className="max-w-xl text-muted-foreground">{t('client.heroDesc')}</p>
          </div>
          <div className="flex gap-2 md:flex-col">
            <Button variant="gradient" size="lg" className="flex-1 md:flex-none">
              <Apple className="size-4" />
              {t('client.downloadIOS')}
            </Button>
            <Button variant="outline" size="lg" className="flex-1 md:flex-none">
              <Play className="size-4" />
              {t('client.downloadAndroid')}
            </Button>
          </div>
        </div>
      </section>

      {/* Feature tiles */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <Card
              key={tile.title}
              className={`card-interactive anim-fade-up ${
                i === 1 ? 'anim-fade-up-delay-1' : i === 2 ? 'anim-fade-up-delay-2' : ''
              }`}
            >
              <CardContent className="p-5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">{tile.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tile.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Mobile upsell */}
      <Card className="mt-8 border-primary/30">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('client.mobileHint.title')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('client.mobileHint.desc')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Apple className="size-4" />
              {t('client.downloadIOS')}
            </Button>
            <Button variant="outline">
              <Play className="size-4" />
              {t('client.downloadAndroid')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
