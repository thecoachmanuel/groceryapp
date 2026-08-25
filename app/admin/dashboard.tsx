import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
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
  getAdminFinancialAnalytics,
  updatePayoutStatus,
  getAllStoreReviews,
  deleteStoreReview,
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

  // Financial Analytics State
  const [analytics, setAnalytics] = useState<any>({
    totalPlatformGMV: 0,
    totalPlatformCommission: 0,
    totalStoreNetEarnings: 0,
    totalPayoutsPaid: 0,
    totalPayoutsPending: 0,
    totalCustomerWalletsBalance: 0,
    totalOrdersCount: 0,
    totalStoresCount: 0,
    totalCustomersCount: 0,
    storeBreakdown: [],
    recentPayouts: [],
  })

  // Store Reviews Moderation State
  const [allReviews, setAllReviews] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Latest unfulfilled order for live ticker
  const [latestOrder, setLatestOrder] = useState<any>(null)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)

  const loadAdminData = async () => {
    try {
      setLoading(true)
      await seedDefaultBannersIfEmpty()

      const [orders, finAnalytics, reviewsList] = await Promise.all([
        getAllOrders().catch(() => []),
        getAdminFinancialAnalytics(),
        getAllStoreReviews(),
      ])

      setAnalytics(finAnalytics)
      setAllReviews(reviewsList)

      const unfulfilledList = orders.filter((o: any) => {
        const norm = String(o.status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
        return !['delivered', 'completed', 'fulfilled', 'cancelled', 'canceled', 'rejected', 'declined'].includes(norm)
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
    loadAdminData()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    loadAdminData()
  }

  const handleApprovePayout = (payout: any) => {
    Alert.alert(
      'Approve & Mark Paid 💸',
      `Confirm approval of ₦${Number(payout.amount || 0).toLocaleString()} payout to ${payout.storeName} (${payout.bankName} - ${payout.accountNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Mark Paid',
          onPress: async () => {
            setActionLoading(true)
            try {
              await updatePayoutStatus(payout.$id, 'completed', 'Approved by Admin')
              await loadAdminData()
              Alert.alert('Payout Completed ✅', `Payout of ₦${Number(payout.amount).toLocaleString()} has been marked completed.`)
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not update payout.')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleRejectPayout = (payout: any) => {
    Alert.alert(
      'Reject Payout Request ❌',
      `Are you sure you want to reject the payout request of ₦${Number(payout.amount || 0).toLocaleString()} for ${payout.storeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject Request',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await updatePayoutStatus(payout.$id, 'rejected', 'Rejected by Admin')
              await loadAdminData()
              Alert.alert('Payout Rejected', 'Payout request has been marked as rejected.')
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not reject payout.')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleDeleteReview = (review: any) => {
    Alert.alert(
      'Delete Customer Review 🗑️',
      `Are you sure you want to remove the ${review.rating}★ rating by ${review.userName || 'Customer'}? The store's cumulative rating will be automatically recalculated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Review',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await deleteStoreReview(review.$id, review.storeId)
              await loadAdminData()
              Alert.alert('Review Removed', 'The review was removed and store rating recalculated.')
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete review.')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
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
    <View className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="light-content" backgroundColor="#53B175" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#53B175']} />
        }
      >
        {/* ── HEADER ── */}
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
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)' as any)}
                  className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-full flex-row items-center active:opacity-80"
                >
                  <Text className="text-white font-quicksand-bold text-xs">
                    🛒 Customer App
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
              Admin Financials & Supervision
            </Text>
            <Text className="text-white/80 font-quicksand-medium text-xs mt-1">
              Multi-store analytics, commission revenues, payouts & wallets
            </Text>
          </View>
        </SafeAreaView>

        {/* ── SECTION 1: PLATFORM FINANCIAL SUMMARY HERO CARD ── */}
        <View className="-mt-8 mx-5 bg-white rounded-[32px] p-6 shadow-xl shadow-black/10 border-2 border-primary/10">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-xs text-gray-400 font-quicksand-semibold uppercase tracking-widest">
                Platform Commission Earned
              </Text>
              <Text className="text-primary text-3xl font-quicksand-bold mt-1" style={{ color: '#53B175' }}>
                ₦ {analytics.totalPlatformCommission.toLocaleString()}
              </Text>
            </View>
            <View className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
              <Text className="text-xl">👑</Text>
            </View>
          </View>

          {/* Metric Grid */}
          <View className="h-px bg-primary/10 my-4" />

          <View className="grid grid-cols-2 gap-2.5">
            <View className="flex-row gap-2.5">
              <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-200/80">
                <Text className="text-[11px] font-quicksand-semibold text-gray-400 uppercase">Platform GMV</Text>
                <Text className="text-base font-quicksand-bold text-dark-100 mt-0.5">
                  ₦ {analytics.totalPlatformGMV.toLocaleString()}
                </Text>
              </View>

              <View className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-200/80">
                <Text className="text-[11px] font-quicksand-semibold text-gray-400 uppercase">Stores Net Sales</Text>
                <Text className="text-base font-quicksand-bold text-dark-100 mt-0.5">
                  ₦ {analytics.totalStoreNetEarnings.toLocaleString()}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2.5 mt-2.5">
              {/* Customer Wallets Balance Liability */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/admin/customers' as any)}
                className="flex-1 bg-purple-50 rounded-2xl p-3 border border-purple-200/80"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-quicksand-semibold text-purple-800 uppercase">Customer Wallets</Text>
                  <Text className="text-[10px] text-purple-600 font-bold">→</Text>
                </View>
                <Text className="text-base font-quicksand-bold text-purple-700 mt-0.5">
                  ₦ {analytics.totalCustomerWalletsBalance.toLocaleString()}
                </Text>
              </TouchableOpacity>

              {/* Total Payouts Completed */}
              <View className="flex-1 bg-blue-50 rounded-2xl p-3 border border-blue-200/80">
                <Text className="text-[11px] font-quicksand-semibold text-blue-800 uppercase">Payouts Completed</Text>
                <Text className="text-base font-quicksand-bold text-blue-700 mt-0.5">
                  ₦ {analytics.totalPayoutsPaid.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {analytics.totalPayoutsPending > 0 && (
            <View className="mt-3 bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Text className="text-lg mr-2">⚠️</Text>
                <View className="flex-1">
                  <Text className="text-xs font-quicksand-bold text-amber-950">
                    Store Payouts Awaiting Approval
                  </Text>
                  <Text className="text-[11px] font-quicksand-semibold text-amber-800">
                    ₦ {analytics.totalPayoutsPending.toLocaleString()} pending review below
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── SECTION 2: STORE PAYOUT REQUESTS APPROVAL WORKSPACE ── */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
              <Text className="text-dark-100 font-quicksand-bold text-lg">
                Store Payout Requests
              </Text>
            </View>
            {actionLoading && <ActivityIndicator size="small" color="#53B175" />}
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          {analytics.recentPayouts.length === 0 ? (
            <View className="bg-gray-50 rounded-2xl p-6 items-center border border-gray-200">
              <Text className="text-2xl mb-1">🏦</Text>
              <Text className="font-quicksand-bold text-gray-600 text-sm">No Payout Requests</Text>
              <Text className="font-quicksand-medium text-gray-400 text-xs mt-0.5 text-center">
                When store sellers request payouts, they will appear here for 1-click approval.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {analytics.recentPayouts.map((p: any, idx: number) => {
                const isPending = String(p.status || '').toLowerCase() === 'pending'
                const isPaid = ['completed', 'approved', 'paid'].includes(String(p.status || '').toLowerCase())
                return (
                  <View
                    key={p.$id || `payout_${idx}`}
                    className={`bg-white rounded-2xl p-4 border-2 shadow-sm ${
                      isPending ? 'border-amber-300 bg-amber-50/20' : 'border-primary/15'
                    }`}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="font-quicksand-bold text-dark-100 text-base">
                          {p.storeName || 'Seller Store'}
                        </Text>
                        <Text className="text-primary font-quicksand-bold text-sm mt-0.5" style={{ color: '#53B175' }}>
                          ₦ {Number(p.amount || 0).toLocaleString()}
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full ${
                          isPaid
                            ? 'bg-green-100'
                            : isPending
                            ? 'bg-amber-100'
                            : 'bg-red-100'
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

                    {/* Bank Details */}
                    <View className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-3">
                      <Text className="text-xs font-quicksand-bold text-dark-100">
                        🏦 {p.bankName || 'Bank'} • {p.accountNumber || 'N/A'}
                      </Text>
                      <Text className="text-[11px] font-quicksand-medium text-gray-500 mt-0.5">
                        Beneficiary: {p.accountName || 'Store Owner'} • Ref: {p.reference || p.$id}
                      </Text>
                    </View>

                    {/* Action Buttons for Pending Payouts */}
                    {isPending ? (
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          disabled={actionLoading}
                          onPress={() => handleApprovePayout(p)}
                          className="flex-1 bg-primary py-2.5 rounded-xl items-center shadow-sm"
                          style={{ backgroundColor: '#53B175' }}
                        >
                          <Text className="text-white font-quicksand-bold text-xs">
                            ✓ Approve & Mark Paid
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={actionLoading}
                          onPress={() => handleRejectPayout(p)}
                          className="bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl items-center"
                        >
                          <Text className="text-red-600 font-quicksand-bold text-xs">
                            Reject
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text className="text-gray-400 font-quicksand-medium text-[10px]">
                        Processed on {p.processedAt ? new Date(p.processedAt).toLocaleDateString('en-GB') : 'Recent'}
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* ── SECTION 3: STORE COMMISSION & EARNINGS BREAKDOWN ── */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
              <Text className="text-dark-100 font-quicksand-bold text-lg">
                Store Commission Breakdown
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/admin/sellers' as any)}>
              <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>
                Manage Stores →
              </Text>
            </TouchableOpacity>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          <View className="gap-3">
            {analytics.storeBreakdown.map((st: any, idx: number) => (
              <View
                key={st.storeId || `store_${idx}`}
                className="bg-white rounded-2xl p-4 border border-primary/15 shadow-sm mb-3"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-quicksand-bold text-dark-100 text-sm">
                    🏪 {st.storeName}
                  </Text>
                  <View className="flex-row items-center bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                    <Text className="text-[10px] mr-1">⭐</Text>
                    <Text className="text-yellow-800 font-quicksand-bold text-xs">
                      {Number(st.rating || 5.0).toFixed(1)} ({st.totalReviews || 0})
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between pt-1">
                  <View>
                    <Text className="text-[10px] font-quicksand-semibold text-gray-400">Gross Sales</Text>
                    <Text className="font-quicksand-bold text-dark-100 text-xs mt-0.5">
                      ₦ {Number(st.grossSales || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View>
                    <Text className="text-[10px] font-quicksand-semibold text-primary" style={{ color: '#53B175' }}>
                      Comm ({st.commissionRate}%)
                    </Text>
                    <Text className="font-quicksand-bold text-primary text-xs mt-0.5" style={{ color: '#53B175' }}>
                      + ₦ {Number(st.commissionPaid || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View>
                    <Text className="text-[10px] font-quicksand-semibold text-gray-400">Store Net</Text>
                    <Text className="font-quicksand-bold text-dark-100 text-xs mt-0.5">
                      ₦ {Number(st.netEarnings || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View>
                    <Text className="text-[10px] font-quicksand-semibold text-blue-600">Paid Out</Text>
                    <Text className="font-quicksand-bold text-blue-700 text-xs mt-0.5">
                      ₦ {Number(st.totalPaidOut || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── SECTION 4: CUSTOMER STORE REVIEWS MODERATION ── */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
              <Text className="text-dark-100 font-quicksand-bold text-lg">
                Store Reviews & Ratings Moderation
              </Text>
            </View>
            <Text className="text-xs text-gray-400 font-quicksand-semibold">
              {allReviews.length} total
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          {allReviews.length === 0 ? (
            <View className="bg-gray-50 rounded-2xl p-6 items-center border border-gray-200">
              <Text className="text-2xl mb-1">⭐</Text>
              <Text className="font-quicksand-bold text-gray-600 text-sm">No Store Reviews Yet</Text>
              <Text className="font-quicksand-medium text-gray-400 text-xs mt-0.5 text-center">
                When customers rate delivered orders, all reviews will be listed here for moderation.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {allReviews.map((rev, idx) => (
                <View
                  key={rev.$id || `rev_${idx}`}
                  className="bg-white rounded-2xl p-4 border border-primary/15 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <Text className="font-quicksand-bold text-dark-100 text-xs">
                          {rev.userName || 'Customer'}
                        </Text>
                        <Text className="text-gray-400 text-[10px] ml-2 font-quicksand-medium">
                          Order #{String(rev.orderId || '').slice(-6)}
                        </Text>
                      </View>
                      <View className="flex-row mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Text key={star} className="text-xs">
                            {star <= (rev.rating || 5) ? '⭐' : '☆'}
                          </Text>
                        ))}
                      </View>
                    </View>

                    {/* Admin Delete Review Button */}
                    <TouchableOpacity
                      disabled={actionLoading}
                      onPress={() => handleDeleteReview(rev)}
                      className="bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 active:opacity-70"
                    >
                      <Text className="text-red-600 font-quicksand-bold text-[10px]">
                        🗑️ Remove Review
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {rev.comment ? (
                    <Text className="text-gray-600 font-quicksand-medium text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                      "{rev.comment}"
                    </Text>
                  ) : null}

                  <Text className="text-gray-400 font-quicksand-semibold text-[10px] mt-2">
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── SECTION 5: MANAGEMENT MODULES NAVIGATION TILES ── */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 font-quicksand-bold text-lg">
              Management Modules
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          <View className="gap-3.5">
            {/* Customer Accounts & Wallets */}
            <TouchableOpacity
              onPress={() => router.push('/admin/customers' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/20 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">👛</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Customer Wallets & Accounts
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    View all customer wallet balances, credit/debit & account status
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base" style={{ color: '#53B175' }}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Sellers & Stores */}
            <TouchableOpacity
              onPress={() => router.push('/admin/sellers' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">🏪</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Sellers & Stores Control
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Create stores, edit commission rates & manage banking details
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base" style={{ color: '#53B175' }}>→</Text>
              </View>
            </TouchableOpacity>

            {/* App Branding */}
            <TouchableOpacity
              onPress={() => router.push('/admin/branding' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mr-4">
                  <Text className="text-2xl">🎨</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    App Branding & Logo
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Customize app display name, logo upload & tagline
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base" style={{ color: '#53B175' }}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Broadcast Center */}
            <TouchableOpacity
              onPress={() => router.push('/admin/broadcast' as any)}
              className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 items-center justify-center mr-4">
                  <Text className="text-2xl">📣</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-dark-100 text-base">
                    Broadcast & Promo Center
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Send instant push alerts & promo codes to users
                  </Text>
                </View>
              </View>
              <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-primary font-bold text-base" style={{ color: '#53B175' }}>→</Text>
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
