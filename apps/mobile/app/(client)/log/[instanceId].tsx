import { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { X, Play, Check, Plus } from 'lucide-react-native';
import {
  useWorkoutInstance,
  useSubmitLog,
  type LogItem,
  type LogSet,
} from '@/hooks/useWorkouts';
import { ExerciseVideoModal } from '@/components/ExerciseVideoModal';
import { useTheme, withAlpha } from '@/lib/theme';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  ProgressBar,
  Icon,
  Input,
  Skeleton,
} from '@/components/ui';

// ── Types ──────────────────────────────────────────────────────────────────

interface SetState {
  reps: string;
  weight: string;
  duration: string;
  rpe: string;
  completed: boolean;
}

interface ExerciseState {
  exerciseId: string;
  name: string;
  videoUrl?: string | null;
  sets: SetState[];
  prescription: Record<string, unknown>;
  coachNotes?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function prescStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function buildInitialState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[] | undefined,
): ExerciseState[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (items ?? []).map((item: any) => {
    const setCount = item.prescription?.sets ?? 3;
    const sets: SetState[] = Array.from({ length: setCount }, () => ({
      reps: prescStr(item.prescription?.reps),
      weight: prescStr(item.prescription?.weight),
      duration: prescStr(item.prescription?.duration),
      rpe: '',
      completed: false,
    }));
    return {
      exerciseId: item.exerciseId,
      name: item.exercise?.name ?? 'Exercise',
      videoUrl: item.exercise?.videoUrl ?? null,
      sets,
      prescription: item.prescription ?? {},
      coachNotes: item.coachNotes,
    };
  });
}

