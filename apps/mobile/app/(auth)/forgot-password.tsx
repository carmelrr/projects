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
import { useAuthStore } from '@/stores/auth.store';

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuthStore();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setError("We couldn't find an account with that email.");
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we&apos;ll send you a link to reset your password.
          </Text>

          <View style={styles.form}>
            {sent ? (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>Check your inbox</Text>
                <Text style={styles.successText}>
                  We sent a reset link to {email}. Follow the link to set a new password.
                </Text>
                <Pressable
                  style={styles.button}
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <Text style={styles.buttonText}>Back to sign in</Text>
                </Pressable>
              </View>
            ) : (
              <>
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
                    autoFocus
                  />
                </View>

                <Pressable
                  style={[styles.button, busy && styles.buttonDisabled]}
                  onPress={submit}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Send reset link</Text>
                  )}
                </Pressable>
              </>
            )}
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
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  back: { paddingVertical: 8 },
  backText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 20,
  },
  form: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 14 },
  field: { marginBottom: 16 },
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
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  successBox: { alignItems: 'center' },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
});
