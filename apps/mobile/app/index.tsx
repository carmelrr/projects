import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function Index() {
  const { user, firebaseUser, isHydrated } = useAuthStore();

  if (!isHydrated) return null;

  if (user) {
    const role = user.role;
    if (role === 'COACH' || role === 'ADMIN_COACH' || role === 'OWNER') {
      return <Redirect href="/(coach)/dashboard" />;
    }
    return <Redirect href="/(client)/today" />;
  }
  // Authenticated with Firebase but no Firestore profile — needs invite.
  if (firebaseUser) return <Redirect href="/(auth)/needs-invite" />;
  return <Redirect href="/(auth)/login" />;
}
