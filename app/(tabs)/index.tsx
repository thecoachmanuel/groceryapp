import CartButton from '@/components/CartButton'
import DeliverTo from '@/components/DeliverTo'
import FastImage from '@/components/FastImage'
import FloatingCartPill from '@/components/FloatingCartPill'
import MenuCard from '@/components/MenuCard'
import { offers } from '@/constants'
import { DEFAULT_GROCERY_PRODUCTS, appwriteConfig, getBanners, getCategories, getMenu, getStores, sortStoresByProximity, sortProductsByProximity } from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useLocationStore } from '@/store/location.store'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const EFFECTIVE_WIDTH = Platform.OS === 'web' ? Math.min(SCREEN_WIDTH, 480) : SCREEN_WIDTH
const CAROUSEL_CARD_WIDTH = EFFECTIVE_WIDTH - 40 // Padding 20 on each side

// Categories fallback with emoji icons for horizontal scroll
const HOME_CATEGORIES = [
  { id: '1', name: 'All', icon: '🛍️', image: null },
  { id: '2', name: 'Fruits & Vegetables', icon: '🥦', image: null },
  { id: '3', name: 'Dairy & Eggs', icon: '🥛', image: null },
  { id: '4', name: 'Bakery & Bread', icon: '🍞', image: null },
  { id: '5', name: 'Beverages & Drinks', icon: '🧃', image: null },
  { id: '6', name: 'Meat & Seafood', icon: '🥩', image: null },
  { id: '7', name: 'Snacks & Confectionery', icon: '🍿', image: null },
  { id: '8', name: 'Pantry & Grains', icon: '🌾', image: null },
]

const EMOJI_MAP: Record<string, string> = {
  'Fruits & Vegetables': '🥦',
  'Dairy & Eggs': '🥛',
  'Bakery & Bread': '🍞',
  'Beverages & Drinks': '🧃',
  'Meat & Seafood': '🥩',
  'Snacks & Confectionery': '🍿',
  'Pantry & Grains': '🌾',
}

// Fallback Stores for Multi-Vendor Showcase
const FEATURED_STORES_FALLBACK = [
  {
    id: 'store_1',
    storeName: 'Green Valley Organic Market',
    description: 'Farm-fresh organic fruits, vegetables & healthy daily picks',
    rating: 4.9,
    deliveryTime: '15-25 min',
    status: 'active',
  },
  {
    id: 'store_2',
    storeName: 'Daily Supermarket & Bakery',
    description: 'Artisanal breads, fresh dairy, eggs, pantry & bakery items',
    rating: 4.8,
    deliveryTime: '20-30 min',
    status: 'active',
  },
  {
    id: 'store_3',
    storeName: 'Prime Meats & Seafood Depot',
    description: 'Premium beef cuts, poultry, fresh fish & frozen meats',
    rating: 4.9,
    deliveryTime: '25-35 min',
    status: 'active',
  },
]

