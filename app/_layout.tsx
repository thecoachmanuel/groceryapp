import { SplashScreen, Stack, useRouter } from "expo-router";
import { useFonts } from 'expo-font';
import { useEffect} from "react";

import './global.css';
import * as Sentry from '@sentry/react-native';
import useAuthStore from "@/store/auth.store";

Sentry.init({
  dsn: 'https://94edd17ee98a307f2d85d750574c454a@o4506876178464768.ingest.us.sentry.io/4509588544094208',
  sendDefaultPii: true,
  replaysSessionSampleRate: 1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

import { useState } from 'react';
import { Animated, ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { subscribeToOrders } from "@/lib/appwrite";
import { images } from "@/constants";
import useBrandingStore from "@/store/branding.store";

import useNotificationStore from "@/store/notification.store";

export default Sentry.wrap(function RootLayout() {
  const router = useRouter();
  const { isLoading, fetchAuthenticatedUser, user, role, isSeller, isAdmin, sellerStore } = useAuthStore();
  const { appName, appLogo, fetchBranding } = useBrandingStore();
  const { addNotification } = useNotificationStore();
  const [notification, setNotification] = useState<{ title: string; body: string; icon?: string; orderId?: string } | null>(null);

  const [fontsLoaded, error] = useFonts({
    "QuickSand-Bold": require('../assets/fonts/Quicksand-Bold.ttf'),
    "QuickSand-Medium": require('../assets/fonts/Quicksand-Medium.ttf'),
    "QuickSand-Regular": require('../assets/fonts/Quicksand-Regular.ttf'),
    "QuickSand-SemiBold": require('../assets/fonts/Quicksand-SemiBold.ttf'),
    "QuickSand-Light": require('../assets/fonts/Quicksand-Light.ttf'),
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  useEffect(() => {
    if(error) throw error;
    if(fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, error]);

  useEffect(() => {
    fetchAuthenticatedUser()
  }, []);

  useEffect(() => {
    // Realtime Order Notifications for Customer, Seller, and Admin
    const unsubscribe = subscribeToOrders((response) => {
      const order = response?.payload
      const events: string[] = response?.events || []
      if (!order) return

      const isNewOrder = events.some((e) => e.endsWith('.create'))
      const orderIdShort = (order.$id || '').slice(-6)
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

        setNotification({ title: notifTitle, body: notifBody, icon: '🥬', orderId: order.$id })
        setTimeout(() => setNotification(null), 6000)
      }
    })

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [user, role, isSeller, isAdmin, sellerStore])

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
        <Text className="text-black text-2xl font-bold mt-4 tracking-wide font-quicksand-bold">
          {appName}
        </Text>
        <ActivityIndicator size="small" color="#16A34A" className="mt-6" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }} />

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
          className="absolute top-12 left-5 right-5 bg-dark-100 rounded-2xl p-4 shadow-2xl z-50 border border-primary/30 flex-row items-center"
        >
          <View className="w-10 h-10 rounded-xl bg-primary/20 items-center justify-center mr-3">
            <Text className="text-xl">{notification.icon || '🔔'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white font-quicksand-bold text-sm">
              {notification.title}
            </Text>
            <Text className="text-gray-300 font-quicksand-medium text-xs">
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