import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  MessageSquare,
  Dumbbell,
  LineChart,
  CalendarDays,
  ClipboardList,
  Bell,
  ChevronLeft,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react-native';
import { Screen, Text, Icon, Skeleton } from '@/components/ui';
import { useTheme, withAlpha } from '@/lib/theme';
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

type LucideIcon = ComponentType<LucideProps>;

function iconFor(type: string): LucideIcon {
  if (type.startsWith('message')) return MessageSquare;
  if (type.startsWith('workout')) return Dumbbell;
  if (type.startsWith('metric')) return LineChart;
  if (type.startsWith('program')) return CalendarDays;
  if (type.startsWith('assignment')) return ClipboardList;
  return Bell;
}

function NotificationRow({
  n,
  onPress,
}: {
  n: Notification;
  onPress: (n: Notification) => void;
}) {
  const theme = useTheme();
  const unread = !n.readAt;
  const IconCmp = iconFor(n.type);

  return (
    <Pressable
      onPress={() => onPress(n)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing[4],
        backgroundColor: unread
          ? withAlpha(theme.colors.primary, 0.06)
          : theme.colors.card,
        gap: theme.spacing[3],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: unread
            ? withAlpha(theme.colors.primary, 0.12)
            : theme.colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon icon={IconCmp} size={18} color={unread ? 'primary' : 'mutedForeground'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          variant={unread ? 'bodyMedium' : 'body'}
          weight={unread ? '700' : '400'}
          color={unread ? 'foreground' : 'mutedForeground'}
          numberOfLines={1}
        >
          {n.title}
        </Text>
        {n.body ? (
          <Text
            variant="caption"
            color="mutedForeground"
            numberOfLines={2}
            style={{ marginTop: 2 }}
          >
            {n.body}
          </Text>
        ) : null}
        <Text
          variant="caption"
          color="mutedForeground"
          style={{ marginTop: 4, fontSize: 11 }}
        >
          {relativeTime(n.createdAt)}
        </Text>
      </View>
      {unread && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.primary,
          }}
        />
      )}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handlePress = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.linkUrl?.startsWith('/')) {
      router.push(n.linkUrl as never);
    }
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{ minWidth: 70, flexDirection: 'row', alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon icon={ChevronLeft} size={18} color="primary" />
          <Text variant="body" color="primary" weight="500">
            Back
          </Text>
        </Pressable>
        <Text variant="body" weight="700">
          Notifications
        </Text>
        <Pressable
          onPress={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
          hitSlop={8}
          style={{ minWidth: 70, alignItems: 'flex-end' }}
          accessibilityRole="button"
        >
          <Text
            variant="caption"
            weight="600"
            color={unreadCount === 0 ? 'mutedForeground' : 'primary'}
          >
            Mark all
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing[3],
              }}
            >
              <Skeleton width={36} height={36} radius={theme.radii.full} />
              <View style={{ flex: 1, gap: theme.spacing[1.5] }}>
                <Skeleton width="70%" height={13} />
                <Skeleton width="95%" height={11} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotificationRow n={item} onPress={handlePress} />
          )}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.border,
                marginStart: 66,
              }}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View
              style={{
                paddingVertical: 80,
                alignItems: 'center',
                paddingHorizontal: theme.spacing[10],
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: withAlpha(theme.colors.primary, 0.1),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: theme.spacing[4],
                }}
              >
                <Icon icon={Bell} size={28} color="primary" />
              </View>
              <Text variant="h3" weight="700">
                You&apos;re all caught up
              </Text>
              <Text
                variant="body"
                color="mutedForeground"
                style={{ textAlign: 'center', marginTop: theme.spacing[1.5] }}
              >
                No notifications yet.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
