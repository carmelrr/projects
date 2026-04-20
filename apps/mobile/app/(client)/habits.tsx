import { useMemo } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Check, Leaf } from 'lucide-react-native';
import {
  useHabitDefinitions,
  useHabitLogs,
  useLogHabit,
  type HabitDefinition,
  type HabitLog,
} from '@/hooks/useHabits';
import { useTheme, withAlpha } from '@/lib/theme';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  ProgressBar,
  Icon,
} from '@/components/ui';

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
  const theme = useTheme();
  const value = log?.value ?? 0;
  const completed = log?.completed ?? false;
  const target = def.target ?? 1;
  const isSimple = target <= 1;

  return (
    <Card tone={completed ? 'success' : 'default'}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            variant="bodyMedium"
            color={completed ? 'success' : 'foreground'}
            style={
              completed ? { textDecorationLine: 'line-through' } : undefined
            }
          >
            {def.name}
          </Text>
          {def.description ? (
            <Text
              variant="caption"
              color="mutedForeground"
              numberOfLines={2}
              style={{ marginTop: theme.spacing[0.5] }}
            >
              {def.description}
            </Text>
          ) : null}

          {!isSimple && (
            <View
              style={{
                marginTop: theme.spacing[2],
                gap: theme.spacing[1],
              }}
            >
              <ProgressBar
                value={value / target}
                tone={completed ? 'success' : 'primary'}
                height={5}
              />
              <Text variant="caption" color="mutedForeground" tabular>
                {value} / {target} {def.unit ?? ''}
              </Text>
            </View>
          )}
        </View>

        {isSimple ? (
          <Button
            onPress={onToggle}
            loading={pending}
            size="icon"
            variant={completed ? 'default' : 'outline'}
            style={{
              borderRadius: theme.radii.full,
              ...(completed
                ? {
                    backgroundColor: theme.colors.success,
                    borderColor: theme.colors.success,
                  }
                : null),
            }}
            accessibilityLabel={
              completed ? 'Mark habit incomplete' : 'Mark habit complete'
            }
            iconLeft={
              completed ? (
                <Icon
                  icon={Check}
                  size={18}
                  color={theme.colors.primaryForeground}
                />
              ) : null
            }
          />
        ) : (
          <Button
            onPress={onIncrement}
            loading={pending}
            size="sm"
            variant="default"
            style={{
              minWidth: 56,
              borderRadius: theme.radii.full,
              ...(completed
                ? { backgroundColor: theme.colors.success }
                : null),
            }}
          >
            {completed ? '✓' : '+1'}
          </Button>
        )}
      </View>
    </Card>
  );
}

export default function HabitsScreen() {
  const theme = useTheme();
  const date = useMemo(() => todayStr(), []);
  const { data: defs, isLoading: loadingDefs, refetch: refetchDefs } =
    useHabitDefinitions();
  const {
    data: logs,
    isLoading: loadingLogs,
    refetch: refetchLogs,
    isRefetching,
  } = useHabitLogs(date);
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
  const pendingId = logMutation.isPending
    ? (logMutation.variables as { habitId?: string } | undefined)?.habitId ??
      null
    : null;

  const subtitle = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Screen edges={['top']}>
      <FlatList
        data={defs ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{
          padding: theme.spacing[5],
          paddingBottom: theme.spacing[10],
        }}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.spacing[2.5] }} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchDefs();
              refetchLogs();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing[5] }}>
            <Text variant="eyebrow" color="mutedForeground">
              {subtitle}
            </Text>
            <Text variant="h1" style={{ marginTop: theme.spacing[1] }}>
              Habits
            </Text>
            {totalCount > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing[2.5],
                  marginTop: theme.spacing[4],
                }}
              >
                <ProgressBar
                  value={completedCount / totalCount}
                  tone={
                    completedCount === totalCount ? 'success' : 'primary'
                  }
                  style={{ flex: 1 }}
                />
                <Badge
                  variant={
                    completedCount === totalCount ? 'success' : 'muted'
                  }
                >
                  {completedCount}/{totalCount} done
                </Badge>
              </View>
            )}
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
                  backgroundColor: withAlpha(theme.colors.success, 0.12),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon icon={Leaf} size={28} color="success" />
              </View>
              <Text variant="h2">No habits yet</Text>
              <Text
                variant="body"
                color="mutedForeground"
                style={{
                  textAlign: 'center',
                  paddingHorizontal: theme.spacing[6],
                }}
              >
                Your coach can set up daily habits for you from the web app.
              </Text>
            </View>
          )
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
      />
    </Screen>
  );
}
