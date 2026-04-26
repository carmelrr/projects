'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Pause,
  Pencil,
  Play as PlayIcon,
  RotateCcw,
  SkipForward,
  StickyNote,
  Timer,
  X,
} from 'lucide-react';
import {
  useWorkoutInstance,
  useSubmitLog,
  type WorkoutItem,
  type SubmitLogPayload,
} from '@/hooks/useWorkouts';
import { useT } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────

interface SetState {
  reps: string;
  weight: string;
  duration: string;
  restSeconds: string;
  completed: boolean;
}

interface ExerciseState {
  exerciseId: string;
  name: string;
  videoUrl?: string | null;
  sets: SetState[];
  prescription: Record<string, unknown>;
  coachNotes?: string;
}

interface BlockCompletion {
  kind: 'INTERVAL_TIMER' | 'NOTE';
  totalWorkSec?: number;
  acknowledged?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function prescStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function fmtSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function buildPrescriptionParts(
  p: Record<string, unknown>,
  setCount: number,
): Array<{ key: string; value: string; label: string }> {
  const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
  const str = (v: unknown) => { const s = String(v ?? '').trim(); return s || null; };
  const parts: Array<{ key: string; value: string; label: string }> = [];

  const sets = num(p.sets) ?? setCount;
  parts.push({ key: 'sets', value: String(sets), label: sets === 1 ? 'set' : 'sets' });

  const reps = str(p.reps);
  if (reps) parts.push({ key: 'reps', value: reps, label: 'reps' });

  const weight = num(p.weight);
  if (weight) parts.push({ key: 'weight', value: String(weight), label: str(p.weightUnit) ?? 'kg' });

  const duration = num(p.duration);
  if (duration) parts.push({ key: 'duration', value: `${duration}s`, label: 'duration' });

  const rest = num(p.rest);
  if (rest) parts.push({ key: 'rest', value: `${rest}s`, label: 'rest' });

  const restBetweenReps = num(p.restBetweenReps);
  if (restBetweenReps) parts.push({ key: 'repRest', value: `${restBetweenReps}s`, label: 'rest/rep' });

  return parts;
}

function buildInitialExercises(items: WorkoutItem[] | undefined): ExerciseState[] {
  return (items ?? [])
    .filter((it) => (it.kind ?? 'EXERCISE') === 'EXERCISE' && !!it.exerciseId)
    .map((it) => {
      const setCount = (it.prescription?.sets as number | undefined) ?? 3;
      const sets: SetState[] = Array.from({ length: setCount }, () => ({
        reps: prescStr(it.prescription?.reps),
        weight: prescStr(it.prescription?.weight),
        duration: prescStr(it.prescription?.duration),
        restSeconds: '',
        completed: false,
      }));
      return {
        exerciseId: it.exerciseId!,
        name: it.exercise?.name ?? 'Exercise',
        videoUrl: it.exercise?.videoUrl ?? null,
        sets,
        prescription: it.prescription ?? {},
        coachNotes: it.coachNotes,
      };
    });
}

// ── Session Timer ────────────────────────────────────────────────────────

function useSessionTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);

  return {
    seconds,
    running,
    formatted: fmtSeconds(seconds),
    toggle: () => setRunning((r) => !r),
    reset: () => setSeconds(0),
  };
}

// ── Set Row ──────────────────────────────────────────────────────────────

function SetRow({
  setIndex,
  set,
  prescription,
  onChange,
  onComplete,
}: {
  setIndex: number;
  set: SetState;
  prescription: Record<string, unknown>;
  onChange: (patch: Partial<SetState>) => void;
  onComplete: () => void;
}) {
  const hasReps = !!prescription.reps;
  const hasWeight = !!prescription.weight;
  const hasDuration = !!prescription.duration;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border p-2 transition-colors',
        set.completed
          ? 'border-success/40 bg-success/5'
          : 'border-border bg-background',
      )}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
        {setIndex + 1}
      </div>

      {hasReps && (
        <div className="flex-1">
          <Input
            inputMode="numeric"
            placeholder="reps"
            value={set.reps}
            onChange={(e) => onChange({ reps: e.target.value })}
            className="h-9 text-sm"
            disabled={set.completed}
          />
        </div>
      )}
      {hasWeight && (
        <div className="flex-1">
          <Input
            inputMode="decimal"
            placeholder="kg"
            value={set.weight}
            onChange={(e) => onChange({ weight: e.target.value })}
            className="h-9 text-sm"
            disabled={set.completed}
          />
        </div>
      )}
      {hasDuration && (
        <div className="flex-1">
          <Input
            inputMode="numeric"
            placeholder="sec"
            value={set.duration}
            onChange={(e) => onChange({ duration: e.target.value })}
            className="h-9 text-sm"
            disabled={set.completed}
          />
        </div>
      )}

      <Button
        type="button"
        size="icon"
        variant={set.completed ? 'default' : 'outline'}
        onClick={onComplete}
        aria-label={set.completed ? 'Mark incomplete' : 'Mark complete'}
        className={cn(
          'size-9 shrink-0',
          set.completed && 'bg-success text-success-foreground hover:bg-success/90',
        )}
      >
        <Check className="size-4" />
      </Button>
    </div>
  );
}

