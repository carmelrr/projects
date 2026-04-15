import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function Index() {
  const { user, isHydrated } = useAuthStore();

  if (!isHydrated) return null;

  return <Redirect href={user ? '/(client)/today' : '/(auth)/login'} />;
}
