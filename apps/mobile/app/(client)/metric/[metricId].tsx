import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  useMetricHistory,
  useMetricDefinitions,
  type MetricEntry,
} from '@/hooks/useMetrics';

const WINDOWS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function MetricChart({
  points,
  unit,
}: {
  points: MetricEntry[];
  unit: string;
}) {
  const screenW = Dimensions.get('window').width;
  const W = screenW - 48; // horizontal padding
  const H = 180;
  const PAD_X = 8;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 24;

  const sorted = points
    .slice()
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

  if (sorted.length === 0) {
    return (
      <View style={[styles.chartBox, { height: H, justifyContent: 'center' }]}>
        <Text style={styles.emptyChart}>No data yet</Text>
      </View>
    );
  }

  if (sorted.length === 1) {
    return (
      <View style={[styles.chartBox, { height: H }]}>
        <View style={styles.singleValueBox}>
          <Text style={styles.singleValue}>
            {sorted[0].value}
            <Text style={styles.singleUnit}> {unit}</Text>
          </Text>
          <Text style={styles.singleDate}>
            {new Date(sorted[0].capturedAt).toLocaleDateString()}
          </Text>
          <Text style={styles.singleHint}>
            Log more entries to see your trend.
          </Text>
        </View>
      </View>
    );
  }

  const vals = sorted.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const xs = sorted.map((_, i) => (i / (sorted.length - 1)) * (W - 2 * PAD_X) + PAD_X);
  const ys = sorted.map(
    (p) => H - PAD_BOTTOM - ((p.value - min) / range) * (H - PAD_TOP - PAD_BOTTOM),
  );

  const linePath = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${H - PAD_BOTTOM} L${xs[0].toFixed(1)},${H - PAD_BOTTOM} Z`;

  const first = vals[0];
  const last = vals[vals.length - 1];
  const delta = last - first;
  const trendColor = delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#6b7280';

  // Y-axis labels (min, mid, max)
  const mid = (min + max) / 2;

  return (
    <View style={styles.chartBox}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartValue}>
          {last}
          <Text style={styles.chartUnit}> {unit}</Text>
        </Text>
        <View style={styles.chartDelta}>
          <Text style={[styles.deltaValue, { color: trendColor }]}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(delta).toFixed(1)} {unit}
          </Text>
          <Text style={styles.deltaLabel}>
            vs {new Date(sorted[0].capturedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2563eb" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#2563eb" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <Line
            key={i}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
            y2={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
        ))}

        <Path d={areaPath} fill="url(#grad)" />
        <Path
          d={linePath}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* endpoint dots */}
        <Circle cx={xs[0]} cy={ys[0]} r={3} fill="#2563eb" />
        <Circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4} fill="#2563eb" />
      </Svg>

      <View style={styles.axisRow}>
        <Text style={styles.axisText}>
          {new Date(sorted[0].capturedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <Text style={styles.axisText}>
          Range {min.toFixed(1)} – {max.toFixed(1)}
        </Text>
        <Text style={styles.axisText}>
          {new Date(sorted[sorted.length - 1].capturedAt).toLocaleDateString(
            undefined,
            { month: 'short', day: 'numeric' },
          )}
        </Text>
      </View>
    </View>
  );
}

export default function MetricDetailScreen() {
  const { metricId } = useLocalSearchParams<{ metricId: string }>();
  const [windowDays, setWindowDays] = useState(30);

  const { data: defs } = useMetricDefinitions();
  const def = defs?.find((d) => d.id === metricId);
  const { data: history, isLoading } = useMetricHistory(metricId!, windowDays);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {def?.name ?? 'Metric'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.windowRow}>
          {WINDOWS.map((w) => (
            <Pressable
              key={w.days}
              style={[
                styles.windowBtn,
                windowDays === w.days && styles.windowBtnActive,
              ]}
              onPress={() => setWindowDays(w.days)}
            >
              <Text
                style={[
                  styles.windowText,
                  windowDays === w.days && styles.windowTextActive,
                ]}
              >
                {w.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#2563eb" size="large" />
          </View>
        ) : (
          <MetricChart points={history ?? []} unit={def?.unit ?? ''} />
        )}

        <Text style={styles.sectionTitle}>History</Text>
        {(history ?? []).length === 0 ? (
          <View style={styles.historyEmpty}>
            <Text style={styles.historyEmptyText}>No entries in this window.</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {(history ?? [])
              .slice()
              .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
              .map((h) => (
                <View key={h.id} style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyValue}>
                      {h.value}
                      <Text style={styles.historyUnit}> {def?.unit ?? ''}</Text>
                    </Text>
                    {h.notes ? (
                      <Text style={styles.historyNotes} numberOfLines={2}>
                        {h.notes}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.historyDate}>
                    {new Date(h.capturedAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { minWidth: 60 },
  backText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },

  content: { padding: 20, paddingBottom: 40 },
  center: { paddingVertical: 60, alignItems: 'center' },

  windowRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  windowBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  windowBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  windowText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  windowTextActive: { color: '#fff' },

  chartBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartValue: { fontSize: 32, fontWeight: '700', color: '#111827' },
  chartUnit: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  chartDelta: { alignItems: 'flex-end' },
  deltaValue: { fontSize: 13, fontWeight: '600' },
  deltaLabel: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  emptyChart: { color: '#9ca3af', textAlign: 'center' },

  singleValueBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  singleValue: { fontSize: 36, fontWeight: '700', color: '#111827' },
  singleUnit: { fontSize: 16, color: '#6b7280' },
  singleDate: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  singleHint: { fontSize: 12, color: '#9ca3af', marginTop: 12 },

  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisText: { fontSize: 10, color: '#9ca3af' },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 10,
  },
  historyList: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyValue: { fontSize: 17, fontWeight: '700', color: '#2563eb' },
  historyUnit: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  historyNotes: { fontSize: 12, color: '#6b7280', marginTop: 4, maxWidth: 220 },
  historyDate: { fontSize: 12, color: '#9ca3af' },
  historyEmpty: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  historyEmptyText: { color: '#9ca3af', fontSize: 14 },
});
