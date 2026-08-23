import CartButton from '@/components/CartButton'
import FastImage from '@/components/FastImage'
import FloatingCartPill from '@/components/FloatingCartPill'
import MenuCard from '@/components/MenuCard'
import { images } from '@/constants'
import { calculateEstimatedDeliveryTime, calculateHaversineDistanceKm, getProductsByStore, getStoreById } from '@/lib/appwrite'
import { useLocationStore } from '@/store/location.store'
import { MenuItem } from '@/type'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

export default function StoreDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const safeBottom = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)

  const { latitude: userLat, longitude: userLon } = useLocationStore()

  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate dynamic delivery time and distance from customer location to store
  const deliveryProximity = useMemo(() => {
    if (!store || store.latitude == null || store.longitude == null) {
      return { distanceKm: 2.5, timeLabel: '15-25 min' }
    }
    const uLat = userLat || 6.5244
    const uLon = userLon || 3.3792
    const dist = calculateHaversineDistanceKm(uLat, uLon, Number(store.latitude), Number(store.longitude))
    const est = calculateEstimatedDeliveryTime(dist)
    return { distanceKm: dist, timeLabel: est.label }
  }, [store, userLat, userLon])

  useEffect(() => {
    async function loadStoreAndProducts() {
      if (!id) return
      try {
        setLoading(true)
        const storeDoc = await getStoreById(id)
        setStore(storeDoc)

        const storeProds = await getProductsByStore(storeDoc || id)
        setProducts(storeProds || [])
      } catch (err) {
        console.error('Error loading store details:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStoreAndProducts()
  }, [id])

  const filteredStoreProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase().trim()
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.categories?.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center" style={{ backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#53B175" />
      </SafeAreaView>
    )
  }

  if (!store) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center px-6" style={{ backgroundColor: '#ffffff' }}>
        <Text className="text-xl font-quicksand-bold text-dark-100 mb-4">
          Store Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary px-6 py-3 rounded-full"
        >
          <Text className="text-white font-quicksand-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const logoSource = store.logoUrl && store.logoUrl.startsWith('http') ? store.logoUrl : null
  const bannerSource = store.bannerUrl && store.bannerUrl.startsWith('http') ? store.bannerUrl : 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&auto=format&fit=crop&q=80'

  return (
    <View className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="light-content" backgroundColor="#53B175" />

      <FlatList
        data={filteredStoreProducts}
        keyExtractor={(item, idx) => item?.$id || item?.id || `prod_${idx}`}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-4">
            {/* Header Banner & Store Info */}
            <View className="relative w-full h-52 bg-primary" style={{ backgroundColor: '#53B175' }}>
              <FastImage
                source={bannerSource}
                className="w-full h-full"
                contentFit="cover"
              />
              <View className="absolute inset-0 bg-black/35" />

              {/* Floating Top Navigation: Arrow Left on Top-Left Corner, Cart Icon on Top-Right Corner */}
              <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-20 flex-row justify-between items-center px-5 pt-3">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.back()}
                  className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-lg shadow-black/20"
                >
                  <FastImage source={images.arrowBack} className="w-5 h-5" contentFit="contain" />
                </TouchableOpacity>

                <CartButton />
              </SafeAreaView>
            </View>

            {/* Store Profile Card (Overlapping Banner) */}
            <View className="px-5 -mt-10">
              <View className="bg-white rounded-[32px] p-5 shadow-xl shadow-black/10 border border-primary/10">
                <View className="flex-row items-center mb-3">
                  {logoSource ? (
                    <FastImage
                      source={logoSource}
                      className="w-16 h-16 rounded-2xl border-2 border-primary/20 mr-4"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/20 items-center justify-center mr-4">
                      <Text className="text-2xl font-quicksand-bold text-primary">
                        {(store.storeName || 'S').charAt(0)}
                      </Text>
                    </View>
                  )}

                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center flex-wrap gap-1">
                      <Text className="text-xl font-quicksand-bold text-dark-100" numberOfLines={1}>
                        {store.storeName}
                      </Text>
                      <View className="bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        <Text className="font-quicksand-bold text-[10px] text-primary">Verified Store 🏪</Text>
                      </View>
                    </View>
                    <Text className="text-xs font-quicksand-medium text-gray-500 mt-0.5" numberOfLines={2}>
                      {store.description || 'Quality grocery & daily essentials store'}
                    </Text>
                  </View>
                </View>

                {/* Address & Contact Row */}
                <View className="pt-3 border-t border-gray-100 gap-y-1.5">
                  {store.address ? (
                    <View className="flex-row items-center">
                      <Text className="text-xs mr-1.5">📍</Text>
                      <Text className="text-xs font-quicksand-semibold text-gray-600 flex-1" numberOfLines={1}>
                        {store.address}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center justify-between mt-1">
                    <View className="flex-row items-center">
                      <Text className="text-xs mr-1.5">📞</Text>
                      <Text className="text-xs font-quicksand-semibold text-gray-600">
                        {store.phone || '+234 800 000 0000'}
                      </Text>
                    </View>

                    <View className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex-row items-center">
                      <Text className="text-[11px] font-quicksand-bold text-emerald-700">
                        ⚡ {deliveryProximity.timeLabel} ({deliveryProximity.distanceKm} km)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* In-Store Search Bar */}
            <View className="px-5 mt-5 mb-2">
              <View className="flex-row items-center bg-white border-2 border-primary/10 rounded-2xl px-4 py-2.5 shadow-sm">
                <Text className="text-base mr-2">🔍</Text>
                <TextInput
                  placeholder={`Search items in ${store.storeName}...`}
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 font-quicksand-semibold text-dark-100 text-sm"
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text className="text-gray-400 font-bold text-xs">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Store Products Header */}
            <View className="px-5 mt-4 mb-2 flex-row justify-between items-center">
              <Text className="text-lg font-quicksand-bold text-dark-100">
                Store Inventory ({filteredStoreProducts.length})
              </Text>
              <Text className="text-xs font-quicksand-semibold text-primary">
                Shop Direct
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="w-[48%]">
            <MenuCard item={item as MenuItem} />
          </View>
        )}
        ListEmptyComponent={
          <View className="py-12 items-center justify-center px-6">
            <Text className="text-4xl mb-2">🏪</Text>
            <Text className="text-base font-quicksand-bold text-dark-100 mb-1 text-center">
              No products found in this store
            </Text>
            <Text className="text-xs font-quicksand-medium text-gray-400 text-center">
              Try adjusting your search query or check back later.
            </Text>
          </View>
        }
      />

      {/* Floating Checkout Cart Pill */}
      <FloatingCartPill bottomOffset={safeBottom + 16} />
    </View>
  )
}
