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
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat')
  const [discountValue, setDiscountValue] = useState('')
  const [minCartAmount, setMinCartAmount] = useState('1000')
  const [usageLimit, setUsageLimit] = useState('500')
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

  const handleCreateCoupon = async () => {
    if (!code.trim() || !discountValue.trim()) {
      return Alert.alert('Validation Error', 'Please enter coupon code and discount value.')
    }

    try {
      setSubmitting(true)
      await createCoupon({
        code: code.trim(),
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        minCartAmount: parseFloat(minCartAmount) || 0,
        usageLimit: parseInt(usageLimit) || 500,
      })

      Alert.alert('Success', `Coupon "${code.toUpperCase()}" created!`)
      setModalVisible(false)
      setCode('')
      setDiscountValue('')
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
            Discounts & Promo Codes
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
              <Text className="text-lg font-quicksand-bold text-dark-100 mb-1">
                No Discount Coupons Created
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-xs mb-5">
                Create promotional coupon codes to offer discounts to customers during checkout.
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className="bg-primary px-6 py-3 rounded-full shadow-lg shadow-primary/30"
              >
                <Text className="text-white font-quicksand-bold text-sm">+ Add First Coupon</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="bg-white rounded-[28px] p-5 mb-4 border-2 border-primary/10 shadow-lg shadow-black/5 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center mb-1">
                  <View className="bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-0.5 mr-2">
                    <Text className="text-primary font-quicksand-bold text-sm uppercase">
                      {item.code}
                    </Text>
                  </View>
                  <Text className="text-xs font-quicksand-semibold text-gray-500">
                    {item.discountType === 'flat' ? `₦${item.discountValue} FLAT OFF` : `${item.discountValue}% OFF`}
                  </Text>
                </View>

                <Text className="text-gray-400 font-quicksand-medium text-xs">
                  Min Cart: ₦{item.minCartAmount || 0} • Used: {item.usedCount || 0}/{item.usageLimit || 1000}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteCoupon(item.$id, item.code)}
                className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full"
              >
                <Text className="text-red-600 font-quicksand-bold text-xs">Delete 🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
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
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Coupon Code *
              </Text>
              <TextInput
                placeholder="Code (e.g. WELCOME10)"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-bold text-base mb-4"
              />

              <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
                Discount Type
              </Text>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => setDiscountType('flat')}
                  className={`flex-1 py-3 rounded-2xl items-center border ${
                    discountType === 'flat' ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`font-quicksand-bold text-xs ${discountType === 'flat' ? 'text-white' : 'text-gray-700'}`}>
                    Flat Amount (₦)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDiscountType('percentage')}
                  className={`flex-1 py-3 rounded-2xl items-center border ${
                    discountType === 'percentage' ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`font-quicksand-bold text-xs ${discountType === 'percentage' ? 'text-white' : 'text-gray-700'}`}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>
              </View>

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

              <View className="flex-row gap-3 mb-5">
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-xs text-dark-100 mb-1">
                    Min Cart Limit (₦)
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
                    Publish Coupon Code 🎟️
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
