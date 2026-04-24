'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Loader2,
  SkipForward,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  useClientCalendar,
  useScheduleWorkout,
  useMoveInstance,
  useSkipInstance,
  useDeleteInstance,
  useWorkout,
  type WorkoutInstance,
} from '@/hooks/useWorkouts';
import { useI18n, useT } from '@/lib/i18n/client';

const LOCALE_TO_BCP47: Record<string, string> = { he: 'he-IL', en: 'en-US' };
function bcp47(locale: string): string {
  return LOCALE_TO_BCP47[locale] ?? locale;
}
import { PickWorkoutDialog } from '@/components/programs/PickWorkoutDialog';
import { InstanceOverrideSheet } from '@/components/calendar/InstanceOverrideSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ─── Date helpers (pure, timezone-neutral ISO YYYY-MM-DD math) ───────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  // Accept full ISO or YYYY-MM-DD. Normalize to local midday to dodge TZ edges.
  const datePart = s.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function startOfWeek(d: Date): Date {
  // Sunday-start week.
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay());
  out.setHours(12, 0, 0, 0);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12, 0, 0, 0);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Status styling ──────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  WorkoutInstance['status'],
  { chip: string; badge: 'success' | 'muted' | 'destructive' | 'warning' | 'default' }
> = {
  SCHEDULED: { chip: 'border-primary/40 bg-primary/10 text-foreground', badge: 'default' },
  COMPLETED: { chip: 'border-success/40 bg-success/10 text-foreground', badge: 'success' },
  SKIPPED: { chip: 'border-muted bg-muted text-muted-foreground', badge: 'muted' },
  MISSED: { chip: 'border-destructive/40 bg-destructive/10 text-foreground', badge: 'destructive' },
  MOVED: { chip: 'border-warning/40 bg-warning/10 text-foreground', badge: 'warning' },
};

// ─── Chip (draggable) ────────────────────────────────────────────────────

function WorkoutChip({
  instance,
  onClick,
}: {
  instance: WorkoutInstance;
  onClick: () => void;
}) {
  const t = useT();
  const { data: tpl } = useWorkout(instance.templateId ?? '');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: instance.id,
    data: { instance },
    disabled: instance.status !== 'SCHEDULED',
  });
  const style = STATUS_STYLES[instance.status] ?? STATUS_STYLES.SCHEDULED;
  const title = tpl?.title ?? instance.title ?? t('clientDetail.calendar.details.defaultTitle');

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full truncate rounded-md border px-1.5 py-1 text-start text-[11px] font-medium transition hover:brightness-105',
        style.chip,
        isDragging && 'opacity-40',
        instance.status === 'SCHEDULED' && 'cursor-grab active:cursor-grabbing',
      )}
      {...attributes}
      {...(instance.status === 'SCHEDULED' ? listeners : {})}
    >
      {title}
    </button>
  );
}

// ─── Day cell (droppable) ────────────────────────────────────────────────

