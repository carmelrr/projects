import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ChevronLeft } from 'lucide-react-native';
import { Screen, Card, Text, Input, PasswordInput, Button, Icon, OwlLogo, FadeInUp } from '@/components/ui';
import { useTheme, withAlpha } from '@/lib/theme';
import { useAuthStore } from '@/stores/auth.store';

export default function AcceptInviteScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ token?: string }>();
  const { acceptInvite, loginWithGoogle, loginWithApple } = useAuthStore();
  const [socialBusy, setSocialBusy] = useState<'google' | 'apple' | null>(null);
  const [form, setForm] = useState({
    token: params.token ?? '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirm: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Stable per-field setters so memoized Inputs don't re-render every keystroke.
  // Critical on Android: re-rendering a sibling password Input mid-typing
  // can rebuild the underlying native view (with secureTextEntry) and
  // dismiss the keyboard.
  const setToken = useCallback(
    (token: string) => setForm((p) => ({ ...p, token })),
    [],
  );
  const setEmail = useCallback(
    (email: string) => setForm((p) => ({ ...p, email })),
    [],
  );
  const setFirstName = useCallback(
    (firstName: string) => setForm((p) => ({ ...p, firstName })),
    [],
  );
  const setLastName = useCallback(
    (lastName: string) => setForm((p) => ({ ...p, lastName })),
    [],
  );
  const setPassword = useCallback(
    (password: string) => setForm((p) => ({ ...p, password })),
    [],
  );
  const setConfirm = useCallback(
    (confirm: string) => setForm((p) => ({ ...p, confirm })),
    [],
  );

  // Stable style refs so memoized children don't see new style objects each render.
  const fieldContainer = useMemo(
    () => ({ marginBottom: theme.spacing[4] }),
    [theme],
  );
  const halfFieldContainer = useMemo(
    () => ({ flex: 1, marginBottom: theme.spacing[4] }),
    [theme],
  );

  const submit = async () => {
    setError('');
    if (!form.token.trim()) return setError('Invite token is required.');
    if (!form.email.trim()) return setError('Enter your email.');
    if (!form.firstName.trim() || !form.lastName.trim())
      return setError('Enter your first and last name.');
    if (form.password.length < 8)
      return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm)
      return setError('Passwords do not match.');

    setBusy(true);
    try {
      await acceptInvite({
        token: form.token.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      router.replace('/(client)/today');
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code;
      if (code === 'auth/email-already-in-use') {
        setError('An account already exists with this email.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak.');
      } else {
        setError(
          (err as Error)?.message || 'Could not accept invite. Please try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'apple') => {
    setError('');
    setSocialBusy(provider);
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithApple();
      const state = useAuthStore.getState();
      if (state.user) {
        router.replace('/(client)/today');
      } else if (state.firebaseUser) {
        router.replace('/(auth)/needs-invite');
      }
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code;
      if (code === '12501' || code === '-5' || code === 'ERR_REQUEST_CANCELED') {
        // user cancelled
      } else {
        setError((err as Error)?.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing[6] }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing[2],
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Returns to the previous screen"
          >
            <Icon icon={ChevronLeft} size={18} color="primary" accessible={false} />
            <Text variant="body" color="primary" weight="500">
              Back
            </Text>
          </Pressable>

          <OwlLogo size={48} framed style={{ marginTop: theme.spacing[4] }} />
          <FadeInUp>
            <Text variant="h1" weight="700" style={{ marginTop: theme.spacing[4] }}>
              Create your account
            </Text>
            <Text
              variant="body"
              color="mutedForeground"
              style={{ marginTop: 6, lineHeight: 20 }}
            >
              You&apos;ve been invited by your coach. Finish setting up your account to
              get started.
            </Text>
          </FadeInUp>

          {/* NOTE: Do NOT wrap this Card in FadeInUp / Animated.View — having
              an animated parent above a TextInput with `secureTextEntry` on
              Android causes the keyboard to dismiss on the first keystroke. */}
          <Card style={{ marginTop: theme.spacing[6] }}>
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

            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => handleSocial('google')}
              disabled={!!socialBusy || busy}
              loading={socialBusy === 'google'}
              style={{ marginBottom: theme.spacing[2.5] }}
            >
              Continue with Google
            </Button>

            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={10}
                style={{ width: '100%', height: 46, marginBottom: theme.spacing[2.5] }}
                onPress={() => handleSocial('apple')}
              />
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: theme.spacing[4],
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
              <Text
                variant="caption"
                color="mutedForeground"
                style={{ marginHorizontal: theme.spacing[3] }}
              >
                or sign up with email
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
            </View>

            {!params.token && (
              <Input
                label="Invite token"
                value={form.token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Paste from your invite email"
                containerStyle={fieldContainer}
              />
            )}

            <Input
              label="Email"
              value={form.email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              containerStyle={fieldContainer}
            />

            <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
              <Input
                label="First name"
                value={form.firstName}
                onChangeText={setFirstName}
                containerStyle={halfFieldContainer}
              />
              <Input
                label="Last name"
                value={form.lastName}
                onChangeText={setLastName}
                containerStyle={halfFieldContainer}
              />
            </View>

            <PasswordInput
              label="Password"
              value={form.password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={Platform.OS === 'ios' ? 'newPassword' : 'none'}
              autoComplete={Platform.OS === 'android' ? 'off' : 'new-password'}
              importantForAutofill={Platform.OS === 'android' ? 'no' : 'auto'}
              blurOnSubmit={false}
              containerStyle={fieldContainer}
            />

            <PasswordInput
              label="Confirm password"
              value={form.confirm}
              onChangeText={setConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={Platform.OS === 'ios' ? 'newPassword' : 'none'}
              autoComplete={Platform.OS === 'android' ? 'off' : 'new-password'}
              importantForAutofill={Platform.OS === 'android' ? 'no' : 'auto'}
              blurOnSubmit={false}
              containerStyle={fieldContainer}
            />

            <Button
              variant="default"
              size="lg"
              fullWidth
              onPress={submit}
              disabled={busy}
              loading={busy}
              accessibilityHint="Creates your account and signs you in"
            >
              Create account
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
