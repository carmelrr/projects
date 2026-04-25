import { useState } from 'react';
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Screen, Card, Text, Input, PasswordInput, Button, OwlLogo, FadeInUp } from '@/components/ui';
import { useTheme, withAlpha } from '@/lib/theme';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const theme = useTheme();
  const { loginWithEmail, loginWithGoogle, loginWithApple } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialBusy, setSocialBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const routeAfterAuth = () => {
    const state = useAuthStore.getState();
    if (state.user) {
      router.replace('/(client)/today');
    } else if (state.firebaseUser) {
      router.replace('/(auth)/needs-invite');
    }
  };

  const handleAuthError = (err: unknown) => {
    const code = (err as { code?: string } | undefined)?.code;
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found' ||
      (err instanceof ApiError && err.status === 401)
    ) {
      setError('Incorrect email or password.');
    } else if (code === 'auth/too-many-requests') {
      setError('Too many attempts. Please try again later.');
    } else if (code === '12501' || code === '-5' || code === 'ERR_REQUEST_CANCELED') {
      // User cancelled — silent.
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await loginWithEmail(email.trim().toLowerCase(), password);
      routeAfterAuth();
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setSocialBusy('google');
    try {
      await loginWithGoogle();
      routeAfterAuth();
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSocialBusy(null);
    }
  };

  const handleApple = async () => {
    setError('');
    setSocialBusy('apple');
    try {
      await loginWithApple();
      routeAfterAuth();
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSocialBusy(null);
    }
  };

  const showApple = Platform.OS === 'ios';
  const anyBusy = isLoading || socialBusy !== null;

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: theme.spacing[6],
            paddingBottom: theme.spacing[8],
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: theme.spacing[10] }}>
            <FadeInUp>
              <OwlLogo size={64} framed style={{ marginBottom: theme.spacing[4], alignSelf: 'center' }} />
              <Text variant="h1" weight="700" style={{ marginBottom: 6, textAlign: 'center' }}>
                OP
              </Text>
              <Text variant="bodyLg" color="mutedForeground" style={{ textAlign: 'center' }}>
                Sign in to your account
              </Text>
            </FadeInUp>
          </View>

          {/* NOTE: keep this Card outside of FadeInUp / Animated.View — an
              animated parent above a TextInput with secureTextEntry causes
              the Android keyboard to dismiss on the first keystroke. */}
          <Card>
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
                <Text
                  variant="body"
                  color="destructive"
                  style={{ textAlign: 'center' }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={handleGoogle}
              disabled={anyBusy}
              loading={socialBusy === 'google'}
              accessibilityHint="Signs in using your Google account"
              style={{ marginBottom: theme.spacing[2.5] }}
            >
              Continue with Google
            </Button>

            {showApple && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={10}
                style={{ width: '100%', height: 46, marginBottom: theme.spacing[2.5] }}
                onPress={handleApple}
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
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
            </View>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              containerStyle={{ marginBottom: theme.spacing[4] }}
            />

            <PasswordInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={Platform.OS === 'ios' ? 'password' : 'none'}
              autoComplete={Platform.OS === 'android' ? 'off' : 'current-password'}
              importantForAutofill={Platform.OS === 'android' ? 'no' : 'auto'}
              blurOnSubmit={false}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
              containerStyle={{ marginBottom: theme.spacing[4] }}
            />

            <Button
              variant="default"
              size="lg"
              fullWidth
              onPress={handleLogin}
              disabled={anyBusy}
              loading={isLoading}
              accessibilityHint="Signs in with your email and password"
            >
              Sign In
            </Button>

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={{ alignItems: 'center', paddingVertical: theme.spacing[3], marginTop: theme.spacing[2] }}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
              accessibilityHint="Opens the password reset screen"
            >
              <Text variant="body" color="primary" weight="500">
                Forgot password?
              </Text>
            </Pressable>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