// ── Timer ──────────────────────────────────────────────────────────────────

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(
    2,
    '0',
  )}:${String(seconds % 60).padStart(2, '0')}`;
  return { seconds, formatted };
}

// ── Set Row ────────────────────────────────────────────────────────────────

function SetRow({
  setIndex,
  set,
  prescription,
  onChange,
}: {
  setIndex: number;
  set: SetState;
  prescription: Record<string, unknown>;
  onChange: (updated: Partial<SetState>) => void;
}) {
  const theme = useTheme();
  const hasReps = !!prescription.reps;
  const hasWeight = !!prescription.weight;
  const hasDuration = !!prescription.duration;

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.colors.input,
    borderRadius: theme.radii.sm,
    paddingVertical: theme.spacing[1.5],
    paddingHorizontal: theme.spacing[1.5],
    fontSize: 14,
    color: theme.colors.foreground,
    textAlign: 'center' as const,
    width: '100%' as const,
    backgroundColor: theme.colors.background,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  };
  const inputCompletedStyle = {
    backgroundColor: withAlpha(theme.colors.success, 0.15),
    borderColor: withAlpha(theme.colors.success, 0.5),
  };
  const placeholderColor = withAlpha(theme.colors.mutedForeground, 0.5);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1.5],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radii.sm,
        paddingHorizontal: theme.spacing[0.5],
        backgroundColor: set.completed
          ? withAlpha(theme.colors.success, 0.08)
          : 'transparent',
      }}
    >
      <Text
        variant="captionMedium"
        color="mutedForeground"
        tabular
        style={{ width: 24, textAlign: 'center' }}
      >
        {setIndex + 1}
      </Text>

      {hasReps && (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TextInput
            style={[inputStyle, set.completed ? inputCompletedStyle : null]}
            value={set.reps}
            onChangeText={(v) => onChange({ reps: v })}
            keyboardType="numeric"
            placeholder={prescStr(prescription.reps) || '—'}
            placeholderTextColor={placeholderColor}
            accessibilityLabel={`Reps for set ${setIndex + 1}`}
          />
        </View>
      )}

      {hasWeight && (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TextInput
            style={[inputStyle, set.completed ? inputCompletedStyle : null]}
            value={set.weight}
            onChangeText={(v) => onChange({ weight: v })}
            keyboardType="decimal-pad"
            placeholder={prescStr(prescription.weight) || '—'}
            placeholderTextColor={placeholderColor}
            accessibilityLabel={`Weight for set ${setIndex + 1}`}
          />
        </View>
      )}

      {hasDuration && (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TextInput
            style={[inputStyle, set.completed ? inputCompletedStyle : null]}
            value={set.duration}
            onChangeText={(v) => onChange({ duration: v })}
            placeholder={prescStr(prescription.duration) || '—'}
            placeholderTextColor={placeholderColor}
            accessibilityLabel={`Duration for set ${setIndex + 1}`}
          />
        </View>
      )}

      <View style={{ flex: 1, alignItems: 'center' }}>
        <TextInput
          style={[inputStyle, set.completed ? inputCompletedStyle : null]}
          value={set.rpe}
          onChangeText={(v) => onChange({ rpe: v })}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={placeholderColor}
          accessibilityLabel={`RPE for set ${setIndex + 1}`}
        />
      </View>

      <Pressable
        onPress={() => onChange({ completed: !set.completed })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.completed }}
        accessibilityLabel={`Set ${setIndex + 1}`}
        accessibilityHint={
          set.completed ? 'Marks set incomplete' : 'Marks set complete'
        }
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: theme.radii.sm,
          borderWidth: 2,
          borderColor: set.completed
            ? theme.colors.success
            : theme.colors.border,
          backgroundColor: set.completed
            ? theme.colors.success
            : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {set.completed ? (
          <Icon
            icon={Check}
            size={16}
            color={theme.colors.primaryForeground}
            accessible={false}
          />
        ) : null}
      </Pressable>
    </View>
  );
}

// ── Exercise Block ─────────────────────────────────────────────────────────

function ExerciseBlock({
  exercise,
  index,
  onUpdateSet,
  onAddSet,
  onWatchVideo,
}: {
  exercise: ExerciseState;
  index: number;
  onUpdateSet: (
    exIndex: number,
    setIndex: number,
    updated: Partial<SetState>,
  ) => void;
  onAddSet: (exIndex: number) => void;
  onWatchVideo: (exIndex: number) => void;
}) {
  const theme = useTheme();
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const p = exercise.prescription;

  const columnHeaderStyle = {
    flex: 1,
    textAlign: 'center' as const,
  };

  return (
    <Card style={{ marginBottom: theme.spacing[3] }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2.5],
          marginBottom: theme.spacing[2.5],
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: theme.radii.full,
            backgroundColor: withAlpha(theme.colors.primary, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="captionMedium" color="primary" weight="700">
            {index + 1}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">{exercise.name}</Text>
          <Text
            variant="caption"
            color="mutedForeground"
            style={{ marginTop: theme.spacing[0.5] }}
          >
            {completedSets}/{exercise.sets.length} sets complete
          </Text>
        </View>
        {exercise.videoUrl ? (
          <Button
            onPress={() => onWatchVideo(index)}
            variant="outline"
            size="sm"
            accessibilityLabel={`Watch demo for ${exercise.name}`}
            iconLeft={<Icon icon={Play} size={12} color="primary" accessible={false} />}
          >
            Demo
          </Button>
        ) : null}
      </View>

      {/* Coach note */}
      {exercise.coachNotes ? (
        <View
          style={{
            backgroundColor: withAlpha(theme.colors.warning, 0.12),
            borderRadius: theme.radii.md,
            padding: theme.spacing[2.5],
            marginBottom: theme.spacing[2.5],
            flexDirection: 'row',
            gap: theme.spacing[1],
          }}
        >
          <Text variant="captionMedium" color="warning">
            Coach note:
          </Text>
          <Text
            variant="caption"
            color="foreground"
            style={{ flex: 1, lineHeight: 16 }}
          >
            {exercise.coachNotes}
          </Text>
        </View>
      ) : null}

      {/* Prescription badges */}
      {Object.keys(p).length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing[1.5],
            marginBottom: theme.spacing[3],
          }}
        >
          {p.sets ? <Badge variant="info">{prescStr(p.sets)} sets</Badge> : null}
          {p.reps ? <Badge variant="info">{prescStr(p.reps)} reps</Badge> : null}
          {p.weight ? (
            <Badge variant="info">{prescStr(p.weight)} kg</Badge>
          ) : null}
          {p.duration ? <Badge variant="info">{prescStr(p.duration)}</Badge> : null}
          {p.rpe ? <Badge variant="info">RPE {prescStr(p.rpe)}</Badge> : null}
          {p.rest ? (
            <Badge variant="muted">Rest {prescStr(p.rest)}</Badge>
          ) : null}
        </View>
      )}

      {/* Set column headers */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing[1],
          marginBottom: theme.spacing[1],
          gap: theme.spacing[1.5],
        }}
      >
        <Text
          variant="caption"
          color="mutedForeground"
          weight="600"
          style={{ width: 24, textAlign: 'center' }}
        >
          #
        </Text>
        {!!p.reps && (
          <Text
            variant="caption"
            color="mutedForeground"
            weight="600"
            style={columnHeaderStyle}
          >
            Reps
          </Text>
        )}
        {!!p.weight && (
          <Text
            variant="caption"
            color="mutedForeground"
            weight="600"
            style={columnHeaderStyle}
          >
            kg
          </Text>
        )}
        {!!p.duration && (
          <Text
            variant="caption"
            color="mutedForeground"
            weight="600"
            style={columnHeaderStyle}
          >
            Time
          </Text>
        )}
        <Text
          variant="caption"
          color="mutedForeground"
          weight="600"
          style={columnHeaderStyle}
        >
          RPE
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {exercise.sets.map((set, si) => (
        <SetRow
          key={si}
          setIndex={si}
          set={set}
          prescription={p}
          onChange={(updated) => onUpdateSet(index, si, updated)}
        />
      ))}

      <Pressable
        onPress={() => onAddSet(index)}
        accessibilityRole="button"
        accessibilityLabel="Add set"
        style={({ pressed }) => ({
          marginTop: theme.spacing[2.5],
          alignItems: 'center',
          paddingVertical: theme.spacing[2],
          flexDirection: 'row',
          justifyContent: 'center',
          gap: theme.spacing[1],
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon icon={Plus} size={14} color="primary" accessible={false} />
        <Text variant="captionMedium" color="primary">
          Add set
        </Text>
      </Pressable>
    </Card>
  );
}

// ── Finish Modal ───────────────────────────────────────────────────────────

function FinishModal({
  visible,
  durationSeconds,
  submitting,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  durationSeconds: number;
  submitting: boolean;
  onSubmit: (notes: string, rpe: number | null) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [notes, setNotes] = useState('');
  const [rpe, setRpe] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: withAlpha(theme.colors.foreground, 0.4),
          justifyContent: 'flex-end',
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderTopLeftRadius: theme.radii['2xl'],
            borderTopRightRadius: theme.radii['2xl'],
            padding: theme.spacing[6],
            paddingBottom: theme.spacing[10],
            gap: theme.spacing[4],
          }}
        >
          <Text variant="h2">Finish Workout 🎉</Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: withAlpha(theme.colors.primary, 0.1),
              borderRadius: theme.radii.lg,
              padding: theme.spacing[4],
            }}
          >
            <Text variant="body" color="mutedForeground">
              Duration
            </Text>
            <Text variant="h2" color="primary" tabular>
              {Math.floor(durationSeconds / 60)} min
            </Text>
          </View>

          <Input
            label="Overall RPE (1–10)"
            value={rpe}
            onChangeText={setRpe}
            keyboardType="numeric"
            placeholder="How hard was it?"
          />

          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="How did it feel? Any PRs?"
            inputStyle={{
              minHeight: 80,
              textAlignVertical: 'top',
              paddingTop: theme.spacing[2],
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing[3],
              marginTop: theme.spacing[2],
            }}
          >
            <Button
              onPress={onClose}
              variant="outline"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              Back
            </Button>
            <Button
              onPress={() => onSubmit(notes, rpe ? Number(rpe) : null)}
              loading={submitting}
              style={{
                flex: 2,
                backgroundColor: theme.colors.success,
              }}
            >
              Save & Finish
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function WorkoutLogScreen() {
  const theme = useTheme();
  const { instanceId } = useLocalSearchParams<{ instanceId: string }>();
  const { data: instance, isLoading } = useWorkoutInstance(instanceId);
  const submitLog = useSubmitLog(instanceId);

  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [videoForIndex, setVideoForIndex] = useState<number | null>(null);
  const { seconds, formatted } = useTimer(timerRunning);

  useEffect(() => {
    if (instance?.template?.items && !initialized) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setExercises(buildInitialState(instance.template.items as any));
      setInitialized(true);
      setTimerRunning(true);
    }
  }, [instance, initialized]);

  const updateSet = (
    exIndex: number,
    setIndex: number,
    updated: Partial<SetState>,
  ) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei !== exIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si !== setIndex ? s : { ...s, ...updated },
              ),
            },
      ),
    );
  };

  const addSet = (exIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei !== exIndex
          ? ex
          : {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  reps: prescStr(ex.prescription.reps),
                  weight: prescStr(ex.prescription.weight),
                  duration: prescStr(ex.prescription.duration),
                  rpe: '',
                  completed: false,
                },
              ],
            },
      ),
    );
  };

  const handleSubmit = async (notes: string, overallRpe: number | null) => {
    setTimerRunning(false);

    const items: LogItem[] = exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s, si) => ({
        setIndex: si,
        reps: s.reps ? Number(s.reps) : undefined,
        weight: s.weight ? Number(s.weight) : undefined,
        duration: s.duration ? Number(s.duration) : undefined,
        rpe: s.rpe ? Number(s.rpe) : undefined,
        completed: s.completed,
      })) as LogSet[],
    }));

    try {
      const result = await submitLog.mutateAsync({
        durationMinutes: Math.round(seconds / 60),
        overallRpe: overallRpe ?? undefined,
        notes: notes || undefined,
        items,
      });
      if (result.queued) {
        Alert.alert(
          'Saved offline',
          'No internet connection. Your workout will sync when you\u2019re back online.',
          [{ text: 'OK', onPress: () => router.replace('/(client)/today') }],
        );
      } else {
        router.replace('/(client)/today');
      }
    } catch {
      Alert.alert('Error', 'Could not save your workout. Please try again.');
    }
  };

  if (isLoading || !initialized) {
    return (
      <Screen edges={['top']}>
        <View
          style={{
            padding: theme.spacing[4],
            gap: theme.spacing[3],
          }}
        >
          <Skeleton height={28} width="55%" />
          <Skeleton height={14} width="35%" />
          <Skeleton height={8} radius={theme.radii.full} />
          {[0, 1, 2].map((i) => (
            <Card key={i} style={{ marginTop: theme.spacing[2] }}>
              <View style={{ gap: theme.spacing[2] }}>
                <Skeleton height={18} width="60%" />
                <Skeleton height={12} width="30%" />
                <Skeleton height={36} radius={theme.radii.md} />
                <Skeleton height={36} radius={theme.radii.md} />
              </View>
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  const title = instance?.template?.title ?? instance?.title ?? 'Workout';
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0,
  );

  const handleLeave = () => {
    Alert.alert('Leave workout?', 'Progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          gap: theme.spacing[3],
        }}
      >
        <Pressable
          onPress={handleLeave}
          accessibilityRole="button"
          accessibilityLabel="Close workout"
          accessibilityHint="Leaves the workout. Progress will be lost."
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            padding: theme.spacing[1],
          })}
        >
          <Icon icon={X} size={22} color="mutedForeground" accessible={false} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {title}
          </Text>
          <Text
            variant="caption"
            color="primary"
            weight="600"
            tabular
            accessibilityLabel={`Elapsed time ${formatted}`}
            style={{ marginTop: theme.spacing[0.5] }}
          >
            {formatted}
          </Text>
        </View>

        <Button
          onPress={() => setShowFinish(true)}
          size="sm"
          style={{ backgroundColor: theme.colors.success }}
        >
          Finish
        </Button>
      </View>

      {/* Progress bar */}
      <ProgressBar
        value={totalSets > 0 ? completedSets / totalSets : 0}
        height={3}
        tone="primary"
        style={{ borderRadius: 0 }}
      />

      {/* Exercise list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing[4],
          paddingBottom: theme.spacing[10],
        }}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.length === 0 ? (
          <View
            style={{
              padding: theme.spacing[10],
              alignItems: 'center',
            }}
          >
            <Text variant="body" color="mutedForeground">
              No exercises in this workout.
            </Text>
          </View>
        ) : (
          exercises.map((ex, i) => (
            <ExerciseBlock
              key={ex.exerciseId + i}
              exercise={ex}
              index={i}
              onUpdateSet={updateSet}
              onAddSet={addSet}
              onWatchVideo={(idx) => setVideoForIndex(idx)}
            />
          ))
        )}
      </ScrollView>

      <FinishModal
        visible={showFinish}
        durationSeconds={seconds}
        submitting={submitLog.isPending}
        onSubmit={handleSubmit}
        onClose={() => setShowFinish(false)}
      />

      <ExerciseVideoModal
        visible={videoForIndex !== null}
        videoUrl={
          videoForIndex !== null ? exercises[videoForIndex]?.videoUrl : null
        }
        title={
          videoForIndex !== null ? exercises[videoForIndex]?.name : undefined
        }
        onClose={() => setVideoForIndex(null)}
      />

      {submitLog.isPending && (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel="Saving workout"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: withAlpha(theme.colors.foreground, 0.6),
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[3],
          }}
        >
          <ActivityIndicator
            color={theme.colors.primaryForeground}
            size="large"
          />
          <Text
            variant="bodyMedium"
            color="inherit"
            style={{ color: theme.colors.primaryForeground }}
          >
            Saving…
          </Text>
        </View>
      )}
    </Screen>
  );
}
