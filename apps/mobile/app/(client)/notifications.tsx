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
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from '@/hooks/useNotifications';

function relativeTime(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function emojiFor(type: string): string {
  if (type.startsWith('message')) return '💬';
  if (type.startsWith('workout')) return '💪';
  if (type.startsWith('metric')) return '📊';
  if (type.startsWith('program')) return '📅';
  if (type.startsWith('assignment')) return '📋';
  return '🔔';
}

function NotificationRow({
  n,
  onPress,
}: {
  n: Notification;
  onPress: (n: Notification) => void;
}) {
  const unread = !n.readAt;
  return (
    <Pressable
      onPress={() => onPress(n)}
      style={({ pressed }) => [
        styles.row,
        unread && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.iconBox, unread && styles.iconBoxUnread]}>
        <Text style={styles.icon}>{emojiFor(n.type)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
          {n.title}
        </Text>
        {n.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {n.body}
          </Text>
        ) : null}
        <Text style={styles.timestamp}>{relativeTime(n.createdAt)}</Text>
      </View>
      {unread && <View style={styles.dot} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handlePress = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.linkUrl?.startsWith('/')) {
      router.push(n.linkUrl as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable
          onPress={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
          style={styles.markAllBtn}
        >
          <Text
            style={[
              styles.markAllText,
              unreadCount === 0 && styles.markAllTextDisabled,
            ]}
          >
            Mark all
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotificationRow n={item} onPress={handlePress} />
          )}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2563eb"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>You're all caught up</Text>
              <Text style={styles.emptySub}>No notifications yet.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { minWidth: 70 },
  backText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  markAllBtn: { minWidth: 70, alignItems: 'flex-end' },
  markAllText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  markAllTextDisabled: { color: '#d1d5db' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    gap: 12,
  },
  rowUnread: { backgroundColor: '#f0f9ff' },
  rowPressed: { opacity: 0.7 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnread: { backgroundColor: '#dbeafe' },
  icon: { fontSize: 18 },
  rowBody: { flex: 1 },
  title: { fontSize: 14, color: '#374151' },
  titleUnread: { color: '#111827', fontWeight: '700' },
  body: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  timestamp: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 66 },

  emptyState: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 6 },
});
