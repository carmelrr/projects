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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  X,
  Search,
  CalendarPlus,
} from 'lucide-react-native';
import {
  useProgram,
  useUpdateProgram,
  useDeleteProgram,
  useAddProgramWeek,
  useUpdateProgramWeek,
  useDeleteProgramWeek,
  type DayOfWeek,
  type ProgramWeek,
} from '@/hooks/usePrograms';
import { useWorkouts, type WorkoutTemplate } from '@/hooks/useWorkouts';
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function WorkoutPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (w: WorkoutTemplate) => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const { data } = useWorkouts({ search: search.trim() || undefined });
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
            <Text variant="h3">Pick workout</Text>
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
            keyExtractor={(w) => w.id}
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
                <Text variant="bodyMedium">{item.title}</Text>
                {item.type ? (
                  <Text variant="caption" color="mutedForeground">
                    {item.type}
                  </Text>
                ) : null}
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

function DayPickerModal({
  open,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  current: DayOfWeek | null;
  onPick: (d: DayOfWeek | null) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={open} animationType="fade" transparent>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: withAlpha(theme.colors.foreground, 0.4),
          justifyContent: 'center',
          padding: theme.spacing[6],
        }}
      >
        <Pressable
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radii.xl,
            padding: theme.spacing[4],
            gap: theme.spacing[2],
          }}
        >
          <Text variant="h3" style={{ marginBottom: theme.spacing[2] }}>
            Pick day
          </Text>
          {DAY_LABELS.map((label, i) => {
            const active = current === i;
            return (
              <Pressable
                key={label}
                onPress={() => {
                  onPick(i as DayOfWeek);
                  onClose();
                }}
                style={({ pressed }) => ({
                  padding: theme.spacing[3],
                  borderRadius: theme.radii.md,
                  backgroundColor: active
                    ? withAlpha(theme.colors.primary, 0.15)
                    : pressed
                      ? theme.colors.muted
                      : 'transparent',
                })}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    color: active ? theme.colors.primary : theme.colors.foreground,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              onPick(null);
              onClose();
            }}
            style={({ pressed }) => ({
              padding: theme.spacing[3],
              borderRadius: theme.radii.md,
              backgroundColor: pressed ? theme.colors.muted : 'transparent',
            })}
          >
            <Text variant="bodyMedium" color="mutedForeground">
              No specific day
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function WeekCard({
  week,
  programId,
  expanded,
  onToggle,
}: {
  week: ProgramWeek;
  programId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const updateWeek = useUpdateProgramWeek();
  const deleteWeek = useDeleteProgramWeek();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dayPickerIndex, setDayPickerIndex] = useState<number | null>(null);

  const workoutIds = week.workoutIds ?? [];
  const workoutDays = week.workoutDays ?? [];
  // load workout titles
  const { data: workoutsData } = useWorkouts({});
  const titleFor = (id: string) =>
    workoutsData?.items?.find((w) => w.id === id)?.title ?? 'Workout';

  const persist = (
    nextIds: string[],
    nextDays: (DayOfWeek | null)[],
  ) => {
    updateWeek.mutate({
      weekId: week.id,
      programId,
      workoutIds: nextIds,
      workoutDays: nextDays,
    });
  };

  const addWorkout = (w: WorkoutTemplate) => {
    persist([...workoutIds, w.id], [...workoutDays, null]);
  };

  const removeAt = (i: number) => {
    persist(
      workoutIds.filter((_, idx) => idx !== i),
      workoutDays.filter((_, idx) => idx !== i),
    );
  };

  const setDayAt = (i: number, d: DayOfWeek | null) => {
    const next = workoutDays.slice();
    while (next.length < workoutIds.length) next.push(null);
    next[i] = d;
    persist(workoutIds, next);
  };

  const onDeleteWeek = () => {
    Alert.alert('Delete week?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteWeek.mutate({ weekId: week.id, programId }),
      },
    ]);
  };

  return (
    <Card style={{ padding: 0 }}>
      <Pressable
        onPress={onToggle}
        style={{
          padding: theme.spacing[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">
            Week {week.weekIndex + 1}
            {week.title ? ` · ${week.title}` : ''}
          </Text>
          <Text variant="caption" color="mutedForeground">
            {workoutIds.length} workout{workoutIds.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {expanded ? (
          <ChevronDown size={18} color={theme.colors.mutedForeground} />
        ) : (
          <ChevronRight size={18} color={theme.colors.mutedForeground} />
        )}
      </Pressable>

      {expanded && (
        <View
          style={{
            paddingHorizontal: theme.spacing[3],
            paddingBottom: theme.spacing[3],
            gap: theme.spacing[2],
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingTop: theme.spacing[3],
          }}
        >
          {workoutIds.length === 0 ? (
            <Text variant="caption" color="mutedForeground">
              No workouts assigned to this week.
            </Text>
          ) : (
            workoutIds.map((id, i) => {
              const day = workoutDays[i] ?? null;
              return (
                <View
                  key={`${id}-${i}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    padding: theme.spacing[2],
                    backgroundColor: theme.colors.muted,
                    borderRadius: theme.radii.md,
                  }}
                >
                  <Pressable
                    onPress={() => setDayPickerIndex(i)}
                    style={{
                      paddingHorizontal: theme.spacing[2],
                      paddingVertical: theme.spacing[1],
                      borderRadius: theme.radii.sm,
                      backgroundColor: withAlpha(theme.colors.primary, 0.15),
                      minWidth: 44,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      variant="caption"
                      style={{ color: theme.colors.primary, fontWeight: '700' }}
                    >
                      {day != null ? DAY_LABELS[day] : '—'}
                    </Text>
                  </Pressable>
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {titleFor(id)}
                  </Text>
                  <Pressable
                    onPress={() => removeAt(i)}
                    hitSlop={6}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Trash2 size={16} color={theme.colors.destructive} />
                  </Pressable>
                </View>
              );
            })
          )}

          <View
            style={{ flexDirection: 'row', gap: theme.spacing[2], marginTop: theme.spacing[1] }}
          >
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Plus size={14} color={theme.colors.foreground} />}
              onPress={() => setPickerOpen(true)}
              style={{ flex: 1 }}
            >
              Add workout
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Trash2 size={14} color={theme.colors.destructive} />}
              onPress={onDeleteWeek}
            >
              Remove week
            </Button>
          </View>

          <WorkoutPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={addWorkout}
          />
          <DayPickerModal
            open={dayPickerIndex !== null}
            current={
              dayPickerIndex !== null ? workoutDays[dayPickerIndex] ?? null : null
            }
            onPick={(d) => {
              if (dayPickerIndex !== null) setDayAt(dayPickerIndex, d);
            }}
            onClose={() => setDayPickerIndex(null)}
          />
        </View>
      )}
    </Card>
  );
}

export default function CoachProgramEditor() {
  const theme = useTheme();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { data: program, isLoading } = useProgram(programId!);
  const update = useUpdateProgram();
  const remove = useDeleteProgram();
  const addWeek = useAddProgramWeek();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);

  useEffect(() => {
    if (program) {
      setTitle(program.title ?? '');
      setDescription(program.description ?? '');
      setIsPrivate(!!program.isPrivate);
    }
  }, [program]);

  const saveMeta = async () => {
    if (!title.trim()) {
      Alert.alert('Title is required');
      return;
    }
    try {
      await update.mutateAsync({
        id: programId!,
        title: title.trim(),
        description: description.trim() || undefined,
        isPrivate,
      });
      Alert.alert('Saved');
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const onAddWeek = async () => {
    try {
      await addWeek.mutateAsync({ programId: programId! });
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const onDelete = () => {
    Alert.alert('Delete program?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(programId!);
            router.back();
          } catch (err) {
            Alert.alert('Failed', err instanceof Error ? err.message : 'Error');
          }
        },
      },
    ]);
  };

  const onAssign = () => {
    router.push(`/(coach)/programs/${programId}/assign`);
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
          Program
        </Text>
        <Pressable onPress={onDelete} style={{ padding: theme.spacing[2] }}>
          <Trash2 size={20} color={theme.colors.destructive} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[5], gap: theme.spacing[4] }}
      >
        {isLoading || !program ? (
          <Skeleton style={{ height: 400, borderRadius: theme.radii.xl }} />
        ) : (
          <>
            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Title *
              </Text>
              <Input value={title} onChangeText={setTitle} />
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
            <Pressable
              onPress={() => setIsPrivate((v) => !v)}
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
                  borderRadius: theme.radii.sm,
                  borderWidth: 2,
                  borderColor: isPrivate ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isPrivate ? theme.colors.primary : 'transparent',
                }}
              />
              <Text variant="body">Private (only me)</Text>
            </Pressable>
            <Button
              onPress={saveMeta}
              loading={update.isPending}
              iconLeft={<Save size={16} color={theme.colors.primaryForeground} />}
              fullWidth
            >
              Save details
            </Button>

            <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing[1] }} />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="h3">Weeks</Text>
              <Badge variant="muted">{program.weeks.length}</Badge>
            </View>

            {program.weeks
              .slice()
              .sort((a, b) => a.weekIndex - b.weekIndex)
              .map((w) => (
                <WeekCard
                  key={w.id}
                  week={w}
                  programId={programId!}
                  expanded={expandedWeekId === w.id}
                  onToggle={() =>
                    setExpandedWeekId(expandedWeekId === w.id ? null : w.id)
                  }
                />
              ))}

            <Button
              variant="outline"
              onPress={onAddWeek}
              loading={addWeek.isPending}
              iconLeft={<Plus size={16} color={theme.colors.foreground} />}
              fullWidth
            >
              Add week
            </Button>

            <Button
              onPress={onAssign}
              variant="gradient"
              size="lg"
              iconLeft={<CalendarPlus size={16} color={theme.colors.primaryForeground} />}
              fullWidth
              style={{ marginTop: theme.spacing[2] }}
            >
              Assign to client
            </Button>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
