import { useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { MessageSquare, Plus, X } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import {
  useThreads,
  useCreateDirectThread,
  type Thread,
} from '@/hooks/useMessaging';
import { useCoaches } from '@/hooks/useCoaches';
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
  const { user } = useAuthStore();
  const { data: threads, isLoading, refetch, isRefetching } = useThreads();
  const { data: coaches } = useCoaches();
  const createDirect = useCreateDirectThread();
  const [pickerOpen, setPickerOpen] = useState(false);

  const startConversation = async (coachId: string) => {
    setPickerOpen(false);
    try {
      const thread = await createDirect.mutateAsync(coachId);
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
          paddingBottom: theme.spacing[10],
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[5],
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
              onPress={() => setPickerOpen(true)}
              size="sm"
              iconLeft={
                <Icon
                  icon={Plus}
                  size={16}
                  color={theme.colors.primaryForeground}
                />
              }
            >
              New
            </Button>
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
              <Text
                variant="body"
                color="mutedForeground"
                style={{
                  textAlign: 'center',
                  paddingHorizontal: theme.spacing[6],
                }}
              >
                Your coach can start a conversation with you from the web app.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ThreadRow thread={item} currentUserId={user?.id ?? ''} />
        )}
      />

      {/* Contact picker modal */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: withAlpha(theme.colors.foreground, 0.35),
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderTopLeftRadius: theme.radii['2xl'],
              borderTopRightRadius: theme.radii['2xl'],
              maxHeight: '60%',
              paddingBottom: theme.spacing[10],
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: theme.spacing[5],
                paddingVertical: theme.spacing[4],
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Text variant="h3">New conversation</Text>
              <Pressable
                onPress={() => setPickerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <Icon icon={X} size={20} color="mutedForeground" />
              </Pressable>
            </View>
            {!coaches?.length ? (
              <View
                style={{
                  padding: theme.spacing[10],
                  alignItems: 'center',
                }}
              >
                <Text variant="body" color="mutedForeground">
                  No coaches available
                </Text>
              </View>
            ) : (
              <FlatList
                data={coaches}
                keyExtractor={(c) => c.id}
                renderItem={({ item: c }) => (
                  <Pressable
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing[3],
                      paddingHorizontal: theme.spacing[5],
                      paddingVertical: theme.spacing[3],
                      backgroundColor: pressed
                        ? theme.colors.muted
                        : 'transparent',
                    })}
                    onPress={() => startConversation(c.id)}
                  >
                    <Avatar
                      initials={initials(c.firstName, c.lastName)}
                      size="md"
                    />
                    <View>
                      <Text variant="bodyMedium">
                        {c.firstName} {c.lastName}
                      </Text>
                      <Text variant="caption" color="mutedForeground">
                        {c.email}
                      </Text>
                    </View>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: theme.colors.border,
                      marginStart: theme.spacing[5] + 36 + theme.spacing[3],
                    }}
                  />
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
