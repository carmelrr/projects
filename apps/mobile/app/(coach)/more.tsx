import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { LogOut, Shield } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/theme';
import { Screen, Text, Card, Button, Avatar, Badge } from '@/components/ui';

export default function CoachMoreScreen() {
  const theme = useTheme();
  const { user, logout } = useAuthStore();

  const onLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to continue.', [
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

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN_COACH';

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing[5], gap: theme.spacing[4] }}>
        <Text variant="h1">More</Text>

        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing[3],
            }}
          >
            <Avatar initials={initials} size="lg" />
            <View style={{ flex: 1 }}>
              <Text variant="h3">
                {user.firstName} {user.lastName}
              </Text>
              <Text variant="caption" color="mutedForeground">
                {user.email}
              </Text>
              <View style={{ marginTop: 4, flexDirection: 'row', gap: 6 }}>
                <Badge variant="default">{user.role.replace('_', ' ')}</Badge>
              </View>
            </View>
          </View>
        </Card>

        {isAdmin && (
          <Card tone="warning">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: theme.spacing[2],
              }}
            >
              <Shield size={18} color={theme.colors.warning} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">Admin tasks on web</Text>
                <Text variant="caption" color="mutedForeground" style={{ marginTop: 2 }}>
                  Inviting coaches and managing users is available on the web app.
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Button
          variant="destructive"
          iconLeft={<LogOut size={16} color={theme.colors.destructiveForeground} />}
          onPress={onLogout}
          fullWidth
          size="lg"
          style={{ marginTop: theme.spacing[4] }}
        >
          Sign out
        </Button>
      </ScrollView>
    </Screen>
  );
}
