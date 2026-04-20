import { useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, Text, Input, Button, OwlLogo, FadeInUp } from '@/components/ui';
import { useTheme, withAlpha } from '@/lib/theme';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/lib/api';

/**
 * Shown when a user is authenticated with Firebase (e.g. via Google/Apple)
 * but has no Firestore profile yet — meaning they need a coach invite token
 * to complete registration.
 */
export default function NeedsInviteScreen() {
  const theme = useTheme();
  const { firebaseUser, acceptInviteWithCurrentUser, logout } = useAuthStore();
  const [token, setToken] = useState('');
  const [firstName, setFirstName] = useState(
    firebaseUser?.displayName?.split(' ')[0] ?? '',
  );
  const [lastName, setLastName] = useState(
    firebaseUser?.displayName?.split(' ').slice(1).join(' ') ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!token.trim()) return setError('Enter your invite token.');
    if (!firstName.trim() || !lastName.trim())
      return setError('Enter your first and last name.');

    setBusy(true);
    try {
      await acceptInviteWithCurrentUser({
        token: token.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      router.replace('/(client)/today');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Invalid invite token.');
      } else {
        setError((err as Error)?.message || 'Could not accept invite.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing[6],
            paddingTop: theme.spacing[12],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <OwlLogo size={48} framed style={{ marginBottom: theme.spacing[4] }} />
          <FadeInUp>
            <Text variant="h1" weight="700" style={{ marginBottom: theme.spacing[2] }}>
              You need an invite
            </Text>
            <Text
              variant="bodyLg"
              color="mutedForeground"
              style={{ marginBottom: theme.spacing[6] }}
            >
              Signed in as{' '}
              <Text variant="bodyLg" weight="600">
                {firebaseUser?.email ?? 'unknown'}
              </Text>
              . Ask your coach for an invite link, then paste the token below.
            </Text>
          </FadeInUp>

          {error ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{
                backgroundColor: withAlpha(theme.colors.destructive, 0.1),
                borderRadius: theme.radii.sm,
                padding: theme.spacing[3],
                marginBottom: theme.spacing[4],
              }}
            >
              <Text variant="body" color="destructive">
                {error}
              </Text>
            </View>
          ) : null}

          <FadeInUp delay={120}>
          <Card>
            <Input
              label="Invite token"
              value={token}
              onChangeText={setToken}
              placeholder="Paste your invite token"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              containerStyle={{ marginBottom: theme.spacing[4] }}
            />

            <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
              <Input
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First"
                containerStyle={{ flex: 1, marginBottom: theme.spacing[4] }}
              />
              <Input
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last"
                containerStyle={{ flex: 1, marginBottom: theme.spacing[4] }}
              />
            </View>

            <Button
              variant="default"
              size="lg"
              fullWidth
              onPress={submit}
              disabled={busy}
              loading={busy}
              accessibilityHint="Redeems the invite token and continues to your account"
            >
              Continue
            </Button>

            <Pressable
              onPress={async () => {
                await logout();
                router.replace('/(auth)/login');
              }}
              style={{
                alignItems: 'center',
                paddingVertical: theme.spacing[3],
                marginTop: theme.spacing[2],
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              accessibilityHint="Signs out and returns to the login screen"
            >
              <Text variant="body" color="primary" weight="500">
                Sign out
              </Text>
            </Pressable>
          </Card>
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
