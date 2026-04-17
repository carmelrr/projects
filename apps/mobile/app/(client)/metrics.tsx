import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Sparkline } from '@/components/Sparkline';
import {
  useMetricDefinitions,
  useLatestMetrics,
  useLogMetric,
  type MetricDefinition,
  type MetricEntry,
} from '@/hooks/useMetrics';

// ── Log Modal ──────────────────────────────────────────────────────────────

function LogModal({
  definition,
  onClose,
}: {
  definition: MetricDefinition;
  onClose: () => void;
}) {
  const logMetric = useLogMetric();
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const save = async () => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      Alert.alert('Invalid value', 'Please enter a valid number.');
      return;
    }
    await logMetric.mutateAsync({
      metricId: definition.id,
      value: num,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Log {definition.name}</Text>

          <View style={styles.valueRow}>
            <TextInput
              style={styles.valueInput}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#d1d5db"
              autoFocus
            />
            <Text style={styles.unitLabel}>{definition.unit}</Text>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any context…"
              placeholderTextColor="#9ca3af"
              multiline
            />
          </View>

          <View style={styles.modalBtns}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={logMetric.isPending || !value}
              style={[styles.saveBtn, (!value || logMetric.isPending) && styles.saveBtnDisabled]}
            >
              {logMetric.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Metric Row ─────────────────────────────────────────────────────────────

function MetricRow({
  definition,
  latest,
  onLog,
}: {
  definition: MetricDefinition;
  latest?: MetricEntry;
  onLog: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.metricRow, pressed && styles.metricRowPressed]}
      onPress={() => router.push(`/(client)/metric/${definition.id}`)}
    >
      <View style={styles.metricInfo}>
        <Text style={styles.metricName}>{definition.name}</Text>
        {latest ? (
          <View style={styles.metricLatest}>
            <Text style={styles.metricValue}>{latest.value}</Text>
            <Text style={styles.metricUnit}>{definition.unit}</Text>
            <Text style={styles.metricDate}>
              · {new Date(latest.capturedAt).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.metricNoData}>No entries yet</Text>
        )}
      </View>

      <View style={styles.metricRight}>
        <Sparkline metricId={definition.id} />
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onLog();
          }}
          style={styles.logBtn}
        >
          <Text style={styles.logBtnText}>Log</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MetricsScreen() {
  const { data: definitions, isLoading: loadingDefs } = useMetricDefinitions();
  const { data: latestEntries, isLoading: loadingLatest } = useLatestMetrics();
  const [logTarget, setLogTarget] = useState<MetricDefinition | null>(null);

  const isLoading = loadingDefs || loadingLatest;

  // Build a map metricId → latest entry
  const latestMap = new Map<string, MetricEntry>();
  (latestEntries ?? []).forEach((e) => latestMap.set(e.metricId, e));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Metrics</Text>
        <Text style={styles.subtitle}>Track your progress over time</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : !definitions || definitions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No metrics configured</Text>
          <Text style={styles.emptySub}>
            Your coach hasn't set up any metrics yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={definitions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item }) => (
            <MetricRow
              definition={item}
              latest={latestMap.get(item.id)}
              onLog={() => setLogTarget(item)}
            />
          )}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}

      {logTarget && (
        <LogModal definition={logTarget} onClose={() => setLogTarget(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 },

  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricRowPressed: { backgroundColor: '#f9fafb' },
  metricRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricInfo: { flex: 1 },
  metricName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  metricLatest: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#2563eb' },
  metricUnit: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  metricDate: { fontSize: 12, color: '#9ca3af' },
  metricNoData: { fontSize: 13, color: '#9ca3af', marginTop: 2 },

  logBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logBtnText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  valueInput: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
    minWidth: 100,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 4,
  },
  unitLabel: { fontSize: 22, color: '#6b7280', fontWeight: '500' },
  fieldWrap: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  saveBtn: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
