'use client';

import Link from 'next/link';
import { ArrowLeft, Check, X, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemHealth } from '@/hooks/useAdmin';

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminSystemPage() {
  const { data, isLoading, refetch, isFetching } = useSystemHealth();

  const tiles = data
    ? [
        {
          label: 'Uptime',
          value: formatUptime(data.uptime),
          hint: `Node ${data.nodeVersion}`,
        },
        {
          label: 'Firestore',
          value: data.firestore.ok ? 'Healthy' : 'Down',
          hint:
            data.firestore.latencyMs !== null
              ? `${data.firestore.latencyMs} ms`
              : 'no response',
          ok: data.firestore.ok,
        },
        {
          label: 'Redis',
          value: data.redis.ok ? 'Healthy' : 'Down',
          hint: data.redis.latencyMs !== null ? `${data.redis.latencyMs} ms` : 'no response',
          ok: data.redis.ok,
        },
        {
          label: 'Heap used',
          value: formatBytes(data.memory.heapUsed),
          hint: `RSS ${formatBytes(data.memory.rss)}`,
        },
      ]
    : [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="System health"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'System' },
        ]}
        description="Live connectivity checks and process metrics."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              <RefreshCw className={`mr-2 size-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 size-4" /> Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : tiles.map((t) => (
              <Card key={t.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t.label}
                    </p>
                    {typeof t.ok === 'boolean' ? (
                      <Badge variant={t.ok ? 'default' : 'destructive'}>
                        {t.ok ? (
                          <Check className="size-3" />
                        ) : (
                          <X className="size-3" />
                        )}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{t.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {data && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-2 font-semibold">Last check</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(data.timestamp).toLocaleString()} · took {data.checkDurationMs} ms
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
