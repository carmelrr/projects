import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Redirect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { registerForPushNotifications } from '@/lib/push';

// ── Tab icon helper ────────────────────────────────────────────────────────

function TabIcon({
  focused,
  label,
  emoji,
}: {
  focused: boolean;
  label: string;
  emoji: string;
}) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function ClientLayout() {
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user]);

  if (!isHydrated) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Today" emoji="📋" />
          ),
        }}
      />
      <Tabs.Screen
        name="log/[instanceId]"
        options={{ href: null }} // hidden from tab bar, navigated to programmatically
      />
      <Tabs.Screen
        name="metrics"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Metrics" emoji="📊" />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Habits" emoji="🌱" />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Messages" emoji="💬" />
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
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Profile" emoji="👤" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#f3f4f6',
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabEmojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: '#2563eb',
  },
});
