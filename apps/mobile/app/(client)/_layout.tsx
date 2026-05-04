import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import {
  CalendarCheck,
  LineChart,
  MessageSquare,
  User,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { registerForPushNotifications } from '@/lib/push';
import { useTheme } from '@/lib/theme';

// ── Tab icon helper ────────────────────────────────────────────────────────

function TabIcon({
  focused,
  icon: IconComponent,
}: {
  focused: boolean;
  icon: LucideIcon;
}) {
  const theme = useTheme();
  return (
    <IconComponent
      size={22}
      strokeWidth={focused ? 2.2 : 1.75}
      color={focused ? theme.colors.primary : theme.colors.mutedForeground}
    />
  );
}

export default function ClientLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user]);

  if (!isHydrated) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'CLIENT') return <Redirect href="/(coach)/dashboard" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 76 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 12 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={CalendarCheck} />
          ),
        }}
      />
      <Tabs.Screen
        name="log/[instanceId]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Metrics',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={LineChart} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={MessageSquare} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/[threadId]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="metric/[metricId]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={User} />
          ),
        }}
      />
    </Tabs>
  );
}
