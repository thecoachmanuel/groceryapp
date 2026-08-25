import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { getCoupons, createCoupon, deleteCoupon } from '@/lib/appwrite'
import { images } from '@/constants'

export default function AdminCouponsScreen() {
  const router = useRouter()
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'flat' | 'percentage' | 'free_delivery'>('free_delivery')
  const [discountValue, setDiscountValue] = useState('0')
  const [minCartAmount, setMinCartAmount] = useState('1000')
  const [usageLimit, setUsageLimit] = useState('500')
  const [oncePerUser, setOncePerUser] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchCouponList = async () => {
    try {
      setLoading(true)
      const list = await getCoupons()
      setCoupons(list)
    } catch (err) {
      console.error('Error loading coupons:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCouponList()
  }, [])

  const applyPreset = (presetType: 'free_delivery' | 'welcome10' | 'save500') => {
    if (presetType === 'free_delivery') {
      setCode('FREEDELIVERY')
      setDiscountType('free_delivery')
      setDiscountValue('0')
      setMinCartAmount('1000')
      setUsageLimit('500')
      setOncePerUser(true)
    } else if (presetType === 'welcome10') {
      setCode('WELCOME10')
      setDiscountType('percentage')
      setDiscountValue('10')
      setMinCartAmount('2000')
      setUsageLimit('1000')
      setOncePerUser(true)
    } else {
      setCode('SAVE500')
      setDiscountType('flat')
      setDiscountValue('500')
      setMinCartAmount('3000')
      setUsageLimit('500')
      setOncePerUser(false)
    }
  }

  const handleCreateCoupon = async () => {
    if (!code.trim()) {
      return Alert.alert('Validation Error', 'Please enter a coupon code.')
    }
    if (discountType !== 'free_delivery' && (!discountValue.trim() || parseFloat(discountValue) <= 0)) {
      return Alert.alert('Validation Error', 'Please enter a valid discount value.')
    }

    try {
      setSubmitting(true)
      await createCoupon({
        code: code.trim(),
        discountType,
        discountValue: discountType === 'free_delivery' ? 0 : parseFloat(discountValue) || 0,
        minCartAmount: parseFloat(minCartAmount) || 0,
        usageLimit: parseInt(usageLimit) || 500,
        oncePerUser,
        isFreeDelivery: discountType === 'free_delivery',
      })

      Alert.alert('Success 🎉', `Coupon "${code.toUpperCase()}" created successfully!`)
      setModalVisible(false)
      setCode('')
      setDiscountValue('0')
      fetchCouponList()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create coupon.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCoupon = async (id: string, codeName: string) => {
    Alert.alert('Delete Coupon', `Are you sure you want to delete coupon "${codeName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCoupon(id)
            fetchCouponList()
          } catch (err: any) {
            Alert.alert('Error', err.message)
          }
        },
      },
    ])
  }

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
            Promotions & Coupons
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            Discounts & Free Delivery Codes
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="bg-primary px-3 py-1.5 rounded-full flex-row items-center"
        >
          <Text className="text-white font-quicksand-bold text-xs">+ New Coupon</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="p-5 pb-32"
          ListEmptyComponent={() => (
            <View className="items-center mt-20 px-8">
              <Text className="text-4xl mb-2">🎟️</Text>
              <Text className="text-lg font-quicksand-bold text-dark-100 mb-1 text-center">
                No Discount Coupons Created
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-xs mb-5 leading-relaxed">
                Create promotional coupon codes to offer Free Delivery or discount percentages to customers during checkout.
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className="bg-primary px-6 py-3 rounded-full shadow-lg shadow-primary/30"
              >
                <Text className="text-white font-quicksand-bold text-sm">+ Add First Coupon</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => {
            const isFreeDeliv = item.discountType === 'free_delivery' || item.isFreeDelivery === true
            const isOnceOnly = item.oncePerUser === true || item.perUserLimit === 1 || isFreeDeliv

            return (
              <View className="bg-white rounded-[28px] p-5 mb-4 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center flex-wrap gap-1.5 mb-1.5">
                    <View className="bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-0.5">
                      <Text className="text-primary font-quicksand-bold text-sm uppercase">
                        {item.code}
                      </Text>
                    </View>
                    {isFreeDeliv ? (
                      <View className="bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">
                        <Text className="text-emerald-700 font-quicksand-bold text-[10px]">
                          🚚 FREE DELIVERY
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-xs font-quicksand-bold text-dark-100">
                        {item.discountType === 'flat' ? `₦${item.discountValue} FLAT OFF` : `${item.discountValue}% OFF`}
                      </Text>
                    )}
                    {isOnceOnly && (
                      <View className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
                        <Text className="text-amber-800 font-quicksand-bold text-[10px]">
                          👤 1 Use Per Customer
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Min Cart: ₦{item.minCartAmount || 0} • Total Used: {item.usedCount || 0}/{item.usageLimit || 1000}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteCoupon(item.$id, item.code)}
                  className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-red-600 font-quicksand-bold text-xs">Delete 🗑️</Text>
                </TouchableOpacity>
              </View>
            )
          }}
        />
      )}

      {/* Modal: Create Coupon */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss()
          setModalVisible(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-black/60 justify-end"
        >
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setModalVisible(false)
            }}
            className="flex-1"
          />

          <View className="bg-white rounded-t-[36px] p-6 max-h-[92%] shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-quicksand-bold text-dark-100">
                Create Promo Coupon
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setModalVisible(false)
                }}
                className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Quick Preset Chips */}
              <Text className="font-quicksand-bold text-xs text-gray-400 uppercase tracking-wider mb-2">
                Quick Coupon Presets
              </Text>
              <View className="flex-row gap-2 mb-4 flex-wrap">
                <TouchableOpacity
                  onPress={() => applyPreset('free_delivery')}
                  className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-emerald-700 font-quicksand-bold text-xs">
                    🚚 Free Delivery (1x/User)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => applyPreset('welcome10')}
                  className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-blue-700 font-quicksand-bold text-xs">
                    🎉 10% OFF Welcome
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => applyPreset('save500')}
                  className="bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-purple-700 font-quicksand-bold text-xs">
                    💸 ₦500 Flat OFF
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Coupon Code *
              </Text>
              <TextInput
                placeholder="Code (e.g. FREEDELIVERY)"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-bold text-base mb-4"
              />

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
                Discount Type *
              </Text>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => {
                    setDiscountType('free_delivery')
                    setDiscountValue('0')
                    setOncePerUser(true)
                  }}
                  className={`flex-1 py-3 px-2 rounded-2xl items-center border ${
                    discountType === 'free_delivery' ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`font-quicksand-bold text-xs ${discountType === 'free_delivery' ? 'text-white' : 'text-gray-700'}`}>
                    🚚 Free Delivery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDiscountType('flat')}
                  className={`flex-1 py-3 px-2 rounded-2xl items-center border ${
                    discountType === 'flat' ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`font-quicksand-bold text-xs ${discountType === 'flat' ? 'text-white' : 'text-gray-700'}`}>
                    Flat Amount (₦)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDiscountType('percentage')}
                  className={`flex-1 py-3 px-2 rounded-2xl items-center border ${
                    discountType === 'percentage' ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`font-quicksand-bold text-xs ${discountType === 'percentage' ? 'text-white' : 'text-gray-700'}`}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>
              </View>

              {discountType !== 'free_delivery' ? (
                <>
                  <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                    Discount Value ({discountType === 'flat' ? '₦' : '%'}) *
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder={discountType === 'flat' ? '500' : '15'}
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold mb-4"
                  />
                </>
              ) : (
                <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-4 flex-row items-center">
                  <Text className="text-xl mr-2.5">🚚</Text>
                  <Text className="font-quicksand-bold text-xs text-emerald-800 flex-1 leading-relaxed">
                    Free Delivery Coupon gives 100% discount on the customer's delivery fee during checkout!
                  </Text>
                </View>
              )}

              {/* Per-User Limit Safeguard Toggle */}
              <TouchableOpacity
                onPress={() => setOncePerUser(!oncePerUser)}
                className={`p-3.5 rounded-2xl border flex-row items-center justify-between mb-5 ${
                  oncePerUser ? 'bg-primary/10 border-primary' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <View className="flex-1 mr-2">
                  <Text className="font-quicksand-bold text-sm text-dark-100">
                    👤 Limit to 1 Use Per Customer
                  </Text>
                  <Text className="font-quicksand-medium text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {oncePerUser
                      ? 'Each customer account can redeem this promo code ONLY ONCE.'
                      : 'Customers can redeem this promo code multiple times.'}
                  </Text>
                </View>
                <View className={`w-6 h-6 rounded-full border items-center justify-center ${oncePerUser ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                  {oncePerUser && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
              </TouchableOpacity>

              <View className="flex-row gap-3 mb-5">
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                    Min Cart Amount (₦)
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="1000"
                    value={minCartAmount}
                    onChangeText={setMinCartAmount}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                    Total Usage Limit
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="500"
                    value={usageLimit}
                    onChangeText={setUsageLimit}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCreateCoupon}
                disabled={submitting}
                className="bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/30"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-quicksand-bold text-base">
                    Publish Promo Coupon 🎟️
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}
