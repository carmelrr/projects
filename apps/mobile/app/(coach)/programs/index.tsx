import { useState } from 'react';
import { View, FlatList, RefreshControl, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Search,
  Plus,
  ChevronRight,
  Lock,
  ArrowLeft,
  Copy,
} from 'lucide-react-native';
import {
  usePrograms,
  useCreateProgram,
  useDuplicateProgram,
  type Program,
} from '@/hooks/usePrograms';
import { useTheme, withAlpha } from '@/lib/theme';
import { Screen, Text, Card, Input, Button, Skeleton, Badge, Icon } from '@/components/ui';

function ProgramRow({
  program,
  onPress,
  onDuplicate,
}: {
  program: Program;
  onPress: () => void;
  onDuplicate?: () => void;
}) {
  const theme = useTheme();
  const weekCount = program.weeks?.length ?? 0;
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}
          >
            <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
              {program.title}
            </Text>
            {program.isPrivate && (
              <Lock size={12} color={theme.colors.mutedForeground} />
            )}
          </View>
          <Text variant="caption" color="mutedForeground">
            {weekCount} week{weekCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {onDuplicate && (
          <Pressable
            onPress={onDuplicate}
            style={({ pressed }) => ({
              padding: theme.spacing[2],
              opacity: pressed ? 0.6 : 1,
            })}
            hitSlop={6}
          >
            <Copy size={16} color={theme.colors.mutedForeground} />
          </Pressable>
        )}
        <ChevronRight size={18} color={theme.colors.mutedForeground} />
      </View>
    </Card>
  );
}

export default function CoachProgramsList() {
  const theme = useTheme();
  const { assignToClientId } = useLocalSearchParams<{ assignToClientId?: string }>();
  const isAssignMode = !!assignToClientId;

  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = usePrograms({
    search: search.trim() || undefined,
  });
  const create = useCreateProgram();
  const duplicate = useDuplicateProgram();

  const items = data?.items ?? [];

  const onTap = async (p: Program) => {
    if (isAssignMode) {
      router.push({
        pathname: `/(coach)/programs/${p.id}/assign`,
        params: { clientId: assignToClientId },
      });
    } else {
      router.push(`/(coach)/programs/${p.id}`);
    }
  };

  const onCreate = async () => {
    try {
      const p = await create.mutateAsync({ title: 'New program' });
      router.push(`/(coach)/programs/${p.id}`);
    } catch {}
  };

  const onDuplicate = async (id: string) => {
    try {
      const p = await duplicate.mutateAsync(id);
      router.push(`/(coach)/programs/${p.id}`);
    } catch {}
  };

  return (
    <Screen edges={['top']}>
      <View style={{ padding: theme.spacing[5], gap: theme.spacing[3] }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
          {isAssignMode && (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ArrowLeft size={22} color={theme.colors.foreground} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="h1">Programs</Text>
            {isAssignMode && (
              <Text variant="caption" color="primary">
                Pick a program to assign
              </Text>
            )}
          </View>
          {!isAssignMode && (
            <Button
              size="sm"
              loading={create.isPending}
              iconLeft={<Plus size={16} color={theme.colors.primaryForeground} />}
              onPress={onCreate}
            >
              New
            </Button>
          )}
        </View>
        <Input
          placeholder="Search programs…"
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={16} color={theme.colors.mutedForeground} />}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProgramRow
            program={item}
            onPress={() => onTap(item)}
            onDuplicate={isAssignMode ? undefined : () => onDuplicate(item.id)}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing[5],
          paddingBottom: theme.spacing[8],
          gap: theme.spacing[2],
        }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: theme.spacing[2] }}>
              <Skeleton style={{ height: 64, borderRadius: theme.radii.xl }} />
              <Skeleton style={{ height: 64, borderRadius: theme.radii.xl }} />
            </View>
          ) : (
            <Card tone="muted">
              <Text variant="body" color="mutedForeground">
                No programs yet.
              </Text>
            </Card>
          )
        }
      />
    </Screen>
  );
}
