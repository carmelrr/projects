import {
  View,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Plus } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import {
  useThreads,
  useCreateDirectThread,
  type Thread,
} from '@/hooks/useMessaging';
import { useMyCoach } from '@/hooks/useCoaches';
import { useTheme, withAlpha } from '@/lib/theme';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Avatar,
  Icon,
  Skeleton,
} from '@/components/ui';

function relativeTime(iso?: string) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function initials(first = '', last = '') {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';
}

function ThreadRow({
  thread,
  currentUserId,
}: {
  thread: Thread;
  currentUserId: string;
}) {
  const theme = useTheme();
  const other = thread.participants.find((p) => p.userId !== currentUserId);
  const name = other?.user
    ? `${other.user.firstName} ${other.user.lastName}`
    : thread.title ?? 'Conversation';
  const unread = thread.unreadCount ?? 0;

  return (
    <Card
      onPress={() => router.push(`/(client)/messages/${thread.id}`)}
      accessibilityLabel={`${name}${unread > 0 ? `, ${unread} unread` : ''}`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <Avatar
          initials={
            other?.user
              ? initials(other.user.firstName, other.user.lastName)
              : '?'
          }
          size="lg"
        />
        <View style={{ flex: 1, gap: theme.spacing[1] }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
              {name}
            </Text>
            {thread.lastMessageAt ? (
              <Text variant="caption" color="mutedForeground">
                {relativeTime(thread.lastMessageAt)}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Text
              variant="caption"
              color={unread > 0 ? 'foreground' : 'mutedForeground'}
              style={{ flex: 1 }}
              numberOfLines={1}
              weight={unread > 0 ? '600' : '400'}
            >
              {thread.lastMessagePreview ?? 'No messages yet'}
            </Text>
            {unread > 0 ? (
              <Badge variant="default">
                {unread > 99 ? '99+' : String(unread)}
              </Badge>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function MessagesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { data: threads, isLoading, refetch, isRefetching } = useThreads();
  const { data: myCoach, isLoading: isCoachLoading } = useMyCoach();
  const createDirect = useCreateDirectThread();

  const startConversation = async (coachUserId: string) => {
    try {
      const thread = await createDirect.mutateAsync(coachUserId);
      router.push(`/(client)/messages/${thread.id}`);
    } catch {
      // Thread may already exist; threads will refetch
    }
  };

  return (
    <Screen edges={['top']}>
      <FlatList
        data={threads ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{
          padding: theme.spacing[5],
          paddingBottom: Math.max(theme.spacing[10], 76 + insets.bottom + theme.spacing[4]),
        }}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.spacing[2.5] }} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: theme.spacing[4], marginBottom: theme.spacing[5] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: theme.spacing[3],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="eyebrow" color="mutedForeground">
                  Inbox
                </Text>
                <Text variant="h1" style={{ marginTop: theme.spacing[1] }}>
                  Messages
                </Text>
              </View>
              <Button
                onPress={() => myCoach && startConversation(myCoach.userId)}
                size="sm"
                disabled={!myCoach || createDirect.isPending}
                loading={createDirect.isPending}
                iconLeft={
                  !createDirect.isPending ? (
                    <Icon
                      icon={Plus}
                      size={16}
                      color={theme.colors.primaryForeground}
                    />
                  ) : null
                }
              >
                New
              </Button>
            </View>
            {myCoach ? (
              <Card>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[3],
                  }}
                >
                  <Avatar initials={initials(myCoach.firstName, myCoach.lastName)} size="md" />
                  <View style={{ flex: 1, gap: theme.spacing[0.5] }}>
                    <Text variant="caption" color="mutedForeground">
                      Your coach
                    </Text>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {myCoach.firstName} {myCoach.lastName}
                    </Text>
                  </View>
                  <Button
                    size="sm"
                    onPress={() => startConversation(myCoach.userId)}
                    loading={createDirect.isPending}
                    iconLeft={
                      !createDirect.isPending ? (
                        <Icon icon={MessageSquare} size={14} color={theme.colors.primaryForeground} />
                      ) : null
                    }
                  >
                    Message
                  </Button>
                </View>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[2], paddingTop: theme.spacing[2] }}>
              {[0, 1, 2, 3].map((i) => (
                <Card key={i}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing[3],
                    }}
                  >
                    <Skeleton width={40} height={40} radius={theme.radii.full} />
                    <View style={{ flex: 1, gap: theme.spacing[1.5] }}>
                      <Skeleton width="55%" height={14} />
                      <Skeleton width="85%" height={12} />
                    </View>
                  </View>
                </Card>
              ))}
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
                  backgroundColor: withAlpha(theme.colors.primary, 0.1),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon icon={MessageSquare} size={28} color="primary" />
              </View>
              <Text variant="h2">No conversations yet</Text>
              {myCoach ? (
                <View style={{ alignItems: 'center', gap: theme.spacing[2] }}>
                  <Text
                    variant="body"
                    color="mutedForeground"
                    style={{ textAlign: 'center', paddingHorizontal: theme.spacing[6] }}
                  >
                    Start a conversation with your coach.
                  </Text>
                  <Button
                    size="sm"
                    onPress={() => startConversation(myCoach.userId)}
                    loading={createDirect.isPending}
                    iconLeft={<Icon icon={MessageSquare} size={14} color={theme.colors.primaryForeground} />}
                  >
                    Message {myCoach.firstName}
                  </Button>
                </View>
              ) : (
                <Text
                  variant="body"
                  color="mutedForeground"
                  style={{
                    textAlign: 'center',
                    paddingHorizontal: theme.spacing[6],
                  }}
                >
                  {isCoachLoading
                    ? 'Looking up your coach...'
                    : 'No coach is assigned yet.'}
                </Text>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <ThreadRow thread={item} currentUserId={user?.id ?? ''} />
        )}
      />

    </Screen>
  );
}
