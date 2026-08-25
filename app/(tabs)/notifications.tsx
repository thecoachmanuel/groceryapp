import CartButton from '@/components/CartButton'
import { images } from '@/constants'
import useAuthStore from '@/store/auth.store'
import useNotificationStore, { AppNotification } from '@/store/notification.store'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  Image,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

export default function NotificationsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, role, sellerStore, isAdmin } = useAuthStore()
  const { getFilteredNotifications, markAsRead, markAllAsRead } = useNotificationStore()

  const [activeFilter, setActiveFilter] = useState<'all' | 'orders' | 'wallet' | 'alerts'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const currentUserId = user?.$id || (user as any)?.accountId
  const sellerStoreId = sellerStore?.$id || (user as any)?.storeId

  // Auto-mark notifications as read immediately when user views the screen
  useFocusEffect(
    useCallback(() => {
      markAllAsRead(role, currentUserId, sellerStoreId)
    }, [role, currentUserId, sellerStoreId])
  )

  // Base list of notifications filtered for current user role and IDs
  const allBaseUserNotifications = useMemo(() => {
    return getFilteredNotifications(role, currentUserId, sellerStoreId)
  }, [getFilteredNotifications, role, currentUserId, sellerStoreId])

  // Category counts for filter chips
  const counts = useMemo(() => {
    const ordersCount = allBaseUserNotifications.filter(
      (n) => n.type === 'order' || n.type === 'seller_order' || n.type === 'admin_order'
    ).length
    const walletCount = allBaseUserNotifications.filter((n) => n.type === 'wallet').length
    const alertsCount = allBaseUserNotifications.filter(
      (n) => n.type === 'system' || n.type === 'broadcast' || n.type === 'promo'
    ).length

    return {
      all: allBaseUserNotifications.length,
      orders: ordersCount,
      wallet: walletCount,
      alerts: alertsCount,
    }
  }, [allBaseUserNotifications])

  // Active filtered notifications list
  const userNotifications = useMemo(() => {
    return allBaseUserNotifications.filter((n) => {
      if (activeFilter === 'orders') {
        return n.type === 'order' || n.type === 'seller_order' || n.type === 'admin_order'
      }
      if (activeFilter === 'wallet') {
        return n.type === 'wallet'
      }
      if (activeFilter === 'alerts') {
        return n.type === 'system' || n.type === 'broadcast' || n.type === 'promo'
      }
      return true
    })
  }, [allBaseUserNotifications, activeFilter])

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 500)
  }

  const handleNotificationPress = (notif: AppNotification) => {
    markAsRead(notif.id)

    if (notif.orderId) {
      if (role === 'admin') {
        router.push('/admin/orders' as any)
      } else if (role === 'seller') {
        router.push('/seller/orders' as any)
      } else {
        router.push(`/order/${notif.orderId}` as any)
      }
    } else if (notif.type === 'order' || notif.type === 'seller_order' || notif.type === 'admin_order') {
      if (role === 'admin') {
        router.push('/admin/orders' as any)
      } else if (role === 'seller') {
        router.push('/seller/orders' as any)
      } else {
        router.push('/orders' as any)
      }
    } else if (notif.type === 'wallet') {
      router.push('/wallet' as any)
    } else if (notif.type === 'promo') {
      router.push('/(tabs)/search' as any)
    }
  }

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

      if (diffMins < 2) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    } catch {
      return 'Recent'
    }
  }

  const getNotifMeta = (type: string) => {
    switch (type) {
      case 'seller_order':
        return {
          ionicon: 'storefront-outline' as const,
          tag: 'Store Order',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          color: '#059669',
        }
      case 'admin_order':
        return {
          ionicon: 'shield-checkmark-outline' as const,
          tag: 'Platform Order',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          color: '#D97706',
        }
      case 'order':
        return {
          ionicon: 'cube-outline' as const,
          tag: 'Delivery',
          bg: 'bg-primary/10',
          border: 'border-primary/20',
          color: '#53B175',
        }
      case 'wallet':
        return {
          ionicon: 'card-outline' as const,
          tag: 'Wallet',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          color: '#2563EB',
        }
      case 'promo':
        return {
          ionicon: 'pricetag-outline' as const,
          tag: 'Special Promo',
          bg: 'bg-pink-50',
          border: 'border-pink-200',
          color: '#DB2777',
        }
      default:
        return {
          ionicon: 'notifications-outline' as const,
          tag: 'Announcement',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          color: '#7C3AED',
        }
    }
  }

  const tabBottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)
  const tabHeight = 70

  return (
    <View className="flex-1 bg-white relative" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Viewport Bounded Content Container ── */}
      <View style={{ flex: 1, marginBottom: tabBottomOffset }} className="overflow-hidden">
        {/* Header matching Find Products Page design */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="pt-2 pb-2 bg-white border-b border-[#F1F1F1]" style={{ backgroundColor: '#ffffff', borderColor: '#F1F1F1' }}>
            <SafeAreaView edges={['top']} className="bg-white px-5 pt-2 pb-2" style={{ backgroundColor: '#ffffff' }}>
              {/* Top Title Row with Cart */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-2xl font-quicksand-bold font-bold text-dark-100">
                    Notifications
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                    Order updates, delivery & account alerts
                  </Text>
                </View>

                <View className="bg-gray-50 border border-[#F1F1F1] rounded-2xl p-1.5" style={{ borderColor: '#F1F1F1' }}>
                  <CartButton />
                </View>
              </View>

              {/* Horizontal Filter Chips */}
              <View className="mt-1">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 10 }}
                  className="flex-row"
                >
                  {(
                    [
                      { key: 'all', label: `All (${counts.all})` },
                      { key: 'orders', label: `Orders (${counts.orders})` },
                      { key: 'wallet', label: `Wallet (${counts.wallet})` },
                      { key: 'alerts', label: `Alerts (${counts.alerts})` },
                    ] as const
                  ).map((chip) => {
                    const isSelected = activeFilter === chip.key
                    return (
                      <TouchableOpacity
                        key={chip.key}
                        onPress={() => setActiveFilter(chip.key)}
                        className={`px-3.5 py-1.5 mr-2 rounded-2xl border flex-row items-center active:scale-95 ${
                          isSelected ? 'bg-primary border-primary' : 'bg-gray-50 border-[#F1F1F1]'
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: '#53B175', borderColor: '#53B175' }
                            : { backgroundColor: '#F9FAFB', borderColor: '#F1F1F1' }
                        }
                      >
                        <Text
                          className={`font-quicksand-semibold text-xs ${
                            isSelected ? 'text-white' : 'text-dark-100'
                          }`}
                        >
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>

              {/* Quick Summary Bar */}
              <View className="flex-row items-center justify-between mt-2.5 px-0.5">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" style={{ backgroundColor: '#53B175' }} />
                  <Text className="text-dark-100 text-xs font-quicksand-semibold">
                    {activeFilter === 'all' ? 'All Alerts' : `${activeFilter.toUpperCase()} Notifications`}
                  </Text>
                </View>
                <Text className="text-[11px] text-gray-400 font-quicksand-medium">
                  {userNotifications.length} Notifications
                </Text>
              </View>
            </SafeAreaView>
          </View>
        </TouchableWithoutFeedback>

        {/* ── Scrollable Notifications List ── */}
        <FlatList
          data={userNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: tabHeight + 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#53B175']}
              tintColor="#53B175"
            />
          }
          ListEmptyComponent={() => (
            <View className="items-center mt-10 px-4">
              <View className="bg-white border border-[#F1F1F1] rounded-3xl p-8 items-center w-full" style={{ borderColor: '#F1F1F1' }}>
                <View className="w-14 h-14 bg-primary/10 rounded-2xl items-center justify-center mb-3">
                  <Ionicons name="notifications-off-outline" size={28} color="#53B175" />
                </View>
                <Text className="text-dark-100 text-base font-quicksand-bold text-center">
                  No Notifications Found
                </Text>
                <Text className="text-gray-400 text-xs font-quicksand-medium mt-1.5 text-center leading-relaxed">
                  {activeFilter === 'all'
                    ? "You're all caught up! New orders, delivery updates, and wallet alerts will appear here in real time."
                    : `No notifications under the "${activeFilter.toUpperCase()}" filter.`}
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            const meta = getNotifMeta(item.type)
            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => handleNotificationPress(item)}
                className="bg-white border border-[#F1F1F1] rounded-2xl p-3.5 mb-3 flex-row items-center active:scale-98"
                style={{ backgroundColor: '#ffffff', borderColor: '#F1F1F1' }}
              >
                {/* Left Icon Square */}
                <View className={`w-10 h-10 rounded-xl ${meta.bg} border ${meta.border} items-center justify-center mr-3`}>
                  <Ionicons name={meta.ionicon} size={18} color={meta.color} />
                </View>

                {/* Content Body */}
                <View className="flex-1 pr-1">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="font-quicksand-bold font-bold text-dark-100 text-sm flex-1 mr-2 leading-tight" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-xs text-gray-400 font-quicksand-medium">
                      {formatTime(item.timestamp)}
                    </Text>
                  </View>

                  <Text className="text-xs font-quicksand-medium text-gray-500 leading-snug" numberOfLines={2}>
                    {item.body}
                  </Text>

                  {/* Bottom Sub-tag */}
                  <View className="mt-2 flex-row items-center justify-between">
                    <View className={`px-2 py-0.5 rounded-full border ${meta.border} ${meta.bg}`}>
                      <Text className="text-[10px] font-quicksand-bold" style={{ color: meta.color }}>
                        {meta.tag}
                      </Text>
                    </View>

                    {item.orderId ? (
                      <Text className="text-xs font-quicksand-bold text-primary" style={{ color: '#53B175' }}>
                        View Order →
                      </Text>
                    ) : item.type === 'promo' ? (
                      <Text className="text-xs font-quicksand-bold text-pink-600">
                        Shop Promo →
                      </Text>
                    ) : (
                      <Text className="text-xs font-quicksand-bold text-gray-400">
                        Details →
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      </View>
    </View>
  )
}
