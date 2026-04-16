'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users } from 'lucide-react';
import { useClients, type Client } from '@/hooks/useClients';
import { useT } from '@/lib/i18n/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

function ComplianceCell({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round(rate * 100);
  const variant = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'destructive';
  return <Badge variant={variant}>{pct}%</Badge>;
}

function StatusCell({ status }: { status: Client['status'] }) {
  const variants = {
    ACTIVE: 'success',
    PAUSED: 'warning',
    ARCHIVED: 'muted',
  } as const;
  return <Badge variant={variants[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export default function ClientsPage() {
  const t = useT();
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useClients({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    limit: LIMIT,
  });

  const clients = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">
      <PageHeader
        title={t('clients.title')}
        description={t('clients.totalCount', { n: total })}
        actions={
          <Button>
            <Plus className="size-4" /> {t('clients.invite')}
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter || 'ALL'}
          onValueChange={(v) => {
            setStatusFilter(v === 'ALL' ? '' : v);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="ALL">{t('clients.filter.all')}</TabsTrigger>
            <TabsTrigger value="ACTIVE">{t('clients.filter.active')}</TabsTrigger>
            <TabsTrigger value="PAUSED">{t('clients.filter.paused')}</TabsTrigger>
            <TabsTrigger value="ARCHIVED">{t('clients.filter.archived')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('clients.empty')}
            description={search ? t('clients.emptyHint') : t('clients.emptyHintInvite')}
            className="border-0"
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 text-start">{t('clients.table.client')}</th>
                    <th className="px-5 py-3 text-start">{t('clients.table.status')}</th>
                    <th className="px-5 py-3 text-start">{t('clients.table.sevenDay')}</th>
                    <th className="px-5 py-3 text-start">{t('clients.table.thirtyDay')}</th>
                    <th className="px-5 py-3 text-start">{t('clients.table.coach')}</th>
                    <th className="px-5 py-3 text-start">{t('clients.table.lastLogin')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map((client) => {
                    const sevenDay = client.complianceSummaries.find((s) => s.period === 'SEVEN_DAY');
                    const thirtyDay = client.complianceSummaries.find((s) => s.period === 'THIRTY_DAY');
                    const coach = client.assignments[0]?.coach;
                    return (
                      <tr key={client.id} className="transition-colors hover:bg-accent/40">
                        <td className="px-5 py-3">
                          <Link href={`/clients/${client.user.id}`} className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback>
                                {client.user.firstName[0]}
                                {client.user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground hover:text-primary">
                                {client.user.firstName} {client.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{client.user.email}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <StatusCell status={client.status} />
                            {sevenDay?.needsAttention && (
                              <span className="text-warning" title="Needs attention">
                                ⚠
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <ComplianceCell rate={sevenDay?.complianceRate ?? null} />
                        </td>
                        <td className="px-5 py-3">
                          <ComplianceCell rate={thirtyDay?.complianceRate ?? null} />
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {coach ? `${coach.user.firstName} ${coach.user.lastName}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {client.user.lastLoginAt
                            ? new Date(client.user.lastLoginAt).toLocaleDateString()
                            : t('clients.table.never')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border md:hidden">
              {clients.map((client) => {
                const sevenDay = client.complianceSummaries.find((s) => s.period === 'SEVEN_DAY');
                return (
                  <li key={client.id}>
                    <Link
                      href={`/clients/${client.user.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                    >
                      <Avatar>
                        <AvatarFallback>
                          {client.user.firstName[0]}
                          {client.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {client.user.firstName} {client.user.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{client.user.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusCell status={client.status} />
                        <ComplianceCell rate={sevenDay?.complianceRate ?? null} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} / {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t('common.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
