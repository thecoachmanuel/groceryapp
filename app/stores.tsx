import CartButton from '@/components/CartButton'
import FastImage from '@/components/FastImage'
import FloatingCartPill from '@/components/FloatingCartPill'
import Searchbar from '@/components/SearchBar'
import { images } from '@/constants'
import { getStores, sortStoresByProximity } from '@/lib/appwrite'
import useAppwrite from '@/lib/useAppwrite'
import { useLocationStore } from '@/store/location.store'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

export default function AllStoresScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const { data: storesList, refetch, loading } = useAppwrite({
    fn: getStores,
  })

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const { latitude, longitude } = useLocationStore()

  // Filter & sort stores by proximity to customer (nearest stores first)
  const filteredStores = useMemo(() => {
    if (!storesList || storesList.length === 0) return []
    const sorted = sortStoresByProximity(storesList, latitude, longitude)
    const q = searchQuery.toLowerCase().trim()
    if (!q) return sorted

    return sorted.filter((st: any) => {
      const name = String(st.storeName || '').toLowerCase()
      const desc = String(st.description || '').toLowerCase()
      const addr = String(st.address || '').toLowerCase()
      return name.includes(q) || desc.includes(q) || addr.includes(q)
    })
  }, [storesList, searchQuery, latitude, longitude])

  // Calculate bottom layout boundaries for smooth clipping and floating cart pill
  const bottomBoundary = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)

  return (
    <View className="flex-1 bg-white relative" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="light-content" backgroundColor="#53B175" />

      {/* ── Viewport Bounded Content Container ── */}
      <View style={{ flex: 1, marginBottom: bottomBoundary }} className="overflow-hidden">
        {/* Header Banner spanning status bar */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="pb-3 bg-white" style={{ backgroundColor: '#ffffff' }}>
            <SafeAreaView edges={['top']} className="bg-primary rounded-b-[36px] shadow-lg shadow-primary/30" style={{ backgroundColor: '#53B175' }}>
              <View className="px-5 pt-3 pb-8">
                {/* Navigation Row */}
                <View className="flex-row items-center justify-between mb-4">
                  <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2.5 bg-white/20 rounded-2xl active:opacity-70 border border-white/30"
                  >
                    <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" tintColor="#fff" />
                  </TouchableOpacity>

                  <View className="items-center flex-1 mx-3">
                    <Text className="text-white text-lg font-quicksand-bold">
                      Verified Partner Stores
                    </Text>
                    <Text className="text-white/80 text-xs font-quicksand-medium">
                      Shop directly from top local stores 🏪
                    </Text>
                  </View>

                  <View className="bg-white rounded-2xl p-2 shadow-md shadow-black/20">
                    <CartButton />
                  </View>
                </View>
              </View>
            </SafeAreaView>

            {/* Live Search Bar for Stores */}
            <View className="px-5 -mt-6">
              <View className="bg-white rounded-2xl p-1.5 shadow-lg shadow-black/5 border border-primary/10">
                <Searchbar
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                  placeholder="Search store name, location, groceries..."
                />
              </View>

              <View className="flex-row items-center justify-between mt-3 px-1">
                <View className="flex-row items-center">
                  <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
                  <Text className="text-dark-100 text-base font-quicksand-bold">
                    All Stores ({filteredStores.length})
                  </Text>
                </View>
                <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  <Text className="text-[11px] text-primary font-quicksand-bold" style={{ color: '#53B175' }}>
                    ⏱️ Fast Local Delivery
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* ── Stores List Grid ── */}
        <FlatList
          data={filteredStores}
          keyExtractor={(item, index) => item.$id || item.id || index.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#53B175"
              colors={['#53B175']}
            />
          }
          renderItem={({ item: store, index }) => {
            const hasBanner = !!store.bannerUrl
            const initial = (store.storeName || 'S').charAt(0).toUpperCase()
            const bannerImage = store.bannerUrl || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000&auto=format&fit=crop&q=80'
            const logoImage = store.logoUrl || null

            const storeId = String(store.$id || store.id || `store_${index + 1}`)
            const openStore = () => {
              router.push({
                pathname: '/store/[id]',
                params: { id: storeId },
              })
            }

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={openStore}
                className="bg-white rounded-[32px] mb-5 border border-[#F1F1F1] overflow-hidden"
                style={{ borderColor: '#F1F1F1' }}
              >
                {/* Store Header Banner Cover */}
                <View className="w-full h-36 bg-primary/10 relative justify-center items-center">
                  <FastImage
                    source={bannerImage}
                    className="w-full h-full"
                    contentFit="cover"
                  />
                  {/* Subtle Top Gradient Overlay */}
                  <View className="absolute inset-0 bg-black/20" />

                  {/* Rating Tag */}
                  <View className="absolute top-3.5 right-3.5 bg-white/95 px-3 py-1.5 rounded-full flex-row items-center border border-amber-500/20 shadow-md">
                    <Text className="text-xs mr-1">⭐</Text>
                    <Text className="font-quicksand-bold text-xs text-amber-700">
                      {store.rating != null && Number(store.rating) > 0 ? Number(store.rating).toFixed(1) : '5.0'}
                      {store.totalReviews ? ` (${store.totalReviews})` : ''}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View className="absolute top-3.5 left-3.5 bg-emerald-600 px-3 py-1.5 rounded-full flex-row items-center shadow-md">
                    <Text className="text-white font-quicksand-bold text-[10px] uppercase tracking-wider">
                      Verified Partner ✓
                    </Text>
                  </View>
                </View>

                {/* Store Logo & Details Body */}
                <View className="p-5 pt-0 relative">
                  {/* Floating Circular Store Logo Badge */}
                  <View className="-mt-10 mb-3 flex-row items-end justify-between">
                    <View className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg shadow-black/15 overflow-hidden items-center justify-center">
                      {logoImage ? (
                        <FastImage
                          source={logoImage}
                          className="w-full h-full"
                          style={{ width: '100%', height: '100%', borderRadius: 9999 }}
                          contentFit="cover"
                        />
                      ) : (
                        <View className="w-full h-full bg-primary/10 items-center justify-center">
                          <Text className="text-3xl font-quicksand-bold text-primary">{initial}</Text>
                        </View>
                      )}
                    </View>

                    {/* Delivery Time Badge */}
                    <View className="bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full flex-row items-center mb-1">
                      <Text className="text-xs font-quicksand-bold text-primary" style={{ color: '#53B175' }}>
                        ⏱️ {store.deliveryTime || '15-25 min'} {store.distanceKm != null ? `• ${store.distanceKm} km` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Store Name & Description */}
                  <Text className="text-xl font-quicksand-bold text-dark-100 leading-tight">
                    {store.storeName || 'Partner Grocery Store'}
                  </Text>
                  <Text className="text-gray-500 font-quicksand-medium text-xs mt-1 leading-relaxed" numberOfLines={2}>
                    {store.description || 'Quality grocery, daily essentials and fresh produce available for instant delivery.'}
                  </Text>

                  {/* Address & Contact Info if present */}
                  {store.address ? (
                    <View className="flex-row items-center mt-3 bg-primary/5 p-2.5 rounded-2xl border border-primary/15">
                      <Image source={images.location} className="w-3.5 h-3.5 mr-2" resizeMode="contain" />
                      <Text className="text-gray-700 font-quicksand-bold text-xs flex-1" numberOfLines={1}>
                        {store.address}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action Bar */}
                  <View className="mt-4 pt-3 border-t border-primary/10 flex-row items-center justify-between">
                    <Text className="text-primary font-quicksand-bold text-xs uppercase tracking-wider">
                      🛍️ Shop Store Catalog
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={(e) => {
                        e.stopPropagation()
                        openStore()
                      }}
                      className="bg-primary px-5 py-2.5 rounded-full shadow-md shadow-primary/30 flex-row items-center active:scale-95"
                      style={{ backgroundColor: '#53B175' }}
                    >
                      <Text className="text-white font-quicksand-bold text-xs mr-1">Visit Store</Text>
                      <Text className="text-white font-bold text-xs">→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={() => (
            loading ? (
              <View className="items-center mt-12">
                <ActivityIndicator size="large" color="#53B175" />
                <Text className="text-gray-400 font-quicksand-medium text-xs mt-2">
                  Loading verified partner stores...
                </Text>
              </View>
            ) : (
              <View className="items-center mt-10 px-8">
                <View className="bg-white border-2 border-primary/15 rounded-[36px] p-8 items-center shadow-lg shadow-black/5 w-full">
                  <Text className="text-4xl mb-2">🏪</Text>
                  <Text className="text-dark-100 text-lg font-quicksand-bold">No Stores Found</Text>
                  <Text className="text-gray-400 text-xs font-quicksand-medium mt-1 text-center">
                    {searchQuery
                      ? `No stores matching "${searchQuery}".`
                      : 'No partner stores currently available.'}
                  </Text>
                </View>
              </View>
            )
          )}
        />
      </View>

      <FloatingCartPill bottomOffset={bottomBoundary + 16} />
    </View>
  )
}
