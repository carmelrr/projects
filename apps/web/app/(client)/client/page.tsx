'use client';

import Link from 'next/link';
import { Activity, ChevronRight, Clock, MessageSquare, PartyPopper, Smartphone, Apple, Play } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useUpcomingWorkouts, type WorkoutInstance } from '@/hooks/useWorkouts';
import { useT } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/EmptyState';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<
  WorkoutInstance['status'],
  { label: string; tone: string; badge: 'default' | 'success' | 'destructive' | 'secondary' }
> = {
  SCHEDULED: { label: 'Scheduled', tone: 'border-primary/30', badge: 'default' },
  COMPLETED: { label: 'Completed', tone: 'border-success/30 bg-success/5', badge: 'success' },
  SKIPPED: { label: 'Skipped', tone: 'border-border', badge: 'secondary' },
  MISSED: { label: 'Missed', tone: 'border-destructive/30', badge: 'destructive' },
  MOVED: { label: 'Moved', tone: 'border-border', badge: 'secondary' },
};

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${time}, ${name}` : time;
}

function isSameDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function WorkoutCard({ instance }: { instance: WorkoutInstance }) {
  const cfg = STATUS_VARIANT[instance.status] ?? STATUS_VARIANT.SCHEDULED;
  const summary = instance.summary;
  const title = summary?.title || instance.template?.title || instance.title || 'Workout';
  const itemCount = summary?.itemCount ?? instance.template?.items?.length ?? 0;
  const duration =
    summary?.estimatedDuration ?? instance.template?.estimatedDuration ?? null;
  const isActionable = instance.status === 'SCHEDULED';

  const inner = (
    <Card className={cn('transition-all', cfg.tone, isActionable && 'card-interactive')}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Activity className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-foreground">{title}</p>
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            {itemCount > 0 && (
              <span>
                {itemCount} block{itemCount !== 1 ? 's' : ''}
              </span>
            )}
            {duration && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {duration} min
                </span>
              </>
            )}
          </div>
        </div>
        {isActionable && <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" />}
      </CardContent>
    </Card>
  );

  return isActionable ? (
    <Link href={`/client/workout/${instance.id}`} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default function ClientHomePage() {
  const t = useT();
  const { user } = useAuthStore();
  const { data, isLoading } = useUpcomingWorkouts(7);

  const all = data ?? [];
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todays = all.filter((i) => isSameDay(i.scheduledDate, today));
  const tomorrows = all.filter((i) => isSameDay(i.scheduledDate, tomorrow));
  const upcoming = all.filter(
    (i) => !isSameDay(i.scheduledDate, today) && !isSameDay(i.scheduledDate, tomorrow),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-10">
      <header className="mb-8">
        <p className="text-eyebrow mb-1">{t('client.welcomeEyebrow')}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {greeting(user?.firstName ?? '')}
        </h1>
      </header>

      {/* Today */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('client.today')}</h2>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : todays.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={PartyPopper}
                title={t('client.restDay.title')}
                description={t('client.restDay.desc')}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todays.map((i) => (
              <WorkoutCard key={i.id} instance={i} />
            ))}
          </div>
        )}
      </section>

      {/* Tomorrow */}
      {tomorrows.length > 0 && (
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{t('client.tomorrow')}</h2>
          <div className="space-y-3">
            {tomorrows.map((i) => (
              <WorkoutCard key={i.id} instance={i} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming this week */}
      {upcoming.length > 0 && (
        <section className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{t('client.upcoming')}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/client/calendar">
                {t('client.viewCalendar')}
                <ChevronRight className="size-3 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {upcoming.map((i) => (
              <WorkoutCard key={i.id} instance={i} />
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="mt-10 grid gap-3 md:grid-cols-3">
        <Link href="/client/metrics" className="block">
          <Card className="card-interactive h-full">
            <CardContent className="p-5">
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-info/15 text-info">
                <Activity className="size-4" />
              </div>
              <p className="font-semibold text-foreground">{t('client.tiles.metrics.title')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('client.tiles.metrics.desc')}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/client/messages" className="block">
          <Card className="card-interactive h-full">
            <CardContent className="p-5">
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                <MessageSquare className="size-4" />
              </div>
              <p className="font-semibold text-foreground">{t('client.tiles.messages.title')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('client.tiles.messages.desc')}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Smartphone className="size-4" />
            </div>
            <p className="font-semibold text-foreground">{t('client.mobileHint.title')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('client.mobileHint.desc')}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm">
                <Apple className="size-3" />
                {t('client.downloadIOS')}
              </Button>
              <Button variant="outline" size="sm">
                <Play className="size-3" />
                {t('client.downloadAndroid')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

