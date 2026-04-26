'use client';

import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkoutInstance, useOverrideInstanceItem, type WorkoutItem } from '@/hooks/useWorkouts';
import { useT } from '@/lib/i18n/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// ── Editable prescription for a single exercise ───────────────────────────

type PrescriptionFields = {
  sets: string;
  reps: string;
  weight: string;
  rest: string;
  restBetweenReps: string;
  duration: string;
  distance: string;
  timeMode: '' | 'STOPWATCH' | 'COUNTDOWN';
};

function toStr(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v);
}

function toPrescriptionFields(p: WorkoutItem['prescription']): PrescriptionFields {
  return {
    sets: p.sets !== undefined ? String(p.sets) : '',
    reps: p.reps ?? '',
    weight: p.weight ?? '',
    rest: toStr(p.rest),
    restBetweenReps: toStr(p.restBetweenReps),
    duration: p.duration ?? '',
    distance: p.distance ?? '',
    timeMode:
      p.timeMode === 'STOPWATCH' || p.timeMode === 'COUNTDOWN' ? p.timeMode : '',
  };
}

function toPayload(f: PrescriptionFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (f.sets !== '') out.sets = Number(f.sets);
  if (f.reps !== '') out.reps = f.reps;
  if (f.weight !== '') out.weight = f.weight;
  if (f.rest !== '') out.rest = f.rest;
  if (f.restBetweenReps !== '') out.restBetweenReps = f.restBetweenReps;
  if (f.duration !== '') out.duration = f.duration;
  if (f.distance !== '') out.distance = f.distance;
  if (f.timeMode !== '') out.timeMode = f.timeMode;
  return out;
}

function ExerciseOverrideRow({
  instanceId,
  item,
}: {
  instanceId: string;
  item: WorkoutItem & { _hasOverride?: boolean };
}): JSX.Element {
  const t = useT();
  const override = useOverrideInstanceItem();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<PrescriptionFields>(() =>
    toPrescriptionFields(item.prescription),
  );

  // Reset local fields when item changes (e.g. after a successful save)
  useEffect(() => {
    setFields(toPrescriptionFields(item.prescription));
  }, [item.prescription]);

  const set = (k: keyof PrescriptionFields, v: string) =>
    setFields((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    try {
      await override.mutateAsync({
        instanceId,
        exerciseId: item.exerciseId,
        prescription: toPayload(fields),
      });
      setEditing(false);
      toast.success(t('instanceOverride.saved'));
    } catch {
      toast.error(t('instanceOverride.saveFailed'));
    }
  };

  const handleReset = () => {
    setFields(toPrescriptionFields(item.prescription));
    setEditing(false);
  };

  const exerciseName = item.exercise?.name ?? item.exerciseId;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-medium text-sm truncate">{exerciseName}</p>
          {item._hasOverride && (
            <Badge variant="outline" className="shrink-0 text-[10px] text-primary border-primary/40">
              {t('instanceOverride.customized')}
            </Badge>
          )}
        </div>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t('instanceOverride.edit')}
          </Button>
        ) : (
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              disabled={override.isPending}
              title={t('instanceOverride.reset')}
            >
              <RotateCcw className="size-3.5" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={override.isPending}>
              {override.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {t('instanceOverride.save')}
            </Button>
          </div>
        )}
      </div>

      {!editing ? (
        // Read-only summary
        <p className="text-xs text-muted-foreground">
          {[
            fields.sets && `${fields.sets} sets`,
            fields.reps && `× ${fields.reps} reps`,
            fields.weight && `@ ${fields.weight}`,
            fields.rest && `rest ${fields.rest}`,
            fields.duration && fields.duration,
            fields.distance && fields.distance,
            fields.timeMode && fields.timeMode.toLowerCase(),
          ]
            .filter(Boolean)
            .join(' · ') || '—'}
        </p>
      ) : (
        // Edit form
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">{t('instanceOverride.fields.sets')}</Label>
            <Input
              type="number"
              min={1}
              value={fields.sets}
              onChange={(e) => set('sets', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('instanceOverride.fields.reps')}</Label>
            <Input
              value={fields.reps}
              onChange={(e) => set('reps', e.target.value)}
              placeholder="e.g. 8-12"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('instanceOverride.fields.weight')}</Label>
            <Input
              value={fields.weight}
              onChange={(e) => set('weight', e.target.value)}
              placeholder="e.g. 80kg"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('instanceOverride.fields.rest')}</Label>
            <Input
              value={fields.rest}
              onChange={(e) => set('rest', e.target.value)}
              placeholder="e.g. 90s"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {t('instanceOverride.fields.restBetweenReps')}
            </Label>
            <Input
              value={fields.restBetweenReps}
              onChange={(e) => set('restBetweenReps', e.target.value)}
              placeholder="e.g. 2s"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('instanceOverride.fields.duration')}</Label>
            <Input
              value={fields.duration}
              onChange={(e) => set('duration', e.target.value)}
              placeholder="e.g. 30min"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Time mode</Label>
            <Input
              value={fields.timeMode}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                if (v === 'STOPWATCH' || v === 'COUNTDOWN' || v === '') {
                  set('timeMode', v as PrescriptionFields['timeMode']);
                }
              }}
              placeholder="STOPWATCH or COUNTDOWN"
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────────

export function InstanceOverrideSheet({
  instanceId,
  open,
  onOpenChange,
}: {
  instanceId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}): JSX.Element {
  const t = useT();
  const { data: instance, isLoading } = useWorkoutInstance(instanceId);
  const items = (instance?.template?.items ?? []) as Array<WorkoutItem & { _hasOverride?: boolean }>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{t('instanceOverride.title')}</SheetTitle>
          <SheetDescription>{t('instanceOverride.description')}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {t('instanceOverride.noExercises')}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ExerciseOverrideRow key={item.exerciseId} instanceId={instanceId} item={item} />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
