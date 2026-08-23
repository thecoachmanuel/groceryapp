import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// Configure global notification handler for Foreground & Background presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * Register device for system notification channels & permissions
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null

  try {
    // 1. Android Notification Channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Grocery App Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#53B175',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      })
    }

    // 2. Request System Permissions (Android 13+ & iOS)
    const settings = await Notifications.getPermissionsAsync()
    let isGranted = settings.granted || Boolean(settings.ios && settings.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL)

    if (!isGranted) {
      const req = await Notifications.requestPermissionsAsync()
      isGranted = req.granted
    }

    if (!isGranted) {
      console.log('[NOTIFICATIONS] Permission not granted for push notifications.')
      return null
    }

    // Get Expo Push Token if available
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync()
      console.log('[NOTIFICATIONS] Expo Push Token:', tokenData.data)
      return tokenData.data
    } catch {
      return null
    }
  } catch (err) {
    console.error('[NOTIFICATIONS] Error setting up notification channel:', err)
    return null
  }
}

/**
 * Send immediate System Local Notification (Displays on System Tray when app is minimized)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (Platform.OS === 'web') return

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: data || {},
      },
      trigger: null, // null triggers immediately
    })
  } catch (err) {
    console.error('[NOTIFICATIONS] Failed to trigger local notification:', err)
  }
}
