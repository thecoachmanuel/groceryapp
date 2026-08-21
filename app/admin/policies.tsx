import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { getPlatformPolicies, updatePlatformPolicies } from '@/lib/appwrite'
import { images } from '@/constants'

export default function AdminPoliciesScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Policy Form State
  const [cartMode, setCartMode] = useState<'single_seller' | 'multi_seller'>('multi_seller')
  const [productApprovalRequired, setProductApprovalRequired] = useState(false)
  const [sellerOrderCancellationAllowed, setSellerOrderCancellationAllowed] = useState(true)
  const [defaultCommissionRate, setDefaultCommissionRate] = useState('10.0')
  const [refundsEnabled, setRefundsEnabled] = useState(true)

  // Delivery Fee Management State
  const [deliveryFee, setDeliveryFee] = useState('1000')
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('10000')

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const data: any = await getPlatformPolicies()
      if (data) {
        setCartMode(data.cartMode || 'multi_seller')
        setProductApprovalRequired(data.productApprovalRequired ?? false)
        setSellerOrderCancellationAllowed(data.sellerOrderCancellationAllowed ?? true)
        setDefaultCommissionRate((data.defaultCommissionRate || 10.0).toString())
        setRefundsEnabled(data.refundsEnabled !== false)
        setDeliveryFee((data.deliveryFee !== undefined ? data.deliveryFee : 1000).toString())
        setFreeDeliveryThreshold((data.freeDeliveryThreshold !== undefined ? data.freeDeliveryThreshold : 10000).toString())
      }
    } catch (err) {
      console.error('Error fetching policies:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [])

  const handleSavePolicies = async () => {
    try {
      setSubmitting(true)
      await updatePlatformPolicies({
        cartMode,
        productApprovalRequired,
        sellerOrderCancellationAllowed,
        defaultCommissionRate: parseFloat(defaultCommissionRate) || 10.0,
        refundsEnabled,
        deliveryFee: parseFloat(deliveryFee) || 0,
        freeDeliveryThreshold: parseFloat(freeDeliveryThreshold) || 0,
      })

      Alert.alert('Policies Saved', 'Platform delivery fees, seller rules & cart policies updated successfully!')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save policies.')
    } finally {
      setSubmitting(false)
    }
  }

  const numDeliveryFee = parseFloat(deliveryFee) || 0
  const numThreshold = parseFloat(freeDeliveryThreshold) || 0

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
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
            Platform Policies & Fees
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            Delivery Fees & System Rules
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Section 1: Delivery Fee & Threshold Management */}
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 font-quicksand-bold text-base">
              🚚 Delivery Fee & Free Delivery Threshold
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          <View className="bg-white rounded-[28px] p-5 mb-6 border-2 border-primary/10 shadow-lg shadow-black/5">
            <Text className="text-gray-500 font-quicksand-medium text-xs mb-4 leading-relaxed">
              Set standard customer delivery fee (₦) and configure automatic free shipping for high-value orders.
            </Text>

            {/* Standard Delivery Fee Input */}
            <Text className="font-quicksand-bold text-xs text-dark-100 mb-1.5">
              Standard Delivery Fee (₦) *
            </Text>
            <TextInput
              keyboardType="numeric"
              value={deliveryFee}
              onChangeText={setDeliveryFee}
              placeholder="e.g. 50"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-bold text-lg text-dark-100 mb-3"
            />

            {/* Presets for Delivery Fee */}
            <Text className="font-quicksand-semibold text-[11px] text-gray-400 mb-2 uppercase tracking-wider">
              Quick Fee Presets:
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {[
                { label: 'Free (₦0)', val: '0' },
                { label: '₦1,000', val: '1000' },
                { label: '₦1,500', val: '1500' },
                { label: '₦2,000', val: '2000' },
                { label: '₦3,000', val: '3000' },
                { label: '₦5,000', val: '5000' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.val}
                  onPress={() => setDeliveryFee(p.val)}
                  className={`px-3 py-2 rounded-xl border ${
                    deliveryFee === p.val
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`font-quicksand-bold text-xs ${
                      deliveryFee === p.val ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="h-px bg-primary/10 mb-4" />

            {/* Free Shipping Threshold Input */}
            <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
              Free Delivery Order Threshold (₦)
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-[11px] mb-2">
              Orders above this subtotal automatically receive FREE delivery (Set to 0 to disable).
            </Text>
            <TextInput
              keyboardType="numeric"
              value={freeDeliveryThreshold}
              onChangeText={setFreeDeliveryThreshold}
              placeholder="e.g. 10000"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-bold text-lg text-dark-100 mb-3"
            />

            {/* Presets for Free Shipping Threshold */}
            <Text className="font-quicksand-semibold text-[11px] text-gray-400 mb-2 uppercase tracking-wider">
              Quick Threshold Presets:
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {[
                { label: 'Disabled (₦0)', val: '0' },
                { label: 'Over ₦10,000', val: '10000' },
                { label: 'Over ₦15,000', val: '15000' },
                { label: 'Over ₦20,000', val: '20000' },
                { label: 'Over ₦30,000', val: '30000' },
                { label: 'Over ₦50,000', val: '50000' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.val}
                  onPress={() => setFreeDeliveryThreshold(p.val)}
                  className={`px-3 py-2 rounded-xl border ${
                    freeDeliveryThreshold === p.val
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`font-quicksand-bold text-xs ${
                      freeDeliveryThreshold === p.val ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Live Customer Checkout Simulation Preview Card */}
            <View className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
              <Text className="text-primary font-quicksand-bold text-xs uppercase tracking-wider mb-2">
                📱 Live Customer Checkout Preview:
              </Text>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600 font-quicksand-medium text-xs">Base Delivery Fee:</Text>
                <Text className="font-quicksand-bold text-xs text-dark-100">
                  {numDeliveryFee === 0 ? 'FREE 🎉' : `₦ ${numDeliveryFee.toLocaleString()}`}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 font-quicksand-medium text-xs">Free Delivery Offer:</Text>
                <Text className="font-quicksand-bold text-xs text-primary">
                  {numThreshold > 0
                    ? `Free on orders over ₦${numThreshold.toLocaleString()}`
                    : 'Standard fee on all orders'}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 2: Cart Mode */}
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 font-quicksand-bold text-base">
              Cart Multi-Vendor Restriction
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          <View className="bg-white rounded-[28px] p-5 mb-6 border-2 border-primary/10 shadow-lg shadow-black/5">
            <Text className="text-gray-500 font-quicksand-medium text-xs mb-3 leading-relaxed">
              Configure whether customer checkout allows items from multiple seller stores simultaneously or forces single-store carts.
            </Text>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setCartMode('multi_seller')}
                className={`flex-1 py-3 rounded-2xl items-center border ${
                  cartMode === 'multi_seller' ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`font-quicksand-bold text-xs ${cartMode === 'multi_seller' ? 'text-white' : 'text-gray-700'}`}>
                  Multi-Seller Cart 🛍️
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCartMode('single_seller')}
                className={`flex-1 py-3 rounded-2xl items-center border ${
                  cartMode === 'single_seller' ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`font-quicksand-bold text-xs ${cartMode === 'single_seller' ? 'text-white' : 'text-gray-700'}`}>
                  Single-Seller Cart 🏪
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 3: Seller Permissions */}
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 font-quicksand-bold text-base">
              Seller Permissions & Approval Rules
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          <View className="bg-white rounded-[28px] p-5 mb-6 border-2 border-primary/10 shadow-lg shadow-black/5 gap-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text className="font-quicksand-bold text-dark-100 text-sm">
                  Require Admin Approval for Seller Products
                </Text>
                <Text className="text-gray-400 font-quicksand-medium text-xs">
                  When enabled, products created by sellers must be approved by admin before appearing live.
                </Text>
              </View>
              <Switch
                value={productApprovalRequired}
                onValueChange={setProductApprovalRequired}
                trackColor={{ false: '#E5E7EB', true: '#16A34A' }}
              />
            </View>

            <View className="h-[1px] bg-gray-100" />

            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text className="font-quicksand-bold text-dark-100 text-sm">
                  Allow Seller Order Cancellations
                </Text>
                <Text className="text-gray-400 font-quicksand-medium text-xs">
                  When enabled, sellers can cancel unfulfilled customer orders directly.
                </Text>
              </View>
              <Switch
                value={sellerOrderCancellationAllowed}
                onValueChange={setSellerOrderCancellationAllowed}
                trackColor={{ false: '#E5E7EB', true: '#16A34A' }}
              />
            </View>

            <View className="h-[1px] bg-gray-100" />

            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text className="font-quicksand-bold text-dark-100 text-sm">
                  💸 Customer Refund Policy
                </Text>
                <Text className="text-gray-400 font-quicksand-medium text-xs">
                  When disabled, customers cannot request refunds for cancelled orders. Wallet credits will be paused.
                </Text>
              </View>
              <Switch
                value={refundsEnabled}
                onValueChange={setRefundsEnabled}
                trackColor={{ false: '#EF4444', true: '#16A34A' }}
                thumbColor={refundsEnabled ? '#fff' : '#fff'}
              />
            </View>
          </View>

          {/* Section 4: Platform Commission */}
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-dark-100 font-quicksand-bold text-base">
              Default Commission Rate
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          <View className="bg-white rounded-[28px] p-5 mb-8 border-2 border-primary/10 shadow-lg shadow-black/5">
            <Text className="font-quicksand-bold text-xs text-gray-500 mb-1">
              Default Store Commission (%)
            </Text>
            <TextInput
              keyboardType="numeric"
              value={defaultCommissionRate}
              onChangeText={setDefaultCommissionRate}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-bold text-lg text-dark-100"
            />
          </View>

          <TouchableOpacity
            onPress={handleSavePolicies}
            disabled={submitting}
            className="bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/30"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-quicksand-bold text-base">
                Save Platform Policies & Delivery Fees ⚙️
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
