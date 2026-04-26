import { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Search, Plus, ChevronRight, Clock } from 'lucide-react-native';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useTheme } from '@/lib/theme';
import { Screen, Text, Card, Input, Button, Skeleton, Badge } from '@/components/ui';
import type { WorkoutTemplate } from '@/hooks/useWorkouts';

function WorkoutRow({ workout }: { workout: WorkoutTemplate }) {
  const theme = useTheme();
  const itemCount = workout.items?.length ?? 0;
  return (
    <Card onPress={() => router.push(`/(coach)/workouts/${workout.id}`)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {workout.title}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing[2],
              marginTop: 4,
              alignItems: 'center',
            }}
          >
            <Text variant="caption" color="mutedForeground">
              {itemCount} block{itemCount !== 1 ? 's' : ''}
            </Text>
            {workout.estimatedDuration ? (
              <>
                <Text variant="caption" color="mutedForeground">·</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} color={theme.colors.mutedForeground} />
                  <Text variant="caption" color="mutedForeground">
                    {workout.estimatedDuration} min
                  </Text>
                </View>
              </>
            ) : null}
            {workout.type ? (
              <>
                <Text variant="caption" color="mutedForeground">·</Text>
                <Text variant="caption" color="mutedForeground">
                  {workout.type}
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <ChevronRight size={18} color={theme.colors.mutedForeground} />
      </View>
    </Card>
  );
}

export default function CoachWorkoutsList() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useWorkouts({
    search: search.trim() || undefined,
  });

  const items = data?.items ?? [];

  return (
    <Screen edges={['top']}>
      <View style={{ padding: theme.spacing[5], gap: theme.spacing[3] }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text variant="h1">Workouts</Text>
          <Button
            size="sm"
            iconLeft={<Plus size={16} color={theme.colors.primaryForeground} />}
            onPress={() => router.push('/(coach)/workouts/new')}
          >
            New
          </Button>
        </View>
        <Input
          placeholder="Search workouts…"
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={theme.colors.mutedForeground} />}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <WorkoutRow workout={item} />}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing[5],
          paddingBottom: theme.spacing[8],
          gap: theme.spacing[2],
        }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[2] }}>
              <Skeleton style={{ height: 72, borderRadius: theme.radii.xl }} />
              <Skeleton style={{ height: 72, borderRadius: theme.radii.xl }} />
            </View>
          ) : (
            <Card tone="muted">
              <Text variant="body" color="mutedForeground">
                {search ? 'No workouts match.' : 'No workouts yet. Tap “New” to create one.'}
              </Text>
            </Card>
          )
        }
      />
    </Screen>
  );
}
