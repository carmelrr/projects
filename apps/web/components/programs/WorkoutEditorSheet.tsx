'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Search,
  Loader2,
  GripVertical,
} from 'lucide-react';
import {
  useWorkout,
  useUpdateWorkout,
  type WorkoutItem,
} from '@/hooks/useWorkouts';
import { useExercises, useCreateExercise, type Exercise } from '@/hooks/useExercises';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type DraftItem = Omit<WorkoutItem, 'id'> & { id?: string };

const EX_CATEGORIES = ['Strength', 'Cardio', 'Mobility', 'Plyometric', 'Stretching', 'Balance', 'Olympic'];
const EX_MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Core', 'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Full Body',
];

function newItem(exercise: Exercise, orderIndex: number): DraftItem {
  return {
    exerciseId: exercise.id,
    orderIndex,
    prescription: { sets: 3, reps: '10', rpe: 7, rest: '90s' },
    exercise: {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      equipment: exercise.equipment,
      videoUrl: exercise.videoUrl,
    },
  };
}

// ─── Exercise picker (nested dialog) ──────────────────────────────────────
function PickExerciseDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (ex: Exercise) => void;
}) {
  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', category: '', muscleGroups: [] as string[] });
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useExercises({ search });
  const createExercise = useCreateExercise();

  useEffect(() => {
    if (!open) {
      setSearch('');
      setMode('pick');
      setForm({ name: '', category: '', muscleGroups: [] });
    }
  }, [open]);

  const toggleMuscle = (m: string) =>
    setForm((f) => ({
      ...f,
      muscleGroups: f.muscleGroups.includes(m)
        ? f.muscleGroups.filter((v) => v !== m)
        : [...f.muscleGroups, m],
    }));

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const created = await createExercise.mutateAsync({
        name: form.name.trim(),
        category: form.category || undefined,
        muscleGroups: form.muscleGroups.length ? form.muscleGroups : undefined,
      });
      onPick(created);
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>Pick from the library or create a new exercise.</DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
          <button
            type="button"
            className={cn(
              'flex-1 rounded px-3 py-1.5 transition',
              mode === 'pick' ? 'bg-background shadow-sm' : 'text-muted-foreground',
            )}
            onClick={() => setMode('pick')}
          >
            From library
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded px-3 py-1.5 transition',
              mode === 'create' ? 'bg-background shadow-sm' : 'text-muted-foreground',
            )}
            onClick={() => setMode('create')}
          >
            Create new
          </button>
        </div>

        {mode === 'pick' ? (
          <>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises…"
                className="ps-9"
                autoFocus
              />
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (data?.items ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No exercises found.{' '}
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline"
                    onClick={() => setMode('create')}
                  >
                    Create one?
                  </button>
                </p>
              ) : (
                (data?.items ?? []).map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onPick(ex);
                      onOpenChange(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card/50 px-3 py-2 text-start text-sm hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{ex.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {(ex.muscleGroups ?? []).join(', ') || ex.category || '—'}
                      </p>
                    </div>
                    {ex.isSystem && (
                      <Badge variant="muted" className="shrink-0">
                        system
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ex-name">Name *</Label>
              <Input
                id="ex-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Bulgarian Split Squat"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category || undefined}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {EX_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Muscle groups</Label>
              <div className="flex flex-wrap gap-1.5">
                {EX_MUSCLE_GROUPS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMuscle(m)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      form.muscleGroups.includes(m)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode('pick')} disabled={creating}>
                Back
              </Button>
              <Button
                variant="gradient"
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create &amp; add
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Workout Editor ─────────────────────────────────────────────────
interface Props {
  workoutId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function WorkoutEditorSheet({ workoutId, open, onOpenChange }: Props) {
  const { data: workout, isLoading } = useWorkout(workoutId ?? '');
  const updateMeta = useUpdateWorkout();
  const qc = useQueryClient();
  const updateItems = useMutation({
    mutationFn: ({ id, items }: { id: string; items: DraftItem[] }) =>
      api.patch(`/workouts/${id}/items`, {
        items: items.map((it, i) => ({
          exerciseId: it.exerciseId,
          orderIndex: i,
          groupLabel: it.groupLabel,
          coachNotes: it.coachNotes,
          prescription: it.prescription,
        })),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['workout', vars.id] });
      qc.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const [meta, setMeta] = useState({
    title: '',
    description: '',
    estimatedDuration: '',
    instructions: '',
  });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (workout) {
      setMeta({
        title: workout.title,
        description: workout.description ?? '',
        estimatedDuration: workout.estimatedDuration?.toString() ?? '',
        instructions: workout.instructions ?? '',
      });
      setItems(
        [...(workout.items ?? [])]
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((i) => ({ ...i })),
      );
      setDirty(false);
      setSaved(false);
    }
  }, [workout]);

  useEffect(() => {
    if (!open) setSaved(false);
  }, [open]);

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  const updateItem = (idx: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    markDirty();
  };
  const updatePrescription = (
    idx: number,
    patch: Partial<DraftItem['prescription']>,
  ) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, prescription: { ...it.prescription, ...patch } } : it,
      ),
    );
    markDirty();
  };
  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  };
  const moveItem = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    markDirty();
  };
  const addExercise = (ex: Exercise) => {
    setItems((prev) => [...prev, newItem(ex, prev.length)]);
    markDirty();
  };

  const save = async () => {
    if (!workoutId) return;
    await updateMeta.mutateAsync({
      id: workoutId,
      title: meta.title,
      description: meta.description || undefined,
      estimatedDuration: meta.estimatedDuration
        ? Number(meta.estimatedDuration)
        : undefined,
      instructions: meta.instructions || undefined,
    });
    await updateItems.mutateAsync({ id: workoutId, items });
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const pending = updateMeta.isPending || updateItems.isPending;

  const totalSets = useMemo(
    () => items.reduce((n, it) => n + Number(it.prescription.sets ?? 0), 0),
    [items],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-xl lg:max-w-2xl">
          <SheetHeader className="mb-4 shrink-0">
            <SheetTitle>{workout?.title || meta.title || 'Workout'}</SheetTitle>
          </SheetHeader>

          <div className="-mx-6 flex-1 overflow-y-auto px-6">
          {isLoading || !workout ? (
            <div className="space-y-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {/* Meta */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="w-title">Title</Label>
                  <Input
                    id="w-title"
                    value={meta.title}
                    onChange={(e) => {
                      setMeta({ ...meta, title: e.target.value });
                      markDirty();
                    }}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="w-dur">Duration (min)</Label>
                    <Input
                      id="w-dur"
                      type="number"
                      value={meta.estimatedDuration}
                      onChange={(e) => {
                        setMeta({ ...meta, estimatedDuration: e.target.value });
                        markDirty();
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-xs text-muted-foreground">
                      {items.length} exercises · {totalSets} total sets
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-desc">Description</Label>
                  <Textarea
                    id="w-desc"
                    rows={2}
                    value={meta.description}
                    onChange={(e) => {
                      setMeta({ ...meta, description: e.target.value });
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-inst">Instructions</Label>
                  <Textarea
                    id="w-inst"
                    rows={2}
                    value={meta.instructions}
                    onChange={(e) => {
                      setMeta({ ...meta, instructions: e.target.value });
                      markDirty();
                    }}
                  />
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Exercises</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPickOpen(true)}
                  >
                    <Plus className="size-3.5" />
                    Add exercise
                  </Button>
                </div>

                {items.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      No exercises yet. Click <em>Add exercise</em> to get started.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <Card key={`${it.exerciseId}-${idx}`}>
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start gap-2">
                            <div className="pt-1 text-muted-foreground">
                              <GripVertical className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {idx + 1}.
                                </span>
                                <p className="truncate font-medium text-foreground">
                                  {it.exercise?.name ?? it.exerciseId}
                                </p>
                                {it.groupLabel && (
                                  <Badge variant="muted" className="shrink-0">
                                    {it.groupLabel}
                                  </Badge>
                                )}
                              </div>
                              {it.exercise?.muscleGroups &&
                                it.exercise.muscleGroups.length > 0 && (
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {it.exercise.muscleGroups.join(', ')}
                                  </p>
                                )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => moveItem(idx, -1)}
                                disabled={idx === 0}
                                aria-label="Move up"
                              >
                                <ChevronUp className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => moveItem(idx, 1)}
                                disabled={idx === items.length - 1}
                                aria-label="Move down"
                              >
                                <ChevronDown className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-destructive hover:text-destructive"
                                onClick={() => removeItem(idx)}
                                aria-label="Remove"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                            <div className="space-y-1">
                              <Label className="text-[11px]">Sets</Label>
                              <Input
                                type="number"
                                value={String(it.prescription.sets ?? '')}
                                onChange={(e) =>
                                  updatePrescription(idx, {
                                    sets: e.target.value
                                      ? Number(e.target.value)
                                      : undefined,
                                  })
                                }
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Reps</Label>
                              <Input
                                value={String(it.prescription.reps ?? '')}
                                onChange={(e) =>
                                  updatePrescription(idx, { reps: e.target.value })
                                }
                                placeholder="8-12"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Weight</Label>
                              <Input
                                value={String(it.prescription.weight ?? '')}
                                onChange={(e) =>
                                  updatePrescription(idx, { weight: e.target.value })
                                }
                                placeholder="75kg"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">RPE</Label>
                              <Input
                                type="number"
                                step="0.5"
                                value={String(it.prescription.rpe ?? '')}
                                onChange={(e) =>
                                  updatePrescription(idx, {
                                    rpe: e.target.value
                                      ? Number(e.target.value)
                                      : undefined,
                                  })
                                }
                                placeholder="7"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Rest</Label>
                              <Input
                                value={String(it.prescription.rest ?? '')}
                                onChange={(e) =>
                                  updatePrescription(idx, { rest: e.target.value })
                                }
                                placeholder="90s"
                                className="h-8"
                              />
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                            <div className="space-y-1">
                              <Label className="text-[11px]">Group (superset)</Label>
                              <Input
                                value={it.groupLabel ?? ''}
                                onChange={(e) =>
                                  updateItem(idx, { groupLabel: e.target.value || undefined })
                                }
                                placeholder="A1"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Coach notes</Label>
                              <Input
                                value={it.coachNotes ?? ''}
                                onChange={(e) =>
                                  updateItem(idx, { coachNotes: e.target.value || undefined })
                                }
                                placeholder="Control the tempo…"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>

          {/* Sticky footer */}
          <div className="-mx-6 -mb-6 mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
            <span className="text-xs text-muted-foreground">
              {pending
                ? 'Saving…'
                : saved
                  ? 'Saved'
                  : dirty
                    ? 'Unsaved changes'
                    : 'All changes saved'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Close
              </Button>
              <Button
                variant="gradient"
                onClick={save}
                disabled={pending || !dirty}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <PickExerciseDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        onPick={addExercise}
      />
    </>
  );
}
