import { useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { BarChart3, ChevronRight } from 'lucide-react-native';
import { Sparkline } from '@/components/Sparkline';
import {
  useMetricDefinitions,
  useLatestMetrics,
  useLogMetric,
  type MetricDefinition,
  type MetricEntry,
} from '@/hooks/useMetrics';
import { useTheme, withAlpha } from '@/lib/theme';
import { Screen, Text, Card, Button, Icon, Input } from '@/components/ui';

// ── Log Modal ──────────────────────────────────────────────────────────────

function LogModal({
  definition,
  onClose,
}: {
  definition: MetricDefinition;
  onClose: () => void;
}) {
  const theme = useTheme();
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
        style={{
          flex: 1,
          backgroundColor: withAlpha(theme.colors.foreground, 0.35),
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
            gap: theme.spacing[5],
          }}
        >
          <Text variant="h2">Log {definition.name}</Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: theme.spacing[2],
            }}
          >
            <TextInput
              style={{
                fontSize: 48,
                fontWeight: '700',
                color: theme.colors.foreground,
                minWidth: 100,
                borderBottomWidth: 2,
                borderBottomColor: theme.colors.primary,
                paddingBottom: 4,
              }}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={withAlpha(theme.colors.mutedForeground, 0.6)}
              autoFocus
            />
            <Text variant="h3" color="mutedForeground">
              {definition.unit}
            </Text>
          </View>

          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any context…"
            multiline
            inputStyle={{
              minHeight: 72,
              textAlignVertical: 'top',
              paddingTop: theme.spacing[2],
            }}
          />

          <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            <Button onPress={onClose} variant="outline" style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              onPress={save}
              loading={logMetric.isPending}
              disabled={!value}
              style={{ flex: 1 }}
            >
              Save
            </Button>
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
  const theme = useTheme();

  return (
    <Card
      onPress={() => router.push(`/(client)/metric/${definition.id}`)}
      accessibilityLabel={`${definition.name} detail`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">{definition.name}</Text>
          {latest ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: theme.spacing[1],
                marginTop: theme.spacing[1],
                flexWrap: 'wrap',
              }}
            >
              <Text variant="h2" color="primary" tabular>
                {latest.value}
              </Text>
              <Text variant="captionMedium" color="mutedForeground">
                {definition.unit}
              </Text>
              <Text variant="caption" color="mutedForeground">
                · {new Date(latest.capturedAt).toLocaleDateString()}
              </Text>
            </View>
          ) : (
            <Text
              variant="caption"
              color="mutedForeground"
              style={{ marginTop: theme.spacing[0.5] }}
            >
              No entries yet
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[2.5],
          }}
        >
          <Sparkline metricId={definition.id} />
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onLog();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Log ${definition.name}`}
            style={({ pressed }) => ({
              backgroundColor: withAlpha(theme.colors.primary, 0.1),
              borderRadius: theme.radii.md,
              paddingHorizontal: theme.spacing[4],
              paddingVertical: theme.spacing[2],
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text variant="captionMedium" color="primary">
              Log
            </Text>
          </Pressable>
          <Icon icon={ChevronRight} size={16} color="mutedForeground" />
        </View>
      </View>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MetricsScreen() {
  const theme = useTheme();
  const { data: definitions, isLoading: loadingDefs } = useMetricDefinitions();
  const { data: latestEntries, isLoading: loadingLatest } = useLatestMetrics();
  const [logTarget, setLogTarget] = useState<MetricDefinition | null>(null);

  const isLoading = loadingDefs || loadingLatest;

  const latestMap = new Map<string, MetricEntry>();
  (latestEntries ?? []).forEach((e) => latestMap.set(e.metricId, e));

  const hasDefs = definitions && definitions.length > 0;

  return (
    <Screen edges={['top']}>
      <FlatList
        data={hasDefs ? definitions : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: theme.spacing[5],
          paddingBottom: theme.spacing[10],
        }}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.spacing[2.5] }} />
        )}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing[5] }}>
            <Text variant="eyebrow" color="mutedForeground">
              Your stats
            </Text>
            <Text variant="h1" style={{ marginTop: theme.spacing[1] }}>
              Metrics
            </Text>
            <Text
              variant="body"
              color="mutedForeground"
              style={{ marginTop: theme.spacing[1] }}
            >
              Track your progress over time
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View
              style={{
                paddingVertical: theme.spacing[16],
                alignItems: 'center',
              }}
            >
              <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
          ) : (
            <View
              style={{
                paddingVertical: theme.spacing[16],
                alignItems: 'center',
                gap: theme.spacing[3],
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: theme.radii.full,
                  backgroundColor: withAlpha(theme.colors.primary, 0.12),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon icon={BarChart3} size={28} color="primary" />
              </View>
              <Text variant="h2">No metrics configured</Text>
              <Text
                variant="body"
                color="mutedForeground"
                style={{
                  textAlign: 'center',
                  paddingHorizontal: theme.spacing[6],
                }}
              >
                Your coach hasn{"\u2019"}t set up any metrics yet.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <MetricRow
            definition={item}
            latest={latestMap.get(item.id)}
            onLog={() => setLogTarget(item)}
          />
        )}
      />

      {logTarget && (
        <LogModal definition={logTarget} onClose={() => setLogTarget(null)} />
      )}
    </Screen>
  );
}
