'use client';

import { use, useState } from 'react';
import type { JSX } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Target,
  Activity,
  TrendingUp,
  MessageSquare,
  Pencil,
  AlertTriangle,
  Users as UsersIcon,
  MoreHorizontal,
  Pause,
  Play,
  Archive,
  ArchiveRestore,
  Loader2,
} from 'lucide-react';
import { useClient, useUpdateClient, useClientAssignments, useClientPrograms } from '@/hooks/useClients';
import { useClientCalendar } from '@/hooks/useWorkouts';
import { useClientMetrics, useMetricHistory } from '@/hooks/useMetrics';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { ManageAssignmentsDialog } from '@/components/clients/ManageAssignmentsDialog';
import { WorkoutCalendar } from '@/components/calendar/WorkoutCalendar';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useI18n, useT } from '@/lib/i18n/client';

const LOCALE_TO_BCP47: Record<string, string> = { he: 'he-IL', en: 'en-US' };
function bcp47(locale: string): string {
  return LOCALE_TO_BCP47[locale] ?? locale;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'muted',
};

function initials(first = '', last = '') {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';
}

// ── Metric card w/ sparkline ─────────────────────────────────────────────
function MetricCardWithChart({
  clientId,
  metricId,
  name,
  unit,
  latestValue,
  latestAt,
}: {
  clientId: string;
  metricId: string;
  name: string;
  unit: string;
  latestValue: number;
  latestAt: string;
}) {
  const t = useT();
  const { locale } = useI18n();
  const lc = bcp47(locale);
  const { data: history } = useMetricHistory(clientId, metricId, 30);
  const points = (history ?? [])
    .slice()
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

  // Sparkline path
  const W = 240;
  const H = 56;
  let path = '';
  let areaPath = '';
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (points.length >= 2) {
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const xs = points.map((_, i) => (i / (points.length - 1)) * (W - 8) + 4);
    const ys = points.map((p) => H - 4 - ((p.value - min) / range) * (H - 12));
    path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    areaPath = `${path} L${xs[xs.length - 1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;
    const first = vals[0];
    const last = vals[vals.length - 1];
    trend = last > first ? 'up' : last < first ? 'down' : 'flat';
  }

  const trendColor =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{name}</p>
          <p className="mt-0.5 text-xl font-semibold text-foreground">
            {latestValue}
            <span className="ms-1 text-xs font-normal text-muted-foreground">{unit}</span>
          </p>
        </div>
        {points.length >= 2 && (
          <span className={cn('text-xs font-medium', trendColor)}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'}{' '}
            {Math.abs(points[points.length - 1].value - points[0].value).toFixed(1)}
          </span>
        )}
      </div>
      {points.length >= 2 ? (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="h-14 w-full">
          <defs>
            <linearGradient id={`g-${metricId}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#g-${metricId})`} className="text-primary" />
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />
        </svg>
      ) : (
        <p className="pt-2 text-[11px] text-muted-foreground">
          {t('clientDetail.metrics.needMoreData')}
        </p>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t('clientDetail.metrics.last', { date: new Date(latestAt).toLocaleDateString(lc) })}
      </p>
    </div>
  );
}

