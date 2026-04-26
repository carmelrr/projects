'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  useMetricDefinitions,
  useMetricHistory,
  useLogMetric,
} from '@/hooks/useMetrics';
import { PageHeader } from '@/components/layout/PageHeader';
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

function Sparkline({
  values,
  width = 600,
  height = 200,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');

  const last = values[values.length - 1];
  const lastIdx = values.length - 1;
  const lastX = lastIdx * stepX;
  const lastY = height - ((last - min) / range) * (height - 20) - 10;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-48 w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
      <polygon
        fill="url(#grad)"
        points={`0,${height} ${points} ${(values.length - 1) * stepX},${height}`}
      />
      <circle cx={lastX} cy={lastY} r="4" fill="currentColor" />
    </svg>
  );
}

export default function ClientMetricDetailPage() {
  const router = useRouter();
  const params = useParams<{ metricId: string }>();
  const metricId = params.metricId;
  const { user } = useAuthStore();

  const { data: defs } = useMetricDefinitions();
  const def = defs?.find((d) => d.id === metricId);

  const [days, setDays] = useState(30);
  const { data: history, isLoading } = useMetricHistory(user?.id ?? '', metricId, days);
  const log = useLogMetric(user?.id ?? '');

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const sorted = useMemo(
    () =>
      [...(history ?? [])].sort(
        (a, b) =>
          new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
      ),
    [history],
  );
  const values = sorted.map((e) => e.value);
  const latest = sorted[sorted.length - 1];

  const submit = async () => {
    if (!value) return;
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    await log.mutateAsync({ metricId, value: num, notes: notes || undefined });
    setOpen(false);
    setValue('');
    setNotes('');
  };

  return (
    <div className="p-4 lg:p-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        onClick={() => router.push('/client/metrics')}
      >
        <ArrowLeft className="size-4 rtl:rotate-180" /> Metrics
      </Button>

      <PageHeader
        title={def?.name ?? 'Metric'}
        description={def ? `Tracked in ${def.unit}` : undefined}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="size-4" /> Log entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log {def?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="value">Value ({def?.unit})</Label>
                  <Input
                    id="value"
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
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
                <Button onClick={submit} disabled={!value || log.isPending}>
                  {log.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Latest</p>
              <p className="text-3xl font-semibold tabular-nums text-foreground">
                {latest ? latest.value : '—'}{' '}
                <span className="text-base font-normal text-muted-foreground">
                  {def?.unit}
                </span>
              </p>
            </div>
            <div className="flex gap-1">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={days === d ? 'default' : 'outline'}
                  onClick={() => setDays(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : values.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No entries in the last {days} days.
            </div>
          ) : (
            <div className="text-info">
              <Sparkline values={values} />
            </div>
          )}
        </CardContent>
      </Card>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">History</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {sorted
                .slice()
                .reverse()
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold tabular-nums text-foreground">
                        {e.value} {def?.unit}
                      </p>
                      {e.notes && (
                        <p className="text-xs text-muted-foreground">{e.notes}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.capturedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
