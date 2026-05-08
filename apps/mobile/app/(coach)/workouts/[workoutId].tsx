import { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Sparkles, ArrowLeft, Plus, Trash2, Save, ChevronUp, ChevronDown, Dumbbell, Timer, StickyNote, X, Search, ChevronDown as Chevron, ChevronRight } from 'lucide-react-native';
import {
  useWorkout,
  useCreateWorkout,
  useUpdateWorkout,
  useDeleteWorkout,
  type WorkoutTemplate,
  type WorkoutItem,
  type WorkoutBlockKind,
} from '@/hooks/useWorkouts';
import { useExercises, useExerciseMuscleGroups, type Exercise } from '@/hooks/useExercises';
import { useSuggestPrescription } from '@/hooks/useAI';
import { AISparkleButton } from '@/components/AISparkleButton';
import { AISuggestExercisesModal } from '@/components/AISuggestExercisesModal';
import { useTheme, withAlpha } from '@/lib/theme';
import {
  Screen,
  Text,
  Card,
  Input,
  Button,
  Skeleton,
  Badge,
} from '@/components/ui';

// ── Helpers ─────────────────────────────────────────────────────────────────

function emptyExerciseItem(exercise: Exercise, orderIndex: number): WorkoutItem {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    exerciseId: exercise.id,
    orderIndex,
    kind: 'EXERCISE',
    prescription: { sets: 3, reps: '8-12' },
    exercise: {
      id: exercise.id,
      name: exercise.name,
      muscleGroups: exercise.muscleGroups,
    },
  };
}

function emptyTimerItem(orderIndex: number): WorkoutItem {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    orderIndex,
    kind: 'INTERVAL_TIMER',
    prescription: {},
    intervalTimer: {
      title: 'Interval timer',
      preset: 'CLASSIC_TABATA',
      prepareSec: 10,
      workSec: 20,
      restSec: 10,
      rounds: 8,
      sets: 1,
      restBetweenSetsSec: 60,
    },
  };
}

function emptyNoteItem(orderIndex: number): WorkoutItem {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    orderIndex,
    kind: 'NOTE',
    prescription: {},
    note: { title: 'Note', body: '' },
  };
}

function blockIcon(kind: WorkoutBlockKind = 'EXERCISE') {
  if (kind === 'INTERVAL_TIMER') return Timer;
  if (kind === 'NOTE') return StickyNote;
  return Dumbbell;
}