function EditDialog({
  client,
  open,
  onOpenChange,
}: {
  client: ReturnType<typeof useClient>['data'];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const update = useUpdateClient();
  const [form, setForm] = useState({
    status: client?.status ?? 'ACTIVE',
    goals: client?.clientProfile?.goals ?? '',
    medicalNotes: client?.clientProfile?.medicalNotes ?? '',
    heightCm: client?.clientProfile?.heightCm ?? undefined,
  });

  if (!client) return null;

  const save = async () => {
    await update.mutateAsync({
      id: client.id,
      status: form.status,
      goals: form.goals || undefined,
      medicalNotes: form.medicalNotes || undefined,
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('clientDetail.edit.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('clientDetail.edit.statusLabel')}</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">{t('clientDetail.status.ACTIVE')}</SelectItem>
                <SelectItem value="PAUSED">{t('clientDetail.status.PAUSED')}</SelectItem>
                <SelectItem value="ARCHIVED">{t('clientDetail.status.ARCHIVED')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goals">{t('clientDetail.edit.goalsLabel')}</Label>
            <Textarea
              id="goals"
              rows={3}
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              placeholder={t('clientDetail.edit.goalsPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">{t('clientDetail.edit.heightLabel')}</Label>
            <Input
              id="height"
              type="number"
              value={form.heightCm ?? ''}
              onChange={(e) =>
                setForm({ ...form, heightCm: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medical">{t('clientDetail.edit.medicalLabel')}</Label>
            <Textarea
              id="medical"
              rows={3}
              value={form.medicalNotes}
              onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
              placeholder={t('clientDetail.edit.medicalPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            {t('clientDetail.edit.cancel')}
          </Button>
          <Button variant="gradient" onClick={save} disabled={update.isPending}>
            {update.isPending ? t('clientDetail.edit.saving') : t('clientDetail.edit.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Programs tab content ────────────────────────────────────────────────
function ProgramsTab({ clientUserId }: { clientUserId: string }) {
  const t = useT();
  const { locale } = useI18n();
  const lc = bcp47(locale);
  const { data: programs, isLoading } = useClientPrograms(clientUserId);
  const items = programs ?? [];
  const active = items.filter((p) => p.status === 'ACTIVE');
  const past = items.filter((p) => p.status !== 'ACTIVE');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <EmptyState
            icon={Activity}
            title={t('clientDetail.programs.emptyTitle')}
            description={t('clientDetail.programs.emptyDesc')}
            action={
              <Button asChild variant="outline">
                <Link href="/programs">{t('clientDetail.programs.browse')}</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const renderRow = (
    p: (typeof items)[number],
    variant: 'success' | 'muted',
  ) => (
    <li
      key={p.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/50 px-3 py-3 text-sm"
    >
      <div className="min-w-0">
        <Link
          href={`/programs/${p.programId}`}
          className="font-medium text-foreground hover:underline"
        >
          {p.program?.title ?? t('clientDetail.programs.programFallback')}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {p.program?.weekCount != null && (
            <>
              {t(
                p.program.weekCount === 1
                  ? 'programs.detail.weeksCount_one'
                  : 'programs.detail.weeksCount_other',
                { n: p.program.weekCount },
              )}
              {' · '}
            </>
          )}
          {p.startDate
            ? t('clientDetail.programs.startPrefix', { date: new Date(p.startDate).toLocaleDateString(lc) })
            : t('clientDetail.programs.noStart')}
          {p.endDate ? ` · ${t('clientDetail.programs.endPrefix', { date: new Date(p.endDate).toLocaleDateString(lc) })}` : ''}
        </p>
      </div>
      <Badge variant={variant}>{t(`clientDetail.programs.statusBadge.${p.status}`)}</Badge>
    </li>
  );

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        {active.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('clientDetail.programs.active')}
            </p>
            <ul className="space-y-2">{active.map((p) => renderRow(p, 'success'))}</ul>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('clientDetail.programs.past')}
            </p>
            <ul className="space-y-2">{past.map((p) => renderRow(p, 'muted'))}</ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}): JSX.Element {
  const { clientId } = use(params);
  const t = useT();
  const { locale } = useI18n();
  const lc = bcp47(locale);
  const { data: client, isLoading } = useClient(clientId);
  const [editOpen, setEditOpen] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const { data: assignments } = useClientAssignments(clientId);
  const updateClient = useUpdateClient();
  const [statusError, setStatusError] = useState<string | null>(null);

  async function changeStatus(status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') {
    if (!client) return;
    setStatusError(null);
    try {
      await updateClient.mutateAsync({ id: client.id, status });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t('clientDetail.alerts.updateError'));
    }
  }

  // 30-day calendar window
  const today = new Date();
  const startDate = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const endDate = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
  const { data: calendar } = useClientCalendar(client?.user.id ?? '', startDate, endDate);
  const { data: metrics } = useClientMetrics(client?.user.id ?? '');

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          title={t('clientDetail.notFoundTitle')}
          description={t('clientDetail.notFoundDesc')}
          action={
            <Button asChild variant="outline">
              <Link href="/clients">
                <ArrowLeft className="size-4 rtl:rotate-180" />
                {t('clientDetail.backToClients')}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const compliance = client.complianceSummaries?.[0];
  const recent = (calendar ?? []).filter((i) => i.status === 'COMPLETED').slice(0, 5);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t('clientDetail.back')}
      </Link>

      <PageHeader
        title={`${client.user.firstName} ${client.user.lastName}`}
        description={client.user.email}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[client.status] ?? 'muted'}>{t(`clientDetail.status.${client.status}`)}</Badge>
            <Button variant="outline" asChild>
              <Link href={`/messages?clientId=${client.user.id}`}>
                <MessageSquare className="size-4" />
                {t('clientDetail.actions.message')}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setAssignmentsOpen(true)}>
              <UsersIcon className="size-4" />
              {t('clientDetail.actions.coaches')}
            </Button>
            <Button variant="gradient" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              {t('clientDetail.actions.edit')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t('clientDetail.actions.more')}
                  disabled={updateClient.isPending}
                >
                  {updateClient.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {client.status === 'ACTIVE' && (
                  <DropdownMenuItem onClick={() => changeStatus('PAUSED')}>
                    <Pause className="size-4" />
                    {t('clientDetail.actions.pause')}
                  </DropdownMenuItem>
                )}
                {client.status === 'PAUSED' && (
                  <DropdownMenuItem onClick={() => changeStatus('ACTIVE')}>
                    <Play className="size-4" />
                    {t('clientDetail.actions.reactivate')}
                  </DropdownMenuItem>
                )}
                {client.status === 'ARCHIVED' ? (
                  <DropdownMenuItem onClick={() => changeStatus('ACTIVE')}>
                    <ArchiveRestore className="size-4" />
                    {t('clientDetail.actions.unarchive')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => changeStatus('ARCHIVED')}
                    className="text-destructive focus:text-destructive"
                  >
                    <Archive className="size-4" />
                    {t('clientDetail.actions.archive')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {compliance?.needsAttention && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            <span className="text-foreground">
              {t('clientDetail.alerts.needsAttention')}
            </span>
          </CardContent>
        </Card>
      )}

      {statusError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="text-destructive">{statusError}</span>
            <Button variant="ghost" size="sm" onClick={() => setStatusError(null)}>
              {t('clientDetail.alerts.dismiss')}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Profile sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar className="size-20 ring-2 ring-border">
                  <AvatarImage src={client.user.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">
                    {initials(client.user.firstName, client.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">
                    {client.user.firstName} {client.user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('clientDetail.profile.joined', { date: new Date(client.createdAt).toLocaleDateString(lc) })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate text-foreground">{client.user.email}</span>
                </div>
                {client.clientProfile?.dob && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    <span className="text-foreground">
                      {new Date(client.clientProfile.dob).toLocaleDateString(lc)}
                    </span>
                  </div>
                )}
                {client.clientProfile?.heightCm && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="size-3.5 shrink-0" />
                    <span className="text-foreground">{client.clientProfile.heightCm} cm</span>
                  </div>
                )}
              </div>

              {client.clientProfile?.goals && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Target className="size-3.5" />
                      {t('clientDetail.profile.goals')}
                    </p>
                    <p className="text-sm text-foreground">{client.clientProfile.goals}</p>
                  </div>
                </>
              )}

              {client.clientProfile?.medicalNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('clientDetail.profile.medicalNotes')}
                    </p>
                    <p className="text-sm text-foreground">{client.clientProfile.medicalNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {(() => {
            const activeAssigns = (assignments ?? []).filter((a) => a.status === 'ACTIVE');
            return (
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <UsersIcon className="size-3.5" />
                      {t('clientDetail.profile.coaches')}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setAssignmentsOpen(true)}
                    >
                      {t('clientDetail.profile.manage')}
                    </Button>
                  </div>
                  {activeAssigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('clientDetail.profile.noCoaches')}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {activeAssigns.map((a) => (
                        <li key={a.id} className="flex items-center gap-2.5">
                          <Avatar className="size-7">
                            <AvatarImage src={a.coach?.user.avatarUrl ?? undefined} alt="" />
                            <AvatarFallback className="text-xs">
                              {a.coach
                                ? `${a.coach.user.firstName[0] ?? ''}${a.coach.user.lastName[0] ?? ''}`.toUpperCase()
                                : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm text-foreground">
                            {a.coach
                              ? `${a.coach.user.firstName} ${a.coach.user.lastName}`
                              : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {compliance && (
            <Card>
              <CardContent className="p-5">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="size-3.5" />
                  {t('clientDetail.profile.compliance', { period: t(`clientDetail.profile.compliancePeriod.${compliance.period}`) })}                </p>
                <div className="flex items-baseline gap-2">
                  <p
                    className={cn(
                      'text-3xl font-bold',
                      compliance.complianceRate >= 80
                        ? 'text-success'
                        : compliance.complianceRate >= 60
                          ? 'text-warning'
                          : 'text-destructive',
                    )}
                  >
                    {Math.round(compliance.complianceRate)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('clientDetail.profile.workoutsRatio', { done: compliance.totalCompleted, total: compliance.totalScheduled })}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      compliance.complianceRate >= 80
                        ? 'bg-success'
                        : compliance.complianceRate >= 60
                          ? 'bg-warning'
                          : 'bg-destructive',
                    )}
                    style={{ width: `${Math.min(100, compliance.complianceRate)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Tabs */}
        <div className="min-w-0">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">{t('clientDetail.tabs.overview')}</TabsTrigger>
              <TabsTrigger value="calendar">{t('clientDetail.tabs.calendar')}</TabsTrigger>
              <TabsTrigger value="metrics">{t('clientDetail.tabs.metrics')}</TabsTrigger>
              <TabsTrigger value="programs">{t('clientDetail.tabs.programs')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-5">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">{t('clientDetail.overview.recentTitle')}</h3>
                  {recent.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {t('clientDetail.overview.noCompleted')}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {recent.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {i.template?.title ?? i.title ?? t('clientDetail.calendar.details.defaultTitle')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(i.scheduledDate).toLocaleDateString(lc)}
                            </p>
                          </div>
                          <Badge variant="success">{t('clientDetail.overview.completed')}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <WorkoutCalendar clientId={client.user.id} />
            </TabsContent>

            <TabsContent value="metrics" className="mt-4">
              <Card>
                <CardContent className="p-5">
                  {(metrics ?? []).length === 0 ? (
                    <EmptyState
                      icon={TrendingUp}
                      title={t('clientDetail.metrics.emptyTitle')}
                      description={t('clientDetail.metrics.emptyDesc')}
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(metrics ?? []).map((m) => (
                        <MetricCardWithChart
                          key={m.id}
                          clientId={client.user.id}
                          metricId={m.metricId}
                          name={m.definition?.name ?? m.metricId}
                          unit={m.definition?.unit ?? ''}
                          latestValue={m.value}
                          latestAt={m.capturedAt}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="programs" className="mt-4">
              <ProgramsTab clientUserId={client.user.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {editOpen && <EditDialog client={client} open={editOpen} onOpenChange={setEditOpen} />}

      <ManageAssignmentsDialog
        clientUserId={client.user.id}
        clientName={`${client.user.firstName} ${client.user.lastName}`}
        open={assignmentsOpen}
        onOpenChange={setAssignmentsOpen}
      />
    </div>
  );
}
