import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function Index() {
  const { user, firebaseUser, isHydrated } = useAuthStore();

  if (!isHydrated) return null;

  if (user) return <Redirect href="/(client)/today" />;
  // Authenticated with Firebase but no Firestore profile — needs invite.
  if (firebaseUser) return <Redirect href="/(auth)/needs-invite" />;
  return <Redirect href="/(auth)/login" />;
}
