import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter } from "expo-router";
import { useEffect } from "react";

import useAuthStore from "@/store/auth.store";
import * as Sentry from '@sentry/react-native';
import './global.css';

Sentry.init({
  dsn: 'https://94edd17ee98a307f2d85d750574c454a@o4506876178464768.ingest.us.sentry.io/4509588544094208',
  sendDefaultPii: true,
  replaysSessionSampleRate: 1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

import { images } from "@/constants";
import { subscribeToOrders } from "@/lib/appwrite";
import useBrandingStore from "@/store/branding.store";
import { useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';

import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, sendLocalNotification } from "@/lib/notifications";
import useNotificationStore from "@/store/notification.store";
import * as Updates from 'expo-updates';

export default Sentry.wrap(function RootLayout() {
  const router = useRouter();
  const { isLoading, fetchAuthenticatedUser, user, role, isSeller, isAdmin, sellerStore } = useAuthStore();
  const { appName, appLogo, fetchBranding } = useBrandingStore();
  const { addNotification } = useNotificationStore();
  const [notification, setNotification] = useState<{ title: string; body: string; icon?: string; orderId?: string } | null>(null);

  const [fontsLoaded, error] = useFonts({
    // Primary Quicksand Font System
    'Quicksand-Bold': require('../assets/fonts/Quicksand-Bold.ttf'),
    'Quicksand-SemiBold': require('../assets/fonts/Quicksand-SemiBold.ttf'),
    'Quicksand-Medium': require('../assets/fonts/Quicksand-Medium.ttf'),
    'Quicksand-Regular': require('../assets/fonts/Quicksand-Regular.ttf'),
    'Quicksand-Light': require('../assets/fonts/Quicksand-Light.ttf'),

    // Case Variations & Legacy Aliases
    'QuickSand-Bold': require('../assets/fonts/Quicksand-Bold.ttf'),
    'QuickSand-SemiBold': require('../assets/fonts/Quicksand-SemiBold.ttf'),
    'QuickSand-Medium': require('../assets/fonts/Quicksand-Medium.ttf'),
    'QuickSand-Regular': require('../assets/fonts/Quicksand-Regular.ttf'),
    'QuickSand-Light': require('../assets/fonts/Quicksand-Light.ttf'),

    // Inter Aliases → Quicksand
    'Inter-Bold': require('../assets/fonts/Quicksand-Bold.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Quicksand-SemiBold.ttf'),
    'Inter-Medium': require('../assets/fonts/Quicksand-Medium.ttf'),
    'Inter-Regular': require('../assets/fonts/Quicksand-Regular.ttf'),
    'Inter-Light': require('../assets/fonts/Quicksand-Light.ttf'),

    // Gilroy Aliases → Quicksand
    'Gilroy-Bold': require('../assets/fonts/Quicksand-Bold.ttf'),
    'Gilroy-SemiBold': require('../assets/fonts/Quicksand-SemiBold.ttf'),
    'Gilroy-Medium': require('../assets/fonts/Quicksand-Medium.ttf'),
    'Gilroy-Regular': require('../assets/fonts/Quicksand-Regular.ttf'),
    'Gilroy-Light': require('../assets/fonts/Quicksand-Light.ttf'),
  });

  useEffect(() => {
    async function checkForOTAUpdates() {
      if (__DEV__) return
      try {
        const update = await Updates.checkForUpdateAsync()
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
        }
      } catch (err) {
        console.log('OTA update check error:', err)
      }
    }
    checkForOTAUpdates()
  }, [])

  useEffect(() => {
    registerForPushNotificationsAsync()
    fetchBranding()
  }, [])

  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, error]);

  useEffect(() => {
    fetchAuthenticatedUser()
  }, []);

  useEffect(() => {
    // Realtime Order Notifications for Customer, Seller, and Admin
    const unsubscribe = subscribeToOrders((response: any) => {
      const order = response?.payload
      const events: string[] = response?.events || []
      if (!order) return

      const isNewOrder = events.some((e) => e.endsWith('.create'))
      const orderIdShort = (order.$id || '').slice(-6).toUpperCase()
      const currentUserId = user?.$id || (user as any)?.accountId
      const sellerStoreId = sellerStore?.$id || (user as any)?.storeId

      // ── 1. SELLER NOTIFICATION ──
      if (isSeller && (order.sellerId === sellerStoreId || order.items?.includes(sellerStoreId))) {
        const notifTitle = isNewOrder ? '📦 New Store Order Received!' : `Store Order Update: ${order.status?.replace('_', ' ').toUpperCase()}`
        const notifBody = isNewOrder
          ? `Customer ${order.userName || 'Client'} placed an order #${orderIdShort} for ₦${Number(order.totalAmount || 0).toLocaleString()}.`
          : `Order #${orderIdShort} status is now ${order.status?.replace('_', ' ')}.`

        addNotification({
          title: notifTitle,
          body: notifBody,
          type: 'seller_order',
          targetRole: 'seller',
          targetSellerId: sellerStoreId,
          orderId: order.$id,
        })

        // Fire native system notification (shows on phone status bar/lockscreen when app is minimized!)
        sendLocalNotification(notifTitle, notifBody, {
          orderId: order.$id,
          url: '/seller/orders',
          targetRole: 'seller',
          type: 'seller_order',
        })

        setNotification({ title: notifTitle, body: notifBody, icon: '🏪', orderId: order.$id })
        setTimeout(() => setNotification(null), 6000)
        return
      }

      // ── 2. ADMIN NOTIFICATION ──
      if (isAdmin) {
        const notifTitle = isNewOrder ? '🔔 New Platform Order Placed!' : `Platform Order #${orderIdShort} Updated`
        const notifBody = `Order #${orderIdShort} by ${order.userName || order.userEmail || 'Customer'} (₦${Number(order.totalAmount || 0).toLocaleString()}) → ${order.status?.replace('_', ' ')}.`

        addNotification({
          title: notifTitle,
          body: notifBody,
          type: 'admin_order',
          targetRole: 'admin',
          orderId: order.$id,
        })

        // Fire native system notification
        sendLocalNotification(notifTitle, notifBody, {
          orderId: order.$id,
          url: '/admin/orders',
          targetRole: 'admin',
          type: 'admin_order',
        })

        setNotification({ title: notifTitle, body: notifBody, icon: '👑', orderId: order.$id })
        setTimeout(() => setNotification(null), 6000)
        return
      }

      // ── 3. CUSTOMER NOTIFICATION ──
      if (user && (order.userId === currentUserId || order.userEmail === user.email)) {
        const notifTitle = isNewOrder ? '🎉 Order Placed Successfully!' : `Order #${orderIdShort} Status: ${order.status?.replace('_', ' ').toUpperCase()}`
        const notifBody = isNewOrder
          ? `Your grocery order #${orderIdShort} for ₦${Number(order.totalAmount || 0).toLocaleString()} is being prepared.`
          : `Your order #${orderIdShort} is currently ${order.status?.replace('_', ' ')}.`

        addNotification({
          title: notifTitle,
          body: notifBody,
          type: 'order',
          targetRole: 'customer',
          targetUserId: currentUserId,
          orderId: order.$id,
        })

        // Fire native system notification
        sendLocalNotification(notifTitle, notifBody, {
          orderId: order.$id,
          url: `/order/${order.$id}`,
          targetRole: 'customer',
          type: 'order',
        })

        setNotification({ title: notifTitle, body: notifBody, icon: '🥬', orderId: order.$id })
        setTimeout(() => setNotification(null), 6000)
      }
    })

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [user, role, isSeller, isAdmin, sellerStore])

  // ── NOTIFICATION RESPONSE TAP LISTENER (Background / Minimized Deep Linking) ──
  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      try {
        const data = response?.notification?.request?.content?.data
        if (!data) return

        const { url, orderId, targetRole, type } = data

        // 1. Direct explicit URL navigation
        if (url && typeof url === 'string') {
          setTimeout(() => {
            router.push(url as any)
          }, 150)
          return
        }

        // 2. Order ID routing based on role or targetRole
        if (orderId && typeof orderId === 'string') {
          setTimeout(() => {
            if (targetRole === 'seller' || isSeller) {
              router.push('/seller/orders' as any)
            } else if (targetRole === 'admin' || isAdmin) {
              router.push('/admin/orders' as any)
            } else {
              router.push(`/order/${orderId}` as any)
            }
          }, 150)
          return
        }

        // 3. Category / Type fallback
        setTimeout(() => {
          if (type === 'seller_order' || isSeller) {
            router.push('/seller/orders' as any)
          } else if (type === 'admin_order' || isAdmin) {
            router.push('/admin/orders' as any)
          } else if (type === 'wallet') {
            router.push('/wallet' as any)
          } else {
            router.push('/(tabs)/notifications' as any)
          }
        }, 150)
      } catch (err) {
        console.error('[NOTIFICATIONS] Deep link routing error:', err)
      }
    }

    // A. Listen for notification tap events when app is minimized or running in background
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)

    // B. Check if app was cold-started directly by tapping a minimized notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [isSeller, isAdmin])

  if (!fontsLoaded || isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        {appLogo ? (
          appLogo.startsWith('http') || appLogo.startsWith('file:') ? (
            <Image
              source={{ uri: appLogo }}
              className="w-40 h-40"
              resizeMode="contain"
            />
          ) : (
            <Text className="text-8xl mb-2">{appLogo}</Text>
          )
        ) : (
          <Image
            source={images.logo}
            className="w-40 h-40"
            resizeMode="contain"
          />
        )}
        <ActivityIndicator size="small" color="#53B175" className="mt-6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#ffffff' },
        }}
      />

      {/* Floating Realtime Notification Toast */}
      {notification && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            const targetOrderId = notification.orderId
            setNotification(null)
            if (targetOrderId) {
              if (role === 'admin') {
                router.push('/admin/orders' as any)
              } else if (role === 'seller') {
                router.push('/seller/orders' as any)
              } else {
                router.push(`/order/${targetOrderId}` as any)
              }
            } else {
              if (role === 'admin') {
                router.push('/admin/orders' as any)
              } else if (role === 'seller') {
                router.push('/seller/orders' as any)
              } else {
                router.push('/orders' as any)
              }
            }
          }}
          className="absolute top-12 left-5 right-5 bg-white rounded-2xl p-4 shadow-2xl z-50 border-2 border-primary/20 flex-row items-center"
        >
          <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3 border border-primary/20">
            <Text className="text-xl">{notification.icon || '🔔'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-dark-100 font-quicksand-bold text-sm">
              {notification.title}
            </Text>
            <Text className="text-gray-500 font-quicksand-medium text-xs">
              {notification.body}
            </Text>
            <Text className="text-primary font-quicksand-bold text-[11px] mt-1">
              Tap to view order details →
            </Text>
          </View>
          <TouchableOpacity onPress={() => setNotification(null)} className="p-1">
            <Text className="text-gray-400 font-bold ml-2">✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
});


// Sentry.showFeedbackWidget();