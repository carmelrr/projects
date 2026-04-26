'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, LineChart, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import {
  useClientMetrics,
  useMetricDefinitions,
  useLogMetric,
  type MetricEntry,
  type MetricDefinition,
} from '@/hooks/useMetrics';
import { useT } from '@/lib/i18n/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function LogMetricDialog({
  definitions,
  defaultMetricId,
  trigger,
}: {
  definitions: MetricDefinition[];
  defaultMetricId?: string;
  trigger: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const log = useLogMetric(user?.id ?? '');
  const [open, setOpen] = useState(false);
  const [metricId, setMetricId] = useState(defaultMetricId ?? '');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const submit = async () => {
    if (!metricId || !value) return;
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    await log.mutateAsync({ metricId, value: num, notes: notes || undefined });
    setOpen(false);
    setValue('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a metric</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="metric">Metric</Label>
            <Select value={metricId} onValueChange={setMetricId}>
              <SelectTrigger id="metric">
                <SelectValue placeholder="Choose a metric" />
              </SelectTrigger>
              <SelectContent>
                {definitions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 75.5"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!metricId || !value || log.isPending}>
            {log.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientMetricsPage() {
  const t = useT();
  const { user } = useAuthStore();
  const { data: latest, isLoading } = useClientMetrics(user?.id ?? '');
  const { data: definitions } = useMetricDefinitions();

  const defs = definitions ?? [];
  const items = latest ?? [];

  // Combine: definitions joined with latest entry (if any)
  const rows = useMemo(() => {
    return defs.map((def) => {
      const entry = items.find((e) => e.metricId === def.id);
      return { def, entry: entry as MetricEntry | undefined };
    });
  }, [defs, items]);

  return (
    <div className="p-4 lg:p-8">
      <PageHeader
        title={t('clientNav.metrics')}
        description={t('client.metrics.desc')}
        actions={
          <LogMetricDialog
            definitions={defs}
            trigger={
              <Button variant="gradient">
                <Plus className="size-4" /> Log metric
              </Button>
            }
          />
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={LineChart}
              title="No metrics yet"
              description="Your coach hasn't set up any metrics for you yet."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ def, entry }) => (
            <Link
              key={def.id}
              href={`/client/metrics/${def.id}`}
              className="block"
            >
              <Card className="card-interactive h-full">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-info/15 text-info">
                    <LineChart className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{def.name}</p>
                    {entry ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground tabular-nums">
                          {entry.value}
                        </span>{' '}
                        {def.unit} · {timeAgo(entry.capturedAt)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No entries yet</p>
                    )}
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
