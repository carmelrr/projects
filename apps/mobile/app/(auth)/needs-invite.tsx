import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/lib/api';

/**
 * Shown when a user is authenticated with Firebase (e.g. via Google/Apple)
 * but has no Firestore profile yet — meaning they need a coach invite token
 * to complete registration.
 */
export default function NeedsInviteScreen() {
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>You need an invite</Text>
          <Text style={styles.subtitle}>
            Signed in as{' '}
            <Text style={styles.bold}>{firebaseUser?.email ?? 'unknown'}</Text>.
            Ask your coach for an invite link, then paste the token below.
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Invite token</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Paste your invite token"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <Pressable
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </Pressable>

          <Pressable
            onPress={async () => {
              await logout();
              router.replace('/(auth)/login');
            }}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 24 },
  bold: { fontWeight: '600', color: '#111827' },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
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
    minHeight: 46,
  },
  row: { flexDirection: 'row' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: 16 },
  linkText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
});
