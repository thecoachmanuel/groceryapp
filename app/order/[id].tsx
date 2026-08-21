import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getOrderById, creditCustomerWallet, updateOrderStatus, getRefundPolicy } from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import { images } from '@/constants'

// -------------------------------------------------------------------
// Status logic
// -------------------------------------------------------------------
const MAIN_STEPS = [
  { key: 'order_placed', label: 'Order Placed', icon: '📝', sub: 'Your order has been received' },
  { key: 'preparing', label: 'Preparing', icon: '🍳', sub: 'Store is preparing your items' },
  { key: 'on_the_way', label: 'On the Way', icon: '🛵', sub: 'Rider is heading to you' },
  { key: 'delivered', label: 'Delivered', icon: '🎉', sub: 'Order successfully delivered' },
]

const CANCELLED_STEP = { key: 'cancelled', label: 'Cancelled', icon: '❌', sub: 'This order was cancelled' }

function normaliseStatus(raw: string | undefined | null): string {
  const s = String(raw || '').toLowerCase().trim()
  if (s === 'pending' || s === 'paid' || s === 'processing' || s === 'confirmed') return 'order_placed'
  if (s === 'in_transit') return 'on_the_way'
  if (s === 'completed' || s === 'done' || s === 'received') return 'delivered'
  if (s === 'refunded') return 'cancelled'
  return s
}

function parseItems(raw: any): any[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return []
}

