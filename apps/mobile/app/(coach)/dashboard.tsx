import { ScrollView, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Users, AlertTriangle, Activity, TrendingUp, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useClients } from '@/hooks/useClients';
import { useTheme } from '@/lib/theme';
import { Screen, Text, Card, Badge, Avatar, Skeleton } from '@/components/ui';

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${time}, ${name}` : time;
}

function StatTile({
  label,
  value,
  Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  tone?: 'default' | 'brand' | 'warning' | 'success';
}) {
  const theme = useTheme();
  const iconColor =
    tone === 'brand'
      ? theme.colors.primary
      : tone === 'warning'
        ? theme.colors.warning
        : tone === 'success'
          ? theme.colors.success
          : theme.colors.foreground;
  return (
    <Card style={{ flex: 1, minWidth: 150 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="caption" color="mutedForeground">
          {label}
        </Text>
        <Icon size={18} color={iconColor} strokeWidth={1.75} />
      </View>
      <Text variant="display" style={{ marginTop: theme.spacing[1.5] }}>
        {value}
      </Text>
    </Card>
  );
}

export default function CoachDashboard() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { data: active, isLoading, refetch } = useClients({
    status: 'ACTIVE',
    limit: 100,
  });
  const { data: attention } = useClients({ needsAttention: true, limit: 50 });

  const activeItems = active?.items ?? [];
  const totalActive = active?.total ?? 0;
  const needsAttention = attention?.items ?? [];

  const sevenDay = activeItems
    .flatMap((c) => (c.complianceSummaries ?? []).filter((s) => s.period === 'SEVEN_DAY'))
    .map((s) => s.complianceRate);
  const avg7 = sevenDay.length
    ? Math.round((sevenDay.reduce((a, b) => a + b, 0) / sevenDay.length) * 100)
    : null;

  const thirtyDay = activeItems
    .flatMap((c) => (c.complianceSummaries ?? []).filter((s) => s.period === 'THIRTY_DAY'))
    .map((s) => s.complianceRate);
  const avg30 = thirtyDay.length
    ? Math.round((thirtyDay.reduce((a, b) => a + b, 0) / thirtyDay.length) * 100)
    : null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[5], gap: theme.spacing[4] }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View>
          <Text variant="h1">{greeting(user?.firstName ?? '')}</Text>
          <Text variant="body" color="mutedForeground" style={{ marginTop: 4 }}>
            Here&apos;s your coaching overview.
          </Text>
        </View>

        {/* Stats grid */}
        <View
          style={{ flexDirection: 'row', gap: theme.spacing[3], flexWrap: 'wrap' }}
        >
          <StatTile
            label="Active clients"
            value={isLoading ? '—' : totalActive}
            Icon={Users}
            tone="brand"
          />
          <StatTile
            label="Needs attention"
            value={isLoading ? '—' : needsAttention.length}
            Icon={AlertTriangle}
            tone="warning"
          />
          <StatTile
            label="Avg compliance 7d"
            value={avg7 !== null ? `${avg7}%` : '—'}
            Icon={Activity}
            tone="success"
          />
          <StatTile
            label="Avg compliance 30d"
            value={avg30 !== null ? `${avg30}%` : '—'}
            Icon={TrendingUp}
          />
        </View>

        {/* Needs attention list */}
        <View style={{ gap: theme.spacing[2] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="h3">Needs attention</Text>
            {needsAttention.length > 0 && (
              <Badge variant="warning">{needsAttention.length}</Badge>
            )}
          </View>
          {isLoading ? (
            <>
              <Skeleton style={{ height: 64, borderRadius: theme.radii.xl }} />
              <Skeleton style={{ height: 64, borderRadius: theme.radii.xl }} />
            </>
          ) : needsAttention.length === 0 ? (
            <Card tone="muted">
              <Text variant="body" color="mutedForeground">
                All clients are on track. Great work!
              </Text>
            </Card>
          ) : (
            needsAttention.slice(0, 6).map((c) => {
              const sevenDay = c.complianceSummaries?.find(
                (s) => s.period === 'SEVEN_DAY',
              );
              const pct = sevenDay
                ? Math.round(sevenDay.complianceRate * 100)
                : null;
              return (
                <Card
                  key={c.id}
                  onPress={() => router.push(`/(coach)/clients/${c.id}`)}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing[3],
                    }}
                  >
                    <Avatar
                      initials={`${c.user.firstName[0] ?? ''}${c.user.lastName[0] ?? ''}`}
                      size="md"
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {c.user.firstName} {c.user.lastName}
                      </Text>
                      <Text variant="caption" color="mutedForeground">
                        {pct !== null ? `${pct}% last 7 days` : 'No recent data'}
                      </Text>
                    </View>
                    <ChevronRight
                      size={18}
                      color={theme.colors.mutedForeground}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