function DayCell({
  date,
  instances,
  inMonth,
  isToday,
  onClickChip,
  onAddClick,
  compact,
}: {
  date: Date;
  instances: WorkoutInstance[];
  inMonth: boolean;
  isToday: boolean;
  onClickChip: (inst: WorkoutInstance) => void;
  onAddClick: (date: Date) => void;
  compact: boolean;
}) {
  const iso = toISODate(date);
  const { setNodeRef, isOver } = useDroppable({ id: `day-${iso}`, data: { date: iso } });
  const t = useT();
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group relative flex min-h-[96px] flex-col gap-1 rounded-md border border-border bg-card/30 p-1.5 transition',
        !inMonth && 'bg-muted/30 text-muted-foreground',
        isOver && 'ring-2 ring-primary ring-offset-1',
        isToday && 'border-primary',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-[11px] font-semibold tabular-nums',
            isToday && 'rounded-full bg-primary px-1.5 text-primary-foreground',
          )}
        >
          {date.getDate()}
        </span>
        <button
          type="button"
          onClick={() => onAddClick(date)}
          aria-label={t('clientDetail.calendar.scheduleOnDay')}
          className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
        >
          <Plus className="size-3" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {(compact ? instances.slice(0, 3) : instances).map((i) => (
          <WorkoutChip key={i.id} instance={i} onClick={() => onClickChip(i)} />
        ))}
        {compact && instances.length > 3 && (
          <span className="px-1 text-[10px] text-muted-foreground">
            +{instances.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Schedule dialog ─────────────────────────────────────────────────────

function ScheduleDialog({
  clientId,
  defaultDate,
  open,
  onOpenChange,
}: {
  clientId: string;
  defaultDate: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const schedule = useScheduleWorkout();
  const [pickOpen, setPickOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>('');
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDate(defaultDate);
    }
  }, [defaultDate, open]);

  const reset = () => {
    setTemplateId('');
    setTemplateTitle('');
    setDate(defaultDate);
    setTitle('');
    setNotes('');
    setErr(null);
  };

  const submit = async () => {
    setErr(null);
    try {
      await schedule.mutateAsync({
        templateId,
        clientId,
        scheduledDate: date,
        title: title || undefined,
        notes: notes || undefined,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) reset();
          onOpenChange(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clientDetail.calendar.schedule.title')}</DialogTitle>
            <DialogDescription>
              {t('clientDetail.calendar.schedule.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('clientDetail.calendar.schedule.templateLabel')}</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setPickOpen(true)}
              >
                {templateTitle || t('clientDetail.calendar.schedule.templatePlaceholder')}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sch-date">
                {t('clientDetail.calendar.schedule.dateLabel')}
              </Label>
              <Input
                id="sch-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sch-title">
                {t('clientDetail.calendar.schedule.titleLabel')}
              </Label>
              <Input
                id="sch-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('clientDetail.calendar.schedule.titlePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sch-notes">
                {t('clientDetail.calendar.schedule.notesLabel')}
              </Label>
              <Textarea
                id="sch-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={schedule.isPending}
            >
              {t('clientDetail.calendar.schedule.cancel')}
            </Button>
            <Button
              variant="gradient"
              onClick={submit}
              disabled={!templateId || !date || schedule.isPending}
            >
              {schedule.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t('clientDetail.calendar.schedule.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PickWorkoutDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        onPick={(w) => {
          setTemplateId(w.id);
          setTemplateTitle(w.title);
          setPickOpen(false);
        }}
      />
    </>
  );
}

// ─── Instance details dialog ─────────────────────────────────────────────

function InstanceDialog({
  instance,
  open,
  onOpenChange,
}: {
  instance: WorkoutInstance | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  const lc = bcp47(locale);
  const { data: tpl } = useWorkout(instance?.templateId ?? '');
  const move = useMoveInstance();
  const skip = useSkipInstance();
  const del = useDeleteInstance();
  const [moveDate, setMoveDate] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);

  if (!instance) return null;
  const style = STATUS_STYLES[instance.status] ?? STATUS_STYLES.SCHEDULED;
  const isScheduled = instance.status === 'SCHEDULED';

  const doMove = async () => {
    if (!moveDate) return;
    await move.mutateAsync({ id: instance.id, scheduledDate: moveDate });
    setMoveDate('');
    onOpenChange(false);
  };

  const doSkip = async () => {
    await skip.mutateAsync({ id: instance.id });
    onOpenChange(false);
  };

  const doDelete = async () => {
    if (!confirm(t('clientDetail.calendar.details.confirmDelete'))) return;
    await del.mutateAsync(instance.id);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tpl?.title ?? instance.title ?? t('clientDetail.calendar.details.defaultTitle')}
          </DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-2">
              <Badge variant={style.badge}>
                {t(`clientDetail.calendar.status.${instance.status}`)}
              </Badge>
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="size-3" />
                {parseISODate(instance.scheduledDate).toLocaleDateString(lc)}
              </span>
              {tpl?.estimatedDuration ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {tpl.estimatedDuration}m
                </span>
              ) : null}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {instance.notes && (
            <p className="rounded-md border border-border bg-muted/30 p-2.5 text-sm text-foreground">
              {instance.notes}
            </p>
          )}
          {isScheduled && (
            <div className="space-y-1.5">
              <Label htmlFor="move-date">
                {t('clientDetail.calendar.details.moveLabel')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="move-date"
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={doMove}
                  disabled={!moveDate || move.isPending}
                >
                  {t('clientDetail.calendar.details.move')}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={doDelete}
            disabled={instance.status === 'COMPLETED' || del.isPending}
          >
            <Trash2 className="size-4" />
            {t('clientDetail.calendar.details.delete')}
          </Button>
          <div className="flex gap-2">
            {isScheduled && (
              <Button variant="outline" onClick={doSkip} disabled={skip.isPending}>
                <SkipForward className="size-4" />
                {t('clientDetail.calendar.details.skip')}
              </Button>
            )}
            {instance.templateId && (
              <Button variant="outline" onClick={() => setOverrideOpen(true)}>
                {t('clientDetail.calendar.details.customize')}
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>
              {t('clientDetail.calendar.details.close')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <InstanceOverrideSheet
      instanceId={instance.id}
      open={overrideOpen}
      onOpenChange={setOverrideOpen}
    />
    </>
  );
}

// ─── Main calendar ───────────────────────────────────────────────────────

type View = 'month' | 'week' | 'day';

export function WorkoutCalendar({ clientId }: { clientId: string }): JSX.Element {
  const t = useT();
  const { locale } = useI18n();
  const lc = bcp47(locale);
  const [view, setView] = useState<View>('month');
  const [focus, setFocus] = useState<Date>(() => new Date());
  const [selectedInstance, setSelectedInstance] = useState<WorkoutInstance | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(toISODate(new Date()));
  const [dragInstance, setDragInstance] = useState<WorkoutInstance | null>(null);
  const move = useMoveInstance();

  // Range for the current view.
  const { startDate, endDate, days } = useMemo(() => {
    if (view === 'day') {
      const d = new Date(focus);
      d.setHours(12, 0, 0, 0);
      return { startDate: toISODate(d), endDate: toISODate(d), days: [d] };
    }
    if (view === 'week') {
      const start = startOfWeek(focus);
      const ds = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return {
        startDate: toISODate(ds[0]),
        endDate: toISODate(ds[6]),
        days: ds,
      };
    }
    // month: show leading/trailing cells from adjacent weeks
    const first = startOfMonth(focus);
    const last = endOfMonth(focus);
    const gridStart = startOfWeek(first);
    const gridDays: Date[] = [];
    let cursor = new Date(gridStart);
    while (cursor <= last || gridDays.length % 7 !== 0) {
      gridDays.push(new Date(cursor));
      cursor = addDays(cursor, 1);
      if (gridDays.length >= 42) break;
    }
    return {
      startDate: toISODate(gridDays[0]),
      endDate: toISODate(gridDays[gridDays.length - 1]),
      days: gridDays,
    };
  }, [view, focus]);

  const { data: instances, isLoading } = useClientCalendar(clientId, startDate, endDate);

  const byDay = useMemo(() => {
    const map = new Map<string, WorkoutInstance[]>();
    for (const i of instances ?? []) {
      const key = i.scheduledDate.split('T')[0];
      const arr = map.get(key) ?? [];
      arr.push(i);
      map.set(key, arr);
    }
    return map;
  }, [instances]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => {
    const inst = (e.active.data.current as { instance?: WorkoutInstance } | undefined)
      ?.instance;
    if (inst) setDragInstance(inst);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragInstance(null);
    if (!e.over) return;
    const targetDate = (e.over.data.current as { date?: string } | undefined)?.date;
    const inst = (e.active.data.current as { instance?: WorkoutInstance } | undefined)
      ?.instance;
    if (!targetDate || !inst) return;
    const currentDate = inst.scheduledDate.split('T')[0];
    if (currentDate === targetDate) return;
    move.mutate({ id: inst.id, scheduledDate: targetDate });
  };

  const today = new Date();
  const shiftMonth = (delta: number) =>
    setFocus((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  const shiftDays = (delta: number) => setFocus((d) => addDays(d, delta));

  const headerLabel = useMemo(() => {
    if (view === 'month') {
      return focus.toLocaleDateString(lc, { month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const s = startOfWeek(focus);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString(lc, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(lc, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return focus.toLocaleDateString(lc, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [view, focus, lc]);

  const handleAddClick = (date: Date) => {
    setScheduleDate(toISODate(date));
    setScheduleOpen(true);
  };

  const dowLabels = useMemo(() => {
    // Sunday-start week.
    const base = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) =>
      addDays(base, i).toLocaleDateString(lc, { weekday: 'short' }),
    );
  }, [lc]);

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label={t('clientDetail.calendar.prev')}
              onClick={() =>
                view === 'month'
                  ? shiftMonth(-1)
                  : shiftDays(view === 'week' ? -7 : -1)
              }
            >
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFocus(new Date())}>
              {t('clientDetail.calendar.today')}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('clientDetail.calendar.next')}
              onClick={() =>
                view === 'month'
                  ? shiftMonth(1)
                  : shiftDays(view === 'week' ? 7 : 1)
              }
            >
              <ChevronRight className="size-4 rtl:rotate-180" />
            </Button>
          </div>
          <p className="ms-2 text-sm font-semibold text-foreground">{headerLabel}</p>
          <div className="ms-auto flex items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              {(['month', 'week', 'day'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium transition',
                    view === v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-foreground hover:bg-muted',
                  )}
                >
                  {t(`clientDetail.calendar.${v}View`)}
                </button>
              ))}
            </div>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => {
                setScheduleDate(toISODate(focus));
                setScheduleOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t('clientDetail.calendar.scheduleCta')}
            </Button>
          </div>
        </div>

        {/* Grid */}
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {view === 'month' && (
            <div>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {dowLabels.map((l) => (
                  <p
                    key={l}
                    className="px-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {l}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => (
                  <DayCell
                    key={toISODate(d)}
                    date={d}
                    instances={byDay.get(toISODate(d)) ?? []}
                    inMonth={d.getMonth() === focus.getMonth()}
                    isToday={sameDay(d, today)}
                    onClickChip={setSelectedInstance}
                    onAddClick={handleAddClick}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {days.map((d) => (
                  <p
                    key={toISODate(d)}
                    className="px-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {d.toLocaleDateString(undefined, { weekday: 'short' })}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => (
                  <DayCell
                    key={toISODate(d)}
                    date={d}
                    instances={byDay.get(toISODate(d)) ?? []}
                    inMonth
                    isToday={sameDay(d, today)}
                    onClickChip={setSelectedInstance}
                    onAddClick={handleAddClick}
                    compact={false}
                  />
                ))}
              </div>
            </div>
          )}

          {view === 'day' && (
            <DayList
              date={focus}
              instances={byDay.get(toISODate(focus)) ?? []}
              onClickChip={setSelectedInstance}
              onAddClick={() => handleAddClick(focus)}
            />
          )}

          <DragOverlay>
            {dragInstance ? <DragChip instance={dragInstance} /> : null}
          </DragOverlay>
        </DndContext>

        {isLoading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {t('clientDetail.calendar.loading')}
          </div>
        )}
      </CardContent>

      <ScheduleDialog
        clientId={clientId}
        defaultDate={scheduleDate}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />
      <InstanceDialog
        instance={selectedInstance}
        open={!!selectedInstance}
        onOpenChange={(o) => !o && setSelectedInstance(null)}
      />
    </Card>
  );
}

function DragChip({ instance }: { instance: WorkoutInstance }) {
  const t = useT();
  const { data: tpl } = useWorkout(instance.templateId ?? '');
  const style = STATUS_STYLES[instance.status] ?? STATUS_STYLES.SCHEDULED;
  return (
    <div
      className={cn(
        'rounded-md border px-1.5 py-1 text-[11px] font-medium shadow-lg',
        style.chip,
      )}
    >
      {tpl?.title ?? instance.title ?? t('clientDetail.calendar.details.defaultTitle')}
    </div>
  );
}

function DayList({
  date,
  instances,
  onClickChip,
  onAddClick,
}: {
  date: Date;
  instances: WorkoutInstance[];
  onClickChip: (inst: WorkoutInstance) => void;
  onAddClick: () => void;
}) {
  const t = useT();
  const iso = toISODate(date);
  const { setNodeRef, isOver } = useDroppable({ id: `day-${iso}`, data: { date: iso } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-md border border-border bg-card/30 p-3 transition',
        isOver && 'ring-2 ring-primary ring-offset-1',
      )}
    >
      {instances.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
          <p>{t('clientDetail.calendar.emptyDayTitle')}</p>
          <Button variant="outline" size="sm" onClick={onAddClick}>
            <Plus className="size-4" />
            {t('clientDetail.calendar.scheduleCta')}
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {instances.map((i) => (
            <DayListRow key={i.id} instance={i} onClick={() => onClickChip(i)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DayListRow({
  instance,
  onClick,
}: {
  instance: WorkoutInstance;
  onClick: () => void;
}) {
  const { data: tpl } = useWorkout(instance.templateId ?? '');
  const style = STATUS_STYLES[instance.status] ?? STATUS_STYLES.SCHEDULED;
  const t = useT();
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2.5 text-start text-sm hover:bg-muted/50"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {tpl?.title ?? instance.title ?? t('clientDetail.calendar.details.defaultTitle')}
          </p>
          {(tpl?.estimatedDuration || instance.notes) && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {tpl?.estimatedDuration ? `${tpl.estimatedDuration} min` : ''}
              {tpl?.estimatedDuration && instance.notes ? ' · ' : ''}
              {instance.notes ?? ''}
            </p>
          )}
        </div>
        <Badge variant={style.badge}>
          {t(`clientDetail.calendar.status.${instance.status}`)}
        </Badge>
      </button>
    </li>
  );
}
