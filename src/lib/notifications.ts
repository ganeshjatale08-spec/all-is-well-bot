import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { supabase } from './supabase';

// Configure how notifications appear when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permission and register an Expo push token, then upsert into
// device_tokens so the report-push Edge Function can reach this device.
// Safe to call repeatedly (upsert + permission already-granted path).
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Physical device required for push tokens. Skip in simulator.
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Upsert via RLS-permitted insert (own tokens only, BACKEND_SCHEMA §7).
  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      { user_id: userId, expo_token: token, platform: Platform.OS },
      { onConflict: 'user_id,expo_token', ignoreDuplicates: true },
    );
  if (error) {
    console.error('device_tokens upsert error:', error.message);
  }

  return token;
}

export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('expo_token', token);
}
