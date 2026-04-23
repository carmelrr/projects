import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { drainQueue } from '@/lib/offline-queue';
import { ThemeProvider } from '@/lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootNavigator() {
  const { hydrate, isHydrated } = useAuthStore();
  const scheme = useColorScheme();

  useEffect(() => {
    hydrate();
  }, []);

  // Handle taps on push notifications — deep link if data.linkUrl is set
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as
        | { linkUrl?: string }
        | undefined;
      const link = data?.linkUrl;
      if (link && typeof link === 'string' && link.startsWith('/')) {
        router.push(link as any);
      } else {
        router.push('/(client)/notifications');
      }
    });
    return () => sub.remove();
  }, []);

  // Drain offline workout-log queue when we regain connectivity
  useEffect(() => {
    // Attempt an initial drain on app launch (covers killed-app reopens)
    drainQueue().catch(() => {});

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        drainQueue().catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  // Don't render navigation until auth is resolved
  if (!isHydrated) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(client)" options={{ headerShown: false }} />
        {__DEV__ ? <Stack.Screen name="dev/ui" options={{ title: 'UI Gallery' }} /> : null}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
