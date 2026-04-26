/**
 * Expo push notification registration.
 * Registers the device token with the notification service after login.
 */
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api.client';
import { localOfferStorage } from './local-storage.service';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule> | null = null;

async function getNotificationsModule(): Promise<NotificationsModule> {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }
  return notificationsModulePromise;
}

export async function registerPushToken(): Promise<void> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) return;
  // Expo Go (SDK 53+) no longer supports Android remote push token APIs.
  if (Constants.appOwnership === 'expo') return;

  try {
    const Notifications = await getNotificationsModule();

    // Configure how notifications appear when app is in foreground.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

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
