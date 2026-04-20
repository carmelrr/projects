import { useState } from 'react';
import { View, Alert, ScrollView, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Avatar,
  Input,
  Icon,
} from '@/components/ui';

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing[2],
        gap: theme.spacing[3],
      }}
    >
      <Text variant="bodyMedium" color="foreground">
        {label}
      </Text>
      <Text
        variant="body"
        color="mutedForeground"
        numberOfLines={1}
        style={{ flex: 1, textAlign: I18nManager.isRTL ? 'left' : 'right' }}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing[1],
      }}
    />
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, logout } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() ||
    '?';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<{
        firstName: string;
        lastName: string;
      }>('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      useAuthStore.setState((s) => ({
        user: s.user
          ? {
              ...s.user,
              firstName: updated.firstName,
              lastName: updated.lastName,
            }
          : null,
      }));
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing[5],
          paddingBottom: theme.spacing[16],
          gap: theme.spacing[5],
        }}
      >
        <View>
          <Text variant="eyebrow" color="mutedForeground">
            Account
          </Text>
          <Text variant="h1" style={{ marginTop: theme.spacing[1] }}>
            Profile
          </Text>
        </View>

        <Card>
          <View style={{ alignItems: 'center', gap: theme.spacing[2] }}>
            <Avatar initials={initials} size="lg" />
            <Text variant="h2" style={{ marginTop: theme.spacing[2] }}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text variant="body" color="mutedForeground">
              {user?.email}
            </Text>
            {user?.role ? (
              <Badge variant="default">{user.role}</Badge>
            ) : null}
          </View>
        </Card>

        <View style={{ gap: theme.spacing[2] }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: theme.spacing[1],
            }}
          >
            <Text variant="eyebrow" color="mutedForeground">
              Account details
            </Text>
            {!editing ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setEditing(true)}
              >
                Edit
              </Button>
            ) : null}
          </View>

          <Card>
            <Row label="Email" value={user?.email ?? ''} />
            <Divider />
            {editing ? (
              <View style={{ gap: theme.spacing[3] }}>
                <Input
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  autoCapitalize="words"
                />
                <Input
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  autoCapitalize="words"
                />
                <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
                  <Button
                    variant="outline"
                    onPress={handleCancel}
                    disabled={saving}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={handleSave}
                    loading={saving}
                    style={{ flex: 1 }}
                  >
                    Save
                  </Button>
                </View>
              </View>
            ) : (
              <Row
                label="Name"
                value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
              />
            )}
          </Card>
        </View>

        <View style={{ gap: theme.spacing[2] }}>
          <Text
            variant="eyebrow"
            color="mutedForeground"
            style={{ paddingHorizontal: theme.spacing[1] }}
          >
            App
          </Text>
          <Card>
            <Row
              label="API endpoint"
              value={process.env.EXPO_PUBLIC_API_URL ?? 'localhost:3001'}
            />
          </Card>
        </View>

        <Button
          variant="outline"
          onPress={handleLogout}
          fullWidth
          size="lg"
          style={{
            borderColor: theme.colors.destructive,
          }}
          iconLeft={<Icon icon={LogOut} size={18} color="destructive" />}
        >
          <Text
            variant="bodyMedium"
            color="destructive"
            weight="600"
            style={{ fontSize: 15 }}
          >
            Sign out
          </Text>
        </Button>

        {__DEV__ ? (
          <Button
            onPress={() => router.push('/dev/ui' as never)}
            variant="ghost"
            size="sm"
            style={{ marginTop: theme.spacing[2] }}
          >
            <Text variant="caption" color="mutedForeground">
              Dev: UI Gallery
            </Text>
          </Button>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
