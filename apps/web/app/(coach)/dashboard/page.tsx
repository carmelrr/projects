'use client';

import Link from 'next/link';
import { Users, AlertTriangle, TrendingUp, Activity, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useClients } from '@/hooks/useClients';
import { useT, useI18n } from '@/lib/i18n/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.greetingMorning';
  if (h < 18) return 'dashboard.greetingDay';
  return 'dashboard.greetingEvening';
}

function complianceColor(pct: number) {
  if (pct >= 80) return 'text-success';
  if (pct >= 50) return 'text-warning';
  return 'text-destructive';
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const t = useT();
  const { dir } = useI18n();
  const { data: activeData, isLoading: activeLoading } = useClients({
    status: 'ACTIVE',
    limit: 100,
  });
  const { data: attentionData } = useClients({ needsAttention: true, limit: 50 });

  const activeItems = activeData?.items ?? [];
  const totalActive = activeData?.total ?? 0;
  const needsAttention = attentionData?.items ?? [];

  const sevenDayValues = activeItems
    .flatMap((c) => (c.complianceSummaries ?? []).filter((s) => s.period === 'SEVEN_DAY'))
    .map((s) => s.complianceRate);
  const avg7 = sevenDayValues.length
    ? Math.round((sevenDayValues.reduce((a, b) => a + b, 0) / sevenDayValues.length) * 100)
    : null;

  const thirtyDayValues = activeItems
    .flatMap((c) => (c.complianceSummaries ?? []).filter((s) => s.period === 'THIRTY_DAY'))
    .map((s) => s.complianceRate);
  const avg30 = thirtyDayValues.length
    ? Math.round((thirtyDayValues.reduce((a, b) => a + b, 0) / thirtyDayValues.length) * 100)
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">
      <PageHeader
        title={t(greetingKey(), { name: user?.firstName ?? '' })}
        description={t('dashboard.subtitle')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('dashboard.stats.activeClients')}
          value={totalActive}
          icon={Users}
          accent="brand"
        />
        <StatCard
          label={t('dashboard.stats.needsAttention')}
          value={needsAttention.length}
          sub={t('dashboard.stats.needsAttentionSub')}
          icon={AlertTriangle}
          accent="warning"
        />
        <StatCard
          label={t('dashboard.stats.avgCompliance7')}
          value={avg7 !== null ? `${avg7}%` : '—'}
          icon={Activity}
          accent="success"
        />
        <StatCard
          label={t('dashboard.stats.avgCompliance30')}
          value={avg30 !== null ? `${avg30}%` : '—'}
          icon={TrendingUp}
          accent="info"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">{t('dashboard.needsAttention')}</CardTitle>
            {needsAttention.length > 0 && (
              <Badge variant="warning">{needsAttention.length}</Badge>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {needsAttention.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t('dashboard.noNeedsAttention')}
              </p>
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {needsAttention.slice(0, 6).map((client) => {
                  const sevenDay = (client.complianceSummaries ?? []).find(
                    (s) => s.period === 'SEVEN_DAY',
                  );
                  const pct = sevenDay ? Math.round(sevenDay.complianceRate * 100) : null;
                  return (
                    <li key={client.id}>
                      <Link
                        href={`/clients/${client.user.id}`}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                      >
                        <Avatar className="size-8">
                          <AvatarFallback>
                            {client.user.firstName[0]}
                            {client.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {client.user.firstName} {client.user.lastName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {pct !== null
                              ? t('dashboard.complianceWeek', { pct })
                              : t('dashboard.noRecentData')}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">{t('dashboard.activeClients')}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/clients" className="gap-1">
                {t('common.viewAll')}
                <ArrowRight className={cn('size-3.5', dir === 'rtl' && 'rotate-180')} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {activeLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                    <Skeleton className="h-2 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : activeItems.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('dashboard.noClients')}
                description={t('dashboard.noClientsHint')}
                className="border-0 py-8"
              />
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {activeItems.slice(0, 8).map((client) => {
                  const sevenDay = (client.complianceSummaries ?? []).find(
                    (s) => s.period === 'SEVEN_DAY',
                  );
                  const pct = sevenDay ? Math.round(sevenDay.complianceRate * 100) : null;
                  return (
                    <li key={client.id}>
                      <Link
                        href={`/clients/${client.user.id}`}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                      >
                        <Avatar className="size-8">
                          <AvatarFallback>
                            {client.user.firstName[0]}
                            {client.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {client.user.firstName} {client.user.lastName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {client.user.email}
                          </p>
                        </div>
                        {pct !== null && (
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm font-semibold tabular-nums',
                                complianceColor(pct),
                              )}
                            >
                              {pct}%
                            </span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-[width]',
                                  pct >= 80
                                    ? 'bg-success'
                                    : pct >= 50
                                    ? 'bg-warning'
                                    : 'bg-destructive',
                                )}
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

