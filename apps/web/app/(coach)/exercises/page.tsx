'use client';

import { useState } from 'react';
import { Search, Plus, Pencil, Trash2, Dumbbell, Play } from 'lucide-react';
import {
  useExercises,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  type Exercise,
} from '@/hooks/useExercises';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { useT } from '@/lib/i18n/client';
import { useT } from '@/lib/i18n/client';
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

const CATEGORIES = ['Strength', 'Cardio', 'Mobility', 'Plyometric', 'Stretching', 'Balance', 'Olympic'];
const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Core', 'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Full Body',
];
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
}) {t = useT();
  const 
  const t = useT();
  const create = useCreateExercise();
  const update = useUpdateExercise();

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    instructions: initial?.instructions ?? '',
    category: initial?.category ?? '',
    muscleGroups: (initial?.muscleGroups ?? []) as string[],
    equipment: (initial?.equipment ?? []) as string[],
    difficulty: (initial?.difficulty ?? 'BEGINNER') as NonNullable<Exercise['difficulty']>,
    videoUrl: initial?.videoUrl ?? '',
  });

  const toggleArr = (field: 'muscleGroups' | 'equipment', val: string) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter((v) => v !== val) : [...f[field], val],
    }));

  const save = async () => {
    if (!form.name.trim()) return;
    if (initial) await update.mutateAsync({ id: initial.id, ...form });
    else await create.mutateAsync(form);
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mat('exercises.dialog.titleEdit') : t('exercises.dialog.titleNew')}</DialogTitle>
          <DialogDescription>{t('exercises.dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('exercises.dialog.nameLabel')} *</Label>
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
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exercises.dialog.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`exercises.categories.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {MUSCLE_GROUPS.map((m) => (
                <ChipToggle
                  key={m}
                  label={t(`exercises.muscleGroupNames.${m}`)}
                  active={form.muscleGroups.includes(m)}
                  onClick={() => toggleArr('muscleGroups', m)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('exercises.dialog.equipment')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT.map((e) => (
                <ChipToggle
                  key={e}
                  label={t(`exercises.equipmentNames.${e}`)}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('exercises.dialog.cancel')}
          </Button>
          <Button variant="gradient" onClick={save} disabled={isPending || !form.name.trim()}>
            {isPending ? t('exercises.dialog.saving') : initial ? t('exercises.dialog.save') : t('exercises.dialog.create')
          <Button variant="gradient" onClick={save} disabled={isPending || !form.name.trim()}>
            {isPending ? t('exercises.dialog.saving') : initial ? t('exercises.dialog.save') : t('exercises.dialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
t = useT();
  const 
export default function ExercisesPage() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [muscleGroup, setMuscleGroup] = useState<string>('');
  const [equipment, setEquipment] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | undefined>();

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
    setDialogOpet('exercises.confirmDelete')
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

  return ({t('exercises.title')}
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
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`exercises.categories.${c}`)}
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
                {MUSCLE_GROUPS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`exercises.muscleGroupNames.${m}`)}
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
                label={t(`exercises.equipmentNames.${e}`)}
                active={equipment === e}
                onClick={() => setEquipment(equipment === e ? '' : e)}
              />
            ))}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="ms-auto">
                {t('exercises.filter.clear')}
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
      ) : exerci{t('exercises.emptyTitle')}
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
                  <div className="mi t(`exercises.categories.${ex.category}`) : t('exercises.uncategorized')}
                      {ex.difficulty && (
                        <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          {ex.difficulty === 'BEGINNER'
                            ? t('exercises.dialog.difficultyBeginner')
                            : ex.difficulty === 'INTERMEDIATE'
                              ? t('exercises.dialog.difficultyIntermediate')
                              : t('exercises.dialog.difficultyAdvanced')exercises.categories.${ex.category}`) : t('exercises.uncategorized')}
                      {ex.difficulty && (
                        <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          {ex.difficulty === 'BEGINNER'
                            ? t('exercises.dialog.difficultyBeginner')
                            : ex.difficulty === 'INTERMEDIATE'
                              ? t('exercises.dialog.difficultyIntermediate')
                              : t('exercises.dialog.difficultyAdvanced')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="f{t('exercises.playVideo')}
                      >
                        <Play className="size-4" />
                      </a>
                    )}
                    {!ex.isSystem && (
                      <>
                        <button
                          onClick={() => openEdit(ex)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label={t('exercises.edit')}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => remove(ex.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t('exercises.delete')}cises.edit')}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => remove(ex.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t('exercises.delete')}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {ex.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{ex.description}</p>
                )}t(`exercises.muscleGroupNames.${m}`)}
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
                      {t('exercises.system')}ex.muscleGroups.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  {ex.isSystem && (
                    <Badge variant="default" className="text-[10px]">
                      {t('exercises.system')}
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