import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useWorkoutInstance, useSubmitLog, type LogItem, type LogSet } from '@/hooks/useWorkouts';

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
  sets: SetState[];
  prescription: Record<string, unknown>;
  coachNotes?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildInitialState(items: ReturnType<typeof useWorkoutInstance>['data'] extends { template?: infer T } ? (T extends { items?: infer I } ? I : never[]) : never[]): ExerciseState[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (items as any[] ?? []).map((item: any) => {
    const setCount = item.prescription?.sets ?? 3;
    const sets: SetState[] = Array.from({ length: setCount }, () => ({
      reps: item.prescription?.reps?.toString() ?? '',
      weight: item.prescription?.weight?.toString() ?? '',
      duration: item.prescription?.duration?.toString() ?? '',
      rpe: '',
      completed: false,
    }));
    return {
      exerciseId: item.exerciseId,
      name: item.exercise?.name ?? 'Exercise',
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
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
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
  const hasReps = !!prescription.reps;
  const hasWeight = !!prescription.weight;
  const hasDuration = !!prescription.duration;

  return (
    <View style={[styles.setRow, set.completed && styles.setRowCompleted]}>
      <Text style={styles.setIndex}>{setIndex + 1}</Text>

      {hasReps && (
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>Reps</Text>
          <TextInput
            style={[styles.setInput, set.completed && styles.setInputCompleted]}
            value={set.reps}
            onChangeText={(v) => onChange({ reps: v })}
            keyboardType="numeric"
            placeholder={prescription.reps?.toString() ?? '—'}
            placeholderTextColor="#d1d5db"
          />
        </View>
      )}

      {hasWeight && (
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>kg</Text>
          <TextInput
            style={[styles.setInput, set.completed && styles.setInputCompleted]}
            value={set.weight}
            onChangeText={(v) => onChange({ weight: v })}
            keyboardType="decimal-pad"
            placeholder={prescription.weight?.toString() ?? '—'}
            placeholderTextColor="#d1d5db"
          />
        </View>
      )}

      {hasDuration && (
        <View style={styles.setField}>
          <Text style={styles.setFieldLabel}>Time</Text>
          <TextInput
            style={[styles.setInput, set.completed && styles.setInputCompleted]}
            value={set.duration}
            onChangeText={(v) => onChange({ duration: v })}
            placeholder={prescription.duration?.toString() ?? '—'}
            placeholderTextColor="#d1d5db"
          />
        </View>
      )}

      <View style={styles.setField}>
        <Text style={styles.setFieldLabel}>RPE</Text>
        <TextInput
          style={[styles.setInput, set.completed && styles.setInputCompleted]}
          value={set.rpe}
          onChangeText={(v) => onChange({ rpe: v })}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor="#d1d5db"
        />
      </View>

      <Pressable
        onPress={() => onChange({ completed: !set.completed })}
        style={[styles.checkButton, set.completed && styles.checkButtonDone]}
      >
        <Text style={styles.checkIcon}>{set.completed ? '✓' : ''}</Text>
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
}: {
  exercise: ExerciseState;
  index: number;
  onUpdateSet: (exIndex: number, setIndex: number, updated: Partial<SetState>) => void;
  onAddSet: (exIndex: number) => void;
}) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;

  return (
    <View style={styles.exerciseBlock}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseIndexBadge}>
          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseTitleCol}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            {completedSets}/{exercise.sets.length} sets complete
          </Text>
        </View>
      </View>

      {exercise.coachNotes ? (
        <View style={styles.coachNote}>
          <Text style={styles.coachNoteLabel}>Coach note:</Text>
          <Text style={styles.coachNoteText}>{exercise.coachNotes}</Text>
        </View>
      ) : null}

      {/* Prescription summary */}
      {Object.keys(exercise.prescription).length > 0 && (
        <View style={styles.prescriptionRow}>
          {exercise.prescription.sets ? (
            <Text style={styles.prescTag}>{exercise.prescription.sets} sets</Text>
          ) : null}
          {exercise.prescription.reps ? (
            <Text style={styles.prescTag}>{exercise.prescription.reps} reps</Text>
          ) : null}
          {exercise.prescription.weight ? (
            <Text style={styles.prescTag}>{exercise.prescription.weight} kg</Text>
          ) : null}
          {exercise.prescription.duration ? (
            <Text style={styles.prescTag}>{exercise.prescription.duration}</Text>
          ) : null}
          {exercise.prescription.rpe ? (
            <Text style={styles.prescTag}>RPE {exercise.prescription.rpe}</Text>
          ) : null}
          {exercise.prescription.rest ? (
            <Text style={styles.prescTag}>Rest {exercise.prescription.rest}</Text>
          ) : null}
        </View>
      )}

      {/* Set header */}
      <View style={styles.setHeader}>
        <Text style={[styles.setHeaderLabel, { width: 24 }]}>#</Text>
        {!!exercise.prescription.reps && <Text style={[styles.setHeaderLabel, styles.setHeaderFlex]}>Reps</Text>}
        {!!exercise.prescription.weight && <Text style={[styles.setHeaderLabel, styles.setHeaderFlex]}>kg</Text>}
        {!!exercise.prescription.duration && <Text style={[styles.setHeaderLabel, styles.setHeaderFlex]}>Time</Text>}
        <Text style={[styles.setHeaderLabel, styles.setHeaderFlex]}>RPE</Text>
        <Text style={[styles.setHeaderLabel, { width: 36 }]}>✓</Text>
      </View>

      {exercise.sets.map((set, si) => (
        <SetRow
          key={si}
          setIndex={si}
          set={set}
          prescription={exercise.prescription}
          onChange={(updated) => onUpdateSet(index, si, updated)}
        />
      ))}

      <Pressable onPress={() => onAddSet(index)} style={styles.addSetBtn}>
        <Text style={styles.addSetText}>+ Add set</Text>
      </Pressable>
    </View>
  );
}

