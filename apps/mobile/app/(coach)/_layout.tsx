import { Tabs, Redirect } from 'expo-router';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { registerForPushNotifications } from '@/lib/push';
import { useTheme } from '@/lib/theme';

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

export default function CoachLayout() {
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
  if (user.role === 'CLIENT') return <Redirect href="/(client)/today" />;

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
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={LayoutDashboard} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients/index"
        options={{
          title: 'Clients',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={Users} />,
        }}
      />
      <Tabs.Screen name="clients/[clientId]" options={{ href: null }} />
      <Tabs.Screen
        name="programs/index"
        options={{
          title: 'Programs',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={ClipboardList} />
          ),
        }}
      />
      <Tabs.Screen name="programs/[programId]/index" options={{ href: null }} />
      <Tabs.Screen name="programs/[programId]/assign" options={{ href: null }} />
      <Tabs.Screen name="workouts/index" options={{ href: null }} />
      <Tabs.Screen name="workouts/[workoutId]" options={{ href: null }} />
      <Tabs.Screen name="exercises/index" options={{ href: null }} />
      <Tabs.Screen name="exercises/[exerciseId]" options={{ href: null }} />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={MessageSquare} />
          ),
        }}
      />
      <Tabs.Screen name="messages/[threadId]" options={{ href: null }} />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={MoreHorizontal} />
          ),
        }}
      />
    </Tabs>
  );
}
