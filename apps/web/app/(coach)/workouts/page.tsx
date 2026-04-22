'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Dumbbell,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  useWorkouts,
  useCreateWorkout,
  useDeleteWorkout,
  type Workout,
} from '@/hooks/useWorkouts';
import { useT } from '@/lib/i18n/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { WorkoutEditorSheet } from '@/components/programs/WorkoutEditorSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function CreateWorkoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const createWorkout = useCreateWorkout();
  const [form, setForm] = useState({
    title: '',
    description: '',
    estimatedDuration: '',
  });

  const reset = () => {
    setForm({ title: '', description: '', estimatedDuration: '' });
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;

    await createWorkout.mutateAsync({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      estimatedDuration: form.estimatedDuration
        ? Number(form.estimatedDuration)
        : undefined,
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('workoutsLibrary.create.title')}</DialogTitle>
          <DialogDescription>
            {t('workoutsLibrary.create.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workout-title">{t('workoutsLibrary.create.titleLabel')}</Label>
            <Input
              id="workout-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('workoutsLibrary.create.titlePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workout-desc">{t('workoutsLibrary.create.descLabel')}</Label>
            <Textarea
              id="workout-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workout-duration">
              {t('workoutsLibrary.create.durationLabel')}
            </Label>
            <Input
              id="workout-duration"
              type="number"
              min={0}
              value={form.estimatedDuration}
              onChange={(e) =>
                setForm({ ...form, estimatedDuration: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createWorkout.isPending}
          >
            {t('workoutsLibrary.create.cancel')}
          </Button>
          <Button
            variant="gradient"
            onClick={handleCreate}
            disabled={createWorkout.isPending || !form.title.trim()}
          >
            {createWorkout.isPending
              ? t('workoutsLibrary.create.creating')
              : t('workoutsLibrary.create.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutCard({
  workout,
  onEdit,
  onDelete,
}: {
  workout: Workout;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();

  return (
    <Card className="card-interactive group">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="min-w-0 flex-1 text-start font-semibold text-foreground hover:underline"
          >
            <span className="line-clamp-1">{workout.title}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100"
              >
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="me-2 size-4" />
                {t('workoutsLibrary.actions.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="me-2 size-4" />
                {t('workoutsLibrary.actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {workout.description || '—'}
        </p>

        <div className="mt-auto flex items-center gap-2">
          <Badge variant="muted">
            {t('workoutsLibrary.exerciseCount', { count: workout.items?.length ?? 0 })}
          </Badge>
          {workout.estimatedDuration ? (
            <Badge variant="outline">
              {t('workoutsLibrary.estimatedDuration', {
                minutes: workout.estimatedDuration,
              })}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkoutsPage() {
  const t = useT();
  const removeWorkout = useDeleteWorkout();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  const { data, isLoading } = useWorkouts({ search: search || undefined });
  const workouts = data?.items ?? [];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title={t('workoutsLibrary.title')}
        description={t('workoutsLibrary.description')}
        actions={
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('workoutsLibrary.newWorkout')}
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-9"
          placeholder={t('workoutsLibrary.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={t('workoutsLibrary.emptyTitle')}
          description={search ? t('workoutsLibrary.emptySearch') : t('workoutsLibrary.emptyHint')}
          action={
            !search ? (
              <Button variant="gradient" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('workoutsLibrary.newWorkout')}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onEdit={() => setEditingWorkoutId(workout.id)}
              onDelete={async () => {
                if (!confirm(t('workoutsLibrary.actions.deleteConfirm'))) return;
                await removeWorkout.mutateAsync(workout.id);
              }}
            />
          ))}
        </div>
      )}

      <CreateWorkoutDialog open={createOpen} onOpenChange={setCreateOpen} />
      <WorkoutEditorSheet
        workoutId={editingWorkoutId}
        open={!!editingWorkoutId}
        onOpenChange={(open) => {
          if (!open) setEditingWorkoutId(null);
        }}
      />
    </div>
  );
}