// ── Finish Modal ───────────────────────────────────────────────────────────

function FinishModal({
  visible,
  durationSeconds,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  durationSeconds: number;
  onSubmit: (notes: string, rpe: number | null) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [rpe, setRpe] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Finish Workout 🎉</Text>

          <View style={styles.modalDuration}>
            <Text style={styles.modalDurationLabel}>Duration</Text>
            <Text style={styles.modalDurationValue}>
              {Math.floor(durationSeconds / 60)} min
            </Text>
          </View>

          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Overall RPE (1–10)</Text>
            <TextInput
              style={styles.modalInput}
              value={rpe}
              onChangeText={setRpe}
              keyboardType="numeric"
              placeholder="How hard was it?"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="How did it feel? Any PRs?"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.modalButtons}>
            <Pressable onPress={onClose} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Back</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit(notes, rpe ? Number(rpe) : null)}
              style={styles.modalSubmitBtn}
            >
              <Text style={styles.modalSubmitText}>Save & Finish</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function WorkoutLogScreen() {
  const { instanceId } = useLocalSearchParams<{ instanceId: string }>();
  const { data: instance, isLoading } = useWorkoutInstance(instanceId);
  const submitLog = useSubmitLog(instanceId);

  const [exercises, setExercises] = useState<ExerciseState[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const { seconds, formatted } = useTimer(timerRunning);

  // Initialize exercise state when instance loads
  useEffect(() => {
    if (instance?.template?.items && !initialized) {
      setExercises(buildInitialState(instance.template.items as never));
      setInitialized(true);
      setTimerRunning(true);
    }
  }, [instance, initialized]);

  const updateSet = (exIndex: number, setIndex: number, updated: Partial<SetState>) => {
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
                  reps: ex.prescription.reps?.toString() ?? '',
                  weight: ex.prescription.weight?.toString() ?? '',
                  duration: ex.prescription.duration?.toString() ?? '',
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
      await submitLog.mutateAsync({
        durationMinutes: Math.round(seconds / 60),
        overallRpe: overallRpe ?? undefined,
        notes: notes || undefined,
        items,
      });
      router.replace('/(client)/today');
    } catch {
      Alert.alert('Error', 'Could not save your workout. Please try again.');
    }
  };

  if (isLoading || !initialized) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const title = instance?.template?.title ?? instance?.title ?? 'Workout';
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => {
          Alert.alert('Leave workout?', 'Progress will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => router.back() },
          ]);
        }}>
          <Text style={styles.backBtn}>✕</Text>
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.topTimer}>{formatted}</Text>
        </View>

        <Pressable onPress={() => setShowFinish(true)} style={styles.finishBtn}>
          <Text style={styles.finishBtnText}>Finish</Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarOuter}>
        <View
          style={[
            styles.progressBarInner,
            { width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' },
          ]}
        />
      </View>

      {/* Exercise list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Text style={styles.emptyText}>No exercises in this workout.</Text>
          </View>
        ) : (
          exercises.map((ex, i) => (
            <ExerciseBlock
              key={ex.exerciseId + i}
              exercise={ex}
              index={i}
              onUpdateSet={updateSet}
              onAddSet={addSet}
            />
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Finish modal */}
      <FinishModal
        visible={showFinish}
        durationSeconds={seconds}
        onSubmit={handleSubmit}
        onClose={() => setShowFinish(false)}
      />

      {/* Submitting overlay */}
      {submitLog.isPending && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.submittingText}>Saving…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  backBtn: { fontSize: 18, color: '#6b7280', paddingHorizontal: 4 },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  topTimer: { fontSize: 13, color: '#2563eb', fontWeight: '600', marginTop: 1 },
  finishBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  progressBarOuter: { height: 3, backgroundColor: '#e5e7eb' },
  progressBarInner: { height: '100%', backgroundColor: '#2563eb' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  exerciseBlock: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  exerciseIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIndexText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  exerciseTitleCol: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  exerciseMeta: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

  coachNote: {
    backgroundColor: '#fefce8',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 4,
  },
  coachNoteLabel: { fontSize: 12, fontWeight: '600', color: '#ca8a04' },
  coachNoteText: { flex: 1, fontSize: 12, color: '#854d0e', lineHeight: 16 },

  prescriptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  prescTag: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '500',
  },

  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 4,
    gap: 6,
  },
  setHeaderLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textAlign: 'center' },
  setHeaderFlex: { flex: 1, textAlign: 'center' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    borderRadius: 8,
    paddingHorizontal: 2,
  },
  setRowCompleted: { backgroundColor: '#f0fdf4' },
  setIndex: { width: 24, fontSize: 13, fontWeight: '600', color: '#6b7280', textAlign: 'center' },
  setField: { flex: 1, alignItems: 'center' },
  setFieldLabel: { fontSize: 10, color: '#d1d5db', marginBottom: 2 },
  setInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
    width: '100%',
    backgroundColor: '#fff',
  },
  setInputCompleted: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  checkIcon: { color: '#fff', fontWeight: '700', fontSize: 15 },

  addSetBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  addSetText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },

  bottomSpacer: { height: 40 },
  emptyCenter: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 15 },

  // Finish modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalDuration: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  modalDurationLabel: { fontSize: 14, color: '#6b7280' },
  modalDurationValue: { fontSize: 22, fontWeight: '700', color: '#2563eb' },
  modalField: { marginBottom: 14 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
  },
  modalTextarea: { height: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Submitting overlay
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submittingText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