// ── Item row ────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  index,
  total,
  expanded,
  onToggle,
  onPatch,
  onMoveUp,
  onMoveDown,
  onRemove,
  clientId,
}: {
  item: WorkoutItem;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<WorkoutItem>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  clientId?: string;
}) {
  const theme = useTheme();
  const kind = item.kind ?? 'EXERCISE';
  const Icon = blockIcon(kind);
  const prescribe = useSuggestPrescription();

  const runPrescription = async () => {
    if (!clientId || !item.exerciseId) return;
    try {
      const res = await prescribe.mutateAsync({
        exerciseId: item.exerciseId,
        clientId,
        locale: 'he',
      });
      const next: Record<string, unknown> = { ...item.prescription };
      if (res.sets != null) next['sets'] = res.sets;
      if (res.reps) next['reps'] = res.reps;
      if (res.rest != null) next['rest'] = res.rest;
      if (res.tempo) next['tempo'] = res.tempo;
      if (res.duration != null) next['duration'] = res.duration;
      if (res.weight) {
        next['weight'] =
          res.weight.type === 'absolute' ? String(res.weight.value) : `${res.weight.value}${res.weight.type === 'percentage_1rm' ? '%1RM' : ' RPE'}`;
      }
      const notes = [item.coachNotes, res.notes, res.rationale ? `✨ ${res.rationale}` : null]
        .filter(Boolean)
        .join('\n');
      onPatch({ prescription: next, coachNotes: notes });
    } catch (err) {
      Alert.alert('AI לא זמין', err instanceof Error ? err.message : 'Error');
    }
  };

  const title =
    kind === 'EXERCISE'
      ? item.exercise?.name ?? 'Exercise'
      : kind === 'INTERVAL_TIMER'
        ? item.intervalTimer?.title ?? 'Interval timer'
        : item.note?.title ?? 'Note';

  const subtitle =
    kind === 'EXERCISE'
      ? `${item.prescription?.sets ?? '?'} × ${item.prescription?.reps ?? '—'}${item.prescription?.weight ? ` @ ${item.prescription.weight}` : ''}`
      : kind === 'INTERVAL_TIMER'
        ? `${item.intervalTimer?.workSec ?? 0}s work · ${item.intervalTimer?.restSec ?? 0}s rest · ${item.intervalTimer?.rounds ?? 0}r`
        : (item.note?.body ?? '').slice(0, 60) || 'Tap to edit';

  return (
    <Card style={{ padding: 0 }}>
      <Pressable
        onPress={onToggle}
        style={{
          padding: theme.spacing[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: theme.radii.md,
            backgroundColor: withAlpha(theme.colors.primary, 0.15),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {expanded ? (
          <Chevron size={18} color={theme.colors.mutedForeground} />
        ) : (
          <ChevronRight size={18} color={theme.colors.mutedForeground} />
        )}
      </Pressable>

      {expanded && (
        <View
          style={{
            paddingHorizontal: theme.spacing[3],
            paddingBottom: theme.spacing[3],
            gap: theme.spacing[3],
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingTop: theme.spacing[3],
          }}
        >
          {kind === 'EXERCISE' && (
            <>
              {clientId && item.exerciseId ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <AISparkleButton
                    onPress={runPrescription}
                    loading={prescribe.isPending}
                    size="sm"
                    label="המלצת AI למתאמן"
                  />
                </View>
              ) : null}
              <View
                style={{ flexDirection: 'row', gap: theme.spacing[2] }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" color="mutedForeground">
                    Sets
                  </Text>
                  <Input
                    keyboardType="numeric"
                    value={String(item.prescription?.sets ?? '')}
                    onChangeText={(v) =>
                      onPatch({
                        prescription: {
                          ...item.prescription,
                          sets: v ? parseInt(v, 10) : undefined,
                        },
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" color="mutedForeground">
                    Reps
                  </Text>
                  <Input
                    value={String(item.prescription?.reps ?? '')}
                    onChangeText={(v) =>
                      onPatch({
                        prescription: { ...item.prescription, reps: v },
                      })
                    }
                    placeholder="8-12"
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" color="mutedForeground">
                    Weight
                  </Text>
                  <Input
                    value={String(item.prescription?.weight ?? '')}
                    onChangeText={(v) =>
                      onPatch({
                        prescription: { ...item.prescription, weight: v },
                      })
                    }
                    placeholder="bodyweight"
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" color="mutedForeground">
                    Rest
                  </Text>
                  <Input
                    value={String(item.prescription?.rest ?? '')}
                    onChangeText={(v) =>
                      onPatch({
                        prescription: { ...item.prescription, rest: v },
                      })
                    }
                    placeholder="60s"
                  />
                </View>
              </View>
              <View style={{ gap: 4 }}>
                <Text variant="caption" color="mutedForeground">
                  Coach notes
                </Text>
                <Input
                  value={item.coachNotes ?? ''}
                  onChangeText={(v) => onPatch({ coachNotes: v })}
                  multiline
                  inputStyle={{ minHeight: 60, textAlignVertical: 'top' }}
                />
              </View>
            </>
          )}

          {kind === 'INTERVAL_TIMER' && item.intervalTimer && (
            <>
              <View style={{ gap: 4 }}>
                <Text variant="caption" color="mutedForeground">
                  Title
                </Text>
                <Input
                  value={item.intervalTimer.title}
                  onChangeText={(v) =>
                    onPatch({
                      intervalTimer: { ...item.intervalTimer!, title: v },
                    })
                  }
                />
              </View>
              <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" color="mutedForeground">
                    Work (s)
                  </Text>
                  <Input
                    keyboardType="numeric"
                    value={String(item.intervalTimer.workSec)}
                    onChangeText={(v) =>
                      onPatch({
                        intervalTimer: {
                          ...item.intervalTimer!,
                          workSec: parseInt(v, 10) || 0,
                        },
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" color="mutedForeground">
                    Rest (s)
                  </Text>
                  <Input
                    keyboardType="numeric"
                    value={String(item.intervalTimer.restSec)}
                    onChangeText={(v) =>
                      onPatch({
                        intervalTimer: {
                          ...item.intervalTimer!,
                          restSec: parseInt(v, 10) || 0,
                        },
                      })
                    }
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" color="mutedForeground">
                    Rounds
                  </Text>
                  <Input
                    keyboardType="numeric"
                    value={String(item.intervalTimer.rounds)}
                    onChangeText={(v) =>
                      onPatch({
                        intervalTimer: {
                          ...item.intervalTimer!,
                          rounds: parseInt(v, 10) || 1,
                        },
                      })
                    }
                  />
                </View>
              </View>
            </>
          )}

          {kind === 'NOTE' && item.note && (
            <>
              <View style={{ gap: 4 }}>
                <Text variant="caption" color="mutedForeground">
                  Title
                </Text>
                <Input
                  value={item.note.title ?? ''}
                  onChangeText={(v) =>
                    onPatch({ note: { ...item.note!, title: v } })
                  }
                />
              </View>
              <View style={{ gap: 4 }}>
                <Text variant="caption" color="mutedForeground">
                  Body
                </Text>
                <Input
                  value={item.note.body}
                  onChangeText={(v) =>
                    onPatch({ note: { ...item.note!, body: v } })
                  }
                  multiline
                  inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              </View>
            </>
          )}

          {/* Action row */}
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing[2],
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <Pressable
                onPress={onMoveUp}
                disabled={index === 0}
                style={({ pressed }) => ({
                  padding: theme.spacing[2],
                  opacity: index === 0 ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <ChevronUp size={20} color={theme.colors.foreground} />
              </Pressable>
              <Pressable
                onPress={onMoveDown}
                disabled={index === total - 1}
                style={({ pressed }) => ({
                  padding: theme.spacing[2],
                  opacity: index === total - 1 ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <ChevronDown size={20} color={theme.colors.foreground} />
              </Pressable>
            </View>
            <Pressable
              onPress={onRemove}
              style={({ pressed }) => ({
                padding: theme.spacing[2],
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Trash2 size={20} color={theme.colors.destructive} />
            </Pressable>
          </View>
        </View>
      )}
    </Card>
  );
}

// ── Exercise picker modal ───────────────────────────────────────────────────

function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (e: Exercise) => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const { data } = useExercises({ search: search.trim() || undefined });

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
            maxHeight: '80%',
            paddingBottom: theme.spacing[8],
          }}
        >
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
            <Text variant="h3">Pick exercise</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={theme.colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={{ padding: theme.spacing[4] }}>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              leftIcon={<Search size={16} color={theme.colors.mutedForeground} />}
            />
          </View>
          <FlatList
            data={data?.items ?? []}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: theme.spacing[5],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.muted : 'transparent',
                })}
              >
                <Text variant="bodyMedium">{item.name}</Text>
                {item.muscleGroups && item.muscleGroups.length > 0 && (
                  <Text variant="caption" color="mutedForeground">
                    {item.muscleGroups.join(', ')}
                  </Text>
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View
                style={{ height: 1, backgroundColor: theme.colors.border }}
              />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Main editor ─────────────────────────────────────────────────────────────

export default function CoachWorkoutEditor() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ workoutId: string; clientId?: string }>();
  const workoutId = params.workoutId;
  const clientId = params.clientId;
  const isNew = !workoutId || workoutId === 'new';

  const { data: existing, isLoading } = useWorkout(isNew ? '' : workoutId!);
  const create = useCreateWorkout();
  const update = useUpdateWorkout();
  const remove = useDeleteWorkout();
  const { data: muscleGroups } = useExerciseMuscleGroups();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [estDur, setEstDur] = useState('');
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [aiPickerOpen, setAiPickerOpen] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title ?? '');
      setDescription(existing.description ?? '');
      setType(existing.type ?? '');
      setEstDur(
        existing.estimatedDuration ? String(existing.estimatedDuration) : '',
      );
      setItems(
        (existing.items ?? [])
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex),
      );
    }
  }, [existing]);

  const patchItem = (id: string, patch: Partial<WorkoutItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = prev.slice();
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((it, i) => ({ ...it, orderIndex: i }));
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) =>
      prev.filter((it) => it.id !== id).map((it, i) => ({ ...it, orderIndex: i })),
    );
  };

  const addExercise = (e: Exercise) => {
    setItems((prev) => [...prev, emptyExerciseItem(e, prev.length)]);
  };

  const addAISuggestions = async (
    suggestions: Array<{ exerciseId: string; name: string }>,
  ) => {
    setItems((prev) => {
      const next = prev.slice();
      suggestions.forEach((s) => {
        next.push(
          emptyExerciseItem(
            { id: s.exerciseId, name: s.name, isSystem: false, createdAt: '' } as Exercise,
            next.length,
          ),
        );
      });
      return next;
    });
  };

  const addTimer = () => {
    const item = emptyTimerItem(items.length);
    setItems((prev) => [...prev, item]);
    setExpandedId(item.id);
  };

  const addNote = () => {
    const item = emptyNoteItem(items.length);
    setItems((prev) => [...prev, item]);
    setExpandedId(item.id);
  };

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Title is required');
      return;
    }
    const body: Partial<WorkoutTemplate> & { title: string } = {
      title: title.trim(),
      description: description.trim() || undefined,
      type: type.trim() || undefined,
      estimatedDuration: estDur ? parseInt(estDur, 10) : undefined,
      items: items.map((it, i) => ({ ...it, orderIndex: i })),
    };
    try {
      if (isNew) {
        await create.mutateAsync(body);
      } else {
        await update.mutateAsync({ id: workoutId!, ...body });
      }
      router.back();
    } catch (err) {
      Alert.alert('Failed to save', err instanceof Error ? err.message : 'Error');
    }
  };

  const onDelete = () => {
    if (isNew) return;
    Alert.alert('Delete workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(workoutId!);
            router.back();
          } catch (err) {
            Alert.alert('Failed', err instanceof Error ? err.message : 'Error');
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: theme.spacing[2] }}>
          <ArrowLeft size={22} color={theme.colors.foreground} />
        </Pressable>
        <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          {isNew ? 'New workout' : 'Edit workout'}
        </Text>
        {!isNew && (
          <Pressable onPress={onDelete} style={{ padding: theme.spacing[2] }}>
            <Trash2 size={20} color={theme.colors.destructive} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[5], gap: theme.spacing[4] }}
      >
        {!isNew && isLoading ? (
          <Skeleton style={{ height: 400, borderRadius: theme.radii.xl }} />
        ) : (
          <>
            {/* Meta fields */}
            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Title *
              </Text>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Upper body day"
              />
            </View>
            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Description
              </Text>
              <Input
                value={description}
                onChangeText={setDescription}
                multiline
                inputStyle={{ minHeight: 60, textAlignVertical: 'top' }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <View style={{ flex: 1, gap: theme.spacing[1.5] }}>
                <Text variant="caption" color="mutedForeground">
                  Type
                </Text>
                <Input
                  value={type}
                  onChangeText={setType}
                  placeholder="strength"
                />
              </View>
              <View style={{ flex: 1, gap: theme.spacing[1.5] }}>
                <Text variant="caption" color="mutedForeground">
                  Duration (min)
                </Text>
                <Input
                  value={estDur}
                  onChangeText={setEstDur}
                  keyboardType="numeric"
                  placeholder="45"
                />
              </View>
            </View>

            {/* Items */}
            <View style={{ gap: theme.spacing[2] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="h3">Blocks</Text>
                <Badge variant="muted">{items.length}</Badge>
              </View>
              {items.length === 0 ? (
                <Card tone="muted">
                  <Text variant="body" color="mutedForeground">
                    No blocks yet. Add an exercise, interval timer, or note below.
                  </Text>
                </Card>
              ) : (
                items.map((it, i) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    index={i}
                    total={items.length}
                    expanded={expandedId === it.id}
                    onToggle={() =>
                      setExpandedId(expandedId === it.id ? null : it.id)
                    }
                    onPatch={(patch) => patchItem(it.id, patch)}
                    onMoveUp={() => moveItem(i, -1)}
                    onMoveDown={() => moveItem(i, 1)}
                    onRemove={() => removeItem(it.id)}
                    clientId={clientId}
                  />
                ))
              )}
            </View>

            {/* Add buttons */}
            <View style={{ gap: theme.spacing[2] }}>
              <Button
                variant="outline"
                iconLeft={<Plus size={16} color={theme.colors.foreground} />}
                onPress={() => setPickerOpen(true)}
                fullWidth
              >
                Add exercise
              </Button>
              <Button
                variant="outline"
                iconLeft={<Sparkles size={16} color={theme.colors.primary} />}
                onPress={() => setAiPickerOpen(true)}
                fullWidth
              >
                הצע תרגילים עם AI
              </Button>
              <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={<Timer size={14} color={theme.colors.foreground} />}
                  onPress={addTimer}
                  style={{ flex: 1 }}
                >
                  Timer block
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={<StickyNote size={14} color={theme.colors.foreground} />}
                  onPress={addNote}
                  style={{ flex: 1 }}
                >
                  Note
                </Button>
              </View>
            </View>

            <Button
              onPress={save}
              loading={create.isPending || update.isPending}
              disabled={!title.trim()}
              iconLeft={<Save size={16} color={theme.colors.primaryForeground} />}
              fullWidth
              size="lg"
              style={{ marginTop: theme.spacing[2] }}
            >
              {isNew ? 'Create workout' : 'Save changes'}
            </Button>
          </>
        )}
      </ScrollView>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
      />

      <AISuggestExercisesModal
        open={aiPickerOpen}
        onClose={() => setAiPickerOpen(false)}
        onAccept={addAISuggestions}
        existingExerciseIds={items.map((i) => i.exerciseId).filter(Boolean) as string[]}
        workoutType={type}
        availableMuscleGroups={muscleGroups ?? []}
      />
    </Screen>
  );
}
