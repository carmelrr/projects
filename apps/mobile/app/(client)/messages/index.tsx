import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useThreads, type Thread } from '@/hooks/useMessaging';

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
  const other = thread.participants.find((p) => p.userId !== currentUserId);
  const name = other?.user
    ? `${other.user.firstName} ${other.user.lastName}`
    : thread.title ?? 'Conversation';
  const unread = thread.unreadCount ?? 0;

  return (
    <Pressable
      onPress={() => router.push(`/(client)/messages/${thread.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {other?.user ? initials(other.user.firstName, other.user.lastName) : '?'}
        </Text>
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {thread.lastMessageAt && (
            <Text style={styles.timestamp}>{relativeTime(thread.lastMessageAt)}</Text>
          )}
        </View>
        <View style={styles.rowFooter}>
          <Text
            style={[styles.preview, unread > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {thread.lastMessagePreview ?? 'No messages yet'}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const { data: threads, isLoading, refetch, isRefetching } = useThreads();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : (
        <FlatList
          data={threads ?? []}
          keyExtractor={(t) => t.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => (
            <ThreadRow thread={item} currentUserId={user?.id ?? ''} />
          )}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>
                Your coach can start a conversation with you from the web app.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  rowPressed: { backgroundColor: '#f9fafb' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  rowBody: { flex: 1, justifyContent: 'center', gap: 4 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  timestamp: { fontSize: 12, color: '#9ca3af' },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: { flex: 1, fontSize: 13, color: '#6b7280' },
  previewUnread: { color: '#111827', fontWeight: '600' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 76 },

  emptyState: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 6 },
});
