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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function AcceptInviteScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const { acceptInvite } = useAuthStore();
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            You&apos;ve been invited by your coach. Finish setting up your account to
            get started.
          </Text>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!params.token && (
              <View style={styles.field}>
                <Text style={styles.label}>Invite token</Text>
                <TextInput
                  style={styles.input}
                  value={form.token}
                  onChangeText={(token) => setForm({ ...form, token })}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Paste from your invite email"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(email) => setForm({ ...form, email })}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  style={styles.input}
                  value={form.firstName}
                  onChangeText={(firstName) => setForm({ ...form, firstName })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  style={styles.input}
                  value={form.lastName}
                  onChangeText={(lastName) => setForm({ ...form, lastName })}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={form.password}
                onChangeText={(password) => setForm({ ...form, password })}
                placeholder="At least 8 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={form.confirm}
                onChangeText={(confirm) => setForm({ ...form, confirm })}
                placeholderTextColor="#9ca3af"
                secureTextEntry
                textContentType="newPassword"
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
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  flex1: { flex: 1 },
  container: { padding: 24 },
  back: { paddingVertical: 8 },
  backText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginTop: 16 },
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
  row: { flexDirection: 'row', gap: 12 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
