import { images } from '@/constants'
import { account, getAllOrders, updateOrderStatus } from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import useNotificationStore from '@/store/notification.store'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

function normalizeStatus(rawStatus?: string): 'order_placed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled' {
  if (!rawStatus) return 'order_placed'
  const s = String(rawStatus).trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (['order_placed', 'placed', 'pending', 'new', 'unfulfilled'].includes(s)) return 'order_placed'
  if (['preparing', 'processing', 'in_prep', 'in_kitchen', 'prep'].includes(s)) return 'preparing'
  if (['on_the_way', 'in_transit', 'out_for_delivery', 'dispatched', 'shipped'].includes(s)) return 'on_the_way'
  if (['delivered', 'completed', 'fulfilled', 'received'].includes(s)) return 'delivered'
  if (['cancelled', 'canceled', 'rejected', 'declined', 'failed'].includes(s)) return 'cancelled'
  return 'order_placed'
}

function isOrderUnfulfilled(rawStatus?: string): boolean {
  const norm = normalizeStatus(rawStatus)
  return norm === 'order_placed' || norm === 'preparing' || norm === 'on_the_way'
}

const STATUS_FILTERS = [
  { key: 'unfulfilled', label: '⏳ Unfulfilled' },
  { key: 'all', label: 'All Orders' },
  { key: 'order_placed', label: '📦 Placed' },
  { key: 'preparing', label: '🍳 Preparing' },
  { key: 'on_the_way', label: '🛵 On the Way' },
  { key: 'delivered', label: '✅ Delivered' },
  { key: 'cancelled', label: '❌ Cancelled' },
]

