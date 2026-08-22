import CartItem from '@/components/CartItem'
import CustomButton from '@/components/CustomButton'
import CustomHeader from '@/components/CustomHeader'
import LocationPickerModal from '@/components/LocationPickerModal'
import { PaystackPayment } from '@/components/PaystackPayment'
import { createOrder, debitCustomerWallet, getCustomerWallet, getDeliveryFeeSettings, updateUserProfile, validateAndApplyCoupon } from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useLocationStore } from '@/store/location.store'
import { PaymentInfoStripeProps } from '@/type'
import cn from 'clsx'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const PaymentInfoStripe = ({
  label,
  value,
  labelStyle,
  valueStyle,
}: PaymentInfoStripeProps) => (
  <View className="flex-row justify-between items-center my-2">
    <Text className={cn('text-gray-100 font-quicksand-medium', labelStyle)}>
      {label}
    </Text>
    <Text className={cn('text-dark-100 font-quicksand-semibold', valueStyle)}>
      {value}
    </Text>
  </View>
)

const Cart = () => {
  const router = useRouter()
  const { user, fetchAuthenticatedUser } = useAuthStore()
  const { address, isCaptured, savedAddresses, selectSavedAddress } = useLocationStore()
  const { items, getTotalItems, getTotalPrice, clearCart } = useCartStore()

  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [locationModalVisible, setLocationModalVisible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  const [checkoutPhone, setCheckoutPhone] = useState((user as any)?.phone || '')

  // Coupon & Wallet State
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)

  // Dynamic Live Delivery Fee Settings
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(50)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(0)

  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'wallet' | 'split'>('paystack')
  const [walletBalance, setWalletBalance] = useState(0)

  // Paystack gateway state
  const [paystackVisible, setPaystackVisible] = useState(false)
  const [paystackAmount, setPaystackAmount] = useState(0)

  const userId = (user as any)?.$id || (user as any)?.accountId || ''

  React.useEffect(() => {
    if ((user as any)?.phone && !checkoutPhone) {
      setCheckoutPhone((user as any).phone)
    }
  }, [user])

  useFocusEffect(
    React.useCallback(() => {
      getDeliveryFeeSettings().then((settings) => {
        setBaseDeliveryFee(settings.deliveryFee)
        setFreeDeliveryThreshold(settings.freeDeliveryThreshold)
      })

      if (userId) {
        getCustomerWallet(userId).then((w: any) => {
          setWalletBalance(Number(w?.balance) || 0)
        })
      }
    }, [userId])
  )

  const totalPrice = getTotalPrice()
  const isFreeDelivery = freeDeliveryThreshold > 0 && totalPrice >= freeDeliveryThreshold
  const actualDeliveryFee = isFreeDelivery ? 0 : baseDeliveryFee
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - totalPrice)

  const totalItems = getTotalItems()
  const netTotal = Math.max(0, totalPrice + actualDeliveryFee - couponDiscount)

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      return Alert.alert('Invalid Code', 'Please enter a promo coupon code.')
    }
    try {
      setCouponLoading(true)
      const result = await validateAndApplyCoupon(couponCodeInput.trim(), totalPrice + actualDeliveryFee)
      setAppliedCoupon(result.coupon)
      setCouponDiscount(result.discountAmount)
      Alert.alert('Coupon Applied! 🎉', `Saved ₦${result.discountAmount.toFixed(2)} on your order!`)
    } catch (err: any) {
      Alert.alert('Coupon Error', err.message || 'Could not apply coupon code.')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponDiscount(0)
    setCouponCodeInput('')
  }

  const handleCheckoutPress = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to proceed with checkout.')
      return
    }

    const isAddressMissing =
      !address ||
      !isCaptured ||
      address === 'Detecting location...' ||
      address === 'Detecting Location...' ||
      address.trim() === ''

    if (isAddressMissing) {
      Alert.alert(
        'Delivery Location Needed',
        'Please select your delivery address on the map or choose a saved address.',
        [
          {
            text: 'Open Map Picker',
            onPress: () => setLocationModalVisible(true),
          },
        ]
      )
      return
    }

    // Fetch live wallet balance
    try {
      if (userId) {
        const wData: any = await getCustomerWallet(userId)
        setWalletBalance(Number(wData.balance) || 0)
      }
    } catch (e) {
      console.error('Error fetching wallet balance:', e)
    }

    const phoneToUse = (user as any)?.phone || checkoutPhone || ''
    setCheckoutPhone(phoneToUse)
    setPaymentModalVisible(true)
  }

  const handleCompleteOrder = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to complete your checkout.')
      return
    }

    if (!checkoutPhone.trim()) {
      Alert.alert('Mobile Phone Required', 'Please provide a mobile phone number for delivery updates before completing checkout.')
      return
    }

    // For Paystack or Split — launch Paystack gateway first
    if (paymentMethod === 'paystack') {
      setPaystackAmount(netTotal)
      setPaymentModalVisible(false)
      setTimeout(() => setPaystackVisible(true), 300)
      return
    }

    if (paymentMethod === 'split') {
      const paystackPortion = Math.max(0, netTotal - walletBalance)
      if (paystackPortion > 0) {
        setPaystackAmount(paystackPortion)
        setPaymentModalVisible(false)
        setTimeout(() => setPaystackVisible(true), 300)
        return
      }
    }

    // Wallet-only payment — process directly
    await processOrder('WALLET_' + Date.now())
  }

  const processOrder = async (paymentRef: string) => {
    setIsProcessing(true)
    try {
      if (user && (user as any).$id) {
        await updateUserProfile((user as any).$id, { phone: checkoutPhone.trim() })
        await fetchAuthenticatedUser()
      }

      // Handle wallet deductions
      if (paymentMethod === 'wallet') {
        if (walletBalance < netTotal) {
          setIsProcessing(false)
          return Alert.alert('Insufficient Wallet Funds', `Wallet balance (₦${walletBalance}) is less than order total (₦${netTotal.toFixed(2)}). Choose Split Pay or Paystack.`)
        }
        await debitCustomerWallet(userId, netTotal, 'order_payment', `Order checkout #${Date.now().toString().slice(-6)}`, paymentRef)
      } else if (paymentMethod === 'split') {
        const walletPortion = Math.min(walletBalance, netTotal)
        if (walletPortion > 0) {
          await debitCustomerWallet(userId, walletPortion, 'order_payment', `Split checkout — wallet portion`, `${paymentRef}_W`)
        }
      }

      const order = await createOrder({
        userId: userId || 'guest_user',
        userName: user!.name || 'Customer',
        userEmail: user!.email || 'customer@example.com',
        items: JSON.stringify(items),
        totalAmount: netTotal,
        deliveryAddress: address || 'Current Location',
        paymentReference: paymentRef,
        paymentStatus: 'paid',
        orderNotes: orderNotes.trim(),
      })

      clearCart()
      setOrderNotes('')
      setAppliedCoupon(null)
      setCouponDiscount(0)
      setCouponCodeInput('')
      setPaymentModalVisible(false)
      setPaystackVisible(false)
      setIsProcessing(false)

      Alert.alert('Order Placed! 🎉', 'Your order has been confirmed & sent to the store.', [
        {
          text: 'Track Order',
          onPress: () => router.push(`/order/${order.$id}` as any),
        },
      ])
    } catch (err: any) {
      setIsProcessing(false)
      Alert.alert('Checkout Error', err.message || 'Could not process order.')
    }
  }

  const handlePaystackCheckoutSuccess = async (reference: string) => {
    setPaystackVisible(false)
    await processOrder(reference)
  }

  const handlePaystackCheckoutCancel = () => {
    setPaystackVisible(false)
    setPaymentModalVisible(true)
    Alert.alert('Payment Cancelled', 'You can choose a different payment method or try again.')
  }


  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <FlatList
        data={items}
        renderItem={({ item }) => <CartItem item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-32 px-5 pt-5"
        ListHeaderComponent={
          <View className="mb-4">
            <CustomHeader title="Your Cart" />
            <Text className="text-gray-100 mt-2 font-quicksand-medium">
              {totalItems > 0
                ? `${totalItems} item${totalItems > 1 ? 's' : ''} in your cart`
                : 'Your cart is empty'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center mt-20">
            <View className="w-20 h-20 bg-primary/10 rounded-full mb-6 items-center justify-center">
              <Text className="text-3xl">🛒</Text>
            </View>
            <Text className="text-dark-100 text-xl font-quicksand-bold mb-2">
              Your Cart is Empty
            </Text>
            <Text className="text-gray-100 font-quicksand-medium text-center px-10">
              Looks like you haven’t added anything yet. Explore our fresh items!
            </Text>
          </View>
        }
        ListFooterComponent={
          totalItems > 0 ? (
            <View className="mt-8 gap-6">
              {/* Promo Coupon Code Box */}
              <View className="bg-white rounded-[28px] p-6 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row items-center mb-3">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                  <Text className="text-dark-100 text-base font-quicksand-bold flex-1">
                    Have a Promo Coupon?
                  </Text>
                  <Text className="text-lg">🎟️</Text>
                </View>
                <View className="h-px bg-primary/10 mb-4" />

                {appliedCoupon ? (
                  <View className="flex-row justify-between items-center bg-green-500/10 border-2 border-green-500/30 p-4 rounded-2xl">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-8 h-8 bg-green-500/20 rounded-xl items-center justify-center mr-3 border border-green-500/30">
                        <Text className="text-sm">🎉</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-quicksand-bold text-green-800 text-xs">
                          Coupon "{appliedCoupon.code}" Applied!
                        </Text>
                        <Text className="text-green-700 font-quicksand-medium text-[11px] mt-0.5">
                          Discount: -₦{couponDiscount.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={handleRemoveCoupon}
                      className="px-3 py-2 bg-red-500/10 rounded-xl border border-red-500/20 active:opacity-80"
                    >
                      <Text className="text-red-600 font-quicksand-bold text-xs">Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row gap-2">
                    <TextInput
                      placeholder="Enter code (e.g. WELCOME10)"
                      value={couponCodeInput}
                      onChangeText={setCouponCodeInput}
                      autoCapitalize="characters"
                      placeholderTextColor="#9CA3AF"
                      className="flex-1 bg-primary/5 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-bold text-xs text-dark-100"
                    />
                    <TouchableOpacity
                      onPress={handleApplyCoupon}
                      disabled={couponLoading}
                      className="bg-primary px-5 py-3 rounded-2xl justify-center items-center shadow-md shadow-primary/30 active:opacity-90"
                    >
                      {couponLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-white font-quicksand-bold text-xs">Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Free Shipping Incentive Banner */}
              {freeDeliveryThreshold > 0 && (
                <View
                  className={`rounded-[24px] p-4 border-2 flex-row items-center ${isFreeDelivery
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                    }`}
                >
                  <Text className="text-2xl mr-3">{isFreeDelivery ? '🎉' : '🚚'}</Text>
                  <View className="flex-1">
                    <Text
                      className={`font-quicksand-bold text-xs ${isFreeDelivery ? 'text-green-800' : 'text-amber-800'
                        }`}
                    >
                      {isFreeDelivery
                        ? 'FREE Delivery Unlocked!'
                        : `Add ₦${amountNeededForFreeDelivery.toLocaleString()} more for FREE Delivery`}
                    </Text>
                    <Text
                      className={`font-quicksand-medium text-[11px] mt-0.5 ${isFreeDelivery ? 'text-green-700' : 'text-amber-700'
                        }`}
                    >
                      {isFreeDelivery
                        ? `Your order exceeds ₦${freeDeliveryThreshold.toLocaleString()}`
                        : `Free delivery on orders over ₦${freeDeliveryThreshold.toLocaleString()}`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payment Summary */}
              <View className="bg-white rounded-[30px] p-6 border-2 border-primary/10 shadow-lg shadow-black/10">
                <Text className="text-dark-100 text-xl font-quicksand-bold mb-5">
                  Payment Summary
                </Text>

                <PaymentInfoStripe
                  label={`Subtotal (${totalItems})`}
                  value={`₦ ${totalPrice.toFixed(2)}`}
                />
                <PaymentInfoStripe
                  label="Delivery Fee"
                  value={actualDeliveryFee === 0 ? 'FREE 🎉' : `₦ ${actualDeliveryFee.toFixed(2)}`}
                  valueStyle={actualDeliveryFee === 0 ? '!text-green-600 font-quicksand-bold' : undefined}
                />
                {couponDiscount > 0 && (
                  <PaymentInfoStripe
                    label="Promo Discount"
                    value={`- ₦ ${couponDiscount.toFixed(2)}`}
                    valueStyle="!text-success"
                  />
                )}

                <View className="border-t border-primary/10 my-4" />

                <PaymentInfoStripe
                  label="Total Payable"
                  value={`₦ ${netTotal.toFixed(2)}`}
                  labelStyle="text-lg font-quicksand-bold !text-dark-100"
                  valueStyle="text-lg font-quicksand-bold !text-primary"
                />
              </View>

              <View className="mb-5">
                <CustomButton
                  title="Checkout"
                  onPress={handleCheckoutPress}
                />
              </View>
            </View>
          ) : null
        }
      />

      {/* Interactive Location Picker Modal */}
      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        titleNote="Select location to continue checkout"
      />

      {/* Secure Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss()
          setPaymentModalVisible(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-slate-900/40 justify-end"
        >
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setPaymentModalVisible(false)
            }}
            className="flex-1"
          />

          <View className="bg-white rounded-t-[40px] p-6 pt-6 border-t-2 border-primary/20 shadow-2xl max-h-[90%]">
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
            >
              <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-3 border-2 border-primary/20">
                <Text className="text-3xl">💳</Text>
              </View>

              <Text className="text-2xl font-quicksand-bold text-dark-100 mb-1">
                Secure Checkout
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-xs mb-4 text-center px-4">
                Select your preferred payment method below.
              </Text>

              {/* Payment Method Selector Cards */}
              <View className="w-full bg-white rounded-[28px] p-5 mb-4 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row items-center mb-3">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                  <Text className="text-dark-100 text-base font-quicksand-bold flex-1">
                    Select Payment Method
                  </Text>
                </View>
                <View className="h-px bg-primary/10 mb-4" />

                <View className="gap-3">
                  {/* Option 1: Paystack */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setPaymentMethod('paystack')}
                    className="p-4 rounded-2xl border-2 flex-row justify-between items-center"
                    style={{
                      backgroundColor: paymentMethod === 'paystack' ? 'rgba(22, 163, 74, 0.05)' : 'rgba(249, 250, 251, 0.8)',
                      borderColor: paymentMethod === 'paystack' ? '#16A34A' : 'rgba(229, 231, 235, 0.8)',
                    }}
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className="w-10 h-10 rounded-2xl bg-white border border-primary/20 items-center justify-center mr-3 shadow-sm">
                        <Text className="text-xl">💳</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-quicksand-bold text-dark-100 text-sm">
                          Paystack Online Card / Transfer
                        </Text>
                        <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                          Debit card, USSD & Bank transfer
                        </Text>
                      </View>
                    </View>
                    <View
                      className="w-6 h-6 rounded-full border-2 items-center justify-center"
                      style={{
                        borderColor: paymentMethod === 'paystack' ? '#16A34A' : '#D1D5DB',
                        backgroundColor: paymentMethod === 'paystack' ? '#16A34A' : '#FFFFFF',
                      }}
                    >
                      {paymentMethod === 'paystack' && <View className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </View>
                  </TouchableOpacity>

                  {/* Option 2: Funded Customer Wallet */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setPaymentMethod('wallet')}
                    className="p-4 rounded-2xl border-2 flex-row justify-between items-center"
                    style={{
                      backgroundColor: paymentMethod === 'wallet' ? 'rgba(22, 163, 74, 0.05)' : 'rgba(249, 250, 251, 0.8)',
                      borderColor: paymentMethod === 'wallet' ? '#16A34A' : 'rgba(229, 231, 235, 0.8)',
                    }}
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className="w-10 h-10 rounded-2xl bg-white border border-primary/20 items-center justify-center mr-3 shadow-sm">
                        <Text className="text-xl">👛</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-quicksand-bold text-dark-100 text-sm">
                          My Wallet (₦{walletBalance.toLocaleString()})
                        </Text>
                        <Text
                          className="font-quicksand-semibold text-xs mt-0.5"
                          style={{
                            color: walletBalance >= netTotal ? '#16a34a' : '#d97706',
                          }}
                        >
                          {walletBalance >= netTotal ? '1-Click Instant Payment' : 'Insufficient balance for full total'}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="w-6 h-6 rounded-full border-2 items-center justify-center"
                      style={{
                        borderColor: paymentMethod === 'wallet' ? '#16A34A' : '#D1D5DB',
                        backgroundColor: paymentMethod === 'wallet' ? '#16A34A' : '#FFFFFF',
                      }}
                    >
                      {paymentMethod === 'wallet' && <View className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </View>
                  </TouchableOpacity>

                  {/* Option 3: Split Payment */}
                  {walletBalance > 0 && walletBalance < netTotal && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPaymentMethod('split')}
                      className="p-4 rounded-2xl border-2 flex-row justify-between items-center"
                      style={{
                        backgroundColor: paymentMethod === 'split' ? 'rgba(22, 163, 74, 0.05)' : 'rgba(249, 250, 251, 0.8)',
                        borderColor: paymentMethod === 'split' ? '#16A34A' : 'rgba(229, 231, 235, 0.8)',
                      }}
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        <View className="w-10 h-10 rounded-2xl bg-white border border-primary/20 items-center justify-center mr-3 shadow-sm">
                          <Text className="text-xl">🔀</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-quicksand-bold text-dark-100 text-sm">
                            Split Payment
                          </Text>
                          <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                            Wallet ₦{walletBalance} + Paystack ₦{(netTotal - walletBalance).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <View
                        className="w-6 h-6 rounded-full border-2 items-center justify-center"
                        style={{
                          borderColor: paymentMethod === 'split' ? '#16A34A' : '#D1D5DB',
                          backgroundColor: paymentMethod === 'split' ? '#16A34A' : '#FFFFFF',
                        }}
                      >
                        {paymentMethod === 'split' && <View className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Payment & Location Summary Box */}
              <View className="w-full bg-white rounded-[28px] p-5 mb-4 border-2 border-primary/10 shadow-lg shadow-black/10 gap-2.5">
                <View className="flex-row items-center mb-1">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                  <Text className="text-dark-100 text-base font-quicksand-bold flex-1">
                    Checkout Summary
                  </Text>
                </View>
                <View className="h-px bg-primary/10 mb-2" />

                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 font-quicksand-medium text-xs">Net Amount Payable:</Text>
                  <Text className="text-primary font-quicksand-bold text-base">
                    ₦ {netTotal.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 font-quicksand-medium text-xs">Email Account:</Text>
                  <Text className="text-dark-100 font-quicksand-bold text-xs">
                    {user?.email || 'customer@example.com'}
                  </Text>
                </View>

                {/* Delivery Location with Edit Link */}
                <TouchableOpacity
                  onPress={() => {
                    setPaymentModalVisible(false)
                    setLocationModalVisible(true)
                  }}
                  className="flex-row justify-between items-center pt-2.5 border-t-2 border-primary/10 mt-1"
                >
                  <Text className="text-gray-500 font-quicksand-medium text-xs mr-2">Deliver To:</Text>
                  <Text
                    className="text-primary font-quicksand-bold flex-1 text-right text-xs underline"
                    numberOfLines={1}
                  >
                    📍 {address} (Change)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Required Phone Number Input */}
              <View className="w-full mb-3">
                <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">
                  Mobile Phone Number (Required for Delivery Updates) *
                </Text>
                <TextInput
                  value={checkoutPhone}
                  onChangeText={setCheckoutPhone}
                  keyboardType="phone-pad"
                  placeholder="e.g. +234 801 234 5678"
                  placeholderTextColor="#9CA3AF"
                  className="bg-primary/5 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-bold text-xs text-dark-100 shadow-sm shadow-black/5"
                />
              </View>

              {/* Order Notes Input */}
              <View className="w-full mb-5">
                <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">
                  Order Notes / Special Instructions (Optional)
                </Text>
                <TextInput
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  placeholder="e.g. Ring bell twice, leave with security..."
                  placeholderTextColor="#9CA3AF"
                  className="bg-primary/5 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-bold text-xs text-dark-100 shadow-sm shadow-black/5"
                />
              </View>

              {isProcessing ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="large" color="#16A34A" />
                  <Text className="text-primary font-quicksand-semibold mt-2">
                    Processing Checkout Transaction...
                  </Text>
                </View>
              ) : (
                <View className="w-full gap-3 mb-2">
                  <TouchableOpacity
                    onPress={handleCompleteOrder}
                    className="bg-primary rounded-full py-4 items-center justify-center shadow-lg shadow-primary/30 active:opacity-90"
                  >
                    <Text className="text-white font-quicksand-bold text-base">
                      Confirm & Pay • ₦ {netTotal.toFixed(2)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPaymentModalVisible(false)}
                    className="bg-red-500/10 border-2 border-red-500/20 rounded-full py-3.5 items-center justify-center active:opacity-80"
                  >
                    <Text className="text-red-600 font-quicksand-bold text-sm">Cancel Checkout</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Paystack Gateway (for Paystack & Split payments) ── */}
      {paystackVisible && (
        <PaystackPayment
          visible={paystackVisible}
          amount={paystackAmount}
          email={(user as any)?.email || ''}
          name={(user as any)?.name}
          reference={`ORDER_${Date.now()}`}
          metadata={{
            userId,
            purpose: 'checkout',
            items: items.length,
          }}
          onSuccess={handlePaystackCheckoutSuccess}
          onCancel={handlePaystackCheckoutCancel}
        />
      )}

    </SafeAreaView>
  )
}

export default Cart