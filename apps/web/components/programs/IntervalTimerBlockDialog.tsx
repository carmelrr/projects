'use client';

import { useEffect, useMemo, useState } from 'react';
import { Timer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { IntervalTimerConfig } from '@/hooks/useWorkouts';

const CLASSIC_TABATA: IntervalTimerConfig = {
  title: 'Classic Tabata',
  preset: 'CLASSIC_TABATA',
  prepareSec: 10,
  workSec: 20,
  restSec: 10,
  rounds: 8,
  sets: 1,
  restBetweenSetsSec: 60,
  intervals: [],
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: IntervalTimerConfig;
  onSave: (cfg: IntervalTimerConfig) => void;
}

export function IntervalTimerBlockDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: Props) {
  const [mode, setMode] = useState<'CLASSIC_TABATA' | 'CUSTOM'>(
    initial?.preset === 'CUSTOM' ? 'CUSTOM' : 'CLASSIC_TABATA',
  );
  const [cfg, setCfg] = useState<IntervalTimerConfig>(
    initial ?? { ...CLASSIC_TABATA },
  );

  useEffect(() => {
    if (!open) return;
    setMode(initial?.preset === 'CUSTOM' ? 'CUSTOM' : 'CLASSIC_TABATA');
    setCfg(initial ?? { ...CLASSIC_TABATA });
  }, [open, initial]);

  const set = <K extends keyof IntervalTimerConfig>(
    key: K,
    value: IntervalTimerConfig[K],
  ) => setCfg((prev) => ({ ...prev, [key]: value, preset: 'CUSTOM' }));

  const intervals = useMemo(() => {
    const list = cfg.intervals ?? [];
    return Array.from({ length: cfg.rounds }, (_, i) => list[i] ?? { name: '', description: '' });
  }, [cfg.intervals, cfg.rounds]);

  const totalSeconds =
    cfg.prepareSec +
    cfg.sets * (cfg.rounds * (cfg.workSec + cfg.restSec)) +
    Math.max(0, cfg.sets - 1) * cfg.restBetweenSetsSec;
  const totalMin = Math.round(totalSeconds / 60);

  const updateInterval = (
    idx: number,
    patch: Partial<{ name: string; description: string }>,
  ) =>
    setCfg((prev) => {
      const list = (prev.intervals ?? []).slice();
      while (list.length < prev.rounds) list.push({ name: '', description: '' });
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, intervals: list, preset: 'CUSTOM' };
    });

  const numField = (key: keyof IntervalTimerConfig, label: string, min = 0) => (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input
        type="number"
        min={min}
        value={String(cfg[key] ?? '')}
        onChange={(e) =>
          set(key, Math.max(min, Number(e.target.value) || 0) as never)
        }
        className="h-8"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="size-4" /> Interval timer block
          </DialogTitle>
          <DialogDescription>
            Define a Tabata-style work/rest interval. The trainee&rsquo;s app
            will run it as a fullscreen timer.
          </DialogDescription>
        </DialogHeader>

        {/* Preset toggle */}
        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
          <button
            type="button"
            className={cn(
              'flex-1 rounded px-3 py-1.5 transition',
              mode === 'CLASSIC_TABATA'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground',
            )}
            onClick={() => {
              setMode('CLASSIC_TABATA');
              setCfg({ ...CLASSIC_TABATA, title: cfg.title || CLASSIC_TABATA.title });
            }}
          >
            Classic Tabata
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded px-3 py-1.5 transition',
              mode === 'CUSTOM' ? 'bg-background shadow-sm' : 'text-muted-foreground',
            )}
            onClick={() => {
              setMode('CUSTOM');
              setCfg((prev) => ({ ...prev, preset: 'CUSTOM' }));
            }}
          >
            Custom
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="it-title">Block title</Label>
            <Input
              id="it-title"
              value={cfg.title}
              onChange={(e) =>
                setCfg((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Tabata Push Day"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {numField('prepareSec', 'Prepare (s)', 0)}
            {numField('workSec', 'Work (s)', 1)}
            {numField('restSec', 'Rest (s)', 0)}
            {numField('rounds', 'Rounds', 1)}
            {numField('sets', 'Sets', 1)}
            {numField('restBetweenSetsSec', 'Rest between sets (s)', 0)}
          </div>

          <p className="text-xs text-muted-foreground">
            {cfg.workSec}s work / {cfg.restSec}s rest · {cfg.rounds} rounds ·{' '}
            {cfg.sets} set{cfg.sets !== 1 ? 's' : ''}
            {' · '}~{totalMin} min total
          </p>

          {/* Per-round names */}
          <div className="space-y-2">
            <Label className="text-[11px]">
              Round names (shown on the timer)
            </Label>
            <div className="space-y-1.5">
              {intervals.map((iv, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr] gap-2 items-center">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <Input
                    value={iv.name ?? ''}
                    onChange={(e) =>
                      updateInterval(i, { name: e.target.value })
                    }
                    placeholder={`Round ${i + 1}`}
                    className="h-8"
                  />
                </div>
              ))}
            </div>
            <Textarea
              rows={2}
              value={(cfg.intervals?.[0]?.description as string) ?? ''}
              onChange={(e) => updateInterval(0, { description: e.target.value })}
              placeholder="Optional cue shown on the first round (e.g. Push-ups)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={() => {
              const cleanIntervals = (cfg.intervals ?? [])
                .slice(0, cfg.rounds)
                .map((iv) => ({
                  name: (iv?.name ?? '').trim() || undefined,
                  description: (iv?.description ?? '').trim() || undefined,
                }))
                .filter((iv) => iv.name || iv.description);
              onSave({
                ...cfg,
                title: cfg.title.trim() || 'Interval Timer',
                preset: mode,
                intervals: cleanIntervals,
              });
              onOpenChange(false);
            }}
            disabled={!cfg.title.trim() || cfg.workSec < 1 || cfg.rounds < 1}
          >
            Save block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
