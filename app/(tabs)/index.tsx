import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useRef, useState } from 'react'
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
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import CartButton from '@/components/CartButton'
import DeliverTo from '@/components/DeliverTo'
import FastImage from '@/components/FastImage'
import FloatingCartPill from '@/components/FloatingCartPill'
import { offers } from '@/constants'
import { DEFAULT_GROCERY_PRODUCTS, appwriteConfig, getBanners, getMenu, getStores } from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useFocusEffect, useRouter } from 'expo-router'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - 40 // Padding 20 on each side

// Categories with icons for horizontal scroll (Grocery categories)
const HOME_CATEGORIES = [
  { id: '1', name: 'All', icon: '🛍️' },
  { id: '2', name: 'Fruits & Vegetables', icon: '🥦' },
  { id: '3', name: 'Dairy & Eggs', icon: '🥛' },
  { id: '4', name: 'Bakery & Bread', icon: '🍞' },
  { id: '5', name: 'Beverages & Drinks', icon: '🧃' },
  { id: '6', name: 'Meat & Seafood', icon: '🥩' },
  { id: '7', name: 'Snacks & Confectionery', icon: '🍿' },
  { id: '8', name: 'Pantry & Grains', icon: '🌾' },
]

// Fallback Stores for Multi-Vendor Showcase
const FEATURED_STORES_FALLBACK = [
  {
    id: 'store_1',
    storeName: 'Green Valley Organic Market',
    description: 'Farm fresh organic produce, daily dairy & superfoods',
    rating: 4.9,
    deliveryTime: '15-25 min',
    status: 'active',
  },
  {
    id: 'store_2',
    storeName: 'Daily Supermarket & Bakery',
    description: 'Artisanal breads, pantry essentials & fresh beverages',
    rating: 4.8,
    deliveryTime: '20-30 min',
    status: 'active',
  },
  {
    id: 'store_3',
    storeName: 'Prime Meats & Seafood Depot',
    description: 'Premium steaks, fresh catch fish, poultry & frozen foods',
    rating: 4.9,
    deliveryTime: '25-35 min',
    status: 'active',
  },
]

