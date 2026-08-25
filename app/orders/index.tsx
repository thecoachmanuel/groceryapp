import { images } from '@/constants'
import { getAllOrders, getUserOrders } from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type TabKey = 'all' | 'ongoing' | 'past'

const FILTER_TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'past', label: 'Past Orders' },
]

const ONGOING_STATUSES = ['pending', 'order_placed', 'preparing', 'on_the_way', 'processing', 'paid', 'confirmed', 'in_transit']
const PAST_STATUSES = ['delivered', 'cancelled', 'completed', 'refunded', 'done', 'received']

function getStatusBadge(status: string) {
  const s = String(status || '').toLowerCase().trim()
  if (['pending', 'order_placed', 'paid', 'processing', 'confirmed'].includes(s)) {
    return { label: '📝 Placed', color: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-700' }
  }
  if (s === 'preparing') {
    return { label: '🍳 Preparing', color: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-700' }
  }
  if (['on_the_way', 'in_transit'].includes(s)) {
    return { label: '🛵 On the Way', color: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-700' }
  }
  if (['delivered', 'completed', 'done', 'received'].includes(s)) {
    return { label: '🎉 Delivered', color: 'bg-green-500/10 border-green-500/30', text: 'text-green-700' }
  }
  if (['cancelled', 'refunded'].includes(s)) {
    return { label: '❌ Cancelled', color: 'bg-red-500/10 border-red-500/30', text: 'text-red-600' }
  }
  return { label: status || 'Placed', color: 'bg-gray-100 border-gray-300', text: 'text-gray-700' }
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Recent Order'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Recent Order'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Recent Order'
  }
}

function parseItems(raw: any): any[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

export default function CustomerOrdersList() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('ongoing')

  const fetchOrders = async () => {
    try {
      const userId = (user as any)?.$id || (user as any)?.accountId || ''
      let data: any[] = []

      if (userId) {
        try {
          data = await getUserOrders(userId)
        } catch {
          // fall through to getAllOrders
        }
      }

      if (!data || data.length === 0) {
        try {
          const all = await getAllOrders()
          if (userId) {
            data = all.filter((o: any) =>
              o?.userId === userId || (user?.email && o?.userEmail === user.email)
            )
          } else {
            data = all
          }
        } catch {
          data = []
        }
      }

      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [(user as any)?.$id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  const filteredOrders = orders.filter((o) => {
    const status = String(o?.status || 'order_placed').toLowerCase().trim()
    if (activeTab === 'ongoing') return ONGOING_STATUSES.includes(status)
    if (activeTab === 'past') return PAST_STATUSES.includes(status)
    return true
  })

  const renderOrder = ({ item }: { item: any }) => {
    const itemsList = parseItems(item?.items)
    const badge = getStatusBadge(item?.status || 'order_placed')
    const orderId = item?.$id ? String(item.$id).substring(0, 8).toUpperCase() : 'UNKNOWN'
    const dateStr = formatDate(item?.createdAt || item?.$createdAt)
    const isPast = PAST_STATUSES.includes(String(item?.status || '').toLowerCase().trim())

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { if (item?.$id) router.push(`/order/${item.$id}` as any) }}
        className="bg-white rounded-[28px] p-5 mb-4 border-2 border-primary/10 shadow-lg shadow-black/10"
      >
        {/* Order Header */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="font-quicksand-bold text-dark-100 text-base">Order #{orderId}</Text>
            <Text className="text-gray-400 text-xs font-quicksand-medium mt-0.5">{dateStr}</Text>
          </View>
          <View className={`px-3 py-1 rounded-full border ${badge.color}`}>
            <Text className={`font-quicksand-bold text-xs ${badge.text}`}>{badge.label}</Text>
          </View>
        </View>

        {/* Items */}
        {itemsList.length > 0 && (
          <View className="bg-primary/5 rounded-2xl p-3.5 mb-3 border border-primary/10">
            {itemsList.slice(0, 3).map((i: any, idx: number) => (
              <Text key={idx} className="text-gray-700 font-quicksand-semibold text-xs mb-0.5">
                • {i?.quantity || 1}× {i?.name || 'Item'} — ₦{(i?.price || 0) * (i?.quantity || 1)}
              </Text>
            ))}
            {itemsList.length > 3 && (
              <Text className="text-primary font-quicksand-bold text-xs mt-1">+{itemsList.length - 3} more items</Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View className="flex-row justify-between items-center pt-3 border-t-2 border-primary/10">
          <Text className="text-gray-400 font-quicksand-medium text-xs flex-1 mr-2" numberOfLines={1}>
            📍 {item?.deliveryAddress || 'Delivery Location'}
          </Text>
          <Text className="text-primary font-quicksand-bold text-base">
            ₦{Number(item?.totalAmount || 0).toLocaleString()}
          </Text>
        </View>

        {/* Actions */}
        <View className="mt-3 flex-row gap-2">
          <TouchableOpacity
            onPress={() => { if (item?.$id) router.push(`/order/${item.$id}` as any) }}
            className="flex-1 bg-primary/5 rounded-2xl py-2.5 items-center border-2 border-primary/10"
          >
            <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>
              Track Order →
            </Text>
          </TouchableOpacity>

          {isPast && item.status === 'delivered' && !item.isRated && (
            <TouchableOpacity
              onPress={() => { if (item?.$id) router.push(`/order/${item.$id}` as any) }}
              className="bg-amber-500/10 px-4 py-2.5 rounded-2xl items-center border border-amber-500/30"
            >
              <Text className="text-amber-700 font-quicksand-bold text-xs">⭐ Rate Store</Text>
            </TouchableOpacity>
          )}

          {isPast && item.isRated && (
            <View className="bg-primary/10 px-3 py-2.5 rounded-2xl items-center border border-primary/20">
              <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>
                ⭐ {item.reviewRating || 5}/5 Rated
              </Text>
            </View>
          )}

          {!isPast && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  const { updateOrderStatus } = await import('@/lib/appwrite')
                  await updateOrderStatus(item.$id, 'delivered')
                  fetchOrders()
                } catch (e: any) {
                  Alert.alert('Error', e?.message || 'Could not update order.')
                }
              }}
              className="bg-green-500/10 px-4 py-2.5 rounded-2xl items-center border border-green-500/30"
            >
              <Text className="text-green-700 font-quicksand-bold text-xs">Mark Delivered 🎉</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center">
        <TouchableOpacity
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile' as any) }}
          className="p-1"
        >
          <Image source={images.arrowBack} className="size-5" resizeMode="contain" />
        </TouchableOpacity>

        <Text className="text-xl font-quicksand-bold text-dark-100">My Orders</Text>
        <View className="size-5" />
      </View>

      {/* Filter Tabs — rendered outside FlatList to avoid navigation context issues */}
      <View className="py-2 px-5 flex-row gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{ flex: 1 }}
            >
              <View
                className={`py-2.5 rounded-full items-center border-2 ${isActive ? 'bg-primary border-primary' : 'bg-white border-primary/10'
                  }`}
              >
                <Text className={`font-quicksand-bold text-xs ${isActive ? 'text-white' : 'text-dark-100'}`}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, idx) => item?.$id ? String(item.$id) : `order_${idx}`}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#53B175" colors={['#53B175']} />
          }
          ListEmptyComponent={() => (
            <View className="items-center mt-16 px-8">
              <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4 border border-primary/20">
                <Text className="text-3xl">📦</Text>
              </View>
              <Text className="text-dark-100 text-lg font-quicksand-bold mb-2">No Orders Found</Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-sm">
                {activeTab === 'ongoing'
                  ? 'You have no active ongoing orders.'
                  : activeTab === 'past'
                    ? 'No past orders in your history yet.'
                    : "You haven't placed any orders yet."}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}
