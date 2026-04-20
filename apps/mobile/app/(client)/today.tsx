import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronRight, Clock, Gauge, PartyPopper } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useTodayWorkouts, type WorkoutInstance } from '@/hooks/useWorkouts';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useTheme, withAlpha } from '@/lib/theme';
import { Screen, Text, Card, Badge, ProgressBar, Icon, Skeleton } from '@/components/ui';
import type { BadgeVariant, CardTone } from '@/components/ui';

// ── Helpers ────────────────────────────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${time}, ${name}` : time;
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const STATUS_MAP: Record<
  WorkoutInstance['status'],
  { tone: CardTone; badge: BadgeVariant; label: string }
> = {
  SCHEDULED: { tone: 'brand', badge: 'default', label: 'Scheduled' },
  COMPLETED: { tone: 'success', badge: 'success', label: 'Completed' },
  SKIPPED: { tone: 'muted', badge: 'muted', label: 'Skipped' },
  MISSED: { tone: 'destructive', badge: 'destructive', label: 'Missed' },
};

// ── Workout Card ───────────────────────────────────────────────────────────

function WorkoutCard({ instance }: { instance: WorkoutInstance }) {
  const theme = useTheme();
  const cfg = STATUS_MAP[instance.status] ?? STATUS_MAP.SCHEDULED;
  const title = instance.template?.title ?? instance.title ?? 'Workout';
  const itemCount = instance.template?.items?.length ?? 0;
  const duration = instance.template?.estimatedDuration;
  const isActionable = instance.status === 'SCHEDULED';

  const handlePress = () => {
    if (isActionable) {
      router.push(`/(client)/log/${instance.id}`);
    }
  };

  return (
    <Card
      tone={cfg.tone}
      onPress={isActionable ? handlePress : undefined}
      disabled={!isActionable}
      accessibilityLabel={`${title} — ${cfg.label}`}
    >
      {/* Title row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}
      >
        <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Text>
        <Badge variant={cfg.badge}>{cfg.label}</Badge>
      </View>

      {/* Meta row */}
      {(itemCount > 0 || duration || instance.template?.type) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[2],
            marginTop: theme.spacing[1.5],
          }}
        >
          {itemCount > 0 && (
            <Text variant="caption" color="mutedForeground">
              {itemCount} exercise{itemCount !== 1 ? 's' : ''}
            </Text>
          )}
          {duration ? (
            <>
              <Dot />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color={theme.colors.mutedForeground} strokeWidth={1.75} />
                <Text variant="caption" color="mutedForeground">
                  {duration} min
                </Text>
              </View>
            </>
          ) : null}
          {instance.template?.type ? (
            <>
              <Dot />
              <Text variant="caption" color="mutedForeground">
                {instance.template.type}
              </Text>
            </>
          ) : null}
        </View>
      )}

      {/* Description */}
      {instance.template?.description ? (
        <Text
          variant="body"
          color="mutedForeground"
          numberOfLines={2}
          style={{ marginTop: theme.spacing[2] }}
        >
          {instance.template.description}
        </Text>
      ) : null}

      {/* Actionable footer */}
      {isActionable && (
        <View
          style={{
            marginTop: theme.spacing[3],
            paddingTop: theme.spacing[3],
            borderTopWidth: 1,
            borderTopColor: withAlpha(theme.colors.primary, 0.2),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text variant="bodyMedium" color="primary">
            Tap to start workout
          </Text>
          <Icon icon={ChevronRight} size={16} color="primary" />
        </View>
      )}

      {/* Completed footer */}
      {instance.status === 'COMPLETED' && instance.log && (
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing[3],
            marginTop: theme.spacing[2.5],
          }}
        >
          {instance.log.durationMinutes ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={12} color={theme.colors.success} strokeWidth={1.75} />
              <Text variant="caption" color="success">
                {instance.log.durationMinutes} min
              </Text>
            </View>
          ) : null}
          {instance.log.overallRpe ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Gauge size={12} color={theme.colors.success} strokeWidth={1.75} />
              <Text variant="caption" color="success">
                RPE {instance.log.overallRpe}/10
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Card>
  );
}

function Dot() {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: theme.colors.mutedForeground,
        opacity: 0.5,
      }}
    />
  );
}

// ── Header bell ────────────────────────────────────────────────────────────

function BellButton() {
  const theme = useTheme();
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <Pressable
      onPress={() => router.push('/(client)/notifications')}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${count} unread notifications` : 'Notifications'}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          ...theme.shadows.sm,
        },
        pressed ? { opacity: 0.75 } : null,
      ]}
    >
      <Bell size={18} color={theme.colors.foreground} strokeWidth={1.75} />
      {count > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            insetInlineEnd: -2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: theme.colors.destructive,
            paddingHorizontal: 4,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: theme.colors.background,
          }}
        >
          <Text
            variant="caption"
            color="inherit"
            style={{ color: theme.colors.destructiveForeground, fontSize: 10, fontWeight: '700', lineHeight: 12 }}
          >
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { data: instances, isLoading, refetch, isRefetching } = useTodayWorkouts();

  const today = formatDate(new Date().toISOString().split('T')[0]);
  const completed = (instances ?? []).filter((i) => i.status === 'COMPLETED').length;
  const total = (instances ?? []).length;

  return (
    <Screen edges={['top']}>
      <FlatList
        data={instances ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: theme.spacing[5],
          paddingBottom: theme.spacing[10],
        }}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing[3] }} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing[6] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: theme.spacing[3],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="eyebrow" color="mutedForeground">
                  {today}
                </Text>
                <Text variant="h1" style={{ marginTop: theme.spacing[1] }}>
                  {greeting(user?.firstName ?? '')}
                </Text>
              </View>
              <BellButton />
            </View>

            {!isLoading && total > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing[2.5],
                  marginTop: theme.spacing[4],
                }}
              >
                <ProgressBar
                  value={completed / total}
                  tone={completed === total ? 'success' : 'primary'}
                  style={{ flex: 1 }}
                />
                <Text variant="captionMedium" color="mutedForeground" tabular>
                  {completed}/{total} done
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[3], paddingTop: theme.spacing[2] }}>
              {[0, 1].map((i) => (
                <Card key={i}>
                  <View style={{ gap: theme.spacing[3] }}>
                    <Skeleton width="60%" height={18} />
                    <Skeleton width="40%" height={12} />
                    <Skeleton height={8} radius={theme.radii.full} />
                    <Skeleton width="100%" height={40} radius={theme.radii.md} />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState />
          )
        }
        renderItem={({ item }) => <WorkoutCard instance={item} />}
      />
    </Screen>
  );
}

function EmptyState() {
  const theme = useTheme();
  return (
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
          backgroundColor: withAlpha(theme.colors.primary, 0.1),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PartyPopper size={28} color={theme.colors.primary} strokeWidth={1.75} />
      </View>
      <Text variant="h2">Rest day!</Text>
      <Text variant="body" color="mutedForeground" style={{ textAlign: 'center' }}>
        No workouts scheduled for today.
      </Text>
    </View>
  );
}