export default function Index() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { addItem } = useCartStore()

  const [banners, setBanners] = useState<any[] | null>(null)
  const [stores, setStores] = useState<any[]>([])
  const [popularProducts, setPopularProducts] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [activeBannerIndex, setActiveBannerIndex] = useState(0)
  const [addedToast, setAddedToast] = useState<string | null>(null)

  const carouselRef = useRef<FlatList>(null)

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

      // 3. Fetch Live Popular Products from Database
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
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: typeof item.image === 'string' ? item.image : '',
    })
    setAddedToast(`Added "${item.name}" to cart! 🛒`)
    setTimeout(() => setAddedToast(null), 2500)
  }

  if (banners === null) {
    return (
      <SafeAreaView className="flex-1 bg-bg-light">
        <View className="flex-between flex-row w-full my-5 px-5">
          <DeliverTo />
          <CartButton />
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
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
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
        }
      >
        {/* Top Header */}
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
            snapToInterval={CAROUSEL_CARD_WIDTH + 16}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / (CAROUSEL_CARD_WIDTH + 16)
              )
              setActiveBannerIndex(index)
            }}
            renderItem={({ item, index }) => {
              const isEven = index % 2 === 0
              const imageSrc = item.image || (item.imageUrl ? { uri: item.imageUrl } : null)

              return (
                <Pressable
                  onPress={() => handleBannerPress(item)}
                  android_ripple={{ color: '#ffffff22' }}
                  style={{ width: CAROUSEL_CARD_WIDTH, marginRight: 16 }}
                >
                  <LinearGradient
                    colors={item.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 24,
                      flexDirection: 'row',
                      padding: 20,
                      minHeight: 180,
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
              <Text className="text-xs font-quicksand-bold text-primary">See All →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
            {HOME_CATEGORIES.map((cat) => (
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
                <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mb-2 border border-primary/20">
                  <Text className="text-2xl">{cat.icon}</Text>
                </View>
                <Text className="font-quicksand-bold text-xs text-dark-100 text-center" numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>



        {/* ── SECTION 4: SHOP FROM STORES (MULTI-VENDOR) ── */}
        <View className="mb-6 px-5">
          <View className="flex-between flex-row items-center mb-3">
            <View>
              <Text className="text-lg font-quicksand-bold text-dark-100">
                Shop From Stores 🏪
              </Text>
              <Text className="text-xs font-quicksand-medium text-gray-400">
                Verified seller stores & fast local delivery
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text className="text-xs font-quicksand-bold text-primary">Explore All →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {stores.map((store, idx) => (
              <View
                key={store.$id || store.id || idx}
                className="bg-white border-2 border-primary/10 rounded-[24px] p-4 mr-4 w-64 shadow-md shadow-black/5 justify-between"
              >
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                      <Text className="text-lg font-quicksand-bold text-primary">
                        {(store.storeName || 'S').charAt(0)}
                      </Text>
                    </View>

                    <View className="flex-row items-center bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
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
                  <Text className="text-[11px] font-quicksand-bold text-gray-500">
                    ⚡ {store.deliveryTime || '20-30 min'}
                  </Text>

                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(tabs)/search', params: { storeId: store.$id || store.id } } as any)}
                    className="bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-primary font-quicksand-bold text-xs">Visit Store 🏪</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── SECTION 5: POPULAR GROCERIES GRID ── */}
        <View className="px-5 pb-8">
          <View className="flex-between flex-row items-center mb-3">
            <Text className="text-lg font-quicksand-bold text-dark-100">
              Popular Groceries 🥬
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text className="text-xs font-quicksand-bold text-primary">View All →</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between gap-y-4">
            {(popularProducts.length > 0 ? popularProducts : DEFAULT_GROCERY_PRODUCTS).slice(0, 8).map((item: any, idx: number) => {
              const productId = item.$id || item.id || `pop_${idx}`
              const rawImg = item.image_url || item.imageUrl || item.image || item.iconUrl || ''
              let imageUrl: any = ''
              const n = (item.name || '').toLowerCase()

              // 1. Direct Appwrite / Cloud / HTTP image from database document
              if (typeof rawImg === 'string' && rawImg.trim().length > 5 && !rawImg.includes('vecteezy')) {
                if (rawImg.startsWith('http')) {
                  imageUrl = rawImg.includes('appwrite') && !rawImg.includes('project=')
                    ? `${rawImg}${rawImg.includes('?') ? '&' : '?'}project=${appwriteConfig.projectId}`
                    : rawImg
                } else {
                  imageUrl = rawImg
                }
              } else {
                // 2. High-res Grocery Unsplash fallback only if database image URL is completely empty
                if (n.includes('avocado')) imageUrl = 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('tomato')) imageUrl = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('milk')) imageUrl = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('egg')) imageUrl = 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('bread') || n.includes('wheat')) imageUrl = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('juice') || n.includes('orange')) imageUrl = 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('oil') || n.includes('olive')) imageUrl = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('chip') || n.includes('fries')) imageUrl = 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('steak') || n.includes('beef') || n.includes('meat')) imageUrl = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('salmon') || n.includes('fish') || n.includes('seafood')) imageUrl = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('burger')) imageUrl = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80'
                else if (n.includes('pizza')) imageUrl = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80'
                else imageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80'
              }

              const displayPrice = item.discountPrice && item.discountPrice < item.price ? item.discountPrice : item.price
              const originalPrice = item.discountPrice && item.discountPrice < item.price ? item.price : null

              return (
                <TouchableOpacity
                  key={productId}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/product/${productId}` as any)}
                  style={{ width: (SCREEN_WIDTH - 52) / 2 }}
                  className="bg-white border-2 border-primary/10 rounded-[24px] p-3.5 shadow-md shadow-black/5 justify-between"
                >
                  {/* Product Image Frame */}
                  <View className="w-full h-28 bg-gray-50 rounded-[18px] overflow-hidden relative mb-2 border border-primary/10 items-center justify-center">
                    <FastImage
                      source={imageUrl}
                      className="w-full h-full"
                      contentFit="cover"
                    />

                    {originalPrice ? (
                      <View className="absolute top-1.5 right-1.5 bg-red-500 px-1.5 py-0.5 rounded-full z-10">
                        <Text className="text-[8px] font-quicksand-bold text-white uppercase">Sale</Text>
                      </View>
                    ) : null}
                  </View>

                  <View>
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xs mr-1">⭐</Text>
                      <Text className="font-quicksand-bold text-xs text-gray-500">
                        {item.rating || 4.9}
                      </Text>
                    </View>

                    <Text
                      className="font-quicksand-bold text-dark-100 text-xs"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-primary/10 min-h-[36px]">
                      <View>
                        <Text className="font-quicksand-bold text-sm text-primary">
                          ₦{Number(displayPrice || 0).toLocaleString()}
                        </Text>
                        {originalPrice ? (
                          <Text className="font-quicksand-medium text-[10px] text-gray-400 line-through">
                            ₦{Number(originalPrice).toLocaleString()}
                          </Text>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation()
                          handleAddToCart(item)
                        }}
                        className="bg-primary w-8 h-8 rounded-full items-center justify-center shadow-md shadow-primary/30 active:scale-95"
                      >
                        <Text className="text-white font-bold text-base leading-none">+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>

      <FloatingCartPill />
    </SafeAreaView>
  )
}