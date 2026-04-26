import { useState } from 'react';
import { View, FlatList, RefreshControl, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Search, ChevronRight, Filter } from 'lucide-react-native';
import { useClients, type Client } from '@/hooks/useClients';
import { useTheme, withAlpha } from '@/lib/theme';
import { Screen, Text, Card, Badge, Avatar, Input, Skeleton } from '@/components/ui';

const STATUS_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'ARCHIVED', label: 'Archived' },
];

function ClientRow({ client }: { client: Client }) {
  const theme = useTheme();
  const sevenDay = client.complianceSummaries?.find((s) => s.period === 'SEVEN_DAY');
  const pct = sevenDay ? Math.round(sevenDay.complianceRate * 100) : null;
  const needsAttention = sevenDay?.needsAttention ?? false;

  return (
    <Card onPress={() => router.push(`/(coach)/clients/${client.id}`)}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}
      >
        <Avatar
          initials={`${client.user.firstName[0] ?? ''}${client.user.lastName[0] ?? ''}`}
          size="md"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {client.user.firstName} {client.user.lastName}
          </Text>
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {client.user.email}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {pct !== null && (
            <Text
              variant="caption"
              style={{
                color:
                  pct >= 80
                    ? theme.colors.success
                    : pct >= 50
                      ? theme.colors.warning
                      : theme.colors.destructive,
                fontWeight: '700',
              }}
            >
              {pct}%
            </Text>
          )}
          {needsAttention && <Badge variant="warning">attention</Badge>}
        </View>
        <ChevronRight size={18} color={theme.colors.mutedForeground} />
      </View>
    </Card>
  );
}

export default function CoachClientsList() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ACTIVE');

  const { data, isLoading, refetch } = useClients({
    search: search.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
    limit: 100,
  });

  const items = data?.items ?? [];

  return (
    <Screen>
      <View style={{ padding: theme.spacing[5], gap: theme.spacing[3] }}>
        <Text variant="h1">Clients</Text>
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={theme.colors.mutedForeground} />}
        />
        <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setStatus(opt.key)}
                style={{
                  paddingHorizontal: theme.spacing[3],
                  paddingVertical: theme.spacing[1.5],
                  borderRadius: theme.radii.full,
                  backgroundColor: active
                    ? withAlpha(theme.colors.primary, 0.15)
                    : theme.colors.muted,
                  borderWidth: 1,
                  borderColor: active
                    ? withAlpha(theme.colors.primary, 0.4)
                    : theme.colors.border,
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: active
                      ? theme.colors.primary
                      : theme.colors.mutedForeground,
                    fontWeight: active ? '700' : '600',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ClientRow client={item} />}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing[5],
          paddingBottom: theme.spacing[8],
          gap: theme.spacing[2],
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[2] }}>
              <Skeleton style={{ height: 72, borderRadius: theme.radii.xl }} />
              <Skeleton style={{ height: 72, borderRadius: theme.radii.xl }} />
              <Skeleton style={{ height: 72, borderRadius: theme.radii.xl }} />
            </View>
          ) : (
            <Card tone="muted">
              <Text variant="body" color="mutedForeground">
                {search ? 'No clients match your search.' : 'No clients yet.'}
              </Text>
            </Card>
          )
        }
      />
    </Screen>
  );
}
