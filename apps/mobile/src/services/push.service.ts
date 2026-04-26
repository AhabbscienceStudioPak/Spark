/**
 * Expo push notification registration.
 * Registers the device token with the notification service after login.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './api.client';
import { localOfferStorage } from './local-storage.service';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(): Promise<void> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('offers', {
        name: 'Nearby Offers',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2D6A4F',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const consumerId = await localOfferStorage.getConsumerId();

    // Register with our notification service
    await apiClient.post('/api/v1/notifications/register', {
      consumer_id: consumerId,
      expo_push_token: tokenData.data,
    });
  } catch {
    // Non-critical — app works without push notifications
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const consumerId = await localOfferStorage.getConsumerId();
    await apiClient.delete(`/api/v1/notifications/register/${consumerId}`);
  } catch {
    // Non-critical
  }
}
