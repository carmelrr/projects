import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<{ firstName: string; lastName: string }>('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      // Update store in-place
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, firstName: updated.firstName, lastName: updated.lastName } : null,
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account</Text>
            {!editing && (
              <Pressable onPress={() => setEditing(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>Email</Text>
            <Text style={styles.menuValue} numberOfLines={1}>{user?.email ?? ''}</Text>
          </View>

          {editing ? (
            <>
              <View style={styles.menuItem}>
                <Text style={styles.menuLabel}>First name</Text>
                <TextInput
                  style={styles.editInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.menuItem}>
                <Text style={styles.menuLabel}>Last name</Text>
                <TextInput
                  style={styles.editInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.editActions}>
                <Pressable style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.menuItem}>
              <Text style={styles.menuLabel}>Name</Text>
              <Text style={styles.menuValue} numberOfLines={1}>
                {`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>

          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>API endpoint</Text>
            <Text style={styles.menuValue} numberOfLines={1}>
              {process.env.EXPO_PUBLIC_API_URL ?? 'localhost:3001'}
            </Text>
          </View>
        </View>

        {/* Sign out */}
        <Pressable onPress={handleLogout} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 20, paddingBottom: 60 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
    marginRight: 4,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  menuLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  menuValue: { fontSize: 14, color: '#9ca3af', maxWidth: '55%', textAlign: 'right' },
  editInput: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
    paddingVertical: 0,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  signOutBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});
