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
import {
  calculateDynamicDeliveryFee,
  getPlatformPolicies,
  updatePlatformPolicies,
} from '@/lib/appwrite'
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
  const [deliveryPricingMode, setDeliveryPricingMode] = useState<'flat' | 'distance'>('flat')
  const [deliveryFee, setDeliveryFee] = useState('1000') // Base Charge for Flat Mode
  const [baseCoverageThreshold, setBaseCoverageThreshold] = useState('10000') // Base Coverage Limit (covers up to ₦10k)
  const [feePerItem, setFeePerItem] = useState('200') // Incremental charge per extra tier / item
  const [deliveryIncrementType, setDeliveryIncrementType] = useState<'per_item' | 'amount_percent' | 'amount_step'>('amount_step')
  const [deliveryIncrementRate, setDeliveryIncrementRate] = useState('2') // %
  const [deliveryIncrementStep, setDeliveryIncrementStep] = useState('5000') // Step ₦
  const [maxDeliveryFee, setMaxDeliveryFee] = useState('5000') // Ceiling cap
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('0')

  // Distance Pricing Settings
  const [distanceBaseRate, setDistanceBaseRate] = useState('800') // 0-3km
  const [distanceMidRate, setDistanceMidRate] = useState('1200') // 3-7km
  const [distanceFarRate, setDistanceFarRate] = useState('1800') // 7-12km
  const [distancePerKmRate, setDistancePerKmRate] = useState('150') // >12km
  const [maxDeliveryRadiusKm, setMaxDeliveryRadiusKm] = useState('20')

  // Live Test Simulation State for Admin
  const [simItemsCount, setSimItemsCount] = useState(3)
  const [simSubtotal, setSimSubtotal] = useState('14000')
  const [simDistanceKm, setSimDistanceKm] = useState('4.5')

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const data: any = await getPlatformPolicies()
      if (data) {
        setCartMode(data.cartMode || 'multi_seller')
        setProductApprovalRequired(data.productApprovalRequired ?? false)
        setSellerOrderCancellationAllowed(data.sellerOrderCancellationAllowed ?? true)
        setDefaultCommissionRate((data.defaultCommissionRate != null ? data.defaultCommissionRate : 10.0).toString())
        setRefundsEnabled(data.refundsEnabled !== false)
        
        setDeliveryPricingMode(data.deliveryPricingMode === 'distance' ? 'distance' : 'flat')
        setDeliveryFee((data.deliveryFee != null ? data.deliveryFee : 1000).toString())
        setBaseCoverageThreshold((data.baseCoverageThreshold != null ? data.baseCoverageThreshold : 10000).toString())
        setFeePerItem((data.feePerItem != null ? data.feePerItem : 200).toString())
        setDeliveryIncrementType((data.deliveryIncrementType || 'amount_step') as any)
        setDeliveryIncrementRate((data.deliveryIncrementRate != null ? data.deliveryIncrementRate : 2).toString())
        setDeliveryIncrementStep((data.deliveryIncrementStep != null ? data.deliveryIncrementStep : 5000).toString())
        setMaxDeliveryFee((data.maxDeliveryFee != null ? data.maxDeliveryFee : 5000).toString())
        setFreeDeliveryThreshold((data.freeDeliveryThreshold != null ? data.freeDeliveryThreshold : 0).toString())

        setDistanceBaseRate((data.distanceBaseRate != null ? data.distanceBaseRate : 800).toString())
        setDistanceMidRate((data.distanceMidRate != null ? data.distanceMidRate : 1200).toString())
        setDistanceFarRate((data.distanceFarRate != null ? data.distanceFarRate : 1800).toString())
        setDistancePerKmRate((data.distancePerKmRate != null ? data.distancePerKmRate : 150).toString())
        setMaxDeliveryRadiusKm((data.maxDeliveryRadiusKm != null ? data.maxDeliveryRadiusKm : 20).toString())
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
        deliveryPricingMode,
        deliveryFee: parseFloat(deliveryFee) || 0,
        baseCoverageThreshold: parseFloat(baseCoverageThreshold) || 10000,
        feePerItem: parseFloat(feePerItem) || 0,
        deliveryIncrementType,
        deliveryIncrementRate: parseFloat(deliveryIncrementRate) || 0,
        deliveryIncrementStep: parseFloat(deliveryIncrementStep) || 5000,
        maxDeliveryFee: parseFloat(maxDeliveryFee) || 0,
        freeDeliveryThreshold: parseFloat(freeDeliveryThreshold) || 0,
        distanceBaseRate: parseFloat(distanceBaseRate) || 800,
        distanceMidRate: parseFloat(distanceMidRate) || 1200,
        distanceFarRate: parseFloat(distanceFarRate) || 1800,
        distancePerKmRate: parseFloat(distancePerKmRate) || 150,
        maxDeliveryRadiusKm: parseFloat(maxDeliveryRadiusKm) || 20,
      })

      Alert.alert('Policies Saved', 'Platform delivery pricing policy updated successfully!')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save policies.')
    } finally {
      setSubmitting(false)
    }
  }

  const numDeliveryFee = parseFloat(deliveryFee) || 0
  const numBaseCoverage = parseFloat(baseCoverageThreshold) || 10000
  const numFeePerItem = parseFloat(feePerItem) || 0
  const numIncrementRate = parseFloat(deliveryIncrementRate) || 0
  const numIncrementStep = parseFloat(deliveryIncrementStep) || 5000
  const numMaxDeliveryFee = parseFloat(maxDeliveryFee) || 0
  const numThreshold = parseFloat(freeDeliveryThreshold) || 0

  const numDistBase = parseFloat(distanceBaseRate) || 800
  const numDistMid = parseFloat(distanceMidRate) || 1200
  const numDistFar = parseFloat(distanceFarRate) || 1800
  const numDistPerKm = parseFloat(distancePerKmRate) || 150
  const numMaxRadius = parseFloat(maxDeliveryRadiusKm) || 20

  // Run live calculation for simulated cart
  const simResult = calculateDynamicDeliveryFee(
    simItemsCount,
    parseFloat(simSubtotal) || 0,
    {
      deliveryPricingMode,
      deliveryFee: numDeliveryFee,
      baseCoverageThreshold: numBaseCoverage,
      feePerItem: numFeePerItem,
      deliveryIncrementType,
      deliveryIncrementRate: numIncrementRate,
      deliveryIncrementStep: numIncrementStep,
      maxDeliveryFee: numMaxDeliveryFee,
      freeDeliveryThreshold: numThreshold,
      distanceBaseRate: numDistBase,
      distanceMidRate: numDistMid,
      distanceFarRate: numDistFar,
      distancePerKmRate: numDistPerKm,
      maxDeliveryRadiusKm: numMaxRadius,
    },
    {
      distanceKm: parseFloat(simDistanceKm) || 2.5,
    }
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
            Platform Policies & Fees
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            Delivery Fees & Incremental Rules
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Section 1: Dynamic Delivery Fee & Increments */}
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" style={{ backgroundColor: '#53B175' }} />
            <Text className="text-dark-100 font-quicksand-bold text-base">
              🚚 Delivery Pricing Policy & Distance Rules
            </Text>
          </View>
          <View className="h-[1px] bg-primary/10 mb-4" />

          <View className="bg-white rounded-[28px] p-5 mb-6 border-2 border-primary/10 shadow-lg shadow-black/5">
            <Text className="text-gray-500 font-quicksand-medium text-xs mb-4 leading-relaxed">
              Choose your platform's delivery pricing strategy (Flat Base Charge vs. Location / Distance-Based Tiers).
            </Text>

            {/* Mode Switcher */}
            <Text className="font-quicksand-bold text-xs text-dark-100 mb-2">
              1. Delivery Pricing Mode *
            </Text>

            <View className="flex-row gap-2 mb-5">
              <TouchableOpacity
                onPress={() => setDeliveryPricingMode('flat')}
                className={`flex-1 p-3.5 rounded-2xl border items-center justify-center ${
                  deliveryPricingMode === 'flat' ? 'border-primary' : 'bg-gray-50 border-gray-200'
                }`}
                style={deliveryPricingMode === 'flat' ? { backgroundColor: 'rgba(83, 177, 117, 0.08)', borderColor: '#53B175' } : {}}
              >
                <Text className="text-lg mb-1">📦</Text>
                <Text className="font-quicksand-bold text-xs text-dark-100 text-center">Flat Base Charge</Text>
                <Text className="text-[10px] text-gray-400 font-quicksand-medium text-center mt-0.5">Fixed price for all orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDeliveryPricingMode('distance')}
                className={`flex-1 p-3.5 rounded-2xl border items-center justify-center ${
                  deliveryPricingMode === 'distance' ? 'border-primary' : 'bg-gray-50 border-gray-200'
                }`}
                style={deliveryPricingMode === 'distance' ? { backgroundColor: 'rgba(83, 177, 117, 0.08)', borderColor: '#53B175' } : {}}
              >
                <Text className="text-lg mb-1">📍</Text>
                <Text className="font-quicksand-bold text-xs text-dark-100 text-center">Location Distance</Text>
                <Text className="text-[10px] text-gray-400 font-quicksand-medium text-center mt-0.5">Base price scales by KM</Text>
              </TouchableOpacity>
            </View>

            <View className="h-px bg-primary/10 mb-4" />

            {/* Flat Mode Controls */}
            {deliveryPricingMode === 'flat' ? (
              <View>
                <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                  Base Delivery Charge (₦) *
                </Text>
                <Text className="text-gray-400 font-quicksand-medium text-[11px] mb-2">
                  The standard base delivery price billed to customers.
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                  placeholder="e.g. 1000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-bold text-lg text-dark-100 mb-2"
                />

                <View className="flex-row flex-wrap gap-2 mb-5">
                  {[
                    { label: 'Free (₦0)', val: '0' },
                    { label: '₦500', val: '500' },
                    { label: '₦1,000', val: '1000' },
                    { label: '₦1,500', val: '1500' },
                    { label: '₦2,000', val: '2000' },
                    { label: '₦3,000', val: '3000' },
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.val}
                      onPress={() => setDeliveryFee(p.val)}
                      className={`px-3 py-1.5 rounded-xl border ${
                        deliveryFee === p.val ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                      }`}
                      style={deliveryFee === p.val ? { backgroundColor: '#53B175', borderColor: '#53B175' } : {}}
                    >
                      <Text className={`font-quicksand-bold text-xs ${deliveryFee === p.val ? 'text-white' : 'text-gray-700'}`}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              /* Distance Mode Controls */
              <View className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mb-5" style={{ backgroundColor: 'rgba(83, 177, 117, 0.05)', borderColor: 'rgba(83, 177, 117, 0.25)' }}>
                <Text className="font-quicksand-bold text-xs text-dark-100 mb-3 uppercase tracking-wider" style={{ color: '#53B175' }}>
                  📍 Distance Zone Pricing Settings:
                </Text>

                {/* Zone 1: 0 - 3 km */}
                <View className="mb-3">
                  <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                    Zone 1: Local Neighborhood (0 – 3 km) ₦
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={distanceBaseRate}
                    onChangeText={setDistanceBaseRate}
                    placeholder="e.g. 800"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 font-quicksand-bold text-base text-dark-100"
                  />
                </View>

                {/* Zone 2: 3 - 7 km */}
                <View className="mb-3">
                  <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                    Zone 2: Mid-City Range (3.1 – 7 km) ₦
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={distanceMidRate}
                    onChangeText={setDistanceMidRate}
                    placeholder="e.g. 1200"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 font-quicksand-bold text-base text-dark-100"
                  />
                </View>

                {/* Zone 3: 7 - 12 km */}
                <View className="mb-3">
                  <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                    Zone 3: Cross-City Extended (7.1 – 12 km) ₦
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={distanceFarRate}
                    onChangeText={setDistanceFarRate}
                    placeholder="e.g. 1800"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 font-quicksand-bold text-base text-dark-100"
                  />
                </View>

                {/* Extended > 12 km */}
                <View className="mb-3">
                  <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                    Extra Charge Beyond 12 km (+ ₦ / km)
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={distancePerKmRate}
                    onChangeText={setDistancePerKmRate}
                    placeholder="e.g. 150"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 font-quicksand-bold text-base text-dark-100"
                  />
                </View>

                {/* Max Radius */}
                <View>
                  <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                    Maximum Delivery Radius Limit (km)
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={maxDeliveryRadiusKm}
                    onChangeText={setMaxDeliveryRadiusKm}
                    placeholder="e.g. 20"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 font-quicksand-bold text-base text-dark-100"
                  />
                </View>
              </View>
            )}

            <View className="h-px bg-primary/10 mb-4" />

            {/* Base Order Coverage Threshold */}
            <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
              2. Base Order Coverage Amount (₦) *
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-[11px] mb-2">
              Any order up to this subtotal (e.g. ₦10,000) pays ONLY the base delivery charge. Increments apply only to the excess above this value.
            </Text>
            <TextInput
              keyboardType="numeric"
              value={baseCoverageThreshold}
              onChangeText={setBaseCoverageThreshold}
              placeholder="e.g. 10000"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-bold text-lg text-dark-100 mb-2"
            />

            {/* Presets for Base Coverage */}
            <View className="flex-row flex-wrap gap-2 mb-5">
              {[
                { label: 'Up to ₦5,000', val: '5000' },
                { label: 'Up to ₦10,000 (Default)', val: '10000' },
                { label: 'Up to ₦15,000', val: '15000' },
                { label: 'Up to ₦20,000', val: '20000' },
                { label: 'Up to ₦30,000', val: '30000' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.val}
                  onPress={() => setBaseCoverageThreshold(p.val)}
                  className={`px-3 py-1.5 rounded-xl border ${
                    baseCoverageThreshold === p.val
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  style={baseCoverageThreshold === p.val ? { backgroundColor: '#53B175', borderColor: '#53B175' } : {}}
                >
                  <Text
                    className={`font-quicksand-bold text-xs ${
                      baseCoverageThreshold === p.val ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="h-px bg-primary/10 mb-4" />

            {/* Increment Strategy Selector */}
            <Text className="font-quicksand-bold text-xs text-dark-100 mb-1.5">
              3. Incremental Strategy for Orders Exceeding Base Coverage *
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-[11px] mb-3">
              How should the fee scale for amounts exceeding ₦{numBaseCoverage.toLocaleString()}?
            </Text>

            <View className="gap-2 mb-4">
              <TouchableOpacity
                onPress={() => setDeliveryIncrementType('amount_step')}
                className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                  deliveryIncrementType === 'amount_step' ? 'border-primary' : 'bg-gray-50 border-gray-200'
                }`}
                style={deliveryIncrementType === 'amount_step' ? { backgroundColor: 'rgba(83, 177, 117, 0.08)', borderColor: '#53B175' } : {}}
              >
                <View className="flex-1 pr-2">
                  <Text className="font-quicksand-bold text-xs text-dark-100">
                    🪜 Excess Subtotal Tiers (Recommended)
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-[11px] mt-0.5">
                    Add fee per tier on amount exceeding ₦{numBaseCoverage.toLocaleString()} (e.g. +₦200 per ₦5,000 excess).
                  </Text>
                </View>
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${deliveryIncrementType === 'amount_step' ? 'border-primary' : 'border-gray-300'}`} style={deliveryIncrementType === 'amount_step' ? { borderColor: '#53B175' } : {}}>
                  {deliveryIncrementType === 'amount_step' && <View className="w-2.5 h-2.5 rounded-full bg-primary" style={{ backgroundColor: '#53B175' }} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDeliveryIncrementType('amount_percent')}
                className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                  deliveryIncrementType === 'amount_percent' ? 'border-primary' : 'bg-gray-50 border-gray-200'
                }`}
                style={deliveryIncrementType === 'amount_percent' ? { backgroundColor: 'rgba(83, 177, 117, 0.08)', borderColor: '#53B175' } : {}}
              >
                <View className="flex-1 pr-2">
                  <Text className="font-quicksand-bold text-xs text-dark-100">
                    📈 Excess Value Surcharge (%)
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-[11px] mt-0.5">
                    Add a % rate on the portion of order value exceeding ₦{numBaseCoverage.toLocaleString()}.
                  </Text>
                </View>
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${deliveryIncrementType === 'amount_percent' ? 'border-primary' : 'border-gray-300'}`} style={deliveryIncrementType === 'amount_percent' ? { borderColor: '#53B175' } : {}}>
                  {deliveryIncrementType === 'amount_percent' && <View className="w-2.5 h-2.5 rounded-full bg-primary" style={{ backgroundColor: '#53B175' }} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Conditional Input for Selected Strategy */}
            {deliveryIncrementType === 'amount_step' && (
              <View className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mb-4" style={{ backgroundColor: 'rgba(83, 177, 117, 0.05)', borderColor: 'rgba(83, 177, 117, 0.25)' }}>
                <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                  Fee Added Per Tier Exceeding ₦{numBaseCoverage.toLocaleString()} (₦)
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={feePerItem}
                  onChangeText={setFeePerItem}
                  placeholder="e.g. 200"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 font-quicksand-bold text-base text-dark-100 mb-2"
                />

                <Text className="font-quicksand-bold text-xs text-dark-100 mb-1 mt-1">
                  Tier Step Amount (₦)
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={deliveryIncrementStep}
                  onChangeText={setDeliveryIncrementStep}
                  placeholder="e.g. 5000"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 font-quicksand-bold text-base text-dark-100 mb-2"
                />
              </View>
            )}

            {deliveryIncrementType === 'amount_percent' && (
              <View className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mb-4" style={{ backgroundColor: 'rgba(83, 177, 117, 0.05)', borderColor: 'rgba(83, 177, 117, 0.25)' }}>
                <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                  Excess Surcharge Percentage (%)
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={deliveryIncrementRate}
                  onChangeText={setDeliveryIncrementRate}
                  placeholder="e.g. 2.5"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 font-quicksand-bold text-base text-dark-100 mb-2"
                />
              </View>
            )}

            <View className="h-px bg-primary/10 mb-4" />

            {/* Maximum Delivery Fee Ceiling */}
            <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
              4. Maximum Delivery Fee Cap (₦)
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-[11px] mb-2">
              The maximum total delivery charge a customer can be billed regardless of distance or items (Set to 0 for no cap).
            </Text>
            <TextInput
              keyboardType="numeric"
              value={maxDeliveryFee}
              onChangeText={setMaxDeliveryFee}
              placeholder="e.g. 5000"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-bold text-lg text-dark-100 mb-5"
            />

            {/* Live Interactive Test Simulation Preview Card */}
            <View className="rounded-2xl p-4 border" style={{ backgroundColor: 'rgba(83, 177, 117, 0.08)', borderColor: 'rgba(83, 177, 117, 0.3)' }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="font-quicksand-bold text-xs uppercase tracking-wider" style={{ color: '#53B175' }}>
                  📱 Live Customer Checkout Simulator ({deliveryPricingMode === 'distance' ? 'Location Mode' : 'Flat Mode'}):
                </Text>
              </View>

              {deliveryPricingMode === 'distance' && (
                <View className="flex-row items-center justify-between mb-3 bg-white p-3 rounded-xl border border-gray-200">
                  <Text className="font-quicksand-bold text-xs text-dark-100">Simulate Distance (KM):</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={simDistanceKm}
                    onChangeText={setSimDistanceKm}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-right font-quicksand-bold text-xs text-dark-100 w-24"
                  />
                </View>
              )}

              <View className="flex-row items-center justify-between mb-3 bg-white p-3 rounded-xl border border-gray-200">
                <Text className="font-quicksand-bold text-xs text-dark-100">Simulate Order Subtotal (₦):</Text>
                <TextInput
                  keyboardType="numeric"
                  value={simSubtotal}
                  onChangeText={setSimSubtotal}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-right font-quicksand-bold text-xs text-dark-100 w-28"
                />
              </View>

              {/* Calculated Results */}
              <View className="gap-1.5 pt-1 border-t border-primary/20">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 font-quicksand-medium text-xs">Calculated Base Price:</Text>
                  <Text className="font-quicksand-bold text-xs text-dark-100">₦ {simResult.baseFee.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 font-quicksand-medium text-xs">Excess Surcharge:</Text>
                  <Text className="font-quicksand-bold text-xs" style={{ color: '#53B175' }}>
                    + ₦ {simResult.incrementalFee.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center pt-1 mt-1 border-t border-primary/15">
                  <Text className="text-dark-100 font-quicksand-bold text-xs">Total Customer Delivery Fee:</Text>
                  <Text className="font-quicksand-bold text-base" style={{ color: '#53B175' }}>
                    {simResult.isOutOfRange ? '⚠️ Out of Range' : (simResult.isFree ? 'FREE 🎉' : `₦ ${simResult.totalDeliveryFee.toLocaleString()}`)}
                  </Text>
                </View>
                <Text className="text-[10px] font-quicksand-medium text-gray-500 italic mt-0.5">
                  Breakdown: {simResult.breakdownText}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 2: Cart Mode */}
          <View className="flex-row items-center mb-2">
            <View className="h-2.5 w-2.5 bg-primary rounded-full mr-2" style={{ backgroundColor: '#53B175' }} />
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
                trackColor={{ false: '#E5E7EB', true: '#53B175' }}
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
                trackColor={{ false: '#E5E7EB', true: '#53B175' }}
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
                trackColor={{ false: '#EF4444', true: '#53B175' }}
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
