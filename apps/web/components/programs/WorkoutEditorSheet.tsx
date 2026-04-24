'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
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
import { useExerciseCategories, useCreateExerciseCategory, useExerciseMuscleGroups, useCreateExerciseMuscleGroup } from '@/hooks/useExercises';
import { api } from '@/lib/api';
import { toast } from 'sonner';
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

function newItem(exercise: Exercise, orderIndex: number): DraftItem {
  return {
    exerciseId: exercise.id,
    orderIndex,
    prescription: { sets: 3, reps: '10', rest: 90 },
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
  const [createError, setCreateError] = useState<string | null>(null);
  const [newCatInput, setNewCatInput] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newMgInput, setNewMgInput] = useState('');
  const [showNewMg, setShowNewMg] = useState(false);
  const { data, isLoading } = useExercises({ search });
  const { data: categories = [] } = useExerciseCategories();
  const { data: muscleGroups = [] } = useExerciseMuscleGroups();
  const createExercise = useCreateExercise();
  const createCategory = useCreateExerciseCategory();
  const createMuscleGroup = useCreateExerciseMuscleGroup();

  useEffect(() => {
    if (!open) {
      setSearch('');
      setMode('pick');
      setForm({ name: '', category: '', muscleGroups: [] });
      setCreateError(null);
      setNewCatInput('');
      setShowNewCat(false);
      setNewMgInput('');
      setShowNewMg(false);
    }
  }, [open]);

  const toggleMuscle = (m: string) =>
    setForm((f) => ({
      ...f,
      muscleGroups: f.muscleGroups.includes(m)
        ? f.muscleGroups.filter((v) => v !== m)
        : [...f.muscleGroups, m],
    }));

  const handleCreateCategory = async () => {
    const name = newCatInput.trim();
    if (!name) return;
    try {
      await createCategory.mutateAsync(name);
      setForm((f) => ({ ...f, category: name }));
      setNewCatInput('');
      setShowNewCat(false);
    } catch {
      toast.error('Failed to create category');
    }
  };

  const handleCreateMuscleGroup = async () => {
    const name = newMgInput.trim();
    if (!name) return;
    try {
      await createMuscleGroup.mutateAsync(name);
      setForm((f) => ({ ...f, muscleGroups: [...f.muscleGroups, name] }));
      setNewMgInput('');
      setShowNewMg(false);
    } catch {
      toast.error('Failed to create muscle group');
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createExercise.mutateAsync({
        name: form.name.trim(),
        category: form.category || '',
        muscleGroups: form.muscleGroups.length ? form.muscleGroups : undefined,
      });
      onPick(created);
      onOpenChange(false);
    } catch {
      setCreateError('Failed to create exercise. Please try again.');
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
                onValueChange={(v) => {
                  if (v === '__new__') { setShowNewCat(true); return; }
                  setForm({ ...form, category: v });
                  setShowNewCat(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="__new__">➕ New category…</SelectItem>
                </SelectContent>
              </Select>
              {showNewCat && (
                <div className="flex gap-2">
                  <Input
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    placeholder="Category name"
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); }
                      if (e.key === 'Escape') { setShowNewCat(false); setNewCatInput(''); }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={!newCatInput.trim() || createCategory.isPending}
                  >
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewCat(false); setNewCatInput(''); }}>
                    ✕
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Muscle groups</Label>
              <div className="flex flex-wrap gap-1.5">
                {muscleGroups.map((m) => (
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
                <button
                  type="button"
                  onClick={() => setShowNewMg(true)}
                  className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted/50"
                >
                  ➕ Add
                </button>
              </div>
              {showNewMg && (
                <div className="flex gap-2">
                  <input
                    value={newMgInput}
                    onChange={(e) => setNewMgInput(e.target.value)}
                    placeholder="Muscle group name"
                    className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleCreateMuscleGroup(); }
                      if (e.key === 'Escape') { setShowNewMg(false); setNewMgInput(''); }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateMuscleGroup}
                    disabled={!newMgInput.trim() || createMuscleGroup.isPending}
                  >
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewMg(false); setNewMgInput(''); }}>
                    ✕
                  </Button>
                </div>
              )}
            </div>
            <Separator />
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
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

function nextSupersetLabel(items: DraftItem[]): string {
  const used = new Set(
    items
      .map((it) => (it.groupLabel ?? '').trim().toUpperCase().charAt(0))
      .filter((ch) => ch >= 'A' && ch <= 'Z'),
  );
  for (let i = 0; i < 26; i += 1) {
    const label = String.fromCharCode(65 + i);
    if (!used.has(label)) return label;
  }
  return `G${items.length + 1}`;
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
  const addExercise = (ex: Exercise) => {
    setItems((prev) => [...prev, newItem(ex, prev.length)]);
    markDirty();
  };

  const reorderItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    markDirty();
  };

  const linkSupersetPair = (upperIndex: number) => {
    const label = nextSupersetLabel(items);
    setItems((prev) =>
      prev.map((it, i) =>
        i === upperIndex || i === upperIndex + 1 ? { ...it, groupLabel: label } : it,
      ),
    );
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
                      <div key={`${it.exerciseId}-${idx}`} className="space-y-2">
                        <Card
                          draggable
                          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragIndex(idx); }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverIndex !== idx) setDragOverIndex(idx); }}
                          onDragLeave={() => setDragOverIndex(null)}
                          onDrop={() => {
                            if (dragIndex !== null) reorderItems(dragIndex, idx);
                            setDragIndex(null);
                            setDragOverIndex(null);
                          }}
                          onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                          className={cn(
                            dragIndex === idx && 'opacity-50 ring-2 ring-primary shadow-lg',
                            dragOverIndex === idx && dragIndex !== idx && 'ring-2 ring-dashed ring-primary/60 bg-primary/5',
                          )}
                        >
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start gap-2">
                            <div className="cursor-grab pt-1 text-muted-foreground active:cursor-grabbing">
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
                              <Label className="text-[11px]">Rest Between Sets</Label>
                              <Input
                                value={String(it.prescription.rest ?? '')}
                                onChange={(e) =>
                                  updatePrescription(idx, { rest: e.target.value })
                                }
                                placeholder="90s"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Duration</Label>
                              <Input
                                value={String(it.prescription.duration ?? '')}
                                onChange={(e) =>
                                  updatePrescription(idx, { duration: e.target.value })
                                }
                                placeholder="60s"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Time Mode</Label>
                              <Select
                                value={
                                  it.prescription.timeMode === 'STOPWATCH' ||
                                  it.prescription.timeMode === 'COUNTDOWN'
                                    ? (it.prescription.timeMode as 'STOPWATCH' | 'COUNTDOWN')
                                    : undefined
                                }
                                onValueChange={(v) =>
                                  updatePrescription(idx, {
                                    timeMode: v as 'STOPWATCH' | 'COUNTDOWN',
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Pick" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="STOPWATCH">Stopwatch</SelectItem>
                                  <SelectItem value="COUNTDOWN">Countdown</SelectItem>
                                </SelectContent>
                              </Select>
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
                        {idx < items.length - 1 && (() => {
                          const linked =
                            it.groupLabel &&
                            items[idx + 1].groupLabel &&
                            it.groupLabel === items[idx + 1].groupLabel;
                          if (linked) {
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                                  {it.groupLabel}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setItems((prev) =>
                                      prev.map((x, i) =>
                                        i === idx || i === idx + 1
                                          ? { ...x, groupLabel: undefined }
                                          : x,
                                      ),
                                    )
                                  }
                                >
                                  ✕ Remove link
                                </Button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => linkSupersetPair(idx)}
                              >
                                Superset +
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
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