// -------------------------------------------------------------------
// Screen
// -------------------------------------------------------------------
export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { isAdmin, isSeller, user } = useAuthStore()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchOrder = async () => {
    try {
      if (id) {
        const data = await getOrderById(id)
        setOrder(data)
      }
    } catch (err) {
      console.error('Error loading order:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 6000)
    return () => clearInterval(interval)
  }, [id])

  // -------------------------------------------------------------------
  // Order actions
  // -------------------------------------------------------------------
  const handleStatusUpdate = async (newStatus: string) => {
    if (!order?.$id) return
    setActionLoading(true)
    try {
      await updateOrderStatus(order.$id, newStatus)
      await fetchOrder()
      Alert.alert('Updated', `Order status set to: ${newStatus.replace(/_/g, ' ')}`)
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCustomerCancel = async () => {
    if (!order?.$id) return
    const normStatus = normaliseStatus(order.status)
    if (normStatus !== 'order_placed') {
      Alert.alert(
        'Cannot Cancel',
        'Orders can only be cancelled while in the "Order Placed" phase. Your order is already being prepared or is on the way.',
      )
      return
    }

    Alert.alert(
      'Cancel Order?',
      'Your order will be cancelled. If refunds are enabled, the full amount will be refunded to your wallet.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel & Refund',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await updateOrderStatus(order.$id, 'cancelled')

              // Check refund policy before crediting wallet
              const refundsAllowed = await getRefundPolicy()
              const userId = (user as any)?.$id || (user as any)?.accountId

              if (refundsAllowed && userId && order.totalAmount) {
                await creditCustomerWallet(
                  userId,
                  Number(order.totalAmount),
                  'refund',
                  `Refund for cancelled Order #${String(order.$id).substring(0, 8).toUpperCase()}`,
                  `REF_${order.$id}`,
                )
                await fetchOrder()
                Alert.alert(
                  'Order Cancelled ✅',
                  `₦${Number(order.totalAmount || 0).toLocaleString()} has been refunded to your wallet.`,
                )
              } else if (!refundsAllowed) {
                await fetchOrder()
                Alert.alert(
                  'Order Cancelled',
                  'Your order has been cancelled. Refunds are currently disabled by the store. Please contact support for assistance.',
                )
              } else {
                await fetchOrder()
                Alert.alert('Order Cancelled', 'Your order has been cancelled.')
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not cancel order.')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ],
    )
  }

  // -------------------------------------------------------------------
  // Render guards
  // -------------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg-light justify-center items-center">
        <ActivityIndicator size="large" color="#16A34A" />
      </SafeAreaView>
    )
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-bg-light justify-center items-center px-6">
        <Text className="text-xl font-quicksand-bold text-dark-100 mb-4">Order Not Found</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)' as any)}
          className="bg-primary px-6 py-3 rounded-full"
        >
          <Text className="text-white font-quicksand-bold">Go to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const normStatus = normaliseStatus(order.status)
  const isCancelled = normStatus === 'cancelled'
  const steps = isCancelled ? [...MAIN_STEPS, CANCELLED_STEP] : MAIN_STEPS
  const currentIdx = Math.max(
    0,
    steps.findIndex((s) => s.key === normStatus),
  )

  const itemsList = parseItems(order.items)
  const orderId = String(order.$id || '').substring(0, 8).toUpperCase()
  const canCustomerCancel = !isAdmin && !isSeller && normStatus === 'order_placed'

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>

        {/* ── Header ── */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)' as any) }}
            className="p-2.5 bg-white rounded-2xl items-center justify-center border-2 border-primary/10 shadow-sm active:opacity-70"
          >
            <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" />
          </TouchableOpacity>
          <Text className="text-xl font-quicksand-bold text-dark-100">Order Status</Text>
          <View className="w-10" />
        </View>

        {/* ── Hero Status Card ── */}
        <View
          className={`rounded-[30px] p-6 mb-6 shadow-xl ${
            isCancelled
              ? 'bg-red-500 shadow-red-500/30'
              : 'bg-primary shadow-primary/30'
          }`}
        >
          <Text className="text-white/70 font-quicksand-semibold text-xs uppercase tracking-widest">
            {isCancelled ? 'Order Cancelled' : 'Estimated Delivery'}
          </Text>
          <Text className="text-white text-3xl font-quicksand-bold mt-1">
            {isCancelled ? 'Refund Issued' : '25 – 35 Mins'}
          </Text>
          <Text className="text-white/80 font-quicksand-semibold text-sm mt-1">
            Order #{orderId}
          </Text>
          <View className="mt-4 bg-white/20 rounded-full px-4 py-2 self-start">
            <Text className="text-white font-quicksand-bold text-sm">
              {steps[currentIdx]?.icon}  {steps[currentIdx]?.label || order.status}
            </Text>
          </View>
        </View>

        {/* ── Delivery Timeline Stepper ── */}
        <View className="bg-white rounded-[28px] p-6 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
          <View className="flex-row items-center mb-5">
            <View className="w-2 h-2 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 text-base font-quicksand-bold">Delivery Timeline</Text>
          </View>

          {steps.map((step, idx) => {
            const isCompleted = idx < currentIdx
            const isCurrent = idx === currentIdx
            const isPending = idx > currentIdx

            return (
              <View key={step.key} className="flex-row mb-0">
                {/* Left column: dot + line */}
                <View className="items-center mr-4" style={{ width: 44 }}>
                  <View
                    className={`w-11 h-11 rounded-full items-center justify-center border-2 ${
                      isCurrent
                        ? 'bg-primary border-primary'
                        : isCompleted
                        ? 'bg-primary/20 border-primary/40'
                        : 'bg-gray-100 border-gray-200'
                    }`}
                  >
                    <Text className="text-lg">{step.icon}</Text>
                  </View>
                  {/* Connector line — skip for last */}
                  {idx < steps.length - 1 && (
                    <View
                      className={`w-0.5 flex-1 my-1 rounded-full ${
                        isCompleted ? 'bg-primary/40' : 'bg-gray-200'
                      }`}
                      style={{ minHeight: 24 }}
                    />
                  )}
                </View>

                {/* Right column: text */}
                <View className="flex-1 pb-5">
                  <Text
                    className={`font-quicksand-bold text-sm ${
                      isCurrent ? 'text-primary' : isCompleted ? 'text-dark-100' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                    {isCurrent && (
                      <Text className="text-primary font-quicksand-semibold"> ← Now</Text>
                    )}
                  </Text>
                  <Text className={`font-quicksand-medium text-xs mt-0.5 ${isPending ? 'text-gray-300' : 'text-gray-400'}`}>
                    {step.sub}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* ── Items Ordered ── */}
        <View className="bg-white rounded-[28px] p-6 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
          <View className="flex-row items-center mb-4">
            <View className="w-2 h-2 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 text-base font-quicksand-bold">Items Ordered</Text>
          </View>
          <View className="h-px bg-primary/10 mb-4" />

          {itemsList.length === 0 ? (
            <Text className="text-gray-400 font-quicksand-medium text-sm text-center py-4">No items found</Text>
          ) : (
            itemsList.map((item: any, idx: number) => (
              <View
                key={idx}
                className={`flex-row justify-between items-center py-3 ${
                  idx < itemsList.length - 1 ? 'border-b-2 border-primary/10' : ''
                }`}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-8 h-8 bg-primary/10 rounded-xl items-center justify-center mr-3 border border-primary/20">
                    <Text className="text-primary font-quicksand-bold text-xs">{item?.quantity || 1}×</Text>
                  </View>
                  <Text className="font-quicksand-bold text-dark-100 text-sm flex-1" numberOfLines={1}>
                    {item?.name || 'Grocery Item'}
                  </Text>
                </View>
                <Text className="font-quicksand-bold text-primary text-sm">
                  ₦{((Number(item?.price) || 0) * (Number(item?.quantity) || 1)).toLocaleString()}
                </Text>
              </View>
            ))
          )}

          <View className="mt-4 pt-3 border-t-2 border-primary/10 flex-row justify-between items-center">
            <Text className="font-quicksand-bold text-dark-100 text-base">Total Paid</Text>
            <Text className="font-quicksand-bold text-primary text-xl">
              ₦{Number(order.totalAmount || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* ── Delivery Address ── */}
        <View className="bg-white rounded-[28px] p-6 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
          <View className="flex-row items-center mb-3">
            <View className="w-2 h-2 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 text-base font-quicksand-bold">Delivery Address</Text>
          </View>
          <View className="h-px bg-primary/10 mb-3" />
          <View className="flex-row items-start">
            <Text className="text-xl mr-3 mt-0.5">📍</Text>
            <Text className="text-gray-600 font-quicksand-semibold flex-1 text-sm">
              {order.deliveryAddress || 'Current Location'}
            </Text>
          </View>
          {order.orderNotes ? (
            <View className="mt-4 bg-primary/5 p-3.5 rounded-2xl border border-primary/10">
              <Text className="text-xs font-quicksand-bold text-gray-400 uppercase tracking-wider mb-1">
                📝 Delivery Note
              </Text>
              <Text className="text-dark-100 font-quicksand-semibold text-sm">
                "{order.orderNotes}"
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Admin / Seller: Order Management Controls ── */}
        {(isAdmin || isSeller) && !isCancelled && (
          <View className="bg-white rounded-[28px] p-6 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
            <View className="flex-row items-center mb-3">
              <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
              <Text className="text-dark-100 text-base font-quicksand-bold">
                {isAdmin ? '🛡️ Admin Supervision' : '🏪 Store Fulfillment'} — Update Order Status
              </Text>
            </View>
            <View className="h-px bg-primary/10 mb-4" />

            <View className="flex-row flex-wrap gap-2.5">
              {[
                { status: 'order_placed', label: '📝 Placed' },
                { status: 'preparing', label: '🍳 Preparing' },
                { status: 'on_the_way', label: '🛵 On the Way' },
                { status: 'delivered', label: '🎉 Delivered' },
              ].map(({ status, label }) => {
                const isActive = normStatus === status
                return (
                  <TouchableOpacity
                    key={status}
                    disabled={actionLoading}
                    onPress={() => handleStatusUpdate(status)}
                    className={`px-4 py-3 rounded-2xl border-2 flex-row items-center ${
                      isActive
                        ? 'bg-primary border-primary shadow-md shadow-primary/20'
                        : 'bg-white border-primary/15 active:opacity-80'
                    }`}
                  >
                    <Text className={`font-quicksand-bold text-xs ${isActive ? 'text-white' : 'text-dark-100'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {isAdmin && (
              <TouchableOpacity
                disabled={actionLoading}
                onPress={() =>
                  Alert.alert('Cancel Order?', 'Cancel this order and credit customer wallet?', [
                    { text: 'Keep Order', style: 'cancel' },
                    {
                      text: 'Cancel Order',
                      style: 'destructive',
                      onPress: () => handleStatusUpdate('cancelled'),
                    },
                  ])
                }
                className="mt-3 self-start px-4 py-2.5 rounded-2xl border-2 bg-red-500/10 border-red-500/20 active:opacity-70"
              >
                <Text className="font-quicksand-bold text-xs text-red-600">❌ Cancel Order</Text>
              </TouchableOpacity>
            )}

            {actionLoading && (
              <View className="mt-4 items-center">
                <ActivityIndicator color="#16A34A" />
              </View>
            )}
          </View>
        )}

        {/* ── Customer: Cancel (only at order_placed phase) ── */}
        {!isAdmin && !isSeller && !isCancelled && (
          <View className="mb-5">
            {canCustomerCancel ? (
              <TouchableOpacity
                disabled={actionLoading}
                onPress={handleCustomerCancel}
                className="bg-red-500/10 border-2 border-red-500/20 rounded-[28px] p-5 items-center active:opacity-70"
              >
                {actionLoading ? (
                  <ActivityIndicator color="#EF4444" />
                ) : (
                  <>
                    <Text className="text-red-600 font-quicksand-bold text-base">Cancel Order & Get Refund</Text>
                    <Text className="text-red-400 font-quicksand-medium text-xs mt-1">
                      ₦{Number(order.totalAmount || 0).toLocaleString()} will be refunded to your wallet
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : normStatus !== 'delivered' && normStatus !== 'cancelled' ? (
              <View className="bg-gray-50 border-2 border-gray-200 rounded-[28px] p-5 items-center">
                <Text className="text-gray-400 font-quicksand-bold text-sm">Cancellation Unavailable</Text>
                <Text className="text-gray-300 font-quicksand-medium text-xs mt-1 text-center">
                  Your order is already being prepared. Contact support for assistance.
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Refund notice for cancelled orders */}
        {isCancelled && (
          <View className="bg-red-500/5 border-2 border-red-500/20 rounded-[28px] p-5 mb-5 items-center">
            <Text className="text-red-600 font-quicksand-bold text-base">Order Cancelled</Text>
            <Text className="text-red-400 font-quicksand-medium text-xs mt-1 text-center">
              If payment was made, a refund has been credited to your wallet balance.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
