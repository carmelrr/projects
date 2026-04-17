'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Check, Loader2 } from 'lucide-react';
import { useWorkouts, useCreateWorkout, type Workout } from '@/hooks/useWorkouts';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  excludeIds?: string[];
  onPick: (workout: Workout) => void;
}

export function PickWorkoutDialog({ open, onOpenChange, excludeIds = [], onPick }: Props) {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  const { data, isLoading } = useWorkouts({ search });
  const create = useCreateWorkout();
  const [form, setForm] = useState({ title: '', description: '', estimatedDuration: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setMode('pick');
      setForm({ title: '', description: '', estimatedDuration: '' });
    }
  }, [open]);

  const items = useMemo(
    () => (data?.items ?? []).filter((w) => !excludeIds.includes(w.id)),
    [data?.items, excludeIds],
  );

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const created = await create.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        estimatedDuration: form.estimatedDuration
          ? Number(form.estimatedDuration)
          : undefined,
      });
      onPick(created);
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add workout</DialogTitle>
          <DialogDescription>
            Pick an existing workout or create a new one.
          </DialogDescription>
        </DialogHeader>

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
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workouts…"
                className="ps-9"
              />
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No workouts found.
                </p>
              ) : (
                items.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      onPick(w);
                      onOpenChange(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card/50 px-3 py-2.5 text-start text-sm transition hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{w.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.items?.length ?? 0} exercises
                        {w.estimatedDuration ? ` · ~${w.estimatedDuration}m` : ''}
                      </p>
                    </div>
                    {w.type && (
                      <Badge variant="muted" className="shrink-0">
                        {w.type}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-title">Title</Label>
              <Input
                id="w-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Upper body A"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-desc">Description</Label>
              <Textarea
                id="w-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-dur">Estimated duration (min)</Label>
              <Input
                id="w-dur"
                type="number"
                value={form.estimatedDuration}
                onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })}
              />
            </div>
            <Separator />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleCreate}
                disabled={creating || !form.title.trim()}
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create &amp; add
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
