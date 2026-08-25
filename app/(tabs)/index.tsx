import CartButton from '@/components/CartButton'
import DeliverTo from '@/components/DeliverTo'
import FastImage from '@/components/FastImage'
import FloatingCartPill from '@/components/FloatingCartPill'
import MenuCard from '@/components/MenuCard'
import Searchbar from '@/components/SearchBar'
import { images, offers } from '@/constants'
import { appwriteConfig, getBanners, getCategories, getMenu, getStores, getUserOrders, sortProductsByProximity, sortStoresByProximity } from '@/lib/appwrite'
import { scheduleOrderRatingNotification } from '@/lib/notifications'
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
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - 40 // Padding 20 on each side

// Categories fallback with emoji icons for horizontal scroll
const HOME_CATEGORIES = [
  { id: '1', name: 'All', icon: '🛍️', image: null },
  { id: '2', name: 'Fruits & Vegetables', icon: '🥦', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&auto=format&fit=crop&q=80' },
  { id: '3', name: 'Dairy & Eggs', icon: '🥛', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80' },
  { id: '4', name: 'Bakery & Bread', icon: '🍞', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80' },
  { id: '5', name: 'Beverages & Drinks', icon: '🧃', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&auto=format&fit=crop&q=80' },
  { id: '6', name: 'Meat & Seafood', icon: '🥩', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&auto=format&fit=crop&q=80' },
  { id: '7', name: 'Snacks & Confectionery', icon: '🍿', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80' },
  { id: '8', name: 'Pantry & Grains', icon: '🌾', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop&q=80' },
]

const EMOJI_MAP: Record<string, string> = {
  'Fruits & Vegetables': '🥦',
  'Dairy & Eggs': '🥛',
  'Bakery & Bread': '🍞',
  'Beverages & Drinks': '🧃',
  'Meat & Seafood': '🥩',
  'Snacks & Confectionery': '🍿',
  'Snacks & Sweets': '🍿',
  'Snacks': '🍿',
  'Pantry & Grains': '🌾',
  'Frozen Foods': '🧊',
}

const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  'Fruits & Vegetables': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&auto=format&fit=crop&q=80',
  'Dairy & Eggs': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80',
  'Bakery & Bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80',
  'Beverages & Drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&auto=format&fit=crop&q=80',
  'Meat & Seafood': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&auto=format&fit=crop&q=80',
  'Snacks & Confectionery': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80',
  'Snacks & Sweets': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80',
  'Snacks': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80',
  'Pantry & Grains': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop&q=80',
  'Frozen Foods': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&auto=format&fit=crop&q=80',
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

  const [banners, setBanners] = useState<any[] | null>(null)
  const [stores, setStores] = useState<any[]>([])
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [popularProducts, setPopularProducts] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [activeBannerIndex, setActiveBannerIndex] = useState(0)
  const [addedToast, setAddedToast] = useState<string | null>(null)
  const [homeSearchQuery, setHomeSearchQuery] = useState('')
  const [liveSearchResults, setLiveSearchResults] = useState<any[] | null>(null)
  const [searchingLive, setSearchingLive] = useState(false)

  // Location Proximity Intelligence: Rank Stores & Products Nearest to Customer
  const sortedStores = useMemo(() => {
    return sortStoresByProximity(stores, latitude, longitude)
  }, [stores, latitude, longitude])

  const sortedPopularProducts = useMemo(() => {
    return sortProductsByProximity(popularProducts, stores, latitude, longitude)
  }, [popularProducts, stores, latitude, longitude])

  // Live Search Filters for Home Screen
  const displayStores = useMemo(() => {
    if (!homeSearchQuery.trim()) return sortedStores
    const q = homeSearchQuery.toLowerCase().trim()
    return sortedStores.filter(
      (s: any) =>
        (s.storeName || s.name || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    )
  }, [sortedStores, homeSearchQuery])

  const displayProducts = useMemo(() => {
    if (!homeSearchQuery.trim()) return sortedPopularProducts
    if (liveSearchResults !== null) return liveSearchResults
    const q = homeSearchQuery.toLowerCase().trim()
    return sortedPopularProducts.filter(
      (p: any) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.categories || p.type || '').toLowerCase().includes(q)
    )
  }, [sortedPopularProducts, liveSearchResults, homeSearchQuery])

  // Filter products exclusively on sale / discounted for Exclusive Offers carousel
  const exclusiveOfferProducts = useMemo(() => {
    if (!sortedPopularProducts || sortedPopularProducts.length === 0) return []
    const saleItems = sortedPopularProducts.filter((item: any) => {
      const p = Number(item.price || 0)
      const dp = item.discountPrice ? Number(item.discountPrice) : null
      const op = item.originalPrice ? Number(item.originalPrice) : null
      return (
        (dp !== null && dp > 0 && dp < p) ||
        (op !== null && op > p) ||
        Boolean(item.isOnSale) ||
        Boolean(item.isPromo) ||
        (item.discountPercent && Number(item.discountPercent) > 0)
      )
    })

    if (saleItems.length > 0) return saleItems

    // Fallback: apply 15% offer discount on top items to populate Exclusive Offers carousel
    return sortedPopularProducts.slice(0, 6).map((item: any) => {
      const p = Number(item.price || 1000)
      return {
        ...item,
        discountPrice: Math.round(p * 0.85),
      }
    })
  }, [sortedPopularProducts])

  const handleHomeSearchChange = (query: string) => {
    setHomeSearchQuery(query)
    if (!query.trim()) {
      setLiveSearchResults(null)
      return
    }

    setSearchingLive(true)
    getMenu({ query: query.trim() })
      .then((results) => {
        setLiveSearchResults(results || [])
      })
      .catch(() => setLiveSearchResults([]))
      .finally(() => setSearchingLive(false))
  }

  const handleHomeSearchSubmit = () => {
    if (homeSearchQuery.trim()) {
      router.push({
        pathname: '/(tabs)/search',
        params: { query: homeSearchQuery.trim() },
      } as any)
    }
  }

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
          const key = doc.$id || doc.id
          if (!seen.has(key)) {
            seen.add(key)
            formattedBanners.push({
              id: doc.$id,
              title: doc.title,
              subtitle: doc.subtitle || '',
              image: doc.imageUrl ? { uri: doc.imageUrl } : null,
              imageUrl: doc.imageUrl,
              gradient: [doc.gradientStart || '#B91C1C', doc.gradientEnd || '#F87171'],
              targetType: doc.targetType,
              targetId: doc.targetId,
              targetCategory: doc.targetCategory,
              hideTextOverlay: Boolean(
                doc.hideTextOverlay ||
                doc.isFullImage ||
                doc.bannerMode === 'image' ||
                doc.subtitle === '[HIDE_TEXT]' ||
                (doc.subtitle && doc.subtitle.includes('[HIDE_TEXT]')) ||
                doc.title === 'Full Image Banner' ||
                !doc.title
              ),
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

      // 4. Fetch Live Products strictly from Database
      const menuDocs = await getMenu({}).catch(() => [])
      setPopularProducts(menuDocs || [])

      // 5. Schedule background notification for unrated delivered orders
      const currentUserId = (user as any)?.$id || (user as any)?.accountId
      if (currentUserId) {
        try {
          const userOrders = await getUserOrders(currentUserId)
          const deliveredOrders = userOrders.filter(
            (o: any) => o.status === 'delivered' && !o.isRated
          )

          if (deliveredOrders.length > 0) {
            const latest = deliveredOrders[0]
            scheduleOrderRatingNotification(latest.$id, 'Grocery Store', 0)
          }
        } catch { }
      }
    } catch (e) {
      console.error('Home load error:', e)
      setBanners((prev) => (prev && prev.length > 0 ? prev : offers))
      setStores(FEATURED_STORES_FALLBACK)
    } finally {
      setRefreshing(false)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      fetchHomeData()
    }, [fetchHomeData])
  )

  // Auto-scrolling carousel timer (every 4.5 seconds)
  useEffect(() => {
    if (!banners || banners.length <= 1) return
    const timer = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length
        carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true })
        return nextIndex
      })
    }, 4500)
    return () => clearInterval(timer)
  }, [banners])

  const onRefresh = () => {
    setRefreshing(true)
    fetchHomeData()
  }

  const handleBannerPress = (banner: any) => {
    if (!banner) return
    const linkType = banner.targetType || banner.linkType || (banner.targetCategory ? 'category' : 'page')
    const linkTarget = banner.targetId || banner.linkTarget || banner.targetCategory || banner.link || ''

    if (linkType === 'product' && linkTarget) {
      router.push({ pathname: '/product/[id]', params: { id: linkTarget } })
    } else if (linkType === 'store' && linkTarget) {
      router.push({ pathname: '/store/[id]', params: { id: linkTarget } })
    } else if (linkType === 'category' && linkTarget) {
      router.push({ pathname: '/(tabs)/search', params: { category: linkTarget.toLowerCase() } } as any)
    } else if (linkType === 'page' && linkTarget) {
      router.push(linkTarget as any)
    } else if (linkTarget && linkTarget.startsWith('/')) {
      router.push(linkTarget as any)
    } else if (linkTarget) {
      router.push({ pathname: '/(tabs)/search', params: { category: linkTarget } } as any)
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
    if (!dbCategories || dbCategories.length === 0) {
      return HOME_CATEGORIES.filter((c) => c.name.toLowerCase() !== 'all')
    }

    const liveList = dbCategories.map((c: any) => {
      const rawImg = c.iconUrl || c.image_url || c.imageUrl
      const customImg = rawImg && typeof rawImg === 'string' && rawImg.startsWith('http') ? resolveCategoryImageUrl(rawImg) : null
      const fallbackImg = FALLBACK_CATEGORY_IMAGES[c.name] || (c.name.toLowerCase().includes('snack') ? 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80' : null)
      const fallbackEmoji = EMOJI_MAP[c.name] || '🥦'
      return {
        id: c.$id,
        name: c.name,
        icon: fallbackEmoji,
        image: customImg || fallbackImg,
      }
    })

    return liveList.filter((c) => c.name.toLowerCase() !== 'all')
  }, [dbCategories])

  const insets = useSafeAreaInsets()
  const tabBottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)
  const tabHeight = 70
  const cartPillBottomOffset = tabBottomOffset + tabHeight + 10
  const listPaddingBottom = tabHeight + 40

  if (banners === null) {
    return (
      <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
        <View className="flex-between flex-row w-full my-5 px-5">
          <DeliverTo />
          <CartButton />
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View className="flex-1 bg-white relative" style={{ backgroundColor: '#ffffff' }}>
      <View
        style={{ flex: 1, marginBottom: tabBottomOffset }}
        className="overflow-hidden"
      >
        <SafeAreaView edges={['top']} className="flex-1">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="flex-1">
              {/* ── Sticky Header: Logo + Deliver To + Search Bar ── */}
              <View
                className="bg-white px-5 pb-3 border-b border-[#F1F1F1]"
                style={{
                  backgroundColor: '#ffffff',
                  borderBottomColor: '#F1F1F1',
                }}
              >
                {/* Toast Feedback for 1-Tap Add to Cart */}
                {addedToast && (
                  <View className="absolute top-14 left-5 right-5 bg-dark-100/95 py-3 px-5 rounded-2xl z-50 shadow-xl border border-primary/30 flex-row items-center justify-between">
                    <Text className="text-white font-quicksand-bold text-xs">{addedToast}</Text>
                    <TouchableOpacity onPress={() => setAddedToast(null)}>
                      <Text className="text-gray-400 font-bold text-xs ml-2">✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* App Brand Logo */}
                <View className="w-full items-center justify-center pt-2 pb-1">
                  <Image
                    source={require('@/assets/images/carrot-logo.png')}
                    style={{ width: 27, height: 31 }}
                    resizeMode="contain"
                  />
                </View>

                {/* Delivery Address */}
                <View className="w-full items-center justify-center my-2">
                  <DeliverTo />
                </View>

                {/* Search Bar */}
                <View className="mt-1">
                  <Searchbar
                    value={homeSearchQuery}
                    onChangeText={handleHomeSearchChange}
                    placeholderWords={['search fresh groceries', 'search fresh fruits', 'search fresh vegetables', 'search verified stores']}
                    isLoading={searchingLive}
                  />
                </View>
              </View>

              {/* ── Scrollable Content Below Fixed Header ── */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
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

            {/* Live Search Results Container Directly Below Search Bar */}
            {homeSearchQuery.trim() !== '' ? (
              <View className="px-5 mb-8">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-quicksand-bold text-dark-100">
                    Search Results for "{homeSearchQuery}"
                  </Text>
                  <Text className="text-xs font-quicksand-semibold text-primary">
                    {displayProducts.length} items found
                  </Text>
                </View>

                {searchingLive && displayProducts.length === 0 ? (
                  <View className="py-12 items-center justify-center">
                    <ActivityIndicator size="large" color="#53B175" />
                    <Text className="text-xs font-quicksand-medium text-gray-400 mt-2">
                      Searching database for "{homeSearchQuery}"...
                    </Text>
                  </View>
                ) : displayProducts.length === 0 ? (
                  <View className="py-12 items-center justify-center bg-gray-50/80 rounded-3xl border border-[#F1F1F1]">
                    <Text className="text-3xl mb-2">🔍</Text>
                    <Text className="text-base font-quicksand-bold text-dark-100">
                      No products matching "{homeSearchQuery}"
                    </Text>
                    <Text className="text-xs font-quicksand-medium text-gray-400 mt-1 text-center px-4">
                      Try searching for fruits, vegetables, bakery, drinks, or store names
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap justify-between gap-y-4">
                    {displayProducts.map((item: any, idx: number) => (
                      <View key={item.$id || item.id || `live_search_${idx}`} style={{ width: (SCREEN_WIDTH - 52) / 2 }}>
                        <MenuCard item={item} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <>
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
                  const isDirectImage = Boolean(
                    item.hideTextOverlay ||
                    item.isFullImage ||
                    item.bannerMode === 'image' ||
                    item.subtitle === '[HIDE_TEXT]' ||
                    (item.subtitle && item.subtitle.includes('[HIDE_TEXT]')) ||
                    item.title === 'Full Image Banner' ||
                    !item.title ||
                    item.title.trim() === ''
                  )

                  return (
                    <Pressable
                      onPress={() => handleBannerPress(item)}
                      android_ripple={{ color: '#ffffff22' }}
                      style={{ width: SCREEN_WIDTH, paddingHorizontal: 20 }}
                    >
                      {isDirectImage && imageSrc ? (
                        <View style={{ borderRadius: 8, height: 115, overflow: 'hidden' }}>
                          <Image
                            source={imageSrc}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        </View>
                      ) : (
                        <LinearGradient
                          colors={item.gradient as [string, string]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            borderRadius: 8,
                            flexDirection: 'row',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            height: 115,
                            overflow: 'hidden',
                          }}
                        >
                          {isEven ? (
                            <>
                              <View className="w-1/2 justify-center items-start pr-2">
                                {imageSrc && (
                                  <Image
                                    source={imageSrc}
                                    className="w-full h-full"
                                    style={{ maxHeight: '100%', flex: 1 }}
                                    resizeMode="contain"
                                  />
                                )}
                              </View>
                              <View className="w-1/2 justify-center items-end pl-2">
                                <Text className="text-xl font-quicksand-bold text-white mb-0.5 text-right" numberOfLines={1}>
                                  {item.title}
                                </Text>
                                {item.subtitle ? (
                                  <Text className="text-[10px] font-quicksand-medium text-white/80 mb-1.5 text-right" numberOfLines={1}>
                                    {item.subtitle}
                                  </Text>
                                ) : null}
                                <TouchableOpacity
                                  onPress={() => handleBannerPress(item)}
                                  className="bg-white/30 px-3.5 py-1 rounded-full mt-0.5"
                                >
                                  <Text className="text-xs font-quicksand-bold text-white">
                                    Order Now
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </>
                          ) : (
                            <>
                              <View className="w-1/2 justify-center items-start pr-2">
                                <Text className="text-xl font-quicksand-bold text-white mb-0.5 text-left" numberOfLines={1}>
                                  {item.title}
                                </Text>
                                {item.subtitle ? (
                                  <Text className="text-[10px] font-quicksand-medium text-white/80 mb-1.5 text-left" numberOfLines={1}>
                                    {item.subtitle}
                                  </Text>
                                ) : null}
                                <TouchableOpacity
                                  onPress={() => handleBannerPress(item)}
                                  className="bg-white/30 px-3.5 py-1 rounded-full mt-0.5"
                                >
                                  <Text className="text-xs font-quicksand-bold text-white">
                                    Order Now
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <View className="w-1/2 justify-center items-end pl-2">
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
                      )}
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

            {/* ── SECTION 2: RECTANGULAR CATEGORY CARDS (MATCHING APP STYLE) ── */}
            <View className="mb-6">
              <View className="flex-between flex-row items-center mb-3 px-5">
                <Text className="text-2xl font-quicksand-bold text-dark-100">Explore Categories</Text>
                <TouchableOpacity onPress={() => router.push('/categories' as any)}>
                  <Text className="text-base font-quicksand-bold text-primary" style={{ color: '#53B175' }}>See All →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}
              >
                {categoriesToDisplay.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/search',
                        params: { category: cat.name.toLowerCase() === 'all' ? 'all' : cat.name },
                      } as any)
                    }
                    className="items-center mr-4 w-20 active:opacity-80"
                  >
                    {/* Ellipse / Circular Image Container */}
                    <View className="w-16 h-16 rounded-full bg-gray-100/90 items-center justify-center overflow-hidden mb-2">
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

                    {/* Category Name Below */}
                    <Text
                      className="font-quicksand-semibold text-xs text-dark-100 text-center leading-tight"
                      numberOfLines={2}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ── SECTION 3: EXCLUSIVE OFFERS (HORIZONTAL CAROUSEL) ── */}
            {exclusiveOfferProducts.length > 0 && (
              <View className="mb-6">
                <View className="flex-between flex-row items-center mb-3 px-5">
                  <View>
                    <Text className="text-2xl font-quicksand-bold font-bold text-dark-100">
                      Exclusive Offers
                    </Text>
                    <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                      Special discounts & price drops on daily picks
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/search', params: { category: 'all' } } as any)}>
                    <Text className="text-base font-quicksand-bold text-primary" style={{ color: '#53B175' }}>See All →</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}
                >
                  {exclusiveOfferProducts.map((item: any, idx: number) => (
                    <View key={item.$id || item.id || `offer_${idx}`} className="mr-3" style={{ width: 165 }}>
                      <MenuCard item={item} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── SECTION 4: SHOP FROM STORES (LOCATION PROXIMITY INTELLIGENCE) ── */}
            <View className="mb-6">
              <View className="flex-between flex-row items-center mb-3 px-5">
                <View>
                  <Text className="text-2xl font-quicksand-bold text-dark-100">
                    Stores Near You
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                    Nearest stores to your delivery location
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/stores' as any)}>
                  <Text className="text-base font-quicksand-bold text-primary" style={{ color: '#53B175' }}>Explore All →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
                className="mt-1"
              >
                {displayStores.map((store: any, idx: number) => {
                  const storeId = String(store.$id || store.id || `store_${idx + 1}`)
                  const openStore = () => {
                    router.push({
                      pathname: '/store/[id]',
                      params: { id: storeId },
                    })
                  }

                  const logoSrc = store.logoUrl || store.logoImage || store.logo || store.image || store.avatar || null
                  const bannerSrc = store.bannerUrl || store.bannerImage || store.banner || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80'
                  const initial = (store.storeName || 'S').charAt(0).toUpperCase()
                  const ratingVal = store.rating != null && Number(store.rating) > 0 ? Number(store.rating).toFixed(1) : '5.0'
                  const isLast = idx === displayStores.length - 1

                  return (
                    <TouchableOpacity
                      key={storeId || idx}
                      activeOpacity={0.88}
                      onPress={openStore}
                      style={{ width: 260, height: 236, minWidth: 260, flexShrink: 0, borderColor: '#F1F1F1' }}
                      className={`bg-white border border-[#F1F1F1] rounded-none overflow-hidden flex-col justify-between ${isLast ? 'mr-0' : 'mr-3.5'
                        }`}
                    >
                      {/* Top Rectangular Cover Banner */}
                      <View className="w-full h-24 bg-primary/10 relative justify-center items-center overflow-hidden">
                        <FastImage
                          source={bannerSrc}
                          className="w-full h-full"
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                        {/* Subtle Dark Gradient Overlay */}
                        <View className="absolute inset-0 bg-black/25" />

                        {/* Top Flex Row: ETA with ⏱️ and Rating */}
                        <View className="absolute top-2 left-2 right-2 flex-row justify-between items-center z-10">
                          {/* Top Left: Proximity & Delivery Time Badge */}
                          <View className="bg-black/60 px-2 py-0.5 rounded-full flex-row items-center border border-white/20">
                            <Text className="text-xs font-quicksand-bold text-white">
                              ⏱️ {store.estimatedDeliveryTime || '15-25 min'}
                            </Text>
                          </View>

                          {/* Top Right: Glassmorphic Rating Tag */}
                          <View className="bg-white/95 px-2 py-0.5 rounded-full flex-row items-center border border-amber-500/20 shadow-sm">
                            <Text className="text-xs mr-0.5">⭐</Text>
                            <Text className="font-quicksand-bold text-xs text-amber-800">
                              {ratingVal}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Store Body & Details */}
                      <View className="p-3 pt-0 flex-1 justify-between">
                        <View>
                          {/* Overlapping Store Logo Badge */}
                          <View className="-mt-6 mb-1.5 flex-row items-end justify-between">
                            <View className="w-12 h-12 rounded-xl bg-white border-2 border-white shadow-md shadow-black/15 overflow-hidden items-center justify-center">
                              {logoSrc ? (
                                <FastImage
                                  source={logoSrc}
                                  className="w-full h-full"
                                  style={{ width: '100%', height: '100%' }}
                                  contentFit="cover"
                                />
                              ) : (
                                <View className="w-full h-full bg-primary/10 items-center justify-center">
                                  <Text className="text-xl font-quicksand-bold text-primary" style={{ color: '#53B175' }}>
                                    {initial}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                              <Text className="text-xs font-quicksand-bold text-primary" style={{ color: '#53B175' }}>
                                Verified Partner ✓
                              </Text>
                            </View>
                          </View>

                          <Text className="font-quicksand-bold text-dark-100 text-base leading-tight" numberOfLines={1}>
                            {store.storeName || 'Partner Store'}
                          </Text>
                          <View className="h-6 justify-center mt-0.5">
                            <Text className="text-gray-400 font-quicksand-medium text-xs" numberOfLines={1}>
                              {store.description || 'Quality grocery & daily essentials store'}
                            </Text>
                          </View>
                        </View>

                        {/* Crisp Divider Line Matching App Theme */}
                        <View className="h-px my-2" style={{ backgroundColor: '#F1F1F1' }} />

                        {/* Bottom Actions Row */}
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Image
                              source={images.location}
                              className="w-3 h-3 mr-1"
                              resizeMode="contain"
                              tintColor="#047857"
                            />
                            <Text className="text-xs font-quicksand-bold text-emerald-700">
                              {store.distanceKm != null ? `${store.distanceKm} km` : 'Near'}
                            </Text>
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={(e) => {
                              e.stopPropagation()
                              openStore()
                            }}
                            className="bg-primary px-3 py-1.5 rounded-full flex-row items-center active:scale-95 shadow-sm shadow-primary/20"
                            style={{ backgroundColor: '#53B175' }}
                          >
                            <Text className="text-white font-quicksand-bold text-xs mr-1">Visit Store</Text>
                            <Text className="text-white font-bold text-xs">→</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>

            {/* ── SECTION 5: POPULAR GROCERIES NEAR YOU ── */}
            <View className="px-5 pb-16 mb-8">
              <View className="flex-between flex-row items-center mb-4">
                <View>
                  <Text className="text-2xl font-quicksand-bold text-dark-100">
                    Groceries Near You
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                    Items from stores near your delivery area
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                  <Text className="text-base font-quicksand-bold text-primary" style={{ color: '#53B175' }}>View All →</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap justify-between gap-y-4">
                {displayProducts.slice(0, 12).map((item: any, idx: number) => (
                  <View key={item.$id || item.id || `pop_${idx}`} style={{ width: (SCREEN_WIDTH - 52) / 2 }}>
                    <MenuCard item={item} />
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </SafeAreaView>
      </View>

      <FloatingCartPill bottomOffset={cartPillBottomOffset} />
    </View>
  )
}