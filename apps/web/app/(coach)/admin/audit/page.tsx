'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogs } from '@/hooks/useAdmin';

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useAuditLogs({
    page,
    limit: 30,
    action: action || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Audit log"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Audit log' },
        ]}
        description="All mutating actions performed in this organization."
        actions={
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 size-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Action (e.g. USER_SUSPENDED)"
                className="pl-9"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value.toUpperCase());
                  setPage(1);
                }}
              />
            </div>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              placeholder="From"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              placeholder="To"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAction('');
                setFrom('');
                setTo('');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-2">When</th>
                  <th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Actor</th>
                  <th className="py-2 px-2">Target</th>
                  <th className="py-2 px-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="py-3 px-2">
                        <Skeleton className="h-4 w-40" />
                      </td>
                    </tr>
                  ))
                ) : !data?.items.length ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No audit entries match these filters.
                    </td>
                  </tr>
                ) : (
                  data.items.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/40">
                      <td className="py-3 px-2 whitespace-nowrap text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                        {log.actorRole ? `${log.actorRole} · ` : ''}
                        {log.actorUserId.slice(0, 8)}…
                      </td>
                      <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                        {log.targetType ? `${log.targetType} · ` : ''}
                        {log.targetId ? `${log.targetId.slice(0, 8)}…` : '—'}
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {Object.keys(log.metadata || {}).length > 0
                          ? JSON.stringify(log.metadata)
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                Page {data.page} of {data.totalPages} · {data.total} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
