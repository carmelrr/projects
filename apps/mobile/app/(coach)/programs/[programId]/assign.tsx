import { useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Search,
  X,
  ChevronRight,
  CalendarPlus,
} from 'lucide-react-native';
import { useProgram, useAssignProgram } from '@/hooks/usePrograms';
import { useClients, type Client } from '@/hooks/useClients';
import { useTheme, withAlpha } from '@/lib/theme';
import {
  Screen,
  Text,
  Card,
  Input,
  Button,
  Avatar,
  Skeleton,
} from '@/components/ui';

function ClientPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (c: Client) => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const { data } = useClients({
    status: 'ACTIVE',
    search: search.trim() || undefined,
    limit: 200,
  });
  return (
    <Modal visible={open} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: withAlpha(theme.colors.foreground, 0.4),
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderTopLeftRadius: theme.radii['2xl'],
            borderTopRightRadius: theme.radii['2xl'],
            maxHeight: '80%',
            paddingBottom: theme.spacing[8],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: theme.spacing[4],
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text variant="h3">Pick client</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={theme.colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={{ padding: theme.spacing[4] }}>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              leftIcon={<Search size={16} color={theme.colors.mutedForeground} />}
            />
          </View>
          <FlatList
            data={data?.items ?? []}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing[3],
                  paddingHorizontal: theme.spacing[5],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.muted : 'transparent',
                })}
              >
                <Avatar
                  initials={`${item.user.firstName[0] ?? ''}${item.user.lastName[0] ?? ''}`.toUpperCase()}
                  size="md"
                />
                <View>
                  <Text variant="bodyMedium">
                    {item.user.firstName} {item.user.lastName}
                  </Text>
                  <Text variant="caption" color="mutedForeground">
                    {item.user.email}
                  </Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View
                style={{ height: 1, backgroundColor: theme.colors.border }}
              />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function CoachAssignProgram() {
  const theme = useTheme();
  const { programId, clientId: paramClientId } = useLocalSearchParams<{
    programId: string;
    clientId?: string;
  }>();
  const { data: program } = useProgram(programId!);
  const { data: clientsData } = useClients({ status: 'ACTIVE', limit: 500 });
  const assign = useAssignProgram();

  const initialClient = paramClientId
    ? clientsData?.items?.find((c) => c.user.id === paramClientId) ?? null
    : null;

  const [selected, setSelected] = useState<Client | null>(initialClient);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateInput, setDateInput] = useState(
    () => new Date().toISOString().split('T')[0],
  );

  // hydrate selected when client list loads
  if (!selected && initialClient) {
    setSelected(initialClient);
  }

  const submit = async () => {
    if (!selected) {
      Alert.alert('Pick a client');
      return;
    }
    try {
      await assign.mutateAsync({
        id: programId!,
        clientId: selected.user.id,
        startDate: startDate.toISOString().split('T')[0],
      });
      Alert.alert(
        'Program assigned',
        `${program?.title ?? 'Program'} assigned to ${selected.user.firstName}.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Error');
    }
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
        <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          Assign program
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[5], gap: theme.spacing[4] }}
      >
        {!program ? (
          <Skeleton style={{ height: 200, borderRadius: theme.radii.xl }} />
        ) : (
          <>
            <Card>
              <Text variant="caption" color="mutedForeground">
                Program
              </Text>
              <Text variant="h3" style={{ marginTop: 4 }}>
                {program.title}
              </Text>
              <Text variant="caption" color="mutedForeground" style={{ marginTop: 2 }}>
                {program.weeks.length} week{program.weeks.length !== 1 ? 's' : ''}
              </Text>
            </Card>

            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Client
              </Text>
              <Card onPress={() => setPickerOpen(true)}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[3],
                  }}
                >
                  {selected ? (
                    <>
                      <Avatar
                        initials={`${selected.user.firstName[0] ?? ''}${selected.user.lastName[0] ?? ''}`.toUpperCase()}
                        size="md"
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium">
                          {selected.user.firstName} {selected.user.lastName}
                        </Text>
                        <Text variant="caption" color="mutedForeground">
                          {selected.user.email}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text variant="body" color="mutedForeground" style={{ flex: 1 }}>
                      Tap to choose a client
                    </Text>
                  )}
                  <ChevronRight size={18} color={theme.colors.mutedForeground} />
                </View>
              </Card>
            </View>

            <View style={{ gap: theme.spacing[1.5] }}>
              <Text variant="caption" color="mutedForeground">
                Start date
              </Text>
              <Card>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[3],
                  }}
                >
                  <Calendar size={18} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={{ flex: 1 }}>
                    {startDate.toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: theme.spacing[1.5],
                    marginTop: theme.spacing[3],
                  }}
                >
                  {[
                    { label: 'Today', offset: 0 },
                    { label: 'Tomorrow', offset: 1 },
                    { label: 'Next Mon', offset: -1 },
                    { label: '+1 week', offset: 7 },
                    { label: '+2 weeks', offset: 14 },
                  ].map((p) => (
                    <Pressable
                      key={p.label}
                      onPress={() => {
                        const d = new Date();
                        d.setHours(0, 0, 0, 0);
                        if (p.offset === -1) {
                          // next monday
                          const day = d.getDay();
                          const add = (8 - day) % 7 || 7;
                          d.setDate(d.getDate() + add);
                        } else {
                          d.setDate(d.getDate() + p.offset);
                        }
                        setStartDate(d);
                        setDateInput(d.toISOString().split('T')[0]);
                      }}
                      style={{
                        paddingHorizontal: theme.spacing[3],
                        paddingVertical: theme.spacing[1.5],
                        borderRadius: theme.radii.full,
                        backgroundColor: theme.colors.muted,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text variant="caption" color="foreground">
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ marginTop: theme.spacing[3] }}>
                  <Text variant="caption" color="mutedForeground">
                    Or enter (YYYY-MM-DD)
                  </Text>
                  <Input
                    value={dateInput}
                    onChangeText={(v) => {
                      setDateInput(v);
                      const parsed = new Date(v);
                      if (!isNaN(parsed.getTime())) {
                        parsed.setHours(0, 0, 0, 0);
                        setStartDate(parsed);
                      }
                    }}
                    placeholder="2025-01-15"
                    autoCapitalize="none"
                  />
                </View>
              </Card>
            </View>

            <Button
              onPress={submit}
              loading={assign.isPending}
              disabled={!selected}
              variant="gradient"
              size="lg"
              iconLeft={<CalendarPlus size={16} color={theme.colors.primaryForeground} />}
              fullWidth
              style={{ marginTop: theme.spacing[2] }}
            >
              Assign program
            </Button>
          </>
        )}
      </ScrollView>

      <ClientPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={setSelected}
      />
    </Screen>
  );
}
