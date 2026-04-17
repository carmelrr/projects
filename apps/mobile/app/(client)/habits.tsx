import { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useHabitDefinitions,
  useHabitLogs,
  useLogHabit,
  type HabitDefinition,
  type HabitLog,
} from '@/hooks/useHabits';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function HabitRow({
  def,
  log,
  onToggle,
  onIncrement,
  pending,
}: {
  def: HabitDefinition;
  log?: HabitLog;
  onToggle: () => void;
  onIncrement: () => void;
  pending: boolean;
}) {
  const value = log?.value ?? 0;
  const completed = log?.completed ?? false;
  const target = def.target ?? 1;

  const isSimple = target <= 1;

  return (
    <View style={[styles.habitRow, completed && styles.habitRowDone]}>
      <View style={styles.habitBody}>
        <Text style={[styles.habitName, completed && styles.habitNameDone]}>
          {def.name}
        </Text>
        {def.description ? (
          <Text style={styles.habitDesc} numberOfLines={2}>
            {def.description}
          </Text>
        ) : null}

        {!isSimple && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (value / target) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {value} / {target} {def.unit ?? ''}
            </Text>
          </View>
        )}
      </View>

      {isSimple ? (
        <Pressable
          onPress={onToggle}
          disabled={pending}
          style={[styles.check, completed && styles.checkDone]}
        >
          {pending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.checkMark, completed && styles.checkMarkDone]}>
              {completed ? '✓' : ''}
            </Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={onIncrement}
          disabled={pending}
          style={[styles.plusBtn, completed && styles.plusBtnDone]}
        >
          {pending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.plusText}>{completed ? '✓' : '+1'}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function HabitsScreen() {
  const date = useMemo(() => todayStr(), []);
  const { data: defs, isLoading: loadingDefs, refetch: refetchDefs } = useHabitDefinitions();
  const { data: logs, isLoading: loadingLogs, refetch: refetchLogs, isRefetching } =
    useHabitLogs(date);
  const logMutation = useLogHabit();

  const logMap = new Map<string, HabitLog>();
  (logs ?? []).forEach((l) => logMap.set(l.habitId, l));

  const completedCount = (defs ?? []).filter(
    (d) => logMap.get(d.id)?.completed,
  ).length;
  const totalCount = (defs ?? []).length;

  const handleToggle = (def: HabitDefinition) => {
    const log = logMap.get(def.id);
    const completed = !(log?.completed ?? false);
    logMutation.mutate({
      habitId: def.id,
      date,
      completed,
      value: completed ? def.target ?? 1 : 0,
    });
  };

  const handleIncrement = (def: HabitDefinition) => {
    const log = logMap.get(def.id);
    const currentValue = log?.value ?? 0;
    const next = currentValue + 1;
    const target = def.target ?? 1;
    logMutation.mutate({
      habitId: def.id,
      date,
      value: next,
      completed: next >= target,
    });
  };

  const isLoading = loadingDefs || loadingLogs;
  const pendingId =
    logMutation.isPending ? (logMutation.variables as any)?.habitId : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Habits</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        {totalCount > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryBar}>
              <View
                style={[
                  styles.summaryFill,
                  {
                    width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.summaryText}>
              {completedCount}/{totalCount} done
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : (
        <FlatList
          data={defs ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetchDefs();
                refetchLogs();
              }}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => (
            <HabitRow
              def={item}
              log={logMap.get(item.id)}
              onToggle={() => handleToggle(item)}
              onIncrement={() => handleIncrement(item)}
              pending={pendingId === item.id}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptySub}>
                Your coach can set up daily habits for you from the web app.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  summaryBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  summaryFill: { height: '100%', backgroundColor: '#16a34a', borderRadius: 3 },
  summaryText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 40 },

  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  habitRowDone: { backgroundColor: '#f0fdf4' },
  habitBody: { flex: 1 },
  habitName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  habitNameDone: { color: '#16a34a', textDecorationLine: 'line-through' },
  habitDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  progressWrap: { marginTop: 8, gap: 4 },
  progressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 3 },
  progressText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },

  check: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  checkMark: { color: 'transparent', fontSize: 16 },
  checkMarkDone: { color: '#fff', fontWeight: '700' },

  plusBtn: {
    minWidth: 48,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBtnDone: { backgroundColor: '#16a34a' },
  plusText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  empty: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 6 },
});
