import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import {
  getAllOrders,
  getStores,
  getCategories,
  getBanners,
  seedDefaultBannersIfEmpty,
  account,
} from '@/lib/appwrite'
import SidebarDrawer from '@/components/SidebarDrawer'
import useAuthStore from '@/store/auth.store'

export default function AdminDashboard() {
  const router = useRouter()
  const { fetchAuthenticatedUser, user } = useAuthStore()

  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeSellers: 0,
    totalCategories: 0,
    totalBanners: 0,
  })

  const [latestOrder, setLatestOrder] = useState<any>(null)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)

  const loadMetricsAndBanners = async () => {
    try {
      setLoading(true)
      await seedDefaultBannersIfEmpty()

      const [orders, stores, categories, bannerList] = await Promise.all([
        getAllOrders().catch(() => []),
        getStores().catch(() => []),
        getCategories().catch(() => []),
        getBanners().catch(() => []),
      ])

      const revenue = orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0)
      const unfulfilledList = orders.filter((o: any) => {
        const norm = String(o.status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
        return !['delivered', 'completed', 'fulfilled', 'cancelled', 'canceled', 'rejected', 'declined'].includes(norm)
      })

      setStats({
        totalRevenue: revenue,
        totalOrders: orders.length,
        activeSellers: stores.length,
        totalCategories: categories.length,
        totalBanners: bannerList.length,
      })
      setActiveOrdersCount(unfulfilledList.length)
      if (unfulfilledList.length > 0) {
        setLatestOrder(unfulfilledList[0])
      } else if (orders.length > 0) {
        setLatestOrder(orders[0])
      }
    } catch (err) {
      console.error('Error loading admin dashboard metrics:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadMetricsAndBanners()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    loadMetricsAndBanners()
  }

  const handleAdminLogout = async () => {
    Alert.alert('Logout Admin', 'Are you sure you want to log out of the Admin Portal?', [
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

  return (
    <View className="flex-1 bg-bg-light">
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
        }
      >
        {/* Customer App Design Architecture: Curved Primary Hero Header Spanning to Status Bar */}
        <SafeAreaView edges={['top']} className="bg-primary rounded-b-[45px] shadow-lg shadow-black/10">
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
                {/* Order Notifications Bell Icon */}
                <TouchableOpacity
                  onPress={() => router.push('/admin/orders' as any)}
                  activeOpacity={0.8}
                  className="bg-white/20 border border-white/30 w-9 h-9 rounded-full items-center justify-center relative"
                >
                  <Ionicons name="notifications-outline" size={19} color="#ffffff" />
                  {activeOrdersCount > 0 && (
                    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[17px] h-[17px] items-center justify-center px-1 border border-white">
                      <Text className="text-[9px] text-white font-bold">
                        {activeOrdersCount > 99 ? '99+' : activeOrdersCount}
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
                  onPress={handleAdminLogout}
                  activeOpacity={0.8}
                  className="bg-white/20 border border-white/30 w-9 h-9 rounded-full items-center justify-center"
                >
                  <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-white text-3xl font-quicksand-bold leading-tight">
              Admin Dashboard
            </Text>
            <Text className="text-white/80 font-quicksand-medium text-xs mt-1">
              Platform management & identity controls
            </Text>
          </View>
        </SafeAreaView>

        {/* Customer App Design Architecture: Overlapping Main Revenue Card */}
        <View className="-mt-8 mx-5 bg-white rounded-[32px] p-6 shadow-xl shadow-black/10 border-2 border-primary/10">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-xs text-gray-400 font-quicksand-semibold uppercase tracking-widest">
                Total Platform Revenue
              </Text>
              <Text className="text-dark-100 text-3xl font-quicksand-bold mt-1">
                ₦ {stats.totalRevenue.toLocaleString()}
              </Text>
            </View>
            <View className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
              <Text className="text-xl">💰</Text>
            </View>
          </View>

          {/* Customer App Design Accent Line */}
          <View className="h-[2px] w-12 bg-primary rounded-full my-3" />

          {/* Metric Grid Cards with Customer App Rectangular Outlines */}
          <View className="flex-row flex-wrap gap-3 mt-1">
            <View className="flex-1 min-w-[130px] bg-gray-50/70 rounded-2xl p-3 border border-primary/10">
              <Text className="text-xs font-quicksand-semibold text-gray-500">Banner Ads</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mt-0.5">
                📢 {stats.totalBanners}
              </Text>
            </View>

            <View className="flex-1 min-w-[130px] bg-gray-50/70 rounded-2xl p-3 border border-primary/10">
              <Text className="text-xs font-quicksand-semibold text-gray-500">Active Sellers</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mt-0.5">
                🏪 {stats.activeSellers}
              </Text>
            </View>

            <View className="flex-1 min-w-[130px] bg-gray-50/70 rounded-2xl p-3 border border-primary/10">
              <Text className="text-xs font-quicksand-semibold text-gray-500">Categories</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mt-0.5">
                🏷️ {stats.totalCategories}
              </Text>
            </View>

            <View className="flex-1 min-w-[130px] bg-gray-50/70 rounded-2xl p-3 border border-primary/10">
              <Text className="text-xs font-quicksand-semibold text-gray-500">Total Orders</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mt-0.5">
                📦 {stats.totalOrders}
              </Text>
            </View>
          </View>

          {/* Live Platform Order Notification Banner */}
          {latestOrder && (
            <TouchableOpacity
              onPress={() => router.push('/admin/orders' as any)}
              activeOpacity={0.88}
              className="mt-4 bg-emerald-500/10 border-2 border-emerald-500/25 rounded-2xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-emerald-500/20 items-center justify-center mr-3">
                  <Text className="text-lg">🔔</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-xs font-quicksand-bold text-emerald-800">
                      Latest Platform Order #{latestOrder.$id.slice(-6)}
                    </Text>
                    {activeOrdersCount > 0 && (
                      <View className="ml-2 bg-emerald-500 px-2 py-0.5 rounded-full">
                        <Text className="text-[9px] text-white font-bold">{activeOrdersCount} Pending</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[11px] font-quicksand-medium text-gray-600 mt-0.5" numberOfLines={1}>
                    {latestOrder.userName || 'Customer'} • ₦{Number(latestOrder.totalAmount || 0).toLocaleString()} • {latestOrder.status?.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text className="text-emerald-700 font-bold text-sm">→</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="px-5 mt-6">
          {/* Section Header: Indicator Dot + Line */}
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 font-quicksand-bold text-lg">
              Management Modules
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          {/* Customer App Design Architecture Card Modules */}
          <View className="gap-3.5">
            {/* 0. App Branding & Logo Customizer */}
            <TouchableOpacity
              onPress={() => router.push('/admin/branding' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/20 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mr-4">
                  <Text className="text-2xl">🎨</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-quicksand-bold text-dark-100 text-base mr-2">
                      App Branding & Identity
                    </Text>
                    <View className="bg-primary/15 px-2 py-0.5 rounded-full border border-primary/25">
                      <Text className="text-[10px] text-primary font-quicksand-bold">Live ✨</Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Customize app display name, logo upload & tagline
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 0.5. Broadcast & Promo Center */}
            <TouchableOpacity
              onPress={() => router.push('/admin/broadcast' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/20 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">📣</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-quicksand-bold text-dark-100 text-base mr-2">
                      Broadcast & Promo Center
                    </Text>
                    <View className="bg-violet-500/15 px-2 py-0.5 rounded-full border border-violet-500/25">
                      <Text className="text-[10px] text-violet-700 font-quicksand-bold">New ✨</Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Send instant push alerts & promo codes to customers & sellers
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 0.6. All Orders & Fulfillment Center */}
            <TouchableOpacity
              onPress={() => router.push('/admin/orders' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/20 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mr-4">
                  <Text className="text-2xl">📦</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-quicksand-bold text-dark-100 text-base mr-2">
                      All Orders & Live Activity
                    </Text>
                    {activeOrdersCount > 0 && (
                      <View className="bg-emerald-500 px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] text-white font-bold">{activeOrdersCount} Pending</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Track all customer orders, delivery status & history ({stats.totalOrders} total)
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 1. Home Tab Banner Ads */}
            <TouchableOpacity
              onPress={() => router.push('/admin/banners' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">📢</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Home Tab Banner Ads
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Manage home banner graphics, titles, priority & colors
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 2. Global Products Manager */}
            <TouchableOpacity
              onPress={() => router.push('/admin/products' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">🍔</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Global Products Inventory
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Manage all products & filter per seller store
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 3. Seller & Store Management */}
            <TouchableOpacity
              onPress={() => router.push('/admin/sellers' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">🏪</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Sellers & Stores Control
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Create sellers, toggle status & commissions
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 4. Category Management */}
            <TouchableOpacity
              onPress={() => router.push('/admin/categories' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">🏷️</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Global Product Categories
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Add, edit & manage system categories
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 5. Global Orders Supervision */}
            <TouchableOpacity
              onPress={() => router.push('/admin/orders' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">📦</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Global Orders Supervision
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    View customer orders & force status updates
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 6. Customer Accounts & Wallet Financials */}
            <TouchableOpacity
              onPress={() => router.push('/admin/customers' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">👥</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Customer Accounts & Wallets
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Inspect wallets, suspend & credit/debit funds
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 7. Promotions & Coupon Codes */}
            <TouchableOpacity
              onPress={() => router.push('/admin/coupons' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">🎟️</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Promotions & Coupon Codes
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Create promo coupons, flat/percentage discounts
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>

            {/* 8. Seller Policy Enforcement */}
            <TouchableOpacity
              onPress={() => router.push('/admin/policies' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">⚙️</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Seller Policy Enforcement
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Single/Multi cart mode & product approval rules
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base">→</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sidebar Drawer Component */}
      <SidebarDrawer
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        type="admin"
      />
    </View>
  )
}
