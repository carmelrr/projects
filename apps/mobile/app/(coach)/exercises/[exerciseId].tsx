import { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Trash2, Save } from 'lucide-react-native';
import {
  useExercise,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  useExerciseCategories,
  useExerciseMuscleGroups,
} from '@/hooks/useExercises';
import { useTheme, withAlpha } from '@/lib/theme';
import { Screen, Text, Card, Input, Button, Skeleton } from '@/components/ui';

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

export default function CoachExerciseEditor() {
  const theme = useTheme();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const isNew = !exerciseId || exerciseId === 'new';

  const { data: existing, isLoading } = useExercise(isNew ? '' : exerciseId!);
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const remove = useDeleteExercise();
  const { data: categories } = useExerciseCategories();
  const { data: muscleGroups } = useExerciseMuscleGroups();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState<string>('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [difficulty, setDifficulty] = useState<
    'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | ''
  >('');

  useEffect(() => {
    if (existing) {
      setName(existing.name ?? '');
      setDescription(existing.description ?? '');
      setInstructions(existing.instructions ?? '');
      setCategory(existing.category ?? '');
      setSelectedMuscles(existing.muscleGroups ?? []);
      setVideoUrl(existing.videoUrl ?? '');
      setDifficulty(existing.difficulty ?? '');
    }
  }, [existing]);

  const toggleMuscle = (m: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name is required');
      return;
    }
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      category: category.trim() || undefined,
      muscleGroups: selectedMuscles,
      videoUrl: videoUrl.trim() || undefined,
      difficulty: difficulty || undefined,
    };
    try {
      if (isNew) {
        await create.mutateAsync(body);
      } else {
        await update.mutateAsync({ id: exerciseId!, ...body });
      }
      router.back();
    } catch (err) {
      Alert.alert('Failed to save', err instanceof Error ? err.message : 'Error');
    }
  };

  const onDelete = () => {
    if (isNew) return;
    Alert.alert('Delete exercise?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(exerciseId!);
            router.back();
          } catch (err) {
            Alert.alert(
              'Failed',
              err instanceof Error ? err.message : 'Error',
            );
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
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
        <Pressable onPress={() => router.back()} style={{ padding: theme.spacing[2] }}>
          <ArrowLeft size={22} color={theme.colors.foreground} />
        </Pressable>
        <Text variant="h3" style={{ flex: 1 }}>
          {isNew ? 'New exercise' : 'Edit exercise'}
        </Text>
        {!isNew && !existing?.isSystem && (
          <Pressable onPress={onDelete} style={{ padding: theme.spacing[2] }}>
            <Trash2 size={20} color={theme.colors.destructive} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[5], gap: theme.spacing[4] }}
      >
        {!isNew && isLoading ? (
          <Skeleton style={{ height: 300, borderRadius: theme.radii.xl }} />
        ) : (
          <>
            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Name *
              </Text>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Bench press"
              />
            </View>

            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Description
              </Text>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Short summary"
                multiline
                inputStyle={{ minHeight: 60, textAlignVertical: 'top' }}
              />
            </View>

            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Instructions
              </Text>
              <Input
                value={instructions}
                onChangeText={setInstructions}
                placeholder="How to perform…"
                multiline
                inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
              />
            </View>

            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Video URL
              </Text>
              <Input
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="https://…"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Difficulty
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                {DIFFICULTIES.map((d) => {
                  const active = difficulty === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDifficulty(active ? '' : d)}
                      style={{
                        flex: 1,
                        paddingVertical: theme.spacing[2],
                        borderRadius: theme.radii.md,
                        backgroundColor: active
                          ? withAlpha(theme.colors.primary, 0.15)
                          : theme.colors.muted,
                        borderWidth: 1,
                        borderColor: active
                          ? withAlpha(theme.colors.primary, 0.4)
                          : theme.colors.border,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontWeight: active ? '700' : '600',
                          color: active
                            ? theme.colors.primary
                            : theme.colors.mutedForeground,
                        }}
                      >
                        {d}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {!!categories?.length && (
              <View style={{ gap: theme.spacing[1.5] }}>
                <Text variant="caption" color="mutedForeground">
                  Category
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: theme.spacing[1.5],
                  }}
                >
                  {categories.map((cat) => {
                    const active = category === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(active ? '' : cat)}
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
                            fontWeight: active ? '700' : '600',
                            color: active
                              ? theme.colors.primary
                              : theme.colors.mutedForeground,
                          }}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {!!muscleGroups?.length && (
              <View style={{ gap: theme.spacing[1.5] }}>
                <Text variant="caption" color="mutedForeground">
                  Muscle groups
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: theme.spacing[1.5],
                  }}
                >
                  {muscleGroups.map((m) => {
                    const active = selectedMuscles.includes(m);
                    return (
                      <Pressable
                        key={m}
                        onPress={() => toggleMuscle(m)}
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
                            fontWeight: active ? '700' : '600',
                            color: active
                              ? theme.colors.primary
                              : theme.colors.mutedForeground,
                          }}
                        >
                          {m}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <Button
              onPress={save}
              loading={create.isPending || update.isPending}
              disabled={!name.trim()}
              iconLeft={<Save size={16} color={theme.colors.primaryForeground} />}
              fullWidth
              size="lg"
              style={{ marginTop: theme.spacing[2] }}
            >
              {isNew ? 'Create exercise' : 'Save changes'}
            </Button>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
