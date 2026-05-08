'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, Dumbbell, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  useExercises,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  useExerciseCategories,
  useCreateExerciseCategory,
  useExerciseMuscleGroups,
  useCreateExerciseMuscleGroup,
  type Exercise,
} from '@/hooks/useExercises';
import { useExerciseAutofill } from '@/hooks/useAI';
import { AISparkleButton } from '@/components/ai/AISparkleButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';

const EQUIPMENT = [
  'Barbell', 'Dumbbell', 'Kettlebell', 'Cable', 'Machine',
  'Bodyweight', 'Resistance Band', 'Pull-up Bar', 'Foam Roller',
];

function ChipToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-medium transition-colors border',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  );
}

function ExerciseDialog({
  open,
  initial,
  onOpenChange,
}: {
  open: boolean;
  initial?: Exercise;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const autofill = useExerciseAutofill();
  const { data: categories = [] } = useExerciseCategories();
  const createCategory = useCreateExerciseCategory();
  const { data: muscleGroups = [] } = useExerciseMuscleGroups();
  const createMuscleGroup = useCreateExerciseMuscleGroup();
  const [newCatInput, setNewCatInput] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newMgInput, setNewMgInput] = useState('');
  const [showNewMg, setShowNewMg] = useState(false);

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

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    instructions: initial?.instructions ?? '',
    category: initial?.category ?? '',
    muscleGroups: (initial?.muscleGroups ?? []) as string[],
    equipment: (initial?.equipment ?? []) as string[],
    difficulty: (initial?.difficulty ?? 'BEGINNER') as NonNullable<Exercise['difficulty']>,
    videoUrl: initial?.videoUrl ?? '',
    isPrBased: initial?.isPrBased ?? false,
  });

  useEffect(() => {
    if (!open) {
      setNewCatInput('');
      setShowNewCat(false);
      setNewMgInput('');
      setShowNewMg(false);
    }
  }, [open]);

  const toggleArr = (field: 'muscleGroups' | 'equipment', val: string) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter((v) => v !== val) : [...f[field], val],
    }));

  const runAutofill = async () => {
    if (!form.name.trim()) {
      toast.error('הכנס שם תרגיל תחילה');
      return;
    }
    try {
      const res = await autofill.mutateAsync({ name: form.name.trim(), locale: 'he' });
      setForm((f) => ({
        ...f,
        category: f.category || res.category,
        description: f.description || res.description,
        instructions: f.instructions || res.instructions || '',
        muscleGroups: f.muscleGroups.length ? f.muscleGroups : res.muscleGroups,
        equipment: f.equipment.length ? f.equipment : res.equipment,
      }));
      toast.success('AI השלים את השדות');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI לא זמין');
    }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (initial) await update.mutateAsync({ id: initial.id, ...form });
      else await create.mutateAsync(form);
      onOpenChange(false);
    } catch {
      toast.error('Failed to save exercise. Please try again.');
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? t('exercises.dialog.titleEdit') : t('exercises.dialog.titleNew')}</DialogTitle>
          <DialogDescription>{t('exercises.dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="name">{t('exercises.dialog.nameLabel')} *</Label>
              {!initial ? (
                <AISparkleButton
                  onClick={runAutofill}
                  loading={autofill.isPending}
                  disabled={!form.name.trim()}
                  label="השלם עם AI"
                />
              ) : null}
            </div>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('exercises.dialog.namePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('exercises.dialog.categoryLabel')}</Label>
              <Select
                value={form.category || undefined}
                onValueChange={(v) => {
                  if (v === '__new__') { setShowNewCat(true); return; }
                  setForm({ ...form, category: v });
                  setShowNewCat(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exercises.dialog.categoryPlaceholder')} />
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
            <div className="space-y-1.5">
              <Label>{t('exercises.dialog.difficultyLabel')}</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => setForm({ ...form, difficulty: v as typeof form.difficulty })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">{t('exercises.dialog.difficultyBeginner')}</SelectItem>
                  <SelectItem value="INTERMEDIATE">{t('exercises.dialog.difficultyIntermediate')}</SelectItem>
                  <SelectItem value="ADVANCED">{t('exercises.dialog.difficultyAdvanced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('exercises.dialog.muscleGroups')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {muscleGroups.map((m) => (
                <ChipToggle
                  key={m}
                  label={m}
                  active={form.muscleGroups.includes(m)}
                  onClick={() => toggleArr('muscleGroups', m)}
                />
              ))}
              <button
                type="button"
                onClick={() => setShowNewMg(true)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors border border-dashed border-border hover:bg-muted/50"
              >
                ➕ Add
              </button>
            </div>
            {showNewMg && (
              <div className="flex gap-2">
                <Input
                  value={newMgInput}
                  onChange={(e) => setNewMgInput(e.target.value)}
                  placeholder="Muscle group name"
                  className="flex-1"
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

          <div className="space-y-2">
            <Label>{t('exercises.dialog.equipment')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT.map((e) => (
                <ChipToggle
                  key={e}
                  label={e}
                  active={form.equipment.includes(e)}
                  onClick={() => toggleArr('equipment', e)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">{t('exercises.dialog.descLabel')}</Label>
            <Textarea
              id="desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('exercises.dialog.descPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inst">{t('exercises.dialog.cuesLabel')}</Label>
            <Textarea
              id="inst"
              rows={3}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder={t('exercises.dialog.cuesPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="video">{t('exercises.dialog.videoLabel')}</Label>
            <Input
              id="video"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder={t('exercises.dialog.videoPlaceholder')}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">PR-based exercise</p>
              <p className="text-xs text-muted-foreground">
                Clients log a personal record (1RM). Workout weights can be set as % of their PR.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isPrBased}
              onClick={() => setForm({ ...form, isPrBased: !form.isPrBased })}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.isPrBased ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  form.isPrBased ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('exercises.dialog.cancel')}
          </Button>
          <Button variant="gradient" onClick={save} disabled={isPending || !form.name.trim()}>
            {isPending ? t('exercises.dialog.saving') : initial ? t('exercises.dialog.save') : t('exercises.dialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ExercisesPage() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [muscleGroup, setMuscleGroup] = useState<string>('');
  const [equipment, setEquipment] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | undefined>();
  const { data: allCategories = [] } = useExerciseCategories();
  const { data: allMuscleGroups = [] } = useExerciseMuscleGroups();

  const { data, isLoading } = useExercises({
    search: search || undefined,
    category: category || undefined,
    muscleGroup: muscleGroup || undefined,
    equipment: equipment || undefined,
  });
  const del = useDeleteExercise();

  const exercises = data?.items ?? [];

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setDialogOpen(true);
  };
  const remove = async (id: string) => {
    if (confirm(t('exercises.confirmDelete'))) await del.mutateAsync(id);
  };

  const hasFilters = !!(search || category || muscleGroup || equipment);
  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setMuscleGroup('');
    setEquipment('');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title={t('exercises.title')}
        description={t('exercises.description')}
        actions={
          <Button variant="gradient" onClick={openCreate}>
            <Plus className="size-4" />
            {t('exercises.newExercise')}
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="ps-9"
                placeholder={t('exercises.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category || 'all'} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('exercises.filter.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('exercises.filter.allCategories')}</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={muscleGroup || 'all'}
              onValueChange={(v) => setMuscleGroup(v === 'all' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('exercises.filter.muscleGroup')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('exercises.filter.allMuscleGroups')}</SelectItem>
                {allMuscleGroups.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('exercises.filter.equipment')}</span>
            <ChipToggle label={t('exercises.filter.all')} active={!equipment} onClick={() => setEquipment('')} />
            {EQUIPMENT.map((e) => (
              <ChipToggle
                key={e}
                label={e}
                active={equipment === e}
                onClick={() => setEquipment(equipment === e ? '' : e)}
              />
            ))}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="ms-auto">
                {t('exercises.filter.clear')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={t('exercises.emptyTitle')}
          description={hasFilters ? t('exercises.emptyFilters') : t('exercises.emptyHint')}
          action={
            hasFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                {t('exercises.filter.clear')}
              </Button>
            ) : (
              <Button variant="gradient" onClick={openCreate}>
                <Plus className="size-4" />
                {t('exercises.newExercise')}
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex) => (
            <Card key={ex.id} className="card-interactive group">
              <CardContent className="flex h-full flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">{ex.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {ex.category ?? 'Uncategorized'}
                      {ex.difficulty && (
                        <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          {ex.difficulty}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {ex.videoUrl && (
                      <a
                        href={ex.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Play video"
                      >
                        <Play className="size-4" />
                      </a>
                    )}
                    {!ex.isSystem && (
                      <>
                        <button
                          onClick={() => openEdit(ex)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => remove(ex.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {ex.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{ex.description}</p>
                )}

                <div className="mt-auto space-y-2">
                  {ex.muscleGroups && ex.muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ex.muscleGroups.slice(0, 4).map((m) => (
                        <Badge key={m} variant="muted" className="text-[10px]">
                          {m}
                        </Badge>
                      ))}
                      {ex.muscleGroups.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{ex.muscleGroups.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  {ex.isSystem && (
                    <Badge variant="default" className="text-[10px]">
                      System
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialogOpen && (
        <ExerciseDialog
          key={editing?.id ?? 'new'}
          open={dialogOpen}
          initial={editing}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}