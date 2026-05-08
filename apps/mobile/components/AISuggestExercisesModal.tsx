import { useEffect, useState } from 'react';
import { Modal, View, Pressable, ScrollView } from 'react-native';
import { Sparkles, X, Check } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/lib/theme';
import { Text, Button, Card, Input, Skeleton } from '@/components/ui';
import {
  useSuggestExercises,
  type ExerciseSuggestion,
} from '@/hooks/useAI';

interface AISuggestExercisesModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: (suggestions: ExerciseSuggestion[]) => void;
  /** IDs already in the workout (will be excluded from suggestions). */
  existingExerciseIds?: string[];
  /** Optional context that helps the AI rank. */
  workoutType?: string;
  initialMuscleGroups?: string[];
  initialEquipment?: string[];
  availableMuscleGroups?: string[];
  availableEquipment?: string[];
}

const COMMON_EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Resistance Band',
  'Bench',
];

export function AISuggestExercisesModal({
  open,
  onClose,
  onAccept,
  existingExerciseIds = [],
  workoutType,
  initialMuscleGroups = [],
  initialEquipment = [],
  availableMuscleGroups = [],
  availableEquipment = COMMON_EQUIPMENT,
}: AISuggestExercisesModalProps) {
  const theme = useTheme();
  const suggest = useSuggestExercises();

  const [muscles, setMuscles] = useState<string[]>(initialMuscleGroups);
  const [equipment, setEquipment] = useState<string[]>(initialEquipment);
  const [goal, setGoal] = useState('');
  const [count, setCount] = useState('5');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const suggestions = suggest.data?.suggestions ?? [];

  useEffect(() => {
    if (open) {
      setSelected({});
      suggest.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, value: string) => {
    setArr(arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]);
  };

  const run = () => {
    suggest.mutate({
      workoutType: workoutType?.trim() || undefined,
      targetMuscleGroups: muscles.length ? muscles : undefined,
      availableEquipment: equipment.length ? equipment : undefined,
      existingExerciseIds,
      goal: goal.trim() || undefined,
      count: Math.max(3, Math.min(10, parseInt(count, 10) || 5)),
      locale: 'he',
    });
  };

  const accept = () => {
    const picked = suggestions.filter((s) => selected[s.exerciseId]);
    if (picked.length === 0) return;
    onAccept(picked);
    onClose();
  };

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: withAlpha(theme.colors.foreground, 0.4),
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderTopLeftRadius: theme.radii['2xl'],
            borderTopRightRadius: theme.radii['2xl'],
            maxHeight: '90%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: theme.spacing[4],
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
              <Sparkles size={18} color={theme.colors.primary} />
              <Text variant="h3">הצעות תרגילים</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={theme.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[3] }}
          >
            {/* Filters */}
            {availableMuscleGroups.length > 0 && (
              <View style={{ gap: theme.spacing[1.5] }}>
                <Text variant="caption" color="mutedForeground">
                  שרירי יעד
                </Text>
                <Chips
                  values={availableMuscleGroups}
                  selected={muscles}
                  onToggle={(v) => toggle(muscles, setMuscles, v)}
                />
              </View>
            )}
            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                ציוד זמין
              </Text>
              <Chips
                values={availableEquipment}
                selected={equipment}
                onToggle={(v) => toggle(equipment, setEquipment, v)}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <View style={{ flex: 2, gap: theme.spacing[1.5] }}>
                <Text variant="caption" color="mutedForeground">
                  מטרה (אופציונלי)
                </Text>
                <Input value={goal} onChangeText={setGoal} placeholder="כוח, היפרטרופיה…" />
              </View>
              <View style={{ flex: 1, gap: theme.spacing[1.5] }}>
                <Text variant="caption" color="mutedForeground">
                  כמות
                </Text>
                <Input value={count} onChangeText={setCount} keyboardType="numeric" />
              </View>
            </View>

            <Button
              onPress={run}
              loading={suggest.isPending}
              iconLeft={<Sparkles size={16} color={theme.colors.primaryForeground} />}
              fullWidth
            >
              הצע תרגילים
            </Button>

            {/* Results */}
            {suggest.isPending && (
              <Skeleton style={{ height: 240, borderRadius: theme.radii.lg }} />
            )}
            {suggest.isError && (
              <Card tone="muted">
                <Text color="destructive">
                  {suggest.error instanceof Error ? suggest.error.message : 'שגיאה'}
                </Text>
              </Card>
            )}
            {!suggest.isPending && suggestions.length > 0 && (
              <View style={{ gap: theme.spacing[2] }}>
                {suggestions.map((s) => {
                  const checked = !!selected[s.exerciseId];
                  return (
                    <Pressable
                      key={s.exerciseId}
                      onPress={() =>
                        setSelected((prev) => ({ ...prev, [s.exerciseId]: !checked }))
                      }
                    >
                      <Card
                        style={{
                          padding: theme.spacing[3],
                          borderColor: checked
                            ? withAlpha(theme.colors.primary, 0.6)
                            : theme.colors.border,
                          borderWidth: 1.5,
                          backgroundColor: checked
                            ? withAlpha(theme.colors.primary, 0.07)
                            : theme.colors.card,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: theme.spacing[2],
                          }}
                        >
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              borderWidth: 1.5,
                              borderColor: checked
                                ? theme.colors.primary
                                : theme.colors.border,
                              backgroundColor: checked ? theme.colors.primary : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {checked ? (
                              <Check size={14} color={theme.colors.primaryForeground} />
                            ) : null}
                          </View>
                          <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                            {s.name}
                          </Text>
                        </View>
                        {s.reason ? (
                          <Text
                            variant="caption"
                            color="mutedForeground"
                            style={{ marginTop: 6 }}
                          >
                            {s.reason}
                          </Text>
                        ) : null}
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {!suggest.isPending && suggest.data && suggestions.length === 0 && (
              <Card tone="muted">
                <Text color="mutedForeground">
                  לא נמצאו תרגילים מתאימים — נסה לשנות סינון.
                </Text>
              </Card>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              padding: theme.spacing[4],
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <Button
              onPress={accept}
              disabled={Object.values(selected).every((v) => !v)}
              fullWidth
            >
              הוסף נבחרים ({Object.values(selected).filter(Boolean).length})
            </Button>
          </View>
        </View>
      </View>
    </Modal>
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
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[1.5] }}>
      {values.map((v) => {
        const active = selected.includes(v);
        return (
          <Pressable
            key={v}
            onPress={() => onToggle(v)}
            style={{
              paddingHorizontal: theme.spacing[3],
              paddingVertical: theme.spacing[1.5],
              borderRadius: theme.radii.full,
              backgroundColor: active
                ? withAlpha(theme.colors.primary, 0.15)
                : theme.colors.muted,
              borderWidth: 1,
              borderColor: active
                ? withAlpha(theme.colors.primary, 0.4)
                : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontWeight: active ? '700' : '600',
                color: active ? theme.colors.primary : theme.colors.mutedForeground,
              }}
            >
              {v}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
