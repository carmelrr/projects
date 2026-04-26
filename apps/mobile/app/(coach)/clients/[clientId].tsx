import { ScrollView, View, Pressable } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Calendar,
  ClipboardList,
  MessageSquare,
  TrendingUp,
} from 'lucide-react-native';
import { useClient, useClientPrograms } from '@/hooks/useClients';
import { useTheme, withAlpha } from '@/lib/theme';
import { Screen, Text, Card, Badge, Avatar, Button, Skeleton } from '@/components/ui';

function complianceColor(pct: number, theme: ReturnType<typeof useTheme>) {
  if (pct >= 80) return theme.colors.success;
  if (pct >= 50) return theme.colors.warning;
  return theme.colors.destructive;
}

export default function CoachClientDetail() {
  const theme = useTheme();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { data: client, isLoading } = useClient(clientId ?? '');
  const { data: programs } = useClientPrograms(client?.user.id ?? '');

  const sevenDay = client?.complianceSummaries?.find((s) => s.period === 'SEVEN_DAY');
  const thirtyDay = client?.complianceSummaries?.find(
    (s) => s.period === 'THIRTY_DAY',
  );

  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ padding: theme.spacing[2] }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={theme.colors.foreground} />
        </Pressable>
        <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          {client ? `${client.user.firstName} ${client.user.lastName}` : 'Client'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[5], gap: theme.spacing[4] }}
      >
        {isLoading || !client ? (
          <>
            <Skeleton style={{ height: 96, borderRadius: theme.radii.xl }} />
            <Skeleton style={{ height: 96, borderRadius: theme.radii.xl }} />
            <Skeleton style={{ height: 200, borderRadius: theme.radii.xl }} />
          </>
        ) : (
          <>
            {/* Header card */}
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing[3],
                }}
              >
                <Avatar
                  initials={`${client.user.firstName[0] ?? ''}${client.user.lastName[0] ?? ''}`}
                  size="lg"
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h2">
                    {client.user.firstName} {client.user.lastName}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <Mail size={12} color={theme.colors.mutedForeground} />
                    <Text
                      variant="caption"
                      color="mutedForeground"
                      numberOfLines={1}
                    >
                      {client.user.email}
                    </Text>
                  </View>
                </View>
                <Badge
                  variant={
                    client.status === 'ACTIVE'
                      ? 'success'
                      : client.status === 'PAUSED'
                        ? 'warning'
                        : 'muted'
                  }
                >
                  {client.status.toLowerCase()}
                </Badge>
              </View>
            </Card>

            {/* Compliance */}
            <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
              <Card style={{ flex: 1 }}>
                <Text variant="caption" color="mutedForeground">
                  7-day compliance
                </Text>
                <Text
                  variant="display"
                  style={{
                    color: sevenDay
                      ? complianceColor(
                          Math.round(sevenDay.complianceRate * 100),
                          theme,
                        )
                      : theme.colors.foreground,
                    marginTop: 4,
                  }}
                >
                  {sevenDay
                    ? `${Math.round(sevenDay.complianceRate * 100)}%`
                    : '—'}
                </Text>
                <Text variant="caption" color="mutedForeground">
                  {sevenDay
                    ? `${sevenDay.totalCompleted} / ${sevenDay.totalScheduled} done`
                    : 'No data'}
                </Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text variant="caption" color="mutedForeground">
                  30-day compliance
                </Text>
                <Text
                  variant="display"
                  style={{
                    color: thirtyDay
                      ? complianceColor(
                          Math.round(thirtyDay.complianceRate * 100),
                          theme,
                        )
                      : theme.colors.foreground,
                    marginTop: 4,
                  }}
                >
                  {thirtyDay
                    ? `${Math.round(thirtyDay.complianceRate * 100)}%`
                    : '—'}
                </Text>
                <Text variant="caption" color="mutedForeground">
                  {thirtyDay
                    ? `${thirtyDay.totalCompleted} / ${thirtyDay.totalScheduled} done`
                    : 'No data'}
                </Text>
              </Card>
            </View>

            {/* Quick actions */}
            <View style={{ gap: theme.spacing[2] }}>
              <Text variant="h3">Actions</Text>
              <Button
                variant="default"
                iconLeft={<ClipboardList size={16} color={theme.colors.primaryForeground} />}
                onPress={() =>
                  router.push({
                    pathname: '/(coach)/programs',
                    params: { assignToClientId: client.user.id },
                  })
                }
                fullWidth
              >
                Assign program
              </Button>
              <Button
                variant="outline"
                iconLeft={<MessageSquare size={16} color={theme.colors.foreground} />}
                onPress={() =>
                  router.push({
                    pathname: '/(coach)/messages',
                    params: { clientUserId: client.user.id },
                  })
                }
                fullWidth
              >
                Message
              </Button>
            </View>

            {/* Programs */}
            <View style={{ gap: theme.spacing[2] }}>
              <Text variant="h3">Active programs</Text>
              {!programs || programs.length === 0 ? (
                <Card tone="muted">
                  <Text variant="body" color="mutedForeground">
                    No programs assigned yet.
                  </Text>
                </Card>
              ) : (
                programs.map((p) => (
                  <Card key={p.id}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing[2],
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="bodyMedium" numberOfLines={1}>
                          {p.program?.title ?? 'Program'}
                        </Text>
                        <Text variant="caption" color="mutedForeground">
                          {p.startDate
                            ? `Started ${new Date(p.startDate).toLocaleDateString()}`
                            : 'Not started'}
                          {p.program?.weekCount
                            ? ` · ${p.program.weekCount} wk`
                            : ''}
                        </Text>
                      </View>
                      <Badge
                        variant={p.status === 'ACTIVE' ? 'success' : 'muted'}
                      >
                        {p.status.toLowerCase()}
                      </Badge>
                    </View>
                  </Card>
                ))
              )}
            </View>

            {client.clientProfile?.goals ? (
              <View style={{ gap: theme.spacing[2] }}>
                <Text variant="h3">Goals</Text>
                <Card>
                  <Text variant="body">{client.clientProfile.goals}</Text>
                </Card>
              </View>
            ) : null}
            {client.clientProfile?.medicalNotes ? (
              <View style={{ gap: theme.spacing[2] }}>
                <Text variant="h3">Medical notes</Text>
                <Card tone="warning">
                  <Text variant="body">
                    {client.clientProfile.medicalNotes}
                  </Text>
                </Card>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
