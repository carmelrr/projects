import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// Foreground behavior: show banner + play sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let registeredToken: string | null = null;

/**
 * Register the device for push notifications.
 * Safely no-ops on simulators / missing config / permission denial.
 * Sends the Expo push token to the API for storage on the user document.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Simulators/emulators don't support real push
  if (!Device.isDevice) {
    return null;
  }

  // Android: create the default channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      status = res.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    const tokenRes = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenRes.data;
    if (!token || token === registeredToken) return token ?? null;

    try {
      await api.post('/users/me/push-tokens', {
        token,
        platform: Platform.OS,
      });
      registeredToken = token;
    } catch (err) {
      // Endpoint errors shouldn't crash the app
      console.warn('Failed to register push token:', err);
    }
    return token;
  } catch (err) {
    console.warn('Push registration failed:', err);
    return null;
  }
}

export async function unregisterPushToken() {
  if (!registeredToken) return;
  try {
    await api.delete(
      `/users/me/push-tokens/${encodeURIComponent(registeredToken)}`,
    );
  } catch {
    /* ignore */
  }
  registeredToken = null;
}
