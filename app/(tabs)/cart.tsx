import CartItem from '@/components/CartItem'
import CustomButton from '@/components/CustomButton'
import CustomHeader from '@/components/CustomHeader'
import LocationPickerModal from '@/components/LocationPickerModal'
import { PaystackPayment } from '@/components/PaystackPayment'
import {
  calculateDynamicDeliveryFee,
  calculateEstimatedDeliveryTime,
  calculateHaversineDistanceKm,
  createOrder,
  debitCustomerWallet,
  DeliveryFeeSettings,
  geocodeAddressCoords,
  getCustomerWallet,
  getDeliveryFeeSettings,
  getStoreById,
  getStores,
  recordWalletTransaction,
  sortStoresByProximity,
  updateUserProfile,
  validateAndApplyCoupon,
  recordCouponUsage,
} from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useLocationStore } from '@/store/location.store'
import { PaymentInfoStripeProps } from '@/type'
import cn from 'clsx'
import * as Location from 'expo-location'
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
  const { address, latitude, longitude, isCaptured, savedAddresses, selectSavedAddress, setLocation } = useLocationStore()
  const { items, getTotalItems, getTotalPrice, clearCart, removeItem } = useCartStore()

  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [locationModalVisible, setLocationModalVisible] = useState(false)
  const [locationMismatchModalVisible, setLocationMismatchModalVisible] = useState(false)
  const [isDetectingLocationMismatch, setIsDetectingLocationMismatch] = useState(false)
  const [locationMismatchInfo, setLocationMismatchInfo] = useState<{
    currentLocationName: string
    currentCoords: { latitude: number; longitude: number }
    savedAddressName: string
    distanceKm: number
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  const [checkoutPhone, setCheckoutPhone] = useState((user as any)?.phone || '')

  // Coupon & Wallet State
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)

  // Dynamic Live Delivery Fee Settings
  const [deliverySettings, setDeliverySettings] = useState<DeliveryFeeSettings | null>(null)
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(1000)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(10000)

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
        setDeliverySettings(settings)
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

  const [userLocationCoords, setUserLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [storeLocationCoords, setStoreLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [storeLocationCoordsMap, setStoreLocationCoordsMap] = useState<Record<string, { latitude: number; longitude: number; storeName?: string }>>({})

  // Resolve Customer Location Coordinates (Identical to Home Screen)
  React.useEffect(() => {
    let isMounted = true
    const resolveUser = async () => {
      if (latitude && longitude) {
        console.log('[CART] User GPS coords (matching Home screen):', latitude, longitude)
        if (isMounted) setUserLocationCoords({ latitude: Number(latitude), longitude: Number(longitude) })
      } else if (address && address !== 'Detecting location...' && address.trim() !== '') {
        console.log('[CART] Geocoding selected user address:', address)
        const coords = await geocodeAddressCoords(address)
        console.log('[CART] Geocoded user coords:', coords)
        if (isMounted) setUserLocationCoords(coords)
      } else {
        console.log('[CART] No user location found, using Lagos default')
        if (isMounted) setUserLocationCoords({ latitude: 6.5244, longitude: 3.3792 })
      }
    }
    resolveUser()
    return () => { isMounted = false }
  }, [address, latitude, longitude])

  // Resolve Store Location Coordinates for EVERY unique seller in cart
  React.useEffect(() => {
    let isMounted = true
    const resolveStores = async () => {
      if (items.length > 0) {
        const uniqueSellerIds = Array.from(
          new Set(
            items.map((i: any) => i.sellerId || i.storeId || i.seller_id).filter(Boolean)
          )
        )

        const mapAcc: Record<string, { latitude: number; longitude: number; storeName?: string }> = {}

        try {
          const allDbStores: any = await getStores().catch(() => [])

          for (const sId of uniqueSellerIds) {
            const strId = String(sId)
            let st: any = allDbStores.find((store: any) => store.$id === strId || store.id === strId)
            if (!st && typeof sId === 'string') {
              st = await getStoreById(sId).catch(() => null)
            }

            if (st && st.latitude && st.longitude &&
              Number(st.latitude) >= 4.0 && Number(st.latitude) <= 14.0 &&
              Number(st.longitude) >= 2.0 && Number(st.longitude) <= 15.0) {
              mapAcc[strId] = {
                latitude: Number(st.latitude),
                longitude: Number(st.longitude),
                storeName: st.storeName || 'Store',
              }
            } else if (st && st.address) {
              const coords = await geocodeAddressCoords(st.address)
              mapAcc[strId] = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                storeName: st.storeName || 'Store',
              }
            }
          }

          if (Object.keys(mapAcc).length === 0 && allDbStores && allDbStores.length > 0) {
            const sorted = sortStoresByProximity(allDbStores, latitude, longitude)
            const fallbackStore = sorted[0]
            if (fallbackStore) {
              mapAcc['default'] = {
                latitude: Number(fallbackStore.latitude || 6.5244),
                longitude: Number(fallbackStore.longitude || 3.3792),
                storeName: fallbackStore.storeName || 'Store',
              }
            }
          }

          if (isMounted) {
            setStoreLocationCoordsMap(mapAcc)
            const firstKey = Object.keys(mapAcc)[0]
            if (firstKey) {
              setStoreLocationCoords(mapAcc[firstKey])
            }
          }
        } catch (e) {
          console.log('[CART] Store evaluation error:', e)
        }
      }
    }
    resolveStores()
    return () => { isMounted = false }
  }, [items, latitude, longitude])

  // Comprehensive Multi-Store Distance & Delivery Radius Evaluation
  const multiStoreEvaluation = React.useMemo(() => {
    const uLat = userLocationCoords?.latitude || latitude || 6.5244
    const uLon = userLocationCoords?.longitude || longitude || 3.3792
    const maxRadius = deliverySettings?.maxDeliveryRadiusKm || 20

    const outOfRangeItemIds: Set<string> = new Set()
    const outOfRangeStoreNames: Set<string> = new Set()
    let maxDistKm = 0
    let hasOutOfRangeStore = false

    items.forEach((item: any) => {
      const sId = String(item.sellerId || item.storeId || item.seller_id || 'default')
      const storeCoords = storeLocationCoordsMap[sId] || storeLocationCoordsMap['default']

      let distKm = 2.5
      if (storeCoords && storeCoords.latitude && storeCoords.longitude) {
        distKm = calculateHaversineDistanceKm(uLat, uLon, storeCoords.latitude, storeCoords.longitude)
      }

      if (distKm > maxDistKm) maxDistKm = distKm

      if (distKm > maxRadius) {
        hasOutOfRangeStore = true
        if (storeCoords?.storeName) outOfRangeStoreNames.add(storeCoords.storeName)
        if (item.id) outOfRangeItemIds.add(item.id)
      }
    })

    return {
      hasOutOfRangeStore,
      outOfRangeItemIds,
      outOfRangeStoreNames: Array.from(outOfRangeStoreNames),
      maxDistKm,
    }
  }, [items, storeLocationCoordsMap, userLocationCoords, latitude, longitude, deliverySettings])

  const totalPrice = getTotalPrice()
  const totalItems = getTotalItems()

  const uniqueSellerCount = React.useMemo(() => {
    return new Set(items.map((i: any) => i.sellerId || i.storeId || i.seller_id).filter(Boolean)).size || 1
  }, [items])

  // Calculate dynamic incremental delivery fee based on total products ordered, distance, subtotal & store count
  const rawDeliveryCalc = deliverySettings
    ? calculateDynamicDeliveryFee(totalItems, totalPrice, deliverySettings, {
      userLocation: userLocationCoords || undefined,
      storeLocation: storeLocationCoords || undefined,
      storeCount: uniqueSellerCount,
    })
    : {
      baseFee: baseDeliveryFee,
      incrementalFee: 0,
      multiStoreSurcharge: uniqueSellerCount > 1 ? (uniqueSellerCount - 1) * 500 : 0,
      totalDeliveryFee: freeDeliveryThreshold > 0 && totalPrice >= freeDeliveryThreshold ? 0 : baseDeliveryFee + (uniqueSellerCount > 1 ? (uniqueSellerCount - 1) * 500 : 0),
      isFree: freeDeliveryThreshold > 0 && totalPrice >= freeDeliveryThreshold,
      distanceKm: 2.5,
      isOutOfRange: false,
      breakdownText: `Base ₦${baseDeliveryFee.toLocaleString()}`,
    }

  const deliveryCalc = {
    ...rawDeliveryCalc,
    isOutOfRange: multiStoreEvaluation.hasOutOfRangeStore || rawDeliveryCalc.isOutOfRange,
    distanceKm: multiStoreEvaluation.maxDistKm > 0 ? multiStoreEvaluation.maxDistKm : rawDeliveryCalc.distanceKm,
  }

  const actualDeliveryFee = deliveryCalc.totalDeliveryFee
  const isFreeDelivery = deliveryCalc.isFree
  const baseDeliveryFeeToDisplay = isFreeDelivery ? 0 : (deliveryCalc.baseFee + (deliveryCalc.incrementalFee || 0))
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - totalPrice)

  const netTotal = Math.max(0, totalPrice + actualDeliveryFee - couponDiscount)

  const handleRemoveOutOfRangeItems = () => {
    if (multiStoreEvaluation.outOfRangeItemIds.size === 0) return
    const idsToRemove = Array.from(multiStoreEvaluation.outOfRangeItemIds)
    idsToRemove.forEach((id) => removeItem(id))
    Alert.alert(
      'Out-of-Range Items Removed 🛒',
      `Removed ${idsToRemove.length} out-of-range item(s) from your cart. Valid items remain in your cart!`
    )
  }

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      return Alert.alert('Invalid Code', 'Please enter a promo coupon code.')
    }
    try {
      setCouponLoading(true)
      const currentUserId = user?.$id || (user as any)?.accountId
      const result = await validateAndApplyCoupon(
        couponCodeInput.trim(),
        totalPrice,
        actualDeliveryFee,
        currentUserId
      )
      setAppliedCoupon(result.coupon)
      setCouponDiscount(result.discountAmount)
      const isFreeDeliv = result.isFreeDelivery || result.coupon?.discountType === 'free_delivery' || result.coupon?.isFreeDelivery === true
      Alert.alert(
        'Coupon Applied! 🎉',
        isFreeDeliv
          ? `Free Delivery Coupon Applied! Saved ₦${result.discountAmount.toFixed(2)} on delivery fee!`
          : `Saved ₦${result.discountAmount.toFixed(2)} on your order!`
      )
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

  const proceedToPayment = async () => {
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

    if (deliveryCalc.isOutOfRange) {
      Alert.alert(
        'Delivery Out of Range ⚠️',
        `The store is ${deliveryCalc.distanceKm} km away from your selected delivery address, which exceeds the maximum delivery radius of ${deliverySettings?.maxDeliveryRadiusKm || 20} km.\n\nPlease select a closer delivery address or choose products from a nearby store.`,
        [
          { text: 'Change Delivery Address', onPress: () => setLocationModalVisible(true) },
          { text: 'OK', style: 'cancel' },
        ]
      )
      return
    }

    // ── SMART LOCATION MISMATCH DETECTION ──
    // If user is about to pay in a new location different from their saved delivery address, ask them!
    try {
      setIsDetectingLocationMismatch(true)
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ])

        const targetLat = userLocationCoords?.latitude || latitude
        const targetLon = userLocationCoords?.longitude || longitude

        if (loc && (loc as any).coords && targetLat && targetLon) {
          const devLat = (loc as any).coords.latitude
          const devLon = (loc as any).coords.longitude

          const diffKm = calculateHaversineDistanceKm(devLat, devLon, Number(targetLat), Number(targetLon))

          // If current device is more than 2.5 km away from the saved delivery address
          if (diffKm > 2.5) {
            let detectedName = 'Current Location'
            try {
              const [geo] = await Location.reverseGeocodeAsync({ latitude: devLat, longitude: devLon })
              if (geo) {
                const street = [geo.streetNumber, geo.street || geo.name].filter(Boolean).join(' ')
                const area = geo.district || geo.subregion || geo.city || ''
                detectedName = [street, area].filter(Boolean).join(', ') || 'Current GPS Location'
              }
            } catch { }

            setLocationMismatchInfo({
              currentLocationName: detectedName,
              currentCoords: { latitude: devLat, longitude: devLon },
              savedAddressName: address,
              distanceKm: diffKm,
            })
            setIsDetectingLocationMismatch(false)
            setLocationMismatchModalVisible(true)
            return
          }
        }
      }
    } catch (err) {
      console.log('[CART] Location mismatch detection skipped:', err)
    } finally {
      setIsDetectingLocationMismatch(false)
    }

    await proceedToPayment()
  }

  const handleContinueWithSavedAddress = async () => {
    setLocationMismatchModalVisible(false)
    await proceedToPayment()
  }

  const handleUseCurrentLocation = async () => {
    if (locationMismatchInfo) {
      setLocation(
        locationMismatchInfo.currentLocationName,
        locationMismatchInfo.currentCoords,
        true
      )
      setUserLocationCoords(locationMismatchInfo.currentCoords)
    }
    setLocationMismatchModalVisible(false)
    await proceedToPayment()
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

      // Handle payment method transaction recording & deductions
      if (paymentMethod === 'wallet') {
        if (walletBalance < netTotal) {
          setIsProcessing(false)
          return Alert.alert('Insufficient Wallet Funds', `Wallet balance (₦${walletBalance}) is less than order total (₦${netTotal.toFixed(2)}). Choose Split Pay or Paystack.`)
        }
        await debitCustomerWallet(
          userId,
          netTotal,
          'wallet_order_payment',
          `Full Wallet Order Checkout — ₦${netTotal.toLocaleString()}`,
          paymentRef,
        )
      } else if (paymentMethod === 'split') {
        const walletPortion = Math.min(walletBalance, netTotal)
        const paystackPortion = Math.max(0, netTotal - walletBalance)

        if (walletPortion > 0) {
          await debitCustomerWallet(
            userId,
            walletPortion,
            'split_wallet_payment',
            `Split Checkout (Wallet Portion) — ₦${walletPortion.toLocaleString()}`,
            `${paymentRef}_W`,
          )
        }

        if (paystackPortion > 0) {
          await recordWalletTransaction({
            userId,
            amount: paystackPortion,
            type: 'debit',
            category: 'split_paystack_payment',
            description: `Split Checkout (Paystack Card Portion) — ₦${paystackPortion.toLocaleString()}`,
            reference: `${paymentRef}_P`,
          })
        }
      } else if (paymentMethod === 'paystack') {
        await recordWalletTransaction({
          userId,
          amount: netTotal,
          type: 'debit',
          category: 'paystack_card_payment',
          description: `Card Checkout via Paystack — ₦${netTotal.toLocaleString()}`,
          reference: paymentRef,
        })
      }

      // Group items by unique seller/store ID for multi-vendor order splitting
      const itemsBySeller: Record<string, typeof items> = {}
      items.forEach((item: any) => {
        const sId = String(item.sellerId || item.storeId || item.seller_id || 'default')
        if (!itemsBySeller[sId]) itemsBySeller[sId] = []
        itemsBySeller[sId].push(item)
      })

      const sellerGroupIds = Object.keys(itemsBySeller)
      const createdOrders: any[] = []

      // If single vendor
      if (sellerGroupIds.length === 1) {
        const singleSellerId = sellerGroupIds[0] === 'default' ? undefined : sellerGroupIds[0]
        const order = await createOrder({
          userId: userId || 'guest_user',
          userName: user!.name || 'Customer',
          userEmail: user!.email || 'customer@example.com',
          items: JSON.stringify(items),
          totalAmount: netTotal,
          deliveryAddress: address || 'Current Location',
          paymentReference: paymentRef,
          paymentStatus: 'paid',
          sellerId: singleSellerId,
          orderNotes: orderNotes.trim(),
          storeLatitude: storeLocationCoords?.latitude,
          storeLongitude: storeLocationCoords?.longitude,
          customerLatitude: userLocationCoords?.latitude,
          customerLongitude: userLocationCoords?.longitude,
          deliveryDistanceKm: deliveryCalc.distanceKm,
          deliveryFee: actualDeliveryFee,
        })
        createdOrders.push(order)
      } else {
        // Multi-Vendor Order Splitting! Create individual orders for each seller
        const totalItemsSubtotal = items.reduce((acc: number, it: any) => {
          const customPrice = it.customizations?.reduce((s: number, c: any) => s + c.price, 0) || 0
          return acc + (it.price + customPrice) * it.quantity
        }, 0)

        const perStoreDeliveryFee = Math.round(actualDeliveryFee / sellerGroupIds.length)

        for (let idx = 0; idx < sellerGroupIds.length; idx++) {
          const sId = sellerGroupIds[idx]
          const sellerItems = itemsBySeller[sId]

          const sellerSubtotal = sellerItems.reduce((acc: number, it: any) => {
            const customPrice = it.customizations?.reduce((s: number, c: any) => s + c.price, 0) || 0
            return acc + (it.price + customPrice) * it.quantity
          }, 0)

          const discountShare = totalItemsSubtotal > 0
            ? (sellerSubtotal / totalItemsSubtotal) * couponDiscount
            : 0

          const sellerNetTotal = Math.max(0, sellerSubtotal + perStoreDeliveryFee - discountShare)

          const sellerCoords = storeLocationCoordsMap[sId] || storeLocationCoordsMap['default']

          let sellerDistKm = deliveryCalc.distanceKm
          if (sellerCoords?.latitude && sellerCoords?.longitude && userLocationCoords?.latitude && userLocationCoords?.longitude) {
            sellerDistKm = calculateHaversineDistanceKm(
              userLocationCoords.latitude,
              userLocationCoords.longitude,
              sellerCoords.latitude,
              sellerCoords.longitude
            )
          }

          const order = await createOrder({
            userId: userId || 'guest_user',
            userName: user!.name || 'Customer',
            userEmail: user!.email || 'customer@example.com',
            items: JSON.stringify(sellerItems),
            totalAmount: sellerNetTotal,
            deliveryAddress: address || 'Current Location',
            paymentReference: `${paymentRef}_S${idx + 1}`,
            paymentStatus: 'paid',
            sellerId: sId === 'default' ? undefined : sId,
            orderNotes: orderNotes.trim(),
            storeLatitude: sellerCoords?.latitude || storeLocationCoords?.latitude,
            storeLongitude: sellerCoords?.longitude || storeLocationCoords?.longitude,
            customerLatitude: userLocationCoords?.latitude,
            customerLongitude: userLocationCoords?.longitude,
            deliveryDistanceKm: sellerDistKm,
            deliveryFee: perStoreDeliveryFee,
          })
          createdOrders.push(order)
        }
      }

      if (appliedCoupon && (appliedCoupon.$id || appliedCoupon.id)) {
        try {
          await recordCouponUsage(appliedCoupon.$id || appliedCoupon.id, appliedCoupon.code, userId)
        } catch (couponRecErr) {
          console.warn('[CART] Error recording coupon usage:', couponRecErr)
        }
      }

      clearCart()
      setOrderNotes('')
      setAppliedCoupon(null)
      setCouponDiscount(0)
      setCouponCodeInput('')
      setPaymentModalVisible(false)
      setPaystackVisible(false)
      setIsProcessing(false)

      const firstOrder = createdOrders[0]
      const orderCount = createdOrders.length

      Alert.alert(
        orderCount > 1 ? 'Multi-Store Orders Placed! 🎉' : 'Order Placed! 🎉',
        orderCount > 1
          ? `Created ${orderCount} separate store orders for your items. Each seller will process their portion.`
          : 'Your order has been confirmed & sent to the store.',
        [
          {
            text: 'Track Order',
            onPress: () => router.push(`/order/${firstOrder.$id}` as any),
          },
        ]
      )
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
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
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

              {/* Interactive Out-of-Range Resolution Banner */}
              {deliveryCalc.isOutOfRange && (
                <View className="bg-red-500/10 border-2 border-red-500/30 rounded-[28px] p-5 mb-5 shadow-sm">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-2xl mr-3">⚠️</Text>
                    <View className="flex-1">
                      <Text className="text-red-800 font-quicksand-bold text-sm">
                        Items Out of Delivery Radius
                      </Text>
                      <Text className="text-red-700 font-quicksand-medium text-xs mt-0.5">
                        Store is {deliveryCalc.distanceKm} km away (Max radius: {deliverySettings?.maxDeliveryRadiusKm || 20} km).
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-x-3 mt-3">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleRemoveOutOfRangeItems}
                      className="flex-1 bg-red-600 py-3 px-3 rounded-2xl items-center justify-center shadow-sm active:scale-95"
                    >
                      <Text className="text-white font-quicksand-bold text-xs">
                        🗑️ Remove Out-of-Range Items
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setLocationModalVisible(true)}
                      className="bg-white border border-red-500/40 px-3.5 py-3 rounded-2xl items-center justify-center active:scale-95"
                    >
                      <Text className="text-red-700 font-quicksand-bold text-xs">
                        📍 Change Address
                      </Text>
                    </TouchableOpacity>
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
                  label={`Delivery Fee ${deliverySettings?.deliveryPricingMode === 'distance' && deliveryCalc.distanceKm ? `(📍 ${deliveryCalc.distanceKm} km)` : ''}`}
                  value={
                    deliveryCalc.isOutOfRange
                      ? '⚠️ Out of Range'
                      : (isFreeDelivery ? 'FREE 🎉' : `₦ ${baseDeliveryFeeToDisplay.toFixed(2)}`)
                  }
                  valueStyle={
                    deliveryCalc.isOutOfRange
                      ? '!text-red-500 font-quicksand-bold text-xs'
                      : (isFreeDelivery ? '!text-green-600 font-quicksand-bold' : undefined)
                  }
                />
                {deliveryCalc.multiStoreSurcharge > 0 && (
                  <PaymentInfoStripe
                    label={`Multi-Store Pickup (${uniqueSellerCount} Stores)`}
                    value={`+ ₦ ${deliveryCalc.multiStoreSurcharge.toFixed(2)}`}
                    valueStyle="!text-amber-600 font-quicksand-bold text-xs"
                  />
                )}
                <PaymentInfoStripe
                  label="Estimated Delivery Time"
                  value={
                    deliveryCalc.isOutOfRange
                      ? 'Out of Radius'
                      : `⏱️ ${calculateEstimatedDeliveryTime(deliveryCalc.distanceKm).label}`
                  }
                  valueStyle="!text-primary font-quicksand-bold text-xs"
                />
                {deliveryCalc.isOutOfRange && (
                  <View className="bg-red-500/10 border border-red-500/30 p-3 rounded-2xl my-2">
                    <Text className="text-red-700 font-quicksand-bold text-xs">
                      ⚠️ Delivery Address Out of Range
                    </Text>
                    <Text className="text-red-600 font-quicksand-medium text-[11px] mt-0.5">
                      Store is {deliveryCalc.distanceKm} km away. Maximum delivery radius is {deliverySettings?.maxDeliveryRadiusKm || 20} km. Please select a closer delivery address.
                    </Text>
                  </View>
                )}
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
                  title={isDetectingLocationMismatch ? "Checking location..." : "Checkout"}
                  isLoading={isDetectingLocationMismatch}
                  onPress={handleCheckoutPress}
                />
              </View>
            </View>
          ) : null
        }
      />

      {/* ── Location Mismatch Confirmation Modal ── */}
      <Modal
        visible={locationMismatchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationMismatchModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          <View className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl border-2 border-primary/20">
            {/* Header */}
            <View className="items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 items-center justify-center mb-3">
                <Text className="text-2xl">📍</Text>
              </View>
              <Text className="text-xl font-quicksand-bold text-dark-100 text-center">
                Different Location Detected
              </Text>
              <Text className="text-xs font-quicksand-medium text-gray-500 text-center mt-1 px-2 leading-relaxed">
                You appear to be at a different location from your saved delivery address. Where would you like this order delivered?
              </Text>
            </View>

            {/* Address Comparison Cards */}
            <View className="gap-y-3 mb-5">
              {/* Option A: Saved / Selected Delivery Address */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleContinueWithSavedAddress}
                className="bg-primary/5 border-2 border-primary/30 p-4 rounded-2xl"
              >
                <View className="flex-row items-start">
                  <Text className="text-lg mr-2.5 mt-0.5">🏠</Text>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-0.5">
                      <Text className="text-xs font-quicksand-bold text-primary" style={{ color: '#53B175' }}>
                        Deliver to Saved Address
                      </Text>
                      <View className="bg-primary px-2 py-0.5 rounded-full" style={{ backgroundColor: '#53B175' }}>
                        <Text className="text-[10px] font-quicksand-bold text-white">Current Selection</Text>
                      </View>
                    </View>
                    <Text className="text-dark-100 font-quicksand-bold text-xs" numberOfLines={2}>
                      {locationMismatchInfo?.savedAddressName || address}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Option B: Current Physical Location */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleUseCurrentLocation}
                className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl"
              >
                <View className="flex-row items-start">
                  <Text className="text-lg mr-2.5 mt-0.5">🎯</Text>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-0.5">
                      <Text className="text-xs font-quicksand-bold text-amber-800">
                        Deliver to Current Location
                      </Text>
                      <Text className="text-[10px] font-quicksand-bold text-amber-700">
                        ~{locationMismatchInfo?.distanceKm.toFixed(1)} km away
                      </Text>
                    </View>
                    <Text className="text-dark-100 font-quicksand-bold text-xs" numberOfLines={2}>
                      {locationMismatchInfo?.currentLocationName}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View className="gap-y-2.5">
              <TouchableOpacity
                onPress={handleContinueWithSavedAddress}
                className="bg-primary py-3.5 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:opacity-90"
                style={{ backgroundColor: '#53B175' }}
              >
                <Text className="text-white font-quicksand-bold text-sm">
                  Continue with Saved Address →
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleUseCurrentLocation}
                className="bg-white border-2 border-primary/30 py-3 rounded-full items-center justify-center active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs" style={{ color: '#53B175' }}>
                  Update & Deliver to Current Location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setLocationMismatchModalVisible(false)
                  setTimeout(() => setLocationModalVisible(true), 250)
                }}
                className="py-2 items-center"
              >
                <Text className="text-gray-400 font-quicksand-bold text-xs">
                  Pick Another Address on Map 🗺️
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                      backgroundColor: paymentMethod === 'paystack' ? 'rgba(83, 177, 117, 0.05)' : 'rgba(249, 250, 251, 0.8)',
                      borderColor: paymentMethod === 'paystack' ? '#53B175' : 'rgba(229, 231, 235, 0.8)',
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
                        borderColor: paymentMethod === 'paystack' ? '#53B175' : '#D1D5DB',
                        backgroundColor: paymentMethod === 'paystack' ? '#53B175' : '#FFFFFF',
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
                      backgroundColor: paymentMethod === 'wallet' ? 'rgba(83, 177, 117, 0.05)' : 'rgba(249, 250, 251, 0.8)',
                      borderColor: paymentMethod === 'wallet' ? '#53B175' : 'rgba(229, 231, 235, 0.8)',
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
                            color: walletBalance >= netTotal ? '#53B175' : '#d97706',
                          }}
                        >
                          {walletBalance >= netTotal ? '1-Click Instant Payment' : 'Insufficient balance for full total'}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="w-6 h-6 rounded-full border-2 items-center justify-center"
                      style={{
                        borderColor: paymentMethod === 'wallet' ? '#53B175' : '#D1D5DB',
                        backgroundColor: paymentMethod === 'wallet' ? '#53B175' : '#FFFFFF',
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
                        backgroundColor: paymentMethod === 'split' ? 'rgba(83, 177, 117, 0.05)' : 'rgba(249, 250, 251, 0.8)',
                        borderColor: paymentMethod === 'split' ? '#53B175' : 'rgba(229, 231, 235, 0.8)',
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
                          borderColor: paymentMethod === 'split' ? '#53B175' : '#D1D5DB',
                          backgroundColor: paymentMethod === 'split' ? '#53B175' : '#FFFFFF',
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
                  <ActivityIndicator size="large" color="#53B175" />
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