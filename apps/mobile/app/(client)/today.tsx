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
import { useTodayWorkouts, type WorkoutInstance } from '@/hooks/useWorkouts';
import { useUnreadCount } from '@/hooks/useNotifications';

// ── Helpers ────────────────────────────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${time}, ${name} 👋`;
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ── Workout Card ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  SCHEDULED: { bg: '#eff6ff', border: '#bfdbfe', badge: '#2563eb', label: 'Scheduled' },
  COMPLETED: { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a', label: 'Completed' },
  SKIPPED: { bg: '#f9fafb', border: '#e5e7eb', badge: '#6b7280', label: 'Skipped' },
  MISSED: { bg: '#fef2f2', border: '#fecaca', badge: '#dc2626', label: 'Missed' },
};

function WorkoutCard({ instance }: { instance: WorkoutInstance }) {
  const cfg = STATUS_CONFIG[instance.status] ?? STATUS_CONFIG.SCHEDULED;
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
    <Pressable
      onPress={handlePress}
      disabled={!isActionable}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
        pressed && isActionable && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: cfg.badge }]}>
            <Text style={styles.statusLabel}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          {itemCount > 0 && (
            <Text style={styles.metaText}>
              {itemCount} exercise{itemCount !== 1 ? 's' : ''}
            </Text>
          )}
          {duration && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{duration} min</Text>
            </>
          )}
          {instance.template?.type && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{instance.template.type}</Text>
            </>
          )}
        </View>
      </View>

      {instance.template?.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {instance.template.description}
        </Text>
      ) : null}

      {isActionable && (
        <View style={styles.startRow}>
          <Text style={styles.startText}>Tap to start workout →</Text>
        </View>
      )}

      {instance.status === 'COMPLETED' && instance.log && (
        <View style={styles.completedRow}>
          {instance.log.durationMinutes ? (
            <Text style={styles.completedMeta}>⏱ {instance.log.durationMinutes} min</Text>
          ) : null}
          {instance.log.overallRpe ? (
            <Text style={styles.completedMeta}>RPE {instance.log.overallRpe}/10</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

function BellButton() {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  return (
    <Pressable
      onPress={() => router.push('/(client)/notifications')}
      style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
    >
      <Text style={styles.bellIcon}>🔔</Text>
      {count > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function TodayScreen() {
  const { user } = useAuthStore();
  const { data: instances, isLoading, refetch, isRefetching } = useTodayWorkouts();

  const today = formatDate(new Date().toISOString().split('T')[0]);
  const completed = (instances ?? []).filter((i) => i.status === 'COMPLETED').length;
  const total = (instances ?? []).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={instances ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>{greeting(user?.firstName ?? '')}</Text>
                <Text style={styles.dateText}>{today}</Text>
              </View>
              <BellButton />
            </View>

            {!isLoading && total > 0 && (
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${total > 0 ? (completed / total) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {completed}/{total} done
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#2563eb" size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>Rest day!</Text>
              <Text style={styles.emptySubtitle}>No workouts scheduled for today.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <WorkoutCard instance={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 20, paddingBottom: 40 },

  header: { marginBottom: 24 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  dateText: { fontSize: 14, color: '#6b7280', marginTop: 2 },

  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  bellPressed: { opacity: 0.7 },
  bellIcon: { fontSize: 18 },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2563eb',
  },
  progressLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
  },
  cardPressed: { opacity: 0.85 },
  cardHeader: { gap: 6 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#6b7280' },
  metaDot: { fontSize: 13, color: '#d1d5db' },
  cardDescription: { fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 18 },

  startRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#dbeafe' },
  startText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },

  completedRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  completedMeta: { fontSize: 13, color: '#16a34a', fontWeight: '500' },

  separator: { height: 12 },
  center: { paddingVertical: 60, alignItems: 'center' },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});
