'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
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
import { cn } from '@/lib/utils';
import { useSuggestExercises, type ExerciseSuggestion } from '@/hooks/useAI';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (suggestions: ExerciseSuggestion[]) => void;
  existingExerciseIds?: string[];
  workoutType?: string;
  availableMuscleGroups?: string[];
  availableEquipment?: string[];
}

const FALLBACK_EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Resistance Band',
  'Bench',
];

export function AISuggestExercisesDialog({
  open,
  onOpenChange,
  onAccept,
  existingExerciseIds = [],
  workoutType,
  availableMuscleGroups = [],
  availableEquipment = FALLBACK_EQUIPMENT,
}: Props) {
  const suggest = useSuggestExercises();
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [count, setCount] = useState('5');
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const suggestions = suggest.data?.suggestions ?? [];

  useEffect(() => {
    if (open) {
      setPicked({});
      suggest.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const run = () => {
    suggest.mutate(
      {
        workoutType: workoutType?.trim() || undefined,
        targetMuscleGroups: muscles.length ? muscles : undefined,
        availableEquipment: equipment.length ? equipment : undefined,
        existingExerciseIds,
        goal: goal.trim() || undefined,
        count: Math.max(3, Math.min(10, parseInt(count, 10) || 5)),
        locale: 'he',
      },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'AI לא זמין');
        },
      },
    );
  };

  const accept = () => {
    const chosen = suggestions.filter((s) => picked[s.exerciseId]);
    if (chosen.length === 0) return;
    onAccept(chosen);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            הצעות תרגילים עם AI
          </DialogTitle>
          <DialogDescription>
            בחר שרירי יעד וציוד זמין, ה-AI יציע תרגילים מהספרייה.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableMuscleGroups.length > 0 && (
            <div className="space-y-2">
              <Label>שרירי יעד</Label>
              <Chips
                values={availableMuscleGroups}
                selected={muscles}
                onToggle={(v) => toggle(muscles, setMuscles, v)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>ציוד זמין</Label>
            <Chips
              values={availableEquipment}
              selected={equipment}
              onToggle={(v) => toggle(equipment, setEquipment, v)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ai-goal">מטרה (אופציונלי)</Label>
              <Input
                id="ai-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="כוח, היפרטרופיה, סבולת…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-count">כמות</Label>
              <Input
                id="ai-count"
                type="number"
                min={3}
                max={10}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={run} disabled={suggest.isPending} className="w-full">
            {suggest.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            הצע תרגילים
          </Button>

          {!suggest.isPending && suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((s) => {
                const checked = !!picked[s.exerciseId];
                return (
                  <button
                    key={s.exerciseId}
                    type="button"
                    onClick={() =>
                      setPicked((prev) => ({ ...prev, [s.exerciseId]: !checked }))
                    }
                    className={cn(
                      'w-full rounded-lg border-2 p-3 text-start transition-colors',
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex size-5 items-center justify-center rounded-full border-2',
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {checked ? <Check className="size-3" /> : null}
                      </div>
                      <p className="flex-1 truncate text-sm font-semibold">{s.name}</p>
                    </div>
                    {s.reason ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">{s.reason}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {!suggest.isPending && suggest.data && suggestions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              לא נמצאו תרגילים מתאימים — נסה לשנות סינון.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button
            onClick={accept}
            disabled={Object.values(picked).every((v) => !v)}
          >
            הוסף נבחרים ({Object.values(picked).filter(Boolean).length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Chips({
  values,
  selected,
  onToggle,
}: {
  values: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => {
        const active = selected.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
            )}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
