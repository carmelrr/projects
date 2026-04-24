import { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { Screen, Card, Text, Icon, Skeleton } from '@/components/ui';
import { useTheme, withAlpha } from '@/lib/theme';
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
  const theme = useTheme();
  const screenW = Dimensions.get('window').width;
  const W = screenW - 48;
  const H = 180;
  const PAD_X = 8;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 24;

  const sorted = points
    .slice()
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

  if (sorted.length === 0) {
    return (
      <Card style={{ height: H, justifyContent: 'center' }}>
        <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
          No data yet
        </Text>
      </Card>
    );
  }

  if (sorted.length === 1) {
    const p0 = sorted[0];
    return (
      <Card style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="h1" weight="700">
          {p0.value}
          <Text variant="bodyLg" color="mutedForeground" weight="500">
            {' '}
            {unit}
          </Text>
        </Text>
        <Text variant="body" color="mutedForeground" style={{ marginTop: 4 }}>
          {new Date(p0.capturedAt).toLocaleDateString()}
        </Text>
        <Text
          variant="caption"
          color="mutedForeground"
          style={{ marginTop: theme.spacing[3] }}
        >
          Log more entries to see your trend.
        </Text>
      </Card>
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
  const trendColor =
    delta > 0 ? theme.colors.success : delta < 0 ? theme.colors.destructive : theme.colors.mutedForeground;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  const primary = theme.colors.primary;

  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: theme.spacing[3],
        }}
      >
        <Text variant="display" weight="700">
          {last}
          <Text variant="bodyLg" color="mutedForeground" weight="500">
            {' '}
            {unit}
          </Text>
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <TrendIcon size={14} color={trendColor} strokeWidth={2.25} />
            <Text
              variant="caption"
              weight="600"
              style={{ color: trendColor }}
            >
              {Math.abs(delta).toFixed(1)} {unit}
            </Text>
          </View>
          <Text
            variant="caption"
            color="mutedForeground"
            style={{ fontSize: 11, marginTop: 1 }}
          >
            vs {new Date(sorted[0].capturedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={primary} stopOpacity={0.22} />
            <Stop offset="1" stopColor={primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {[0.25, 0.5, 0.75].map((f, i) => (
          <Line
            key={i}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
            y2={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
            stroke={theme.colors.border}
            strokeWidth={1}
          />
        ))}

        <Path d={areaPath} fill="url(#grad)" />
        <Path
          d={linePath}
          fill="none"
          stroke={primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Circle cx={xs[0]} cy={ys[0]} r={3} fill={primary} />
        <Circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4} fill={primary} />
      </Svg>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 6,
        }}
      >
        <Text variant="caption" color="mutedForeground" style={{ fontSize: 10 }}>
          {new Date(sorted[0].capturedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <Text variant="caption" color="mutedForeground" style={{ fontSize: 10 }}>
          Range {min.toFixed(1)} – {max.toFixed(1)}
        </Text>
        <Text variant="caption" color="mutedForeground" style={{ fontSize: 10 }}>
          {new Date(sorted[sorted.length - 1].capturedAt).toLocaleDateString(
            undefined,
            { month: 'short', day: 'numeric' },
          )}
        </Text>
      </View>
    </Card>
  );
}

export default function MetricDetailScreen() {
  const theme = useTheme();
  const { metricId } = useLocalSearchParams<{ metricId: string }>();
  const [windowDays, setWindowDays] = useState(30);

  const { data: defs } = useMetricDefinitions();
  const def = defs?.find((d) => d.id === metricId);
  const { data: history, isLoading } = useMetricHistory(metricId!, windowDays);

  return (
    <Screen edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{ minWidth: 60, flexDirection: 'row', alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon icon={ChevronLeft} size={18} color="primary" />
          <Text variant="body" color="primary" weight="500">
            Back
          </Text>
        </Pressable>
        <Text
          variant="body"
          weight="700"
          style={{ flex: 1, textAlign: 'center' }}
          numberOfLines={1}
        >
          {def?.name ?? 'Metric'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[5], paddingBottom: 40 }}
      >
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing[2],
            marginBottom: theme.spacing[4],
          }}
        >
          {WINDOWS.map((w) => {
            const active = windowDays === w.days;
            return (
              <Pressable
                key={w.days}
                onPress={() => setWindowDays(w.days)}
                accessibilityRole="button"
                style={{
                  paddingVertical: theme.spacing[2],
                  paddingHorizontal: theme.spacing[4],
                  borderRadius: 20,
                  backgroundColor: active ? theme.colors.primary : theme.colors.card,
                  borderWidth: 1,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                }}
              >
                <Text
                  variant="caption"
                  weight="600"
                  color={active ? 'primaryForeground' : 'foreground'}
                >
                  {w.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: theme.spacing[4], gap: theme.spacing[2] }}>
            <Skeleton height={160} radius={theme.radii.md} />
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <Skeleton height={14} width="28%" />
              <Skeleton height={14} width="28%" />
              <Skeleton height={14} width="28%" />
            </View>
          </View>
        ) : (
          <MetricChart points={history ?? []} unit={def?.unit ?? ''} />
        )}

        <Text
          variant="bodyMedium"
          weight="700"
          style={{
            marginTop: theme.spacing[6],
            marginBottom: theme.spacing[2.5],
          }}
        >
          History
        </Text>
        {(history ?? []).length === 0 ? (
          <Card style={{ alignItems: 'center', padding: theme.spacing[6] }}>
            <Text variant="body" color="mutedForeground">
              No entries in this window.
            </Text>
          </Card>
        ) : (
          <Card style={{ overflow: 'hidden', padding: 0 }}>
            {(history ?? [])
              .slice()
              .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
              .map((h, idx, arr) => (
                <View
                  key={h.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: theme.spacing[4],
                    borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <View style={{ flex: 1, marginEnd: theme.spacing[3] }}>
                    <Text variant="bodyLg" weight="700" color="primary">
                      {h.value}
                      <Text
                        variant="caption"
                        color="mutedForeground"
                        weight="500"
                      >
                        {' '}
                        {def?.unit ?? ''}
                      </Text>
                    </Text>
                    {h.notes ? (
                      <Text
                        variant="caption"
                        color="mutedForeground"
                        numberOfLines={2}
                        style={{ marginTop: 4, maxWidth: 220 }}
                      >
                        {h.notes}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    variant="caption"
                    color="mutedForeground"
                    style={{ backgroundColor: withAlpha(theme.colors.muted, 0) }}
                  >
                    {new Date(h.capturedAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
