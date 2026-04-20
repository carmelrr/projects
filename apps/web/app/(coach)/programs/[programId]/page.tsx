'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Lock,
  CalendarDays,
  Pencil,
  Trash2,
  MoreVertical,
  UserPlus,
  Loader2,
  GripVertical,
  X,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useProgram,
  useUpdateProgram,
  useAddProgramWeek,
  useUpdateProgramWeek,
  useDeleteProgramWeek,
  useReorderProgramWeeks,
  useAssignProgram,
} from '@/hooks/usePrograms';
import { useWorkouts, useWorkout, type Workout } from '@/hooks/useWorkouts';
import { useClients } from '@/hooks/useClients';
import { useT } from '@/lib/i18n/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { PickWorkoutDialog } from '@/components/programs/PickWorkoutDialog';
import { WorkoutEditorSheet } from '@/components/programs/WorkoutEditorSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Workout chip (sortable) ──────────────────────────────────────────────
function WorkoutChip({
  sortId,
  workoutId,
  onEdit,
  onRemove,
}: {
  sortId: string;
  workoutId: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { data: w } = useWorkout(workoutId);
  const t = useT();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-2 py-2 text-xs"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={t('programs.detail.dragReorder')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5 shrink-0" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 truncate text-start font-medium text-foreground hover:underline"
        title={w?.title ?? t('programs.detail.workoutPlaceholder')}
      >
        {w?.title ?? <span className="text-muted-foreground">{t('programs.detail.workoutPlaceholder')}</span>}
        {w?.items && w.items.length > 0 && (
          <span className="ms-1 font-normal text-muted-foreground">
            · {w.items.length}
          </span>
        )}
      </button>
      <Button
        size="icon"
        variant="ghost"
        className="size-6 shrink-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        onClick={onRemove}
        aria-label={t('programs.detail.removeWorkout')}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

// ─── Program meta edit dialog ─────────────────────────────────────────────
function EditProgramDialog({
  programId,
  initial,
  open,
  onOpenChange,
}: {
  programId: string;
  initial: { title: string; description?: string; isPrivate: boolean; tags?: string[] };
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const update = useUpdateProgram();
  const [form, setForm] = useState({
    title: initial.title,
    description: initial.description ?? '',
    isPrivate: initial.isPrivate,
    tagsRaw: (initial.tags ?? []).join(', '),
  });

  const save = async () => {
    await update.mutateAsync({
      id: programId,
      title: form.title,
      description: form.description,
      isPrivate: form.isPrivate,
      tags: form.tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('programs.detail.editProgram.title')}</DialogTitle>
          <DialogDescription>{t('programs.detail.editProgram.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t('programs.detail.editProgram.titleLabel')}</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">{t('programs.detail.editProgram.descLabel')}</Label>
            <Textarea
              id="desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">{t('programs.detail.editProgram.tagsLabel')}</Label>
            <Input
              id="tags"
              value={form.tagsRaw}
              onChange={(e) => setForm({ ...form, tagsRaw: e.target.value })}
              placeholder={t('programs.detail.editProgram.tagsPlaceholder')}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{t('programs.detail.editProgram.privateLabel')}</p>
              <p className="text-xs text-muted-foreground">{t('programs.detail.editProgram.privateHint')}</p>
            </div>
            <Switch
              checked={form.isPrivate}
              onCheckedChange={(checked) => setForm({ ...form, isPrivate: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            {t('programs.detail.editProgram.cancel')}
          </Button>
          <Button variant="gradient" onClick={save} disabled={update.isPending}>
            {update.isPending ? t('programs.detail.editProgram.saving') : t('programs.detail.editProgram.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit week dialog ─────────────────────────────────────────────────────
function EditWeekDialog({
  programId,
  week,
  open,
  onOpenChange,
}: {
  programId: string;
  week: { id: string; title?: string; notes?: string } | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const update = useUpdateProgramWeek();
  const [form, setForm] = useState({ title: '', notes: '' });

  useEffect(() => {
    if (week) setForm({ title: week.title ?? '', notes: week.notes ?? '' });
  }, [week]);

  if (!week) return null;

  const save = async () => {
    await update.mutateAsync({
      programId,
      weekId: week.id,
      title: form.title,
      notes: form.notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('programs.detail.editWeekDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wk-title">{t('programs.detail.editWeekDialog.titleLabel')}</Label>
            <Input
              id="wk-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wk-notes">{t('programs.detail.editWeekDialog.notesLabel')}</Label>
            <Textarea
              id="wk-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t('programs.detail.editWeekDialog.notesPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            {t('programs.detail.editWeekDialog.cancel')}
          </Button>
          <Button variant="gradient" onClick={save} disabled={update.isPending}>
            {update.isPending ? t('programs.detail.editWeekDialog.saving') : t('programs.detail.editWeekDialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign to client dialog ──────────────────────────────────────────────
function AssignProgramDialog({
  programId,
  open,
  onOpenChange,
}: {
  programId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const { data: clients } = useClients({ status: 'ACTIVE', limit: 200 });
  const assign = useAssignProgram();
  const [clientId, setClientId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    try {
      await assign.mutateAsync({ id: programId, clientId, startDate });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onOpenChange(false);
      }, 1200);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('programs.assign.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('programs.assign.title')}</DialogTitle>
          <DialogDescription>
            {t('programs.assign.descriptionGeneric')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('programs.assign.clientLabel')}</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder={t('programs.assign.clientPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {(clients?.items ?? []).map((c) => (
                  <SelectItem key={c.user.id} value={c.user.id}>
                    {c.user.firstName} {c.user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start">{t('programs.assign.startDateLabel')}</Label>
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          {done && <p className="text-xs text-success">{t('programs.assign.success')}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assign.isPending}
          >
            {t('programs.assign.cancel')}
          </Button>
          <Button
            variant="gradient"
            onClick={submit}
            disabled={!clientId || assign.isPending}
          >
            {assign.isPending ? t('programs.assign.assigning') : t('programs.assign.assign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sortable week card wrapper ───────────────────────────────────────────
function SortableWeek({
  weekId,
  children,
}: {
  weekId: string;
  children: (props: {
    dragAttributes: ReturnType<typeof useSortable>['attributes'];
    dragListeners: ReturnType<typeof useSortable>['listeners'];
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: weekId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="w-80 shrink-0">
      {children({ dragAttributes: attributes, dragListeners: listeners })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function ProgramDetailPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const t = useT();
  const { programId } = use(params);
  const { data: program, isLoading } = useProgram(programId);
  const addWeek = useAddProgramWeek();
  const updateWeek = useUpdateProgramWeek();
  const deleteWeek = useDeleteProgramWeek();
  const reorderWeeks = useReorderProgramWeeks();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pickFor, setPickFor] = useState<string | null>(null); // weekId
  const [editingWeek, setEditingWeek] =
    useState<{ id: string; title?: string; notes?: string } | null>(null);
  const [openWorkoutId, setOpenWorkoutId] = useState<string | null>(null);
  const [workoutSheetOpen, setWorkoutSheetOpen] = useState(false);

  const weeks = useMemo(
    () => [...(program?.weeks ?? [])].sort((a, b) => a.weekIndex - b.weekIndex),
    [program?.weeks],
  );

  const excludeForPicker = useMemo(() => {
    const wk = weeks.find((w) => w.id === pickFor);
    return wk?.workoutIds ?? [];
  }, [weeks, pickFor]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          title={t('programs.detail.notFoundTitle')}
          description={t('programs.detail.notFoundDesc')}
          action={
            <Button asChild variant="outline">
              <Link href="/programs">
                <ArrowLeft className="size-4 rtl:rotate-180" />
                {t('programs.detail.backToPrograms')}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const totalWorkouts = weeks.reduce((n, w) => n + (w.workoutIds?.length ?? 0), 0);

  const setWeekWorkouts = (weekId: string, workoutIds: string[]) =>
    updateWeek.mutate({ programId, weekId, workoutIds });

  const onPickWorkout = (w: Workout) => {
    if (!pickFor) return;
    const wk = weeks.find((x) => x.id === pickFor);
    if (!wk) return;
    setWeekWorkouts(pickFor, [...(wk.workoutIds ?? []), w.id]);
    setPickFor(null);
  };

  const openWorkout = (id: string) => {
    setOpenWorkoutId(id);
    setWorkoutSheetOpen(true);
  };

  const handleWeeksDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = weeks.map((w) => w.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    reorderWeeks.mutate({ programId, weekIds: next });
  };

  const handleWorkoutsDragEnd = (weekId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const wk = weeks.find((w) => w.id === weekId);
    if (!wk) return;
    const ids = (wk.workoutIds ?? []).map((id, i) => `${id}__${i}`);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove([...(wk.workoutIds ?? [])], oldIndex, newIndex);
    setWeekWorkouts(weekId, next);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link
        href="/programs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t('programs.detail.back')}
      </Link>

      <PageHeader
        title={program.title}
        description={program.description ?? t('programs.detail.noDescription')}
        actions={
          <div className="flex items-center gap-2">
            {program.isPrivate && (
              <Badge variant="muted" className="gap-1">
                <Lock className="size-3" />
                {t('programs.private')}
              </Badge>
            )}
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              {t('programs.detail.edit')}
            </Button>
            <Button variant="outline" onClick={() => setAssignOpen(true)}>
              <UserPlus className="size-4" />
              {t('programs.detail.assign')}
            </Button>
            <Button
              variant="gradient"
              onClick={() =>
                addWeek.mutate({
                  programId,
                  title: `Week ${(weeks.at(-1)?.weekIndex ?? -1) + 2}`,
                })
              }
              disabled={addWeek.isPending}
            >
              <Plus className="size-4" />
              {t('programs.detail.addWeek')}
            </Button>
          </div>
        }
      />

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3">
        {(program.tags ?? []).map((tag) => (
          <Badge key={tag} variant="muted">
            {tag}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground">
          {t(weeks.length === 1 ? 'programs.detail.weeksCount_one' : 'programs.detail.weeksCount_other', { n: weeks.length })}
          {' · '}
          {t(totalWorkouts === 1 ? 'programs.detail.workoutsCount_one' : 'programs.detail.workoutsCount_other', { n: totalWorkouts })}
        </span>
      </div>

      {/* Weeks */}
      {weeks.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t('programs.detail.noWeeksTitle')}
          description={t('programs.detail.noWeeksDesc')}
          action={
            <Button
              variant="gradient"
              onClick={() => addWeek.mutate({ programId, title: 'Week 1' })}
              disabled={addWeek.isPending}
            >
              {addWeek.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t('programs.detail.addFirstWeek')}
            </Button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleWeeksDragEnd}
        >
          <SortableContext
            items={weeks.map((w) => w.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 overflow-x-auto pb-2">
              {weeks.map((w) => (
                <SortableWeek key={w.id} weekId={w.id}>
                  {({ dragAttributes, dragListeners }) => (
                    <Card>
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <button
                            type="button"
                            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                            aria-label={t('programs.detail.dragReorderWeek')}
                            {...dragAttributes}
                            {...dragListeners}
                          >
                            <GripVertical className="size-4" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {t('programs.detail.weekLabel', { n: w.weekIndex + 1 })}
                            </p>
                            <h3 className="mt-0.5 truncate text-base font-semibold text-foreground">
                              {w.title ?? t('programs.detail.weekLabel', { n: w.weekIndex + 1 })}
                            </h3>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 shrink-0"
                                aria-label={t('programs.detail.weekActions')}
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  setEditingWeek({
                                    id: w.id,
                                    title: w.title,
                                    notes: w.notes,
                                  })
                                }
                              >
                                <Pencil className="size-4" />
                                {t('programs.detail.editWeek')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(t('programs.detail.confirmDeleteWeek', { n: w.weekIndex + 1 }))) {
                                    deleteWeek.mutate({ programId, weekId: w.id });
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4" />
                                {t('programs.detail.deleteWeek')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {w.notes && (
                          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                            {w.notes}
                          </p>
                        )}

                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleWorkoutsDragEnd(w.id)}
                        >
                          <SortableContext
                            items={(w.workoutIds ?? []).map((id, i) => `${id}__${i}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-1.5">
                              {(w.workoutIds ?? []).length === 0 ? (
                                <p className="py-4 text-center text-xs text-muted-foreground">
                                  {t('programs.detail.noWorkouts')}
                                </p>
                              ) : (
                                (w.workoutIds ?? []).map((id, i) => (
                                  <WorkoutChip
                                    key={`${id}-${i}`}
                                    sortId={`${id}__${i}`}
                                    workoutId={id}
                                    onEdit={() => openWorkout(id)}
                                    onRemove={() => {
                                      const next = (w.workoutIds ?? []).filter(
                                        (_, j) => j !== i,
                                      );
                                      setWeekWorkouts(w.id, next);
                                    }}
                                  />
                                ))
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setPickFor(w.id)}
                              >
                                <Plus className="size-3.5" />
                                {t('programs.detail.addWorkout')}
                              </Button>
                            </div>
                          </SortableContext>
                        </DndContext>
                      </CardContent>
                    </Card>
                  )}
                </SortableWeek>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editOpen && (
        <EditProgramDialog
          programId={programId}
          initial={{
            title: program.title,
            description: program.description ?? '',
            isPrivate: program.isPrivate,
            tags: program.tags,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <EditWeekDialog
        programId={programId}
        week={editingWeek}
        open={!!editingWeek}
        onOpenChange={(o) => !o && setEditingWeek(null)}
      />

      <PickWorkoutDialog
        open={!!pickFor}
        onOpenChange={(o) => !o && setPickFor(null)}
        excludeIds={excludeForPicker}
        onPick={onPickWorkout}
      />

      <AssignProgramDialog
        programId={programId}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />

      <WorkoutEditorSheet
        workoutId={openWorkoutId}
        open={workoutSheetOpen}
        onOpenChange={(o) => {
          setWorkoutSheetOpen(o);
          if (!o) setOpenWorkoutId(null);
        }}
      />
    </div>
  );
}
