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
    let isGranted = Boolean((settings as any)?.granted || (settings as any)?.status === 'granted' || (settings as any)?.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)

    if (!isGranted) {
      const req = await Notifications.requestPermissionsAsync()
      isGranted = Boolean((req as any)?.granted || (req as any)?.status === 'granted')
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

/**
 * Schedule a gentle rating reminder notification when an order is delivered
 * Triggered after a few minutes so customers receive a background alert if minimized.
 */
export async function scheduleOrderRatingNotification(
  orderId: string,
  storeName = 'Store',
  delaySeconds = 180
) {
  if (Platform.OS === 'web') return

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
    const key = `@rating_notif_sent_${orderId}`
    const alreadySent = await AsyncStorage.getItem(key)
    if (alreadySent) return

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⭐ How was your grocery delivery?',
        body: `Your order from ${storeName} has been delivered. Tap to share your rating & experience!`,
        sound: 'default',
        data: { url: `/order/${orderId}`, orderId },
      },
      trigger: delaySeconds > 0
        ? ({ type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds, repeats: false } as any)
        : null,
    })

    await AsyncStorage.setItem(key, 'true')
  } catch (err) {
    console.warn('[NOTIFICATIONS] Failed to schedule rating notification:', err)
  }
}
