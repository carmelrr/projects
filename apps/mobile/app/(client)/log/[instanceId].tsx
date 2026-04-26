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
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { X, Play, Check, Plus } from 'lucide-react-native';
import {
  useWorkoutInstance,
  useSubmitLog,
  usePersonalRecords,
  useUpsertPersonalRecord,
  type LogItem,
  type LogSet,
  type PersonalRecord,
} from '@/hooks/useWorkouts';
import { ExerciseVideoModal } from '@/components/ExerciseVideoModal';
import { useTheme, withAlpha } from '@/lib/theme';
import { useAuthStore } from '@/stores/auth.store';
import { convertWeightString, type WeightUnit } from '@coaching/shared';
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
  restSeconds: string;
  completed: boolean;
}

interface ExerciseState {
  exerciseId: string;
  name: string;
  videoUrl?: string | null;
  sets: SetState[];
  prescription: Record<string, unknown>;
  coachNotes?: string;
  isPrBased?: boolean;
  needsPrEntry?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function prescStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function parseSeconds(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  if (typeof v !== 'string') return 0;
  const raw = v.trim().toLowerCase();
  if (!raw) return 0;
  const mmss = raw.match(/^(\d+):(\d{1,2})$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/^(\d+(?:\.\d+)?)(s|sec|secs|seconds|m|min|mins|minutes)$/);
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  return m[2].startsWith('m') ? Math.floor(n * 60) : Math.floor(n);
}

function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function buildInitialState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[] | undefined,
  prMap: Record<string, PersonalRecord> = {},
  traineeUnit: WeightUnit = 'kg',
): ExerciseState[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (items ?? []).map((item: any) => {
    const setCount = item.prescription?.sets ?? 3;
    const isPrBased = item.exercise?.isPrBased ?? false;
    const rawWeight = item.prescription?.weight;
    const prescriptionUnit: WeightUnit =
      item.prescription?.weightUnit === 'lbs' ? 'lbs' : 'kg';
    let resolvedWeight = prescStr(rawWeight);
    let needsPrEntry = false;

    if (isPrBased && typeof rawWeight === 'string' && rawWeight.trim().endsWith('%')) {
      const pct = parseFloat(rawWeight) / 100;
      const pr = prMap[item.exerciseId];
      if (pr && !isNaN(pct)) {
        // PR is stored in the unit the trainee used at entry time.
        // Convert the computed absolute weight to trainee's current display unit.
        const prUnit: WeightUnit = pr.unit === 'lbs' ? 'lbs' : 'kg';
        const absoluteInPrUnit = Math.round(pr.weight * pct * 10) / 10;
        const converted = convertWeightString(
          String(absoluteInPrUnit),
          prUnit,
          traineeUnit,
        );
        resolvedWeight = converted;
      } else {
        resolvedWeight = '';
        needsPrEntry = true;
      }
    } else if (resolvedWeight) {
      // Absolute weight from prescription — convert from coach's unit to trainee's unit.
      resolvedWeight = convertWeightString(resolvedWeight, prescriptionUnit, traineeUnit);
    }

    const sets: SetState[] = Array.from({ length: setCount }, () => ({
      reps: prescStr(item.prescription?.reps),
      weight: resolvedWeight,
      duration: prescStr(item.prescription?.duration),
      restSeconds: '',
      completed: false,
    }));
    return {
      exerciseId: item.exerciseId,
      name: item.exercise?.name ?? 'Exercise',
      videoUrl: item.exercise?.videoUrl ?? null,
      sets,
      prescription: item.prescription ?? {},
      coachNotes: item.coachNotes,
      isPrBased,
      needsPrEntry,
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

/**
 * Parse a reps prescription into a numeric target.
 * "10" → 10, "8-10" → 10 (upper bound, allow Stop early), "AMRAP"/"" → null.
 */
function parseRepTarget(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v !== 'string') return null;
  const raw = v.trim();
  if (!raw) return null;
  const range = raw.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) return Number(range[2]);
  const single = raw.match(/^(\d+)/);
  if (single) return Number(single[1]);
  return null;
}

type SetPhase = 'idle' | 'rep-work' | 'rep-rest' | 'done';

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
  const timeMode =
    prescription.timeMode === 'COUNTDOWN' ? 'COUNTDOWN' : 'STOPWATCH';

  // Per-rep Tabata mode: reps + duration + a parseable rep count.
  const workSeconds = parseSeconds(prescription.duration);
  const repRestSeconds = parseSeconds(prescription.restBetweenReps);
  const repTarget = parseRepTarget(prescription.reps);
  const perRepMode = hasReps && hasDuration && !!repTarget && workSeconds > 0;
  // In per-rep mode, time is intrinsically a countdown per rep.
  const effectiveTimeMode: 'STOPWATCH' | 'COUNTDOWN' = perRepMode
    ? 'COUNTDOWN'
    : timeMode;
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [targetSeconds, setTargetSeconds] = useState<number | null>(null);
  // Per-rep state (only used when perRepMode is true)
  const [phase, setPhase] = useState<SetPhase>('idle');
  const [currentRep, setCurrentRep] = useState(0); // 1..repTarget while running
  const [activeWorkAccum, setActiveWorkAccum] = useState(0); // total work seconds completed

  // Reset phase if prescription mode changes underneath us.
  useEffect(() => {
    if (!perRepMode && phase !== 'idle') {
      setPhase('idle');
      setCurrentRep(0);
      setActiveWorkAccum(0);
    }
  }, [perRepMode, phase]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null) return prev;

        // Per-rep Tabata flow ─────────────────────────────────────────────
        if (perRepMode) {
          if (prev > 1) return prev - 1;
          // prev <= 1 → segment finished
          if (phase === 'rep-work') {
            const nextWorkAccum = activeWorkAccum + workSeconds;
            const isLastRep = currentRep >= (repTarget ?? 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            if (isLastRep) {
              // Set complete
              setActiveWorkAccum(nextWorkAccum);
              setPhase('done');
              setTimerRunning(false);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              ).catch(() => {});
              onChange({
                duration: String(nextWorkAccum),
                reps: String(currentRep),
                completed: true,
              });
              return 0;
            }
            // More reps: go to rep-rest (or skip if 0)
            setActiveWorkAccum(nextWorkAccum);
            if (repRestSeconds > 0) {
              setPhase('rep-rest');
              setTargetSeconds(repRestSeconds);
              return repRestSeconds;
            }
            // No rep rest → straight into the next rep
            setCurrentRep((r) => r + 1);
            setPhase('rep-work');
            setTargetSeconds(workSeconds);
            return workSeconds;
          }
          if (phase === 'rep-rest') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setCurrentRep((r) => r + 1);
            setPhase('rep-work');
            setTargetSeconds(workSeconds);
            return workSeconds;
          }
          return 0;
        }

        // Single-segment flow (legacy: COUNTDOWN of duration, or STOPWATCH).
        if (effectiveTimeMode === 'COUNTDOWN') {
          if (prev <= 1) {
            setTimerRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onChange({ duration: String(targetSeconds ?? 0), completed: true });
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [
    activeWorkAccum,
    currentRep,
    effectiveTimeMode,
    onChange,
    perRepMode,
    phase,
    repRestSeconds,
    repTarget,
    targetSeconds,
    timerRunning,
    workSeconds,
  ]);

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
          <Pressable
            onPress={() => {
              if (timerRunning) {
                // Stop / cancel
                if (perRepMode) {
                  // Sum the work from completed reps + partial current rep (work phase only)
                  const partial =
                    phase === 'rep-work'
                      ? Math.max(0, workSeconds - (timerSeconds ?? 0))
                      : 0;
                  const total = activeWorkAccum + partial;
                  onChange({
                    duration: String(total),
                    reps: String(
                      Math.max(
                        0,
                        phase === 'rep-work' ? currentRep - 1 : currentRep,
                      ),
                    ),
                  });
                  setPhase('idle');
                  setCurrentRep(0);
                  setActiveWorkAccum(0);
                  setTimerRunning(false);
                  return;
                }
                const current = timerSeconds ?? 0;
                if (effectiveTimeMode === 'COUNTDOWN') {
                  const target = targetSeconds ?? parseSeconds(prescription.duration);
                  const elapsed = Math.max(0, target - current);
                  onChange({ duration: String(elapsed) });
                } else {
                  onChange({ duration: String(current) });
                }
                setTimerRunning(false);
                return;
              }

              // Start
              if (perRepMode) {
                setActiveWorkAccum(0);
                setCurrentRep(1);
                setPhase('rep-work');
                setTargetSeconds(workSeconds);
                setTimerSeconds(workSeconds);
                setTimerRunning(true);
                return;
              }
              if (effectiveTimeMode === 'COUNTDOWN') {
                const target = parseSeconds(prescription.duration);
                if (!target) return;
                setTargetSeconds(target);
                setTimerSeconds(target);
                setTimerRunning(true);
                return;
              }

              setTargetSeconds(null);
              setTimerSeconds(parseSeconds(set.duration));
              setTimerRunning(true);
            }}
            style={({ pressed }) => ({
              marginTop: theme.spacing[1],
              paddingHorizontal: theme.spacing[1],
              paddingVertical: theme.spacing[0.5],
              borderRadius: theme.radii.sm,
              borderWidth: 1,
              borderColor: withAlpha(theme.colors.primary, 0.4),
              backgroundColor: withAlpha(theme.colors.primary, 0.1),
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text variant="caption" color="primary" tabular>
              {timerRunning
                ? perRepMode
                  ? `${phase === 'rep-rest' ? 'Rest' : 'Rep'} ${currentRep}/${repTarget} · ${formatSeconds(timerSeconds ?? 0)}`
                  : `Stop ${formatSeconds(timerSeconds ?? 0)}`
                : perRepMode
                  ? `Start ${repTarget}×${workSeconds}s`
                  : `${effectiveTimeMode === 'COUNTDOWN' ? 'Timer' : 'Stopwatch'} Start`}
            </Text>
          </Pressable>
        </View>
      )}

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
  weightUnit,
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
  weightUnit?: WeightUnit;
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
            <Badge variant="info">{prescStr(p.weight)} {weightUnit ?? 'kg'}</Badge>
          ) : null}
          {p.duration ? (
            <Badge variant="info">
              {p.reps ? `${prescStr(p.duration)} per rep` : prescStr(p.duration)}
            </Badge>
          ) : null}
          {p.timeMode && !(p.reps && p.duration) ? (
            <Badge variant="info">{prescStr(p.timeMode)}</Badge>
          ) : null}
          {p.restBetweenReps ? (
            <Badge variant="muted">
              Rest between reps {prescStr(p.restBetweenReps)}
            </Badge>
          ) : null}
          {p.rest ? (
            <Badge variant="muted">Rest between sets {prescStr(p.rest)}</Badge>
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

// ── PR Entry Modal ─────────────────────────────────────────────────────────

function PrEntryModal({
  visible,
  exerciseName,
  saving,
  onSave,
  onSkip,
  unit,
}: {
  visible: boolean;
  exerciseName: string;
  saving: boolean;
  onSave: (weight: number, reps: number) => void;
  onSkip: () => void;
  unit?: WeightUnit;
}) {
  const theme = useTheme();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('1');

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.colors.input,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    fontSize: 16,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.background,
    marginTop: theme.spacing[1],
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
      >
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radii.xl,
            padding: theme.spacing[5],
            gap: theme.spacing[4],
          }}
        >
          <View style={{ gap: theme.spacing[1] }}>
            <Text variant="h3">Record your PR</Text>
            <Text variant="body" color="mutedForeground">
              {exerciseName} is a PR-based exercise. Enter your personal record so we can calculate workout weights.
            </Text>
          </View>

          <View style={{ gap: theme.spacing[3] }}>
            <View>
              <Text variant="captionMedium" color="mutedForeground">Max weight ({unit ?? 'kg'})</Text>
              <TextInput
                style={inputStyle}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="e.g. 120"
                placeholderTextColor={theme.colors.mutedForeground}
                autoFocus
              />
            </View>
            <View>
              <Text variant="captionMedium" color="mutedForeground">For how many reps? (default: 1)</Text>
              <TextInput
                style={inputStyle}
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={theme.colors.mutedForeground}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            <Button onPress={onSkip} variant="outline" disabled={saving} style={{ flex: 1 }}>
              Skip for now
            </Button>
            <Button
              onPress={() => {
                const w = parseFloat(weight);
                const r = parseInt(reps, 10) || 1;
                if (!isNaN(w) && w > 0) onSave(w, r);
              }}
              loading={saving}
              disabled={!weight.trim() || saving}
              style={{ flex: 2 }}
            >
              Save PR
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  onSubmit: (notes: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [notes, setNotes] = useState('');

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
              onPress={() => onSubmit(notes)}
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
  const { data: personalRecords } = usePersonalRecords();
  const upsertPr = useUpsertPersonalRecord();
  const traineeUnit = useAuthStore((s): WeightUnit => s.user?.weightUnit ?? 'kg');

  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [videoForIndex, setVideoForIndex] = useState<number | null>(null);
  const [prPromptQueue, setPrPromptQueue] = useState<{ exerciseId: string; name: string }[]>([]);
  const [savingPr, setSavingPr] = useState(false);
  const { seconds, formatted } = useTimer(timerRunning);

  // Build PR lookup map by exerciseId
  const prMap = (personalRecords ?? []).reduce<Record<string, PersonalRecord>>(
    (acc, pr) => { acc[pr.exerciseId] = pr; return acc; },
    {},
  );

  useEffect(() => {
    if (instance?.template?.items && !initialized) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const built = buildInitialState(instance.template.items as any, prMap, traineeUnit);
      setExercises(built);
      setInitialized(true);
      // Queue any exercises that need PR entry
      const needPr = built
        .filter((ex) => ex.needsPrEntry)
        .map((ex) => ({ exerciseId: ex.exerciseId, name: ex.name }));
      if (needPr.length > 0) setPrPromptQueue(needPr);
      // Timer does NOT auto-start; user must tap "Start" explicitly
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
                si !== setIndex
                  ? s
                  : {
                      ...s,
                      ...updated,
                      restSeconds:
                        updated.completed && !s.restSeconds
                          ? String(parseSeconds(ex.prescription.rest))
                          : s.restSeconds,
                    },
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
                  restSeconds: '',
                  completed: false,
                },
              ],
            },
      ),
    );
  };

  const handleSubmit = async (notes: string) => {
    setTimerRunning(false);

    const items: LogItem[] = exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s, si) => ({
        setIndex: si,
        reps: s.reps ? Number(s.reps) : undefined,
        weight: s.weight ? Number(s.weight) : undefined,
        duration: s.duration ? Number(s.duration) : undefined,
        restSeconds: s.restSeconds ? Number(s.restSeconds) : undefined,
        completed: s.completed,
      })) as LogSet[],
    }));

    try {
      const result = await submitLog.mutateAsync({
        durationMinutes: Math.round(seconds / 60),
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
      <Screen edges={['top', 'bottom']}>
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
    <Screen edges={['top', 'bottom']}>
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
          {timerRunning || seconds > 0 ? (
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
          ) : (
            <Pressable
              onPress={() => setTimerRunning(true)}
              accessibilityRole="button"
              accessibilityLabel="Start workout timer"
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: theme.spacing[0.5],
              })}
            >
              <Icon icon={Play} size={12} color="primary" accessible={false} />
              <Text variant="caption" color="primary" weight="600">
                Start timer
              </Text>
            </Pressable>
          )}
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
              weightUnit={traineeUnit}
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

      {/* PR entry modal — shown for each exercise needing a PR */}
      <PrEntryModal
        visible={prPromptQueue.length > 0}
        exerciseName={prPromptQueue[0]?.name ?? ''}
        saving={savingPr}
        unit={traineeUnit}
        onSave={async (weight, reps) => {
          const current = prPromptQueue[0];
          if (!current) return;
          setSavingPr(true);
          try {
            await upsertPr.mutateAsync({
              exerciseId: current.exerciseId,
              exerciseName: current.name,
              weight,
              reps,
              unit: traineeUnit,
            });
            // Recalculate weight for this exercise in state
            setExercises((prev) =>
              prev.map((ex) => {
                if (ex.exerciseId !== current.exerciseId) return ex;
                const rawWeight = ex.prescription?.weight;
                if (typeof rawWeight === 'string' && rawWeight.trim().endsWith('%')) {
                  const pct = parseFloat(rawWeight) / 100;
                  const calculated = String(Math.round(weight * pct * 10) / 10);
                  return {
                    ...ex,
                    needsPrEntry: false,
                    sets: ex.sets.map((s) => ({ ...s, weight: calculated })),
                  };
                }
                return { ...ex, needsPrEntry: false };
              }),
            );
          } finally {
            setSavingPr(false);
            setPrPromptQueue((q) => q.slice(1));
          }
        }}
        onSkip={() => {
          // Mark this exercise as no longer needing PR entry (user will enter weight manually)
          const current = prPromptQueue[0];
          if (current) {
            setExercises((prev) =>
              prev.map((ex) =>
                ex.exerciseId === current.exerciseId ? { ...ex, needsPrEntry: false } : ex,
              ),
            );
          }
          setPrPromptQueue((q) => q.slice(1));
        }}
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