// ── Interval Timer Block (simple version) ────────────────────────────────

function IntervalTimerBlock({
  config,
  blockKey,
  completion,
  onUpdate,
}: {
  config: NonNullable<WorkoutItem['intervalTimer']>;
  blockKey: string;
  completion?: BlockCompletion;
  onUpdate: (c: BlockCompletion) => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalWorkSec = useMemo(() => {
    const rounds = config.rounds ?? 1;
    const sets = config.sets ?? 1;
    return (
      (config.prepareSec ?? 0) +
      sets * (rounds * (config.workSec + config.restSec) + (config.restBetweenSetsSec ?? 0))
    );
  }, [config]);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= totalWorkSec) {
            setRunning(false);
            onUpdate({ kind: 'INTERVAL_TIMER', totalWorkSec });
            return totalWorkSec;
          }
          return e + 1;
        });
      }, 1000);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running, totalWorkSec, onUpdate]);

  const progress = totalWorkSec > 0 ? (elapsed / totalWorkSec) * 100 : 0;
  const done = !!completion;

  return (
    <Card
      className={cn(
        'border-l-4',
        done ? 'border-l-success bg-success/5' : 'border-l-info bg-info/5',
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-info" />
          <p className="flex-1 font-semibold text-foreground">{config.title}</p>
          {done && <Badge variant="success">Done</Badge>}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Work</p>
            <p className="font-semibold tabular-nums">{config.workSec}s</p>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Rest</p>
            <p className="font-semibold tabular-nums">{config.restSec}s</p>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Rounds × Sets</p>
            <p className="font-semibold tabular-nums">
              {config.rounds} × {config.sets}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono tabular-nums">{fmtSeconds(elapsed)}</span>
            <span className="text-xs text-muted-foreground">
              / {fmtSeconds(totalWorkSec)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-info transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={running ? 'outline' : 'default'}
            className="flex-1"
            onClick={() => setRunning((r) => !r)}
            disabled={done}
          >
            {running ? (
              <>
                <Pause className="size-4" /> Pause
              </>
            ) : (
              <>
                <PlayIcon className="size-4" /> {elapsed === 0 ? 'Start' : 'Resume'}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRunning(false);
              onUpdate({ kind: 'INTERVAL_TIMER', totalWorkSec });
            }}
            disabled={done}
          >
            <Check className="size-4" /> Mark done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Note Block ───────────────────────────────────────────────────────────

function NoteBlock({
  config,
  blockKey,
  completion,
  onUpdate,
}: {
  config: NonNullable<WorkoutItem['note']>;
  blockKey: string;
  completion?: BlockCompletion;
  onUpdate: (c: BlockCompletion) => void;
}) {
  const acked = !!completion?.acknowledged;
  return (
    <Card className={cn('border-l-4', acked ? 'border-l-success bg-success/5' : 'border-l-warning bg-warning/5')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <StickyNote className="size-4 text-warning" />
          <p className="flex-1 font-semibold text-foreground">
            {config.title || 'Note'}
          </p>
          {acked && <Badge variant="success">Read</Badge>}
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{config.body}</p>
        <Button
          type="button"
          variant={acked ? 'outline' : 'default'}
          size="sm"
          onClick={() => onUpdate({ kind: 'NOTE', acknowledged: !acked })}
        >
          {acked ? 'Mark unread' : 'Got it'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Exercise Timer (auto-cycle work / rest across all sets) ──────────────

type ExPhase = 'PREPARE' | 'WORK' | 'REP_REST' | 'SET_REST' | 'DONE';

interface ExSegment {
  phase: ExPhase;
  seconds: number;
  /** 0-based set index this segment belongs to. */
  setIndex: number;
  /** 0-based rep index within the set (for per-rep modes). */
  repIndex?: number;
  /** Total reps in this set, when per-rep. */
  repsInSet?: number;
  /** Whether this WORK segment is the final one for its set. */
  lastWorkOfSet?: boolean;
}

function buildExerciseSegments(
  prescription: Record<string, unknown>,
  setCount: number,
): ExSegment[] {
  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const duration = num(prescription.duration);
  const reps = num(prescription.reps);
  const restBetweenReps = num(prescription.restBetweenReps);
  const restBetweenSets = num(prescription.rest);
  const perRep = duration > 0 && reps > 1 && restBetweenReps > 0;

  const segs: ExSegment[] = [];
  segs.push({ phase: 'PREPARE', seconds: 5, setIndex: 0 });

  for (let s = 0; s < setCount; s += 1) {
    if (perRep) {
      for (let r = 0; r < reps; r += 1) {
        segs.push({
          phase: 'WORK',
          seconds: duration,
          setIndex: s,
          repIndex: r,
          repsInSet: reps,
          lastWorkOfSet: r === reps - 1,
        });
        if (r < reps - 1) {
          segs.push({
            phase: 'REP_REST',
            seconds: restBetweenReps,
            setIndex: s,
            repIndex: r,
          });
        }
      }
    } else if (duration > 0) {
      segs.push({
        phase: 'WORK',
        seconds: duration,
        setIndex: s,
        lastWorkOfSet: true,
      });
    }
    if (s < setCount - 1 && restBetweenSets > 0) {
      segs.push({ phase: 'SET_REST', seconds: restBetweenSets, setIndex: s });
    }
  }
  segs.push({ phase: 'DONE', seconds: 0, setIndex: setCount - 1 });
  return segs;
}

function exerciseHasTimer(prescription: Record<string, unknown>): boolean {
  const n = Number(prescription.duration);
  return Number.isFinite(n) && n > 0;
}

/** Plays a short beep using the Web Audio API. */
function playBeep(freq: number, durationMs: number) {
  if (typeof window === 'undefined') return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
    osc.onended = () => ctx.close().catch(() => undefined);
  } catch {
    /* audio not available */
  }
}

function ExerciseTimerDialog({
  open,
  exerciseName,
  prescription,
  setCount,
  onClose,
  onSetComplete,
}: {
  open: boolean;
  exerciseName: string;
  prescription: Record<string, unknown>;
  setCount: number;
  onClose: () => void;
  /** Called when WORK for a given (0-based) set finishes. */
  onSetComplete: (setIndex: number) => void;
}) {
  const segments = useMemo(
    () => buildExerciseSegments(prescription, setCount),
    [prescription, setCount],
  );
  const [segIdx, setSegIdx] = useState(0);
  const [remaining, setRemaining] = useState(segments[0]?.seconds ?? 0);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef<Set<number>>(new Set());

  // Reset whenever the dialog re-opens or segments change.
  useEffect(() => {
    if (open) {
      setSegIdx(0);
      setRemaining(segments[0]?.seconds ?? 0);
      setRunning(true);
      completedRef.current = new Set();
    } else {
      setRunning(false);
    }
  }, [open, segments]);

  const advance = (fromIdx: number) => {
    const cur = segments[fromIdx];
    if (cur?.phase === 'WORK' && cur.lastWorkOfSet) {
      if (!completedRef.current.has(cur.setIndex)) {
        completedRef.current.add(cur.setIndex);
        onSetComplete(cur.setIndex);
      }
    }
    const nextIdx = fromIdx + 1;
    const next = segments[nextIdx];
    if (!next || next.phase === 'DONE') {
      playBeep(880, 250);
      setTimeout(() => playBeep(1175, 350), 200);
      setRunning(false);
      setSegIdx(segments.length - 1);
      setRemaining(0);
      return;
    }
    // Cue beep for transitions
    if (next.phase === 'WORK') playBeep(880, 180);
    else playBeep(523, 140);
    setSegIdx(nextIdx);
    setRemaining(next.seconds);
  };

  // Tick
  useEffect(() => {
    if (!running) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // Defer state mutation outside this updater
          queueMicrotask(() => advance(segIdx));
          return 0;
        }
        // Final-3-seconds countdown beeps
        if (r <= 4 && r > 1) playBeep(660, 80);
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, segIdx]);

  const cur = segments[segIdx] ?? segments[0];
  const total = cur?.seconds || 1;
  const elapsed = total - remaining;
  const progress = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  const isDone = !cur || cur.phase === 'DONE' || segIdx >= segments.length - 1;

  const phaseLabel = (() => {
    if (!cur) return '';
    switch (cur.phase) {
      case 'PREPARE':
        return 'Get ready';
      case 'WORK':
        return cur.repsInSet
          ? `Rep ${(cur.repIndex ?? 0) + 1} / ${cur.repsInSet}`
          : 'Work';
      case 'REP_REST':
        return 'Rest';
      case 'SET_REST':
        return 'Rest between sets';
      case 'DONE':
        return 'Done';
    }
  })();

  const phaseTone =
    cur?.phase === 'WORK'
      ? 'text-success'
      : cur?.phase === 'PREPARE'
        ? 'text-info'
        : 'text-warning';

  const barTone =
    cur?.phase === 'WORK'
      ? 'bg-success'
      : cur?.phase === 'PREPARE'
        ? 'bg-info'
        : 'bg-warning';

  // Find the next WORK segment to preview "Up next"
  const upNext = (() => {
    for (let i = segIdx + 1; i < segments.length; i += 1) {
      const s = segments[i];
      if (s.phase === 'WORK') return s;
    }
    return undefined;
  })();

  const restart = () => {
    setSegIdx(0);
    setRemaining(segments[0]?.seconds ?? 0);
    completedRef.current = new Set();
    setRunning(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{exerciseName}</DialogTitle>
          <DialogDescription>
            Set {Math.min(setCount, (cur?.setIndex ?? 0) + 1)} of {setCount}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <p className={cn('text-sm font-semibold uppercase tracking-wide', phaseTone)}>
            {phaseLabel}
          </p>
          <p className="font-mono text-7xl font-bold tabular-nums text-foreground">
            {fmtSeconds(remaining)}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-[width]', barTone)}
              style={{ width: `${progress}%` }}
            />
          </div>
          {!isDone && upNext && (
            <p className="text-xs text-muted-foreground">
              Up next: Set {upNext.setIndex + 1}
              {upNext.repsInSet ? ` · Rep ${(upNext.repIndex ?? 0) + 1}` : ''} ·{' '}
              {upNext.seconds}s
            </p>
          )}
          {isDone && (
            <p className="text-sm font-medium text-success">
              All sets complete!
            </p>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="size-4" /> Close
          </Button>
          <div className="flex gap-2">
            {isDone ? (
              <Button type="button" variant="outline" onClick={restart}>
                <RotateCcw className="size-4" /> Restart
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => advance(segIdx)}
                  aria-label="Skip"
                >
                  <SkipForward className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={running ? 'outline' : 'default'}
                  onClick={() => setRunning((r) => !r)}
                >
                  {running ? (
                    <>
                      <Pause className="size-4" /> Pause
                    </>
                  ) : (
                    <>
                      <PlayIcon className="size-4" /> {elapsed === 0 ? 'Start' : 'Resume'}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



export default function WorkoutLogPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ instanceId: string }>();
  const instanceId = params.instanceId;
  const storageKey = `workout-log-draft-${instanceId}`;

  const { data: instance, isLoading } = useWorkoutInstance(instanceId);
  const submit = useSubmitLog(instanceId);

  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [blockCompletions, setBlockCompletions] = useState<Record<string, BlockCompletion>>({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timerExIdx, setTimerExIdx] = useState<number | null>(null);
  const [logExpanded, setLogExpanded] = useState<Set<number>>(new Set());

  const toggleLogExpanded = (exIdx: number) =>
    setLogExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(exIdx)) next.delete(exIdx);
      else next.add(exIdx);
      return next;
    });

  const session = useSessionTimer();

  // Initialize state once template loads, hydrating from localStorage if present.
  useEffect(() => {
    if (!instance?.template?.items || hydrated) return;
    const initial = buildInitialExercises(instance.template.items);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as {
          exercises: ExerciseState[];
          blockCompletions: Record<string, BlockCompletion>;
          sessionNotes: string;
        };
        // Map by exerciseId in case the template changed
        const draftMap = new Map(draft.exercises.map((e) => [e.exerciseId, e]));
        const merged = initial.map((ex) => {
          const d = draftMap.get(ex.exerciseId);
          return d ? { ...ex, sets: d.sets } : ex;
        });
        setExercises(merged);
        setBlockCompletions(draft.blockCompletions ?? {});
        setSessionNotes(draft.sessionNotes ?? '');
      } else {
        setExercises(initial);
      }
    } catch {
      setExercises(initial);
    }
    setHydrated(true);
  }, [instance, hydrated, storageKey]);

  // Autosave to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ exercises, blockCompletions, sessionNotes }),
      );
    } catch {
      // ignore quota errors
    }
  }, [exercises, blockCompletions, sessionNotes, hydrated, storageKey]);

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<SetState>) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)),
        };
      }),
    );
  };

  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) =>
            j === setIdx ? { ...s, completed: !s.completed } : s,
          ),
        };
      }),
    );
  };

  const markSetComplete = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) =>
            j === setIdx && !s.completed ? { ...s, completed: true } : s,
          ),
        };
      }),
    );
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              reps: last?.reps ?? '',
              weight: last?.weight ?? '',
              duration: last?.duration ?? '',
              restSeconds: '',
              completed: false,
            },
          ],
        };
      }),
    );
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
      }),
    );
  };

  const handleSubmit = async () => {
    const payload: SubmitLogPayload = {
      durationMinutes: Math.max(1, Math.round(session.seconds / 60)),
      notes: sessionNotes.trim() || undefined,
      items: exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map((s, idx) => ({
          setIndex: idx,
          reps: s.reps ? Number(s.reps) : undefined,
          weight: s.weight ? Number(s.weight) : undefined,
          duration: s.duration ? Number(s.duration) : undefined,
          restSeconds: s.restSeconds ? Number(s.restSeconds) : undefined,
          completed: s.completed,
        })),
      })),
      blockCompletions: Object.fromEntries(
        Object.entries(blockCompletions).map(([k, v]) => [
          k,
          { kind: v.kind, totalWorkSec: v.totalWorkSec },
        ]),
      ),
    };

    try {
      await submit.mutateAsync(payload);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* noop */
      }
      router.push('/client');
    } catch (err) {
      console.error('Failed to submit log', err);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!instance || !instance.template) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-muted-foreground">Workout not found.</p>
        <Button className="mt-4" onClick={() => router.back()} variant="outline">
          <ArrowLeft className="size-4 rtl:rotate-180" /> Back
        </Button>
      </div>
    );
  }

  const allItems = instance.template.items ?? [];
  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (s, e) => s + e.sets.filter((x) => x.completed).length,
    0,
  );
  const progress = totalSets ? (completedSets / totalSets) * 100 : 0;

  // Build a render plan that interleaves blocks in original order
  let exerciseCursor = 0;

  return (
    <div className="mx-auto max-w-3xl pb-32">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft className="size-5 rtl:rotate-180" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {instance.template.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedSets}/{totalSets} sets
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={session.toggle}
            className="font-mono tabular-nums"
            aria-label="Session timer"
          >
            <Clock className="size-4" />
            {session.formatted}
          </Button>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="space-y-4 px-4 py-4 lg:px-8 lg:py-6">
        {allItems.map((item, idx) => {
          const kind = item.kind ?? 'EXERCISE';
          if (kind === 'INTERVAL_TIMER' && item.intervalTimer) {
            const k = `block-${idx}`;
            return (
              <IntervalTimerBlock
                key={k}
                blockKey={k}
                config={item.intervalTimer}
                completion={blockCompletions[k]}
                onUpdate={(c) => setBlockCompletions((p) => ({ ...p, [k]: c }))}
              />
            );
          }
          if (kind === 'NOTE' && item.note) {
            const k = `block-${idx}`;
            return (
              <NoteBlock
                key={k}
                blockKey={k}
                config={item.note}
                completion={blockCompletions[k]}
                onUpdate={(c) => setBlockCompletions((p) => ({ ...p, [k]: c }))}
              />
            );
          }
          if (kind === 'EXERCISE' && item.exerciseId) {
            const exIdx = exerciseCursor++;
            const ex = exercises[exIdx];
            if (!ex) return null;
            const isCollapsed = collapsed[exIdx];
            const completedCount = ex.sets.filter((s) => s.completed).length;
            const allDone = completedCount === ex.sets.length && ex.sets.length > 0;
            return (
              <Card key={item.id} className={cn(allDone && 'border-success/40')}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex w-full items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((p) => ({ ...p, [exIdx]: !p[exIdx] }))
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 text-start"
                    >
                      {allDone ? (
                        <CheckCircle2 className="size-5 shrink-0 text-success" />
                      ) : (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {completedCount}/{ex.sets.length}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {ex.name}
                        </p>
                        {item.groupLabel && (
                          <p className="text-xs text-muted-foreground">
                            {item.groupLabel}
                          </p>
                        )}
                      </div>
                      {isCollapsed ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {exerciseHasTimer(ex.prescription) && (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setTimerExIdx(exIdx)}
                        aria-label="Run timer for this exercise"
                        title="Run timer"
                        className="size-8 shrink-0"
                      >
                        <Timer className="size-4" />
                      </Button>
                    )}
                  </div>

                  {/* Prescription summary — always visible */}
                  {(() => {
                    const parts = buildPrescriptionParts(ex.prescription, ex.sets.length);
                    if (!parts.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {parts.map((p) => (
                          <span
                            key={p.key}
                            className="inline-flex items-baseline gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs"
                          >
                            <span className="font-semibold tabular-nums text-foreground">{p.value}</span>
                            <span className="text-muted-foreground">{p.label}</span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {ex.coachNotes && !isCollapsed && (
                    <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      {ex.coachNotes}
                    </p>
                  )}

                  {!isCollapsed && (
                    <>
                      {/* Set chips */}
                      <div className="flex flex-wrap items-center gap-2">
                        {ex.sets.map((set, setIdx) => (
                          <div key={setIdx} className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => toggleSetComplete(exIdx, setIdx)}
                              aria-label={set.completed ? `Set ${setIdx + 1} — mark incomplete` : `Set ${setIdx + 1} — mark complete`}
                              className={cn(
                                'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
                                set.completed
                                  ? 'border-success/40 bg-success/10 text-success'
                                  : 'border-border bg-muted/30 text-foreground hover:border-primary/50',
                              )}
                            >
                              {set.completed ? (
                                <Check className="size-3.5 shrink-0" />
                              ) : (
                                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                  {setIdx + 1}
                                </span>
                              )}
                              <span>Set {setIdx + 1}</span>
                            </button>
                            {ex.sets.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSet(exIdx, setIdx)}
                                aria-label="Remove set"
                                className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <X className="size-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 text-muted-foreground"
                          onClick={() => addSet(exIdx)}
                        >
                          + Add set
                        </Button>
                      </div>

                      {/* Log actual values toggle */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => toggleLogExpanded(exIdx)}
                      >
                        <Pencil className="size-3" />
                        {logExpanded.has(exIdx) ? 'Hide actual values' : 'Log actual values'}
                      </Button>

                      {/* Expanded per-set inputs */}
                      {logExpanded.has(exIdx) && (
                        <div className="space-y-2">
                          {ex.sets.map((set, setIdx) => (
                            <div key={setIdx} className="flex items-center gap-1">
                              <div className="flex-1">
                                <SetRow
                                  setIndex={setIdx}
                                  set={set}
                                  prescription={ex.prescription}
                                  onChange={(p) => updateSet(exIdx, setIdx, p)}
                                  onComplete={() => toggleSetComplete(exIdx, setIdx)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          }
          return null;
        })}

        {/* Session notes */}
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium text-foreground">Session notes</p>
            <Textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="How did it go?"
              rows={3}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sticky submit bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:p-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="lg:hidden"
            size="icon"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
          </Button>
          <Button
            variant="gradient"
            className="flex-1"
            size="lg"
            onClick={() => setConfirmOpen(true)}
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Check className="size-4" /> Finish workout
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish this workout?</DialogTitle>
            <DialogDescription>
              You completed {completedSets} of {totalSets} sets in {session.formatted}.
              Your coach will see your log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submit.isPending}
            >
              Keep going
            </Button>
            <Button
              variant="gradient"
              onClick={async () => {
                setConfirmOpen(false);
                await handleSubmit();
              }}
              disabled={submit.isPending}
            >
              {submit.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise timer dialog */}
      {timerExIdx !== null && exercises[timerExIdx] && (
        <ExerciseTimerDialog
          open={timerExIdx !== null}
          exerciseName={exercises[timerExIdx].name}
          prescription={exercises[timerExIdx].prescription}
          setCount={exercises[timerExIdx].sets.length}
          onClose={() => setTimerExIdx(null)}
          onSetComplete={(setIdx) => {
            const idx = timerExIdx;
            if (idx !== null) markSetComplete(idx, setIdx);
          }}
        />
      )}
    </div>
  );
}
