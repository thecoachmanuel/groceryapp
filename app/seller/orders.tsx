import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { getSellerOrders, updateOrderStatus, getAllOrders } from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import { images } from '@/constants'

const STATUS_FILTERS = ['all', 'order_placed', 'preparing', 'on_the_way', 'delivered']

export default function SellerOrders() {
  const router = useRouter()
  const { sellerStore } = useAuthStore()
  const sellerId = sellerStore?.$id || ''

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')

  const fetchOrders = async () => {
    try {
      let data = await getSellerOrders(sellerId)
      // Fallback: If sellerId hasn't been set on older orders, load all orders
      if (!data || data.length === 0) {
        data = await getAllOrders().catch(() => [])
      }
      setOrders(data)
    } catch (err) {
      console.error('Error fetching seller orders:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 6000)
    return () => clearInterval(interval)
  }, [sellerId])

  const onRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus)
      Alert.alert('Fulfillment Progressed', `Order status updated to "${newStatus.replace(/_/g, ' ')}"`)
      fetchOrders()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update order status')
    }
  }

  const filteredOrders = orders.filter((o) =>
    activeFilter === 'all' ? true : o.status === activeFilter,
  )

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-primary/10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 bg-white border border-primary/15 rounded-2xl shadow-sm active:opacity-70"
        >
          <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-lg font-quicksand-bold text-dark-100">
            Order Fulfillment Pipeline
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            Store Orders Management
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {/* Filter Tabs */}
      <View className="py-3 px-5 bg-white border-b border-gray-100">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(item)}
              className={`px-4 py-2 rounded-full mr-3 border ${
                activeFilter === item
                  ? 'bg-primary border-primary'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text
                className={`font-quicksand-bold text-xs capitalize ${
                  activeFilter === item ? 'text-white' : 'text-gray-600'
                }`}
              >
                {item.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="p-5 pb-32"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53B175']} />
          }
          ListEmptyComponent={() => (
            <View className="items-center mt-20">
              <Text className="text-4xl mb-3">👨‍🍳</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mb-1">
                No Orders in Pipeline
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-sm">
                No incoming orders match the selected status filter.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const items = item.items ? JSON.parse(item.items) : []
            return (
              <View className="bg-white rounded-[28px] p-5 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
                    <View className="flex-1">
                      <Text className="font-quicksand-bold text-dark-100 text-base" numberOfLines={1}>
                        {item.userName || 'Customer Order'}
                      </Text>
                      <Text className="text-gray-400 text-xs font-quicksand-medium" numberOfLines={1}>
                        {item.userEmail}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    <Text className="text-primary font-quicksand-bold text-xs uppercase">
                      {item.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                {/* Items */}
                <View className="bg-primary/5 rounded-2xl p-4 mb-3 border border-primary/10">
                  {items.map((i: any, idx: number) => (
                    <Text key={idx} className="text-gray-700 font-quicksand-semibold text-xs mb-1">
                      • {i.quantity}x {i.name} (₦ {i.price})
                    </Text>
                  ))}
                  <View className="h-px bg-primary/10 my-2" />
                  <Text className="text-primary font-quicksand-bold text-base">
                    Order Total: ₦ {Number(item.totalAmount || 0).toLocaleString()}
                  </Text>
                </View>

                <Text className="text-gray-600 font-quicksand-semibold text-xs mb-4">
                  📍 Shipping Address: {item.deliveryAddress || 'Not provided'}
                </Text>

                {/* Redesigned 4-Step Status Progress Pipeline Buttons */}
                <View className="pt-3 border-t-2 border-primary/10">
                  <Text className="text-xs font-quicksand-bold text-gray-400 mb-3 uppercase tracking-wider">
                    Update Store Fulfillment Pipeline:
                  </Text>

                  <View className="flex-row flex-wrap gap-2">
                    {[
                      { key: 'order_placed', label: '📝 Placed' },
                      { key: 'preparing', label: '🍳 Preparing' },
                      { key: 'on_the_way', label: '🛵 On the Way' },
                      { key: 'delivered', label: '🎉 Delivered' },
                    ].map((st) => {
                      const isActive = item.status === st.key
                      return (
                        <TouchableOpacity
                          key={st.key}
                          onPress={() => handleUpdateStatus(item.$id, st.key)}
                          className={`px-3.5 py-2.5 rounded-2xl border-2 flex-row items-center ${
                            isActive
                              ? 'bg-primary border-primary shadow-md shadow-primary/20'
                              : 'bg-white border-primary/15'
                          }`}
                        >
                          <Text
                            className={`font-quicksand-bold text-xs ${
                              isActive ? 'text-white' : 'text-dark-100'
                            }`}
                          >
                            {st.label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}
