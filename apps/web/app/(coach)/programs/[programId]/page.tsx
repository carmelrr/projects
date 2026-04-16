'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Lock, CalendarDays, Pencil } from 'lucide-react';
import {
  useProgram,
  useUpdateProgram,
  useAddProgramWeek,
} from '@/hooks/usePrograms';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
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

function EditDialog({
  programId,
  initial,
  open,
  onOpenChange,
}: {
  programId: string;
  initial: { title: string; description?: string; isPrivate: boolean };
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const update = useUpdateProgram();
  const [form, setForm] = useState(initial);

  const save = async () => {
    await update.mutateAsync({ id: programId, ...form });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit program</DialogTitle>
          <DialogDescription>Update the program details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Private</p>
              <p className="text-xs text-muted-foreground">Only visible to you</p>
            </div>
            <Switch
              checked={form.isPrivate}
              onCheckedChange={(checked) => setForm({ ...form, isPrivate: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={save} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProgramDetailPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = use(params);
  const { data: program, isLoading } = useProgram(programId);
  const addWeek = useAddProgramWeek();
  const [editOpen, setEditOpen] = useState(false);

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
          title="Program not found"
          description="The program may have been deleted."
          action={
            <Button asChild variant="outline">
              <Link href="/programs">
                <ArrowLeft className="size-4" />
                Back to programs
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const weeks = [...(program.weeks ?? [])].sort((a, b) => a.weekIndex - b.weekIndex);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link
        href="/programs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        All programs
      </Link>

      <PageHeader
        title={program.title}
        description={program.description ?? 'No description.'}
        actions={
          <div className="flex items-center gap-2">
            {program.isPrivate && (
              <Badge variant="muted" className="gap-1">
                <Lock className="size-3" />
                Private
              </Badge>
            )}
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              variant="gradient"
              onClick={() =>
                addWeek.mutate({
                  programId,
                  title: `Week ${(weeks.at(-1)?.weekIndex ?? 0) + 1}`,
                })
              }
              disabled={addWeek.isPending}
            >
              <Plus className="size-4" />
              Add week
            </Button>
          </div>
        }
      />

      {/* Meta */}
      <div className="flex flex-wrap gap-2">
        {(program.tags ?? []).map((t) => (
          <Badge key={t} variant="muted">
            {t}
          </Badge>
        ))}
      </div>

      {/* Weeks */}
      {weeks.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No weeks yet"
          description="Add your first week to start building the program."
          action={
            <Button
              variant="gradient"
              onClick={() => addWeek.mutate({ programId, title: 'Week 1' })}
              disabled={addWeek.isPending}
            >
              <Plus className="size-4" />
              Add first week
            </Button>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {weeks.map((w) => (
            <Card key={w.id} className="w-72 shrink-0">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Week {w.weekIndex + 1}
                    </p>
                    <h3 className="mt-0.5 text-base font-semibold text-foreground">
                      {w.title ?? `Week ${w.weekIndex + 1}`}
                    </h3>
                  </div>
                </div>

                {w.notes && (
                  <p className="mb-3 text-xs text-muted-foreground">{w.notes}</p>
                )}

                <div className="space-y-1.5">
                  {(w.workoutIds ?? []).length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No workouts yet
                    </p>
                  ) : (
                    (w.workoutIds ?? []).map((id, i) => (
                      <div
                        key={id}
                        className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-2.5 py-2 text-xs"
                      >
                        <span className="text-muted-foreground">Day {i + 1}</span>
                        <span className="truncate font-medium text-foreground">Workout</span>
                      </div>
                    ))
                  )}
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="size-3.5" />
                    Add workout
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editOpen && (
        <EditDialog
          programId={programId}
          initial={{
            title: program.title,
            description: program.description ?? '',
            isPrivate: program.isPrivate,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </div>
  );
}
