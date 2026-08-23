import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getSellerOrders, getMenu, account } from '@/lib/appwrite'
import SidebarDrawer from '@/components/SidebarDrawer'
import useAuthStore from '@/store/auth.store'

export default function SellerDashboard() {
  const router = useRouter()
  const { fetchAuthenticatedUser, sellerStore, user } = useAuthStore()

  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [latestStoreOrder, setLatestStoreOrder] = useState<any>(null)
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeOrders: 0,
    totalProducts: 0,
  })

  const loadSellerMetrics = async () => {
    try {
      const sellerId = sellerStore?.$id
      const [orders, products] = await Promise.all([
        getSellerOrders(sellerId || ''),
        getMenu({ sellerId: sellerId || '' }),
      ])

      const sales = orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0)
      const active = orders.filter((o: any) => ['order_placed', 'preparing', 'on_the_way'].includes(o.status)).length

      setStats({
        totalSales: sales,
        totalOrders: orders.length,
        activeOrders: active,
        totalProducts: products.length,
      })
      if (orders.length > 0) {
        setLatestStoreOrder(orders[0])
      }
    } catch (err) {
      console.error('Error loading seller dashboard metrics:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadSellerMetrics()
  }, [sellerStore])

  const onRefresh = () => {
    setRefreshing(true)
    loadSellerMetrics()
  }

  const handleSellerLogout = async () => {
    Alert.alert('Logout Seller', 'Are you sure you want to log out of your Seller Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await account.deleteSession('current')
            await fetchAuthenticatedUser()
            router.replace('/(auth)/sign-in' as any)
          } catch (err) {
            console.error(err)
          }
        },
      },
    ])
  }

  const storeName = sellerStore?.storeName || `${user?.name || 'Seller'}'s Store`

  return (
    <View className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="light-content" backgroundColor="#53B175" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53B175']} />
        }
      >
        {/* Customer App Design Architecture: Curved Primary Hero Header Spanning Status Bar */}
        <SafeAreaView edges={['top']} className="bg-primary rounded-b-[45px] shadow-lg shadow-black/10" style={{ backgroundColor: '#53B175' }}>
          <View className="px-6 pt-2 pb-14">
            <View className="flex-row justify-between items-center mb-3">
              <TouchableOpacity
                onPress={() => setSidebarVisible(true)}
                className="bg-white/20 border border-white/30 px-3.5 py-1.5 rounded-full flex-row items-center active:opacity-80"
              >
                <Text className="text-white text-base mr-1.5 font-bold">☰</Text>
                <Text className="text-white font-quicksand-bold text-xs uppercase tracking-widest">
                  Menu
                </Text>
              </TouchableOpacity>

              <View className="flex-row gap-2 items-center">
                {/* Store Order Notifications Bell Icon */}
                <TouchableOpacity
                  onPress={() => router.push('/seller/orders' as any)}
                  activeOpacity={0.8}
                  className="bg-white/20 border border-white/30 w-9 h-9 rounded-full items-center justify-center relative"
                >
                  <Ionicons name="notifications-outline" size={19} color="#ffffff" />
                  {stats.activeOrders > 0 && (
                    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[17px] h-[17px] items-center justify-center px-1 border border-white">
                      <Text className="text-[9px] text-white font-bold">
                        {stats.activeOrders > 99 ? '99+' : stats.activeOrders}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)' as any)}
                  className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-full flex-row items-center active:opacity-80"
                >
                  <Text className="text-white font-quicksand-bold text-xs">
                    🛒 Customer Mode
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSellerLogout}
                  activeOpacity={0.8}
                  className="bg-white/20 border border-white/30 w-9 h-9 rounded-full items-center justify-center"
                >
                  <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-white text-3xl font-quicksand-bold leading-tight" numberOfLines={1}>
              {storeName}
            </Text>
            <Text className="text-white/80 font-quicksand-medium text-xs mt-1">
              Store performance & order fulfillment workspace
            </Text>
          </View>
        </SafeAreaView>

        {/* Customer App Design Architecture: Overlapping Main Sales Card */}
        <View className="-mt-8 mx-5 bg-white rounded-[32px] p-6 shadow-xl shadow-black/10 border-2 border-primary/10">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-xs text-gray-400 font-quicksand-semibold uppercase tracking-widest">
                Total Store Revenue
              </Text>
              <Text className="text-dark-100 text-3xl font-quicksand-bold mt-1">
                ₦ {stats.totalSales.toLocaleString()}
              </Text>
            </View>
            <View className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
              <Text className="text-xl">💰</Text>
            </View>
          </View>

          {/* Customer App Accent Line */}
          <View className="h-[2px] w-12 bg-primary rounded-full my-3" />

          {/* Active Order Pipeline Badge */}
          <View className="bg-primary/10 border border-primary/20 rounded-full px-4 py-2 self-start mb-2">
            <Text className="text-primary font-quicksand-semibold text-xs">
              🛵 {stats.activeOrders} Active Orders in Fulfillment Pipeline
            </Text>
          </View>

          {/* Metric Grid Cards */}
          <View className="flex-row flex-wrap gap-3 mt-1">
            <View className="flex-1 min-w-[130px] bg-gray-50/70 rounded-2xl p-3 border border-primary/10">
              <Text className="text-xs font-quicksand-semibold text-gray-500">Active Orders</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mt-0.5">
                👨‍🍳 {stats.activeOrders}
              </Text>
            </View>

            <View className="flex-1 min-w-[130px] bg-gray-50/70 rounded-2xl p-3 border border-primary/10">
              <Text className="text-xs font-quicksand-semibold text-gray-500">Products Catalog</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mt-0.5">
                🍔 {stats.totalProducts}
              </Text>
            </View>

            <View className="flex-1 min-w-[130px] bg-gray-50/70 rounded-2xl p-3 border border-primary/10">
              <Text className="text-xs font-quicksand-semibold text-gray-500">Total Orders</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mt-0.5">
                📑 {stats.totalOrders}
              </Text>
            </View>
          </View>

          {/* Live Store Order Notification Banner */}
          {latestStoreOrder && (
            <TouchableOpacity
              onPress={() => router.push('/seller/orders' as any)}
              activeOpacity={0.88}
              className="mt-4 bg-emerald-500/10 border-2 border-emerald-500/25 rounded-2xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-emerald-500/20 items-center justify-center mr-3">
                  <Text className="text-lg">🏪</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-xs font-quicksand-bold text-emerald-800">
                      Store Order #{latestStoreOrder.$id.slice(-6)}
                    </Text>
                    {stats.activeOrders > 0 && (
                      <View className="ml-2 bg-emerald-500 px-2 py-0.5 rounded-full">
                        <Text className="text-[9px] text-white font-bold">{stats.activeOrders} Action Needed</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[11px] font-quicksand-medium text-gray-600 mt-0.5" numberOfLines={1}>
                    {latestStoreOrder.userName || 'Customer'} • ₦{Number(latestStoreOrder.totalAmount || 0).toLocaleString()} • {latestStoreOrder.status?.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text className="text-emerald-700 font-bold text-sm">→</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="px-5 mt-6">
          {/* Customer App Design Section Header: Indicator Dot + Line */}
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 font-quicksand-bold text-lg">
              Seller Management Workspace
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="small" color="#53B175" />
            </View>
          ) : (
            <View className="gap-3.5">
              {/* 1. Order Fulfillment */}
              <TouchableOpacity
                onPress={() => router.push('/seller/orders' as any)}
                className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 items-center justify-center mr-4">
                    <Text className="text-2xl">👨‍🍳</Text>
                  </View>
                  <View>
                    <Text className="font-quicksand-bold text-dark-100 text-base">
                      Order Fulfillment Pipeline
                    </Text>
                    <Text className="text-gray-400 font-quicksand-medium text-xs">
                      Update order status from Placed ➔ Delivered
                    </Text>
                  </View>
                </View>
                <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center" style={{ backgroundColor: 'rgba(83, 177, 117, 0.1)', borderColor: 'rgba(83, 177, 117, 0.2)' }}>
                  <Text className="text-primary font-bold text-base" style={{ color: '#53B175' }}>→</Text>
                </View>
              </TouchableOpacity>

              {/* 2. Product Inventory CRUD */}
              <TouchableOpacity
                onPress={() => router.push('/seller/products' as any)}
                className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 items-center justify-center mr-4">
                    <Text className="text-2xl">🍔</Text>
                  </View>
                  <View>
                    <Text className="font-quicksand-bold text-dark-100 text-base">
                      Product Inventory Control
                    </Text>
                    <Text className="text-gray-400 font-quicksand-medium text-xs">
                      Add, edit, pricing & upload product images
                    </Text>
                  </View>
                </View>
                <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center" style={{ backgroundColor: 'rgba(83, 177, 117, 0.1)', borderColor: 'rgba(83, 177, 117, 0.2)' }}>
                  <Text className="text-primary font-bold text-base" style={{ color: '#53B175' }}>→</Text>
                </View>
              </TouchableOpacity>

              {/* 3. Store Settings */}
              <TouchableOpacity
                onPress={() => router.push('/seller/store-settings' as any)}
                className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-4">
                    <Text className="text-2xl">⚙️</Text>
                  </View>
                  <View>
                    <Text className="font-quicksand-bold text-dark-100 text-base">
                      Store Profile & Details
                    </Text>
                    <Text className="text-gray-400 font-quicksand-medium text-xs">
                      Address, phone number & cover banner setup
                    </Text>
                  </View>
                </View>
                <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center" style={{ backgroundColor: 'rgba(83, 177, 117, 0.1)', borderColor: 'rgba(83, 177, 117, 0.2)' }}>
                  <Text className="text-primary font-bold text-base" style={{ color: '#53B175' }}>→</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sidebar Drawer Component */}
      <SidebarDrawer
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        type="seller"
      />
    </View>
  )
}
