import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
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
      // User cancelled â€” don't show an error.
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Logo / title */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>C</Text>
            </View>
            <Text style={styles.title}>Coaching App</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Social login */}
            <Pressable
              style={[styles.socialBtn, anyBusy && styles.buttonDisabled]}
              onPress={handleGoogle}
              disabled={anyBusy}
            >
              {socialBusy === 'google' ? (
                <ActivityIndicator color="#111827" size="small" />
              ) : (
                <Text style={styles.socialText}>Continue with Google</Text>
              )}
            </Pressable>

            {showApple && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={10}
                style={styles.appleBtn}
                onPress={handleApple}
              />
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                textContentType="password"
                autoComplete="current-password"
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
            </View>

            <Pressable
              style={[styles.button, anyBusy && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={anyBusy}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoLetter: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  socialBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  socialText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  appleBtn: {
    width: '100%',
    height: 46,
    marginBottom: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
});

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Logo / title */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>C</Text>
            </View>
            <Text style={styles.title}>Coaching App</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                textContentType="password"
                autoComplete="current-password"
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
            </View>

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

