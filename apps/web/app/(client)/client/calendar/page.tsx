'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays, Activity } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useClientCalendar, type WorkoutInstance } from '@/hooks/useWorkouts';
import { useT } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function fmtDate(d: Date) {
  return d.toISOString().split('T')[0];
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const STATUS_DOT: Record<WorkoutInstance['status'], string> = {
  SCHEDULED: 'bg-primary',
  COMPLETED: 'bg-success',
  SKIPPED: 'bg-muted-foreground/40',
  MISSED: 'bg-destructive',
  MOVED: 'bg-muted-foreground/40',
};

export default function ClientCalendarPage() {
  const t = useT();
  const { user } = useAuthStore();
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  // Pad to full weeks (Sunday start)
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const { data, isLoading } = useClientCalendar(
    user?.id ?? '',
    fmtDate(gridStart),
    fmtDate(gridEnd),
  );

  const byDay = useMemo(() => {
    const m = new Map<string, WorkoutInstance[]>();
    (data ?? []).forEach((inst) => {
      const key = inst.scheduledDate.split('T')[0];
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(inst);
    });
    return m;
  }, [data]);

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const today = new Date();
  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 7); // a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    });
  }, []);

  const selectedKey = fmtDate(selectedDate);
  const selectedInstances = byDay.get(selectedKey) ?? [];

  return (
    <div className="p-4 lg:p-8">
      <PageHeader
        title={t('clientNav.calendar')}
        description={t('client.calendar.desc')}
      />

      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize text-foreground">
              {monthLabel}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCursor(new Date())}
              >
                {t('client.calendar.today')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
                aria-label="Next month"
              >
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {weekdays.map((w) => (
              <div key={w} className="py-1.5 capitalize">
                {w}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : (
            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((d) => {
                const key = fmtDate(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const insts = byDay.get(key) ?? [];
                const isToday = isSameDay(d, today);
                const isSelected = isSameDay(d, selectedDate);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={cn(
                      'group aspect-square rounded-md border p-1.5 text-start transition-all',
                      'hover:border-primary/40 hover:bg-accent/40',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-transparent',
                      !inMonth && 'opacity-40',
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {d.getDate()}
                    </div>
                    {insts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {insts.slice(0, 3).map((i) => (
                          <span
                            key={i.id}
                            className={cn(
                              'size-1.5 rounded-full',
                              STATUS_DOT[i.status],
                            )}
                          />
                        ))}
                        {insts.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">
                            +{insts.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected day detail */}
      <section className="mt-6">
        <h3 className="mb-3 text-base font-semibold text-foreground">
          {selectedDate.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h3>
        {selectedInstances.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CalendarDays className="size-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                {t('client.calendar.empty')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {selectedInstances.map((i) => {
              const title =
                i.summary?.title ?? i.template?.title ?? i.title ?? 'Workout';
              const isActionable = i.status === 'SCHEDULED';
              const inner = (
                <Card
                  className={cn(
                    'transition-all',
                    isActionable && 'card-interactive border-primary/30',
                  )}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Activity className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {i.status.toLowerCase()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        i.status === 'COMPLETED'
                          ? 'success'
                          : i.status === 'MISSED'
                            ? 'destructive'
                            : i.status === 'SCHEDULED'
                              ? 'default'
                              : 'secondary'
                      }
                    >
                      {i.status}
                    </Badge>
                  </CardContent>
                </Card>
              );
              return isActionable ? (
                <Link key={i.id} href={`/client/workout/${i.id}`} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={i.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
