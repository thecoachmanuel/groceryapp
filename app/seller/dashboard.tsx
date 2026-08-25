import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  getSellerOrders,
  getMenu,
  getSellerFinancialSummary,
  requestSellerPayout,
  getStoreReviews,
  account,
} from '@/lib/appwrite'
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

  // Financials & Payouts State
  const [financials, setFinancials] = useState({
    grossSales: 0,
    commissionRate: 10.0,
    commissionDeducted: 0,
    netEarnings: 0,
    totalPaidOut: 0,
    totalPendingPayout: 0,
    availableBalance: 0,
    totalOrders: 0,
    payoutsHistory: [] as any[],
  })

  // Store Reviews State
  const [storeReviews, setStoreReviews] = useState<any[]>([])

  // Payout Request Modal
  const [payoutModalVisible, setPayoutModalVisible] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [bankName, setBankName] = useState(sellerStore?.bankName || '')
  const [accountNumber, setAccountNumber] = useState(sellerStore?.accountNumber || '')
  const [accountName, setAccountName] = useState(sellerStore?.accountName || user?.name || '')
  const [submittingPayout, setSubmittingPayout] = useState(false)

  const loadSellerData = async () => {
    try {
      const sellerId = sellerStore?.$id
      if (!sellerId) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      const [orders, products, finData, reviews] = await Promise.all([
        getSellerOrders(sellerId),
        getMenu({ sellerId }),
        getSellerFinancialSummary(sellerId),
        getStoreReviews(sellerId),
      ])

      const sales = orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0)
      const active = orders.filter((o: any) =>
        ['order_placed', 'preparing', 'on_the_way'].includes(o.status)
      ).length

      setStats({
        totalSales: sales,
        totalOrders: orders.length,
        activeOrders: active,
        totalProducts: products.length,
      })

      setFinancials(finData)
      setStoreReviews(reviews)

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
    loadSellerData()
  }, [sellerStore])

  const onRefresh = () => {
    setRefreshing(true)
    loadSellerData()
  }

  const handleRequestPayout = async () => {
    const amountNum = Number(payoutAmount)
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      return Alert.alert('Invalid Amount', 'Please enter a valid payout amount in Naira (₦).')
    }

    if (amountNum > financials.availableBalance) {
      return Alert.alert(
        'Insufficient Balance',
        `Requested amount (₦${amountNum.toLocaleString()}) exceeds your available payout balance of ₦${financials.availableBalance.toLocaleString()}.`
      )
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      return Alert.alert(
        'Bank Details Required',
        'Please enter your bank name, 10-digit account number, and beneficiary account name.'
      )
    }

    if (accountNumber.trim().length < 10) {
      return Alert.alert('Invalid Account Number', 'Please enter a valid 10-digit Nigerian NUBAN account number.')
    }

    setSubmittingPayout(true)
    try {
      await requestSellerPayout({
        sellerId: sellerStore!.$id,
        storeName: sellerStore?.storeName || 'Seller Store',
        amount: amountNum,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      })

      setPayoutModalVisible(false)
      setPayoutAmount('')
      await loadSellerData()

      Alert.alert(
        'Payout Request Submitted! 💸',
        `Your payout request for ₦${amountNum.toLocaleString()} has been sent to the Admin team for approval.`
      )
    } catch (err: any) {
      Alert.alert('Payout Error', err.message || 'Could not submit payout request.')
    } finally {
      setSubmittingPayout(false)
    }
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
  const avgRating = sellerStore?.rating != null ? Number(sellerStore.rating).toFixed(1) : '5.0'
  const totalReviewsCount = sellerStore?.totalReviews || storeReviews.length

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

            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-white text-3xl font-quicksand-bold leading-tight" numberOfLines={1}>
                  {storeName}
                </Text>
                <Text className="text-white/80 font-quicksand-medium text-xs mt-1">
                  Store performance, earnings & payout workspace
                </Text>
              </View>

              {/* Store Cumulative Rating Badge */}
              <View className="bg-white/20 border border-white/30 px-3 py-2 rounded-2xl items-center">
                <View className="flex-row items-center">
                  <Text className="text-yellow-300 text-sm mr-1">⭐</Text>
                  <Text className="text-white font-quicksand-bold text-base">{avgRating}</Text>
                </View>
                <Text className="text-white/80 font-quicksand-medium text-[10px]">
                  {totalReviewsCount} reviews
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* ── SECTION 1: FINANCIAL EARNINGS & PAYOUT HERO CARD ── */}
        <View className="-mt-8 mx-5 bg-white rounded-[32px] p-6 shadow-xl shadow-black/10 border-2 border-primary/10">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-xs text-gray-400 font-quicksand-semibold uppercase tracking-widest">
                Available Payout Balance
              </Text>
              <Text className="text-primary text-3xl font-quicksand-bold mt-1" style={{ color: '#53B175' }}>
                ₦ {financials.availableBalance.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPayoutModalVisible(true)}
              activeOpacity={0.88}
              className="bg-primary px-4 py-2.5 rounded-2xl flex-row items-center shadow-md shadow-primary/30"
              style={{ backgroundColor: '#53B175' }}
            >
              <Text className="text-white font-quicksand-bold text-xs mr-1">Request Payout</Text>
              <Text className="text-white text-xs font-bold">💸</Text>
            </TouchableOpacity>
          </View>

          {/* Financial Breakdown Grid */}
          <View className="h-px bg-primary/10 my-4" />

          <View className="grid grid-cols-2 gap-2.5">
            <View className="flex-row gap-2.5">
              <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-200/80">
                <Text className="text-[11px] font-quicksand-semibold text-gray-400 uppercase">Gross Sales</Text>
                <Text className="text-base font-quicksand-bold text-dark-100 mt-0.5">
                  ₦ {financials.grossSales.toLocaleString()}
                </Text>
              </View>

              <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-200/80">
                <Text className="text-[11px] font-quicksand-semibold text-gray-400 uppercase">
                  Commission ({financials.commissionRate}%)
                </Text>
                <Text className="text-base font-quicksand-bold text-red-500 mt-0.5">
                  - ₦ {financials.commissionDeducted.toLocaleString()}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2.5 mt-2.5">
              <View className="flex-1 bg-emerald-50 rounded-2xl p-3 border border-emerald-200/80">
                <Text className="text-[11px] font-quicksand-semibold text-emerald-800 uppercase">Net Earned</Text>
                <Text className="text-base font-quicksand-bold text-emerald-700 mt-0.5">
                  ₦ {financials.netEarnings.toLocaleString()}
                </Text>
              </View>

              <View className="flex-1 bg-blue-50 rounded-2xl p-3 border border-blue-200/80">
                <Text className="text-[11px] font-quicksand-semibold text-blue-800 uppercase">Total Paid Out</Text>
                <Text className="text-base font-quicksand-bold text-blue-700 mt-0.5">
                  ₦ {financials.totalPaidOut.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {financials.totalPendingPayout > 0 && (
            <View className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-base mr-2">⏳</Text>
                <Text className="text-xs font-quicksand-bold text-amber-900">
                  Pending Admin Approval:
                </Text>
              </View>
              <Text className="text-xs font-quicksand-bold text-amber-800">
                ₦ {financials.totalPendingPayout.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* ── SECTION 2: STORE MANAGEMENT WORKSPACE TILES ── */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 font-quicksand-bold text-lg">
              Store Operations
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          <View className="gap-3.5">
            {/* 1. Order Fulfillment Pipeline */}
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
                    {stats.activeOrders} active • Update status to Delivered
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
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
                    {stats.totalProducts} products • Manage pricing & stock
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
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
                    Store Profile & Banking
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Address, location coords & payout bank details
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base" style={{ color: '#53B175' }}>→</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION 3: RECENT STORE PAYOUTS HISTORY ── */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
              <Text className="text-dark-100 font-quicksand-bold text-lg">
                Payout History
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPayoutModalVisible(true)}>
              <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>
                + Request Payout
              </Text>
            </TouchableOpacity>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          {financials.payoutsHistory.length === 0 ? (
            <View className="bg-gray-50 rounded-2xl p-6 items-center border border-gray-200">
              <Text className="text-2xl mb-1">🏦</Text>
              <Text className="font-quicksand-bold text-gray-600 text-sm">No Payouts Yet</Text>
              <Text className="font-quicksand-medium text-gray-400 text-xs mt-0.5 text-center">
                When you make sales, request a payout to transfer your net earnings directly to your bank account.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {financials.payoutsHistory.map((p, idx) => {
                const isPaid = ['completed', 'approved', 'paid'].includes(String(p.status).toLowerCase())
                const isPending = String(p.status).toLowerCase() === 'pending'
                return (
                  <View
                    key={p.$id || `payout_${idx}`}
                    className="bg-white rounded-2xl p-4 border border-primary/15 shadow-sm flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <Text className="font-quicksand-bold text-dark-100 text-sm">
                          ₦ {Number(p.amount || 0).toLocaleString()}
                        </Text>
                        <View
                          className={`ml-2 px-2.5 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-green-100 text-green-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-quicksand-bold ${
                              isPaid ? 'text-green-700' : isPending ? 'text-amber-700' : 'text-red-700'
                            }`}
                          >
                            {String(p.status || 'Pending').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                        {p.bankName || 'Bank'} • {p.accountNumber ? `••••${String(p.accountNumber).slice(-4)}` : ''} • Ref: {p.reference || p.$id.slice(-6)}
                      </Text>
                    </View>
                    <Text className="text-gray-400 font-quicksand-semibold text-[11px]">
                      {p.requestedAt || p.createdAt ? new Date(p.requestedAt || p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* ── SECTION 4: STORE CUSTOMER REVIEWS & RATINGS ── */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
              <Text className="text-dark-100 font-quicksand-bold text-lg">
                Customer Ratings & Feedback
              </Text>
            </View>
            <View className="bg-yellow-100 px-2.5 py-1 rounded-full flex-row items-center">
              <Text className="text-xs mr-1">⭐</Text>
              <Text className="text-yellow-800 font-quicksand-bold text-xs">{avgRating}</Text>
            </View>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          {storeReviews.length === 0 ? (
            <View className="bg-gray-50 rounded-2xl p-6 items-center border border-gray-200">
              <Text className="text-2xl mb-1">⭐</Text>
              <Text className="font-quicksand-bold text-gray-600 text-sm">No Ratings Yet</Text>
              <Text className="font-quicksand-medium text-gray-400 text-xs mt-0.5 text-center">
                Customer ratings for delivered orders will appear here automatically.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {storeReviews.map((rev, idx) => (
                <View
                  key={rev.$id || `rev_${idx}`}
                  className="bg-white rounded-2xl p-4 border border-primary/15 shadow-sm"
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="font-quicksand-bold text-dark-100 text-xs">
                      {rev.userName || 'Customer'}
                    </Text>
                    <View className="flex-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} className="text-xs">
                          {star <= (rev.rating || 5) ? '⭐' : '☆'}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <Text className="text-gray-600 font-quicksand-medium text-xs">
                    "{rev.comment || 'Great experience!'}"
                  </Text>
                  <Text className="text-gray-400 font-quicksand-semibold text-[10px] mt-1.5">
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── REQUEST PAYOUT MODAL ── */}
      <Modal
        visible={payoutModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayoutModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-white rounded-t-[36px] p-6 max-h-[85%] border-t-2 border-primary/20 shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center mr-3">
                  <Text className="text-xl">💸</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-lg">
                    Request Store Payout
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Available: ₦{financials.availableBalance.toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setPayoutModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Text className="font-bold text-dark-100 text-sm">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              {/* Amount Input */}
              <View className="mb-4">
                <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5 uppercase">
                  Payout Amount (₦) *
                </Text>
                <TextInput
                  value={payoutAmount}
                  onChangeText={setPayoutAmount}
                  placeholder={`Max: ${financials.availableBalance}`}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-3 font-quicksand-bold text-base text-dark-100"
                />
              </View>

              {/* Bank Name */}
              <View className="mb-4">
                <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5 uppercase">
                  Bank Name *
                </Text>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="e.g. GTBank, Zenith, Access, Kuda, OPay"
                  placeholderTextColor="#9CA3AF"
                  className="bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-3 font-quicksand-bold text-xs text-dark-100"
                />
              </View>

              {/* Account Number */}
              <View className="mb-4">
                <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5 uppercase">
                  10-Digit Account Number *
                </Text>
                <TextInput
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="0123456789"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                  className="bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-3 font-quicksand-bold text-xs text-dark-100"
                />
              </View>

              {/* Account Name */}
              <View className="mb-4">
                <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5 uppercase">
                  Beneficiary Account Name *
                </Text>
                <TextInput
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="e.g. John Doe / Fresh Groceries Ltd"
                  placeholderTextColor="#9CA3AF"
                  className="bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-3 font-quicksand-bold text-xs text-dark-100"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              disabled={submittingPayout}
              onPress={handleRequestPayout}
              className="bg-primary py-4 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:opacity-90"
              style={{ backgroundColor: '#53B175' }}
            >
              {submittingPayout ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-quicksand-bold text-base">
                  Confirm & Submit Payout Request
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sidebar Drawer Component */}
      <SidebarDrawer
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        type="seller"
      />
    </View>
  )
}
