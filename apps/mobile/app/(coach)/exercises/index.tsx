import { useState } from 'react';
import { View, FlatList, RefreshControl, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Search, Plus, ChevronRight, Tag } from 'lucide-react-native';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { useTheme } from '@/lib/theme';
import { Screen, Text, Card, Badge, Input, Button, Skeleton } from '@/components/ui';

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const theme = useTheme();
  return (
    <Card onPress={() => router.push(`/(coach)/exercises/${exercise.id}`)}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
              {exercise.name}
            </Text>
            {exercise.isSystem && <Badge variant="muted">system</Badge>}
          </View>
          {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                gap: 4,
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              {exercise.muscleGroups.slice(0, 3).map((m) => (
                <Text key={m} variant="caption" color="mutedForeground">
                  {m}
                  {' '}
                </Text>
              ))}
            </View>
          )}
        </View>
        <ChevronRight size={18} color={theme.colors.mutedForeground} />
      </View>
    </Card>
  );
}

export default function CoachExercisesList() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useExercises({
    search: search.trim() || undefined,
  });

  const items = data?.items ?? [];

  return (
    <Screen edges={['top']}>
      <View
        style={{
          padding: theme.spacing[5],
          gap: theme.spacing[3],
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text variant="h1">Exercises</Text>
          <Button
            size="sm"
            iconLeft={<Plus size={16} color={theme.colors.primaryForeground} />}
            onPress={() => router.push('/(coach)/exercises/new')}
          >
            New
          </Button>
        </View>
        <Input
          placeholder="Search exercises…"
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={theme.colors.mutedForeground} />}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <ExerciseRow exercise={item} />}
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
              <Skeleton style={{ height: 64, borderRadius: theme.radii.xl }} />
              <Skeleton style={{ height: 64, borderRadius: theme.radii.xl }} />
              <Skeleton style={{ height: 64, borderRadius: theme.radii.xl }} />
            </View>
          ) : (
            <Card tone="muted">
              <Text variant="body" color="mutedForeground">
                {search
                  ? 'No exercises match your search.'
                  : 'No exercises yet. Tap “New” to create one.'}
              </Text>
            </Card>
          )
        }
      />
    </Screen>
  );
}
