import useAuthStore from '@/store/auth.store'
import useNotificationStore, { AppNotification } from '@/store/notification.store'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function NotificationsScreen() {
  const router = useRouter()
  const { user, role, sellerStore, isAdmin } = useAuthStore()
  const { getFilteredNotifications, markAsRead, markAllAsRead } = useNotificationStore()

  const [activeFilter, setActiveFilter] = useState<'all' | 'orders' | 'wallet' | 'alerts'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const currentUserId = user?.$id || (user as any)?.accountId
  const sellerStoreId = sellerStore?.$id || (user as any)?.storeId

  // Auto-mark notifications as read immediately when the user views the Notifications screen
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
        return { icon: '🏪', tag: 'Store Order', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-700' }
      case 'admin_order':
        return { icon: '👑', tag: 'Platform Order', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-700' }
      case 'order':
        return { icon: '📦', tag: 'Delivery', bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' }
      case 'wallet':
        return { icon: '💳', tag: 'Wallet', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-700' }
      case 'promo':
        return { icon: '🎟️', tag: 'Special Promo', bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-700' }
      default:
        return { icon: '📢', tag: 'Announcement', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-700' }
    }
  }

  return (
    <View className="flex-1 bg-bg-light">
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />

      {/* Header Banner spanning into status bar */}
      <SafeAreaView edges={['top']} className="bg-primary rounded-b-[40px] shadow-lg shadow-primary/30">
        <View className="px-6 pt-3 pb-8">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-[11px] uppercase tracking-wider font-quicksand-bold">
                {role === 'admin' ? '👑 Admin Alert Center' : role === 'seller' ? '🏪 Seller Inbox' : '🥬 Customer Inbox'}
              </Text>
            </View>

            {isAdmin && (
              <TouchableOpacity
                onPress={() => router.push('/admin/broadcast' as any)}
                className="bg-white/20 border border-white/30 px-3 py-1 rounded-full active:opacity-80 flex-row items-center"
              >
                <Text className="text-white font-quicksand-bold text-xs">+ Broadcast 📣</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-white text-2xl font-quicksand-bold">
                Notifications
              </Text>
              <Text className="text-white/80 text-xs font-quicksand-medium mt-0.5">
                Automatically updated & marked as read
              </Text>
            </View>

            <View className="bg-white/20 px-3 py-1.5 rounded-2xl border border-white/30 items-center justify-center">
              <Text className="text-white font-quicksand-bold text-sm">
                🔔 {allBaseUserNotifications.length}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Filter Chips with Real-Time Counters */}
      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {(
            [
              { key: 'all', label: `All (${counts.all})` },
              { key: 'orders', label: `Orders 📦 (${counts.orders})` },
              { key: 'wallet', label: `Wallet 💳 (${counts.wallet})` },
              { key: 'alerts', label: `Alerts 🔔 (${counts.alerts})` },
            ] as const
          ).map((chip) => {
            const isSelected = activeFilter === chip.key

            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setActiveFilter(chip.key)}
                className={`px-3.5 py-2 mr-2 rounded-2xl border-2 ${isSelected
                  ? 'bg-primary border-primary'
                  : 'bg-white border-primary/10'
                  }`}
              >
                <Text
                  className={`font-quicksand-bold text-xs ${isSelected ? 'text-white' : 'text-dark-100'
                    }`}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Notification Feed */}
      <FlatList
        data={userNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 130 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="items-center mt-12 px-8">
            <View className="bg-white border-2 border-primary/15 rounded-[36px] px-8 py-10 items-center shadow-lg shadow-black/5 w-full">
              <View className="w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center mb-3 border border-primary/20">
                <Text className="text-3xl">📭</Text>
              </View>
              <Text className="text-dark-100 text-lg font-quicksand-bold">
                No Notifications Found
              </Text>
              <Text className="text-gray-400 text-xs font-quicksand-medium mt-1.5 text-center leading-relaxed">
                {activeFilter === 'all'
                  ? "You're all caught up! New orders, status changes, and balance alerts will appear here in real time."
                  : `No notifications under the "${activeFilter.toUpperCase()}" filter category.`}
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
              className={`rounded-[26px] p-4 mb-3 border-2 shadow-sm ${item.read
                ? 'bg-white border-primary/10'
                : 'bg-green-50/50 border-primary/30 shadow-primary/10'
                }`}
            >
              <View className="flex-row items-start">
                <View className={`w-11 h-11 rounded-2xl ${meta.bg} border ${meta.border} items-center justify-center mr-3 mt-0.5`}>
                  <Text className="text-xl">{meta.icon}</Text>
                </View>

                <View className="flex-1 pr-2">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Text className="font-quicksand-bold text-dark-100 text-sm mr-2" numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-gray-400 font-quicksand-medium">
                      {formatTime(item.timestamp)}
                    </Text>
                  </View>

                  <Text className="text-xs font-quicksand-medium text-gray-600 leading-relaxed">
                    {item.body}
                  </Text>

                  <View className="mt-2.5 flex-row items-center justify-between">
                    <View className={`px-2.5 py-0.5 rounded-full border ${meta.border} ${meta.bg}`}>
                      <Text className={`text-[10px] font-quicksand-bold ${meta.text}`}>
                        {meta.tag}
                      </Text>
                    </View>

                    {item.orderId ? (
                      <Text className="text-[11px] font-quicksand-bold text-primary">
                        View Details →
                      </Text>
                    ) : item.type === 'promo' ? (
                      <Text className="text-[11px] font-quicksand-bold text-pink-600">
                        Shop Promo →
                      </Text>
                    ) : null}
                  </View>
                </View>

                {!item.read && (
                  <View className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5" />
                )}
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}