export default function Index() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { addItem } = useCartStore()

  const { latitude, longitude } = useLocationStore()

  const [banners, setBanners] = useState<any[]>(offers)
  const [stores, setStores] = useState<any[]>(FEATURED_STORES_FALLBACK)
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [popularProducts, setPopularProducts] = useState<any[]>(DEFAULT_GROCERY_PRODUCTS)
  const [refreshing, setRefreshing] = useState(false)
  const [activeBannerIndex, setActiveBannerIndex] = useState(0)
  const [addedToast, setAddedToast] = useState<string | null>(null)

  // Location Proximity Intelligence: Rank Stores & Products Nearest to Customer
  const sortedStores = useMemo(() => {
    return sortStoresByProximity(stores, latitude, longitude)
  }, [stores, latitude, longitude])

  const sortedPopularProducts = useMemo(() => {
    return sortProductsByProximity(popularProducts, stores, latitude, longitude)
  }, [popularProducts, stores, latitude, longitude])

  const carouselRef = useRef<FlatList>(null)

  const resolveCategoryImageUrl = (url?: string) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null
    let formatted = url.trim()
    if (formatted.startsWith('http') && !formatted.includes('project=')) {
      formatted = `${formatted}${formatted.includes('?') ? '&' : '?'}project=${appwriteConfig.projectId}`
    }
    return formatted
  }

  const fetchHomeData = useCallback(async () => {
    try {
      // 1. Fetch Banners
      const docs = await getBanners()
      if (docs && docs.length > 0) {
        const seen = new Set<string>()
        const formattedBanners: any[] = []

        for (const doc of docs) {
          const key = (doc.title || doc.$id || '').trim().toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            formattedBanners.push({
              id: doc.$id,
              title: doc.title,
              subtitle: doc.subtitle || '',
              image: doc.imageUrl ? { uri: doc.imageUrl } : null,
              gradient: [doc.gradientStart || '#B91C1C', doc.gradientEnd || '#F87171'],
              targetType: doc.targetType,
              targetId: doc.targetId,
              targetCategory: doc.targetCategory,
            })
          }
        }
        setBanners(formattedBanners)
      } else {
        setBanners(offers)
      }

      // 2. Fetch Live Stores
      const storeDocs = await getStores().catch(() => [])
      if (storeDocs && storeDocs.length > 0) {
        setStores(storeDocs)
      } else {
        setStores(FEATURED_STORES_FALLBACK)
      }

      // 3. Fetch Live Categories
      const catDocs = await getCategories().catch(() => [])
      if (catDocs && catDocs.length > 0) {
        setDbCategories(catDocs)
      }

      // 4. Fetch Live Popular Products from Database
      const menuDocs = await getMenu({}).catch(() => [])
      if (menuDocs && menuDocs.length > 0) {
        setPopularProducts(menuDocs)
      } else {
        setPopularProducts(
          DEFAULT_GROCERY_PRODUCTS.map((p: any, idx: number) => ({
            $id: `pop_default_${idx + 1}`,
            name: p.name,
            price: p.price,
            discountPrice: p.discountPrice,
            rating: p.rating || 4.9,
            image_url: p.image_url,
          }))
        )
      }
    } catch (err) {
      console.log('Error fetching home data:', err)
      setBanners((prev) => (prev && prev.length > 0 ? prev : offers))
      setStores(FEATURED_STORES_FALLBACK)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHomeData()
  }, [fetchHomeData])

  useFocusEffect(
    useCallback(() => {
      fetchHomeData()
    }, [fetchHomeData])
  )

  // Auto-scrolling carousel timer (every 4 seconds)
  useEffect(() => {
    if (!banners || banners.length <= 1) return
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length
        carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true })
        return nextIndex
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [banners])

  const onRefresh = () => {
    setRefreshing(true)
    fetchHomeData()
  }

  const handleBannerPress = (banner: any) => {
    if (banner.targetType === 'product' && banner.targetId) {
      router.push(`/product/${banner.targetId}` as any)
    } else if (banner.targetType === 'category' && banner.targetId) {
      router.push({ pathname: '/(tabs)/search', params: { category: banner.targetId } } as any)
    } else if (banner.targetCategory) {
      router.push({ pathname: '/(tabs)/search', params: { category: banner.targetCategory } } as any)
    } else {
      router.push('/(tabs)/search' as any)
    }
  }

  const handleAddToCart = (item: any) => {
    addItem({
      id: item.$id || item.id,
      name: item.name,
      price: item.price,
      image_url: typeof item.image === 'string' ? item.image : (item.image_url || ''),
      sellerId: item.sellerId || item.seller_id || item.storeId,
    })
    setAddedToast(`Added "${item.name}" to cart! 🛒`)
    setTimeout(() => setAddedToast(null), 2500)
  }

  const categoriesToDisplay = useMemo(() => {
    const allItem = { id: 'all', name: 'All', icon: '🛍️', image: null }
    if (!dbCategories || dbCategories.length === 0) {
      return HOME_CATEGORIES
    }

    const liveList = dbCategories.map((c: any) => {
      const rawImg = c.iconUrl || c.image_url
      const imageUri = rawImg && typeof rawImg === 'string' && rawImg.startsWith('http') ? resolveCategoryImageUrl(rawImg) : null
      const fallbackEmoji = EMOJI_MAP[c.name] || '🥦'
      return {
        id: c.$id,
        name: c.name,
        icon: fallbackEmoji,
        image: imageUri,
      }
    })

    return [allItem, ...liveList]
  }, [dbCategories])

  const insets = useSafeAreaInsets()
  const tabBottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)
  const tabHeight = 70
  const cartPillBottomOffset = tabBottomOffset + tabHeight + 10
  const listPaddingBottom = tabHeight + 40

  return (
    <View className="flex-1 bg-white relative" style={{ backgroundColor: '#ffffff' }}>
      <View
        style={{ flex: 1, marginBottom: tabBottomOffset }}
        className="overflow-hidden"
      >
        <SafeAreaView edges={['top']} className="flex-1">
          {/* Toast Feedback for 1-Tap Add to Cart */}
          {addedToast && (
            <View className="absolute top-14 left-5 right-5 bg-dark-100/95 py-3 px-5 rounded-2xl z-50 shadow-xl border border-primary/30 flex-row items-center justify-between">
              <Text className="text-white font-quicksand-bold text-xs">{addedToast}</Text>
              <TouchableOpacity onPress={() => setAddedToast(null)}>
                <Text className="text-gray-400 font-bold text-xs ml-2">✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: listPaddingBottom }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#53B175"
                colors={['#53B175']}
              />
            }
          >
            {/* Header */}
            <View className="flex-between flex-row w-full my-5 px-5">
              <DeliverTo />
              <CartButton />
            </View>

            {/* ── SECTION 1: AUTO-SCROLLING BANNER CAROUSEL ── */}
            <View className="mb-6">
              <FlatList
                ref={carouselRef}
                data={banners}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
                  setActiveBannerIndex(index)
                }}
                renderItem={({ item, index }) => {
                  const isEven = index % 2 === 0
                  const imageSrc = item.image || (item.imageUrl ? { uri: item.imageUrl } : null)

                  return (
                    <Pressable
                      onPress={() => handleBannerPress(item)}
                      android_ripple={{ color: '#ffffff22' }}
                      style={{ width: SCREEN_WIDTH, paddingHorizontal: 20 }}
                    >
                      <LinearGradient
                        colors={item.gradient as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          borderRadius: 24,
                          flexDirection: 'row',
                          padding: 18,
                          height: 185,
                          overflow: 'hidden',
                        }}
                      >
                        {isEven ? (
                          <>
                            <View className="w-1/2 justify-center items-start pr-3">
                              {imageSrc && (
                                <Image
                                  source={imageSrc}
                                  className="w-full h-full"
                                  style={{ maxHeight: '100%', flex: 1 }}
                                  resizeMode="contain"
                                />
                              )}
                            </View>
                            <View className="w-1/2 justify-center items-end pl-3">
                              <Text className="text-3xl font-quicksand-bold text-white mb-1 text-right">
                                {item.title}
                              </Text>
                              {item.subtitle ? (
                                <Text className="text-xs font-quicksand-medium text-white/80 mb-3 text-right">
                                  {item.subtitle}
                                </Text>
                              ) : null}
                              <TouchableOpacity
                                onPress={() => handleBannerPress(item)}
                                className="bg-white/30 px-5 py-2 rounded-full mt-1"
                              >
                                <Text className="text-sm font-quicksand-bold text-white">
                                  Order Now
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : (
                          <>
                            <View className="w-1/2 justify-center items-start pr-3">
                              <Text className="text-3xl font-quicksand-bold text-white mb-1 text-left">
                                {item.title}
                              </Text>
                              {item.subtitle ? (
                                <Text className="text-xs font-quicksand-medium text-white/80 mb-3 text-left">
                                  {item.subtitle}
                                </Text>
                              ) : null}
                              <TouchableOpacity
                                onPress={() => handleBannerPress(item)}
                                className="bg-white/30 px-5 py-2 rounded-full mt-1"
                              >
                                <Text className="text-sm font-quicksand-bold text-white">
                                  Order Now
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <View className="w-1/2 justify-center items-end pl-3">
                              {imageSrc && (
                                <Image
                                  source={imageSrc}
                                  className="w-full h-full"
                                  style={{ maxHeight: '100%', flex: 1 }}
                                  resizeMode="contain"
                                />
                              )}
                            </View>
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                  )
                }}
              />

              {/* Carousel Active Pagination Dots */}
              {banners.length > 1 && (
                <View className="flex-row justify-center items-center mt-3 gap-1.5">
                  {banners.map((_, i) => (
                    <View
                      key={i}
                      className={`h-2 rounded-full ${activeBannerIndex === i ? 'w-6 bg-primary' : 'w-2 bg-gray-300'
                        }`}
                      style={activeBannerIndex === i ? { backgroundColor: '#53B175' } : {}}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* ── SECTION 2: CATEGORIES HORIZONTAL SCROLL BAR ── */}
            <View className="mb-6 px-5">
              <View className="flex-between flex-row items-center mb-3">
                <Text className="text-lg font-quicksand-bold text-dark-100">Explore Categories</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                  <Text className="text-xs font-quicksand-bold text-primary" style={{ color: '#53B175' }}>See All →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                {categoriesToDisplay.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/search',
                        params: cat.name === 'All' ? {} : { category: cat.name },
                      } as any)
                    }
                    className="bg-white border-2 border-primary/10 rounded-[24px] p-3.5 mr-3 w-28 items-center justify-center shadow-md shadow-black/5 active:scale-95"
                  >
                    <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mb-2 border border-primary/20 overflow-hidden">
                      {cat.image ? (
                        <Image
                          source={{ uri: cat.image }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-2xl">{cat.icon}</Text>
                      )}
                    </View>
                    <Text className="font-quicksand-bold text-xs text-dark-100 text-center" numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>



            {/* ── SECTION 4: SHOP FROM STORES (LOCATION PROXIMITY INTELLIGENCE) ── */}
            <View className="mb-6 px-5">
              <View className="flex-between flex-row items-center mb-3">
                <View>
                  <Text className="text-lg font-quicksand-bold text-dark-100">
                    Stores Near You 📍
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-gray-400">
                    Sorted by proximity to your current location
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/stores' as any)}>
                  <Text className="text-xs font-quicksand-bold text-primary" style={{ color: '#53B175' }}>Explore All →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sortedStores.map((store, idx) => {
                  const storeId = String(store.$id || store.id || `store_${idx + 1}`)
                  const openStore = () => {
                    router.push({
                      pathname: '/store/[id]',
                      params: { id: storeId },
                    })
                  }

                  return (
                    <TouchableOpacity
                      key={storeId || idx}
                      activeOpacity={0.85}
                      onPress={openStore}
                      className="bg-white border-2 border-primary/10 rounded-[24px] p-4 mr-4 w-64 shadow-md shadow-black/5 justify-between"
                    >
                      <View>
                        <View className="flex-row items-center justify-between mb-2">
                          {(() => {
                            const logoSrc = store.logoUrl || store.logoImage || store.logo || store.image || store.avatar || null
                            const initial = (store.storeName || 'S').charAt(0).toUpperCase()
                            return (
                              <View className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/20 items-center justify-center overflow-hidden shadow-sm">
                                {logoSrc ? (
                                  <FastImage
                                    source={logoSrc}
                                    className="w-full h-full"
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                  />
                                ) : (
                                  <Text className="text-xl font-quicksand-bold text-primary" style={{ color: '#53B175' }}>
                                    {initial}
                                  </Text>
                                )}
                              </View>
                            )
                          })()}

                          <View className="flex-row items-center bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                            <Text className="text-xs mr-1">⭐</Text>
                            <Text className="font-quicksand-bold text-xs text-amber-700">
                              {store.rating || 4.9}
                            </Text>
                          </View>
                        </View>

                        <Text className="font-quicksand-bold text-dark-100 text-sm" numberOfLines={1}>
                          {store.storeName || 'Partner Store'}
                        </Text>
                        <Text className="text-gray-400 font-quicksand-medium text-xs mt-1" numberOfLines={2}>
                          {store.description || 'Quality grocery & daily essentials store'}
                        </Text>
                      </View>

                      <View className="mt-4 pt-3 border-t border-primary/10 flex-row items-center justify-between">
                        <View className="bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full flex-row items-center">
                          <Text className="text-[10px] font-quicksand-bold text-primary" style={{ color: '#53B175' }}>
                            📍 {store.distanceKm != null ? `${store.distanceKm} km` : 'Near you'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e.stopPropagation()
                            openStore()
                          }}
                          className="bg-primary px-3.5 py-1.5 rounded-full flex-row items-center active:scale-95 shadow-sm shadow-primary/20"
                          style={{ backgroundColor: '#53B175' }}
                        >
                          <Text className="text-white font-quicksand-bold text-xs mr-1">Visit Store</Text>
                          <Text className="text-white font-bold text-xs">→</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>

            {/* ── SECTION 5: POPULAR GROCERIES NEAR YOU ── */}
            <View className="px-5 pb-8">
              <View className="flex-between flex-row items-center mb-3">
                <View>
                  <Text className="text-lg font-quicksand-bold text-dark-100">
                    Groceries Near You 🛒
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-gray-400">
                    Products sorted by nearest store availability
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                  <Text className="text-xs font-quicksand-bold text-primary" style={{ color: '#53B175' }}>View All →</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap justify-between gap-y-4">
                {(sortedPopularProducts.length > 0 ? sortedPopularProducts : DEFAULT_GROCERY_PRODUCTS).slice(0, 8).map((item: any, idx: number) => (
                  <View key={item.$id || item.id || `pop_${idx}`} style={{ width: (SCREEN_WIDTH - 52) / 2 }}>
                    <MenuCard item={item} />
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>

      <FloatingCartPill bottomOffset={cartPillBottomOffset} />
    </View>
  )
}