export default function AdminOrders() {
  const router = useRouter()
  const { fetchAuthenticatedUser } = useAuthStore()
  const { markAllAsRead } = useNotificationStore()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('unfulfilled')
  const [loggingOut, setLoggingOut] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Auto-mark admin order notifications as read when viewing this screen
  useFocusEffect(
    useCallback(() => {
      markAllAsRead('admin')
    }, [])
  )

  const fetchOrders = async () => {
    try {
      const data = await getAllOrders()
      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching admin orders:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 8000)
    return () => clearInterval(interval)
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  const handleAdminLogout = async () => {
    Alert.alert('Logout Admin', 'Are you sure you want to log out of the Admin Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true)
            await account.deleteSession('current')
            await fetchAuthenticatedUser()
            router.replace('/(auth)/sign-in' as any)
          } catch (err) {
            console.error(err)
          } finally {
            setLoggingOut(false)
          }
        },
      },
    ])
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId)
      await updateOrderStatus(orderId, newStatus)
      Alert.alert('Status Updated ✅', `Order #${orderId.slice(-6)} changed to "${newStatus.replace(/_/g, ' ').toUpperCase()}"`)
      await fetchOrders()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update status')
    } finally {
      setUpdatingId(null)
    }
  }

  // Parse items safely into a readable text summary
  const parseItemsList = (itemsData: any) => {
    if (!itemsData) return 'Grocery Package'
    if (typeof itemsData === 'string') {
      try {
        const parsed = JSON.parse(itemsData)
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => `${p.name || p.title || 'Item'} (x${p.quantity || 1})`).join(', ')
        }
        return itemsData
      } catch {
        return itemsData
      }
    } else if (Array.isArray(itemsData)) {
      return itemsData.map((p: any) => `${p.name || p.title || 'Item'} (x${p.quantity || 1})`).join(', ')
    }
    return 'Grocery Package'
  }

  // Accurate unfulfilled and breakdown metrics
  const metrics = useMemo(() => {
    let unfulfilledCount = 0
    let placed = 0
    let preparing = 0
    let onTheWay = 0
    let delivered = 0
    let cancelled = 0
    let totalUnfulfilledValue = 0

    orders.forEach((o) => {
      const norm = normalizeStatus(o?.status)
      const amt = Number(o?.totalAmount) || 0

      if (norm === 'order_placed') {
        placed++
        unfulfilledCount++
        totalUnfulfilledValue += amt
      } else if (norm === 'preparing') {
        preparing++
        unfulfilledCount++
        totalUnfulfilledValue += amt
      } else if (norm === 'on_the_way') {
        onTheWay++
        unfulfilledCount++
        totalUnfulfilledValue += amt
      } else if (norm === 'delivered') {
        delivered++
      } else if (norm === 'cancelled') {
        cancelled++
      }
    })

    return {
      allCount: orders.length,
      unfulfilledCount,
      placed,
      preparing,
      onTheWay,
      delivered,
      cancelled,
      totalUnfulfilledValue,
    }
  }, [orders])

  // Filtered orders list based on selected filter
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const norm = normalizeStatus(o?.status)
      if (activeFilter === 'unfulfilled') {
        return isOrderUnfulfilled(o?.status)
      }
      if (activeFilter === 'all') return true
      return norm === activeFilter
    })
  }, [orders, activeFilter])

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-primary/10">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.replace('/admin/dashboard' as any)
            }
          }}
          className="p-2 bg-white border border-primary/15 rounded-2xl shadow-sm active:opacity-70"
        >
          <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-lg font-quicksand-bold text-dark-100">
            Orders Supervision
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            👑 Admin Fulfillment Pipeline
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleAdminLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
          className="bg-red-500/10 px-3.5 py-1.5 rounded-full border border-red-500/20 flex-row items-center gap-1.5"
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#F14141" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={15} color="#DC2626" />
              <Text className="text-red-600 font-quicksand-bold text-xs">
                Logout
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Unfulfilled Orders Real-Time Queue Card */}
      <View className="mx-5 mt-4 bg-white rounded-[28px] p-5 border-2 border-primary/20 shadow-lg shadow-black/5">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center">
              <View className={`w-2.5 h-2.5 rounded-full mr-2 ${metrics.unfulfilledCount > 0 ? 'bg-amber-500' : 'bg-primary'}`} />
              <Text className="text-xs font-quicksand-bold text-gray-400 uppercase tracking-wider">
                Unfulfilled Orders Pipeline
              </Text>
            </View>
            <Text className="text-2xl font-quicksand-bold text-dark-100 mt-1">
              ⏳ {metrics.unfulfilledCount} {metrics.unfulfilledCount === 1 ? 'Order' : 'Orders'} Pending
            </Text>
            <Text className="text-xs font-quicksand-bold text-primary mt-0.5">
              Pipeline Value: ₦{metrics.totalUnfulfilledValue.toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setActiveFilter('unfulfilled')}
            className={`border px-3.5 py-2.5 rounded-2xl items-center ${activeFilter === 'unfulfilled'
                ? 'bg-amber-500 border-amber-600'
                : 'bg-amber-500/15 border-amber-500/30'
              }`}
          >
            <Text
              className={`font-quicksand-bold text-base ${activeFilter === 'unfulfilled' ? 'text-white' : 'text-amber-800'
                }`}
            >
              {metrics.unfulfilledCount}
            </Text>
            <Text
              className={`text-[9px] font-quicksand-bold uppercase ${activeFilter === 'unfulfilled' ? 'text-white' : 'text-amber-800'
                }`}
            >
              Action Req.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Breakdown Stage Chips */}
        <View className="flex-row gap-2 mt-3 pt-3 border-t border-primary/10">
          <TouchableOpacity
            onPress={() => setActiveFilter('order_placed')}
            className={`flex-1 p-2 rounded-xl border items-center ${activeFilter === 'order_placed'
                ? 'bg-blue-500 border-blue-600'
                : 'bg-blue-50/70 border-blue-200'
              }`}
          >
            <Text className={`text-[10px] font-quicksand-bold ${activeFilter === 'order_placed' ? 'text-white' : 'text-blue-700'}`}>
              📦 Placed: {metrics.placed}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('preparing')}
            className={`flex-1 p-2 rounded-xl border items-center ${activeFilter === 'preparing'
                ? 'bg-amber-500 border-amber-600'
                : 'bg-amber-50/70 border-amber-200'
              }`}
          >
            <Text className={`text-[10px] font-quicksand-bold ${activeFilter === 'preparing' ? 'text-white' : 'text-amber-700'}`}>
              🍳 Prep: {metrics.preparing}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('on_the_way')}
            className={`flex-1 p-2 rounded-xl border items-center ${activeFilter === 'on_the_way'
                ? 'bg-purple-500 border-purple-600'
                : 'bg-purple-50/70 border-purple-200'
              }`}
          >
            <Text className={`text-[10px] font-quicksand-bold ${activeFilter === 'on_the_way' ? 'text-white' : 'text-purple-700'}`}>
              🛵 Transit: {metrics.onTheWay}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips Carousel with Live Accurate Counts */}
      <View className="py-3 px-5">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.key
            const badge =
              item.key === 'unfulfilled'
                ? metrics.unfulfilledCount
                : item.key === 'all'
                  ? metrics.allCount
                  : item.key === 'order_placed'
                    ? metrics.placed
                    : item.key === 'preparing'
                      ? metrics.preparing
                      : item.key === 'on_the_way'
                        ? metrics.onTheWay
                        : item.key === 'delivered'
                          ? metrics.delivered
                          : metrics.cancelled

            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.key)}
                className={`px-3.5 py-2 rounded-full mr-2.5 border-2 flex-row items-center ${isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-white border-primary/15'
                  }`}
              >
                <Text
                  className={`font-quicksand-bold text-xs ${isSelected ? 'text-white' : 'text-dark-100'
                    }`}
                >
                  {item.label}
                </Text>
                {badge !== undefined && (
                  <View
                    className={`ml-1.5 px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/30' : 'bg-primary/10'
                      }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-primary'
                        }`}
                    >
                      {badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, index) => item?.$id || String(index)}
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53B175']} />
          }
          ListEmptyComponent={() => (
            <View className="items-center mt-12 px-6">
              <View className="bg-white border-2 border-primary/15 rounded-[32px] p-8 items-center w-full shadow-sm">
                <Text className="text-3xl mb-2">
                  {activeFilter === 'unfulfilled' ? '🎉' : '📭'}
                </Text>
                <Text className="text-lg font-quicksand-bold text-dark-100 text-center">
                  {activeFilter === 'unfulfilled'
                    ? 'All Caught Up! No Unfulfilled Orders'
                    : 'No Orders Found'}
                </Text>
                <Text className="text-gray-400 text-xs font-quicksand-medium text-center mt-1.5 leading-relaxed">
                  {activeFilter === 'unfulfilled'
                    ? 'All orders in the platform database have either been delivered or processed.'
                    : `No customer orders match the selected filter.`}
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            if (!item) return null
            const norm = normalizeStatus(item.status)
            const isUnfulfilled = isOrderUnfulfilled(item.status)
            const itemsText = parseItemsList(item.items || item.itemsSummary)
            const isThisUpdating = updatingId === item.$id
            const orderIdShort = item.$id ? item.$id.slice(-6) : '000000'

            return (
              <View className="bg-white rounded-[28px] p-5 mb-4 border-2 border-primary/10 shadow-lg shadow-black/5">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center">
                      <Text className="font-quicksand-bold text-dark-100 text-base">
                        Order #{orderIdShort}
                      </Text>
                      {isUnfulfilled && (
                        <View className="ml-2 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          <Text className="text-[9px] text-amber-800 font-bold">Pending</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                      Customer: <Text className="text-dark-100 font-quicksand-bold">{item.userName || item.userEmail || 'Client'}</Text>
                    </Text>
                  </View>

                  <View
                    className={`px-3 py-1 rounded-full border ${norm === 'delivered'
                        ? 'bg-green-500/10 border-green-500/20'
                        : norm === 'cancelled'
                          ? 'bg-red-500/10 border-red-500/20'
                          : norm === 'preparing'
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : norm === 'on_the_way'
                              ? 'bg-purple-500/10 border-purple-500/30'
                              : 'bg-blue-500/10 border-blue-500/30'
                      }`}
                  >
                    <Text
                      className={`font-quicksand-bold text-xs capitalize ${norm === 'delivered'
                          ? 'text-green-700'
                          : norm === 'cancelled'
                            ? 'text-red-600'
                            : norm === 'preparing'
                              ? 'text-amber-700'
                              : norm === 'on_the_way'
                                ? 'text-purple-700'
                                : 'text-blue-700'
                        }`}
                    >
                      {norm.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                {/* Items & Address Details */}
                <View className="bg-gray-50/70 rounded-2xl p-3.5 mb-3 border border-primary/10">
                  <Text className="font-quicksand-medium text-xs text-gray-700 leading-relaxed mb-1.5">
                    🛒 <Text className="font-quicksand-bold">Items:</Text> {itemsText}
                  </Text>
                  <Text className="font-quicksand-medium text-xs text-gray-500">
                    📍 <Text className="font-quicksand-bold">Delivery:</Text> {item.address || item.deliveryAddress || 'Standard Delivery'}
                  </Text>
                  {item.createdAt || item.$createdAt ? (
                    <Text className="font-quicksand-medium text-[10px] text-gray-400 mt-1">
                      🕒 Placed on: {new Date(item.createdAt || item.$createdAt).toLocaleString('en-GB')}
                    </Text>
                  ) : null}
                </View>

                {/* Order Financials & Action Buttons */}
                <View className="pt-2 border-t border-primary/10 flex-row justify-between items-center">
                  <View>
                    <Text className="text-[10px] text-gray-400 font-quicksand-semibold uppercase">Total Amount</Text>
                    <Text className="text-primary font-quicksand-bold text-base">
                      ₦{Number(item.totalAmount || 0).toLocaleString()}
                    </Text>
                  </View>

                  {/* Status Action Buttons */}
                  {isThisUpdating ? (
                    <ActivityIndicator size="small" color="#53B175" />
                  ) : (
                    <View className="flex-row gap-2">
                      {norm === 'order_placed' && (
                        <TouchableOpacity
                          onPress={() => handleUpdateStatus(item.$id, 'preparing')}
                          className="bg-amber-500 px-3.5 py-2 rounded-xl shadow-sm active:opacity-80"
                        >
                          <Text className="text-white font-quicksand-bold text-xs">Start Prep 🍳</Text>
                        </TouchableOpacity>
                      )}
                      {norm === 'preparing' && (
                        <TouchableOpacity
                          onPress={() => handleUpdateStatus(item.$id, 'on_the_way')}
                          className="bg-blue-500 px-3.5 py-2 rounded-xl shadow-sm active:opacity-80"
                        >
                          <Text className="text-white font-quicksand-bold text-xs">Dispatch 🛵</Text>
                        </TouchableOpacity>
                      )}
                      {norm === 'on_the_way' && (
                        <TouchableOpacity
                          onPress={() => handleUpdateStatus(item.$id, 'delivered')}
                          className="bg-primary px-3.5 py-2 rounded-xl shadow-sm active:opacity-80"
                        >
                          <Text className="text-white font-quicksand-bold text-xs">Mark Delivered ✅</Text>
                        </TouchableOpacity>
                      )}
                      {isUnfulfilled && (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert('Cancel Order', `Are you sure you want to cancel order #${orderIdShort}?`, [
                              { text: 'No', style: 'cancel' },
                              { text: 'Cancel Order', style: 'destructive', onPress: () => handleUpdateStatus(item.$id, 'cancelled') },
                            ])
                          }}
                          className="bg-red-500/10 border border-red-500/20 px-2.5 py-2 rounded-xl active:opacity-80"
                        >
                          <Text className="text-red-600 font-quicksand-bold text-xs">✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}
