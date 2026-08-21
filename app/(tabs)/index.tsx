import { LinearGradient } from 'expo-linear-gradient'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCallback, useState } from 'react'

import CartButton from '@/components/CartButton'
import { offers } from '@/constants'
import useAuthStore from '@/store/auth.store'
import DeliverTo from '@/components/DeliverTo'
import FloatingCartPill from '@/components/FloatingCartPill'
import { getBanners } from '@/lib/appwrite'
import { useFocusEffect, useRouter } from 'expo-router'

export default function Index() {
  const router = useRouter()
  const { user } = useAuthStore()

  // null = initial loading state, preventing visual pop/flicker from fallback banners
  const [banners, setBanners] = useState<any[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBannersData = useCallback(async () => {
    try {
      const docs = await getBanners()
      if (docs && docs.length > 0) {
        // Strict deduplication by title and ID
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
    } catch (err) {
      console.log('Error fetching banners:', err)
      setBanners((prev) => (prev && prev.length > 0 ? prev : offers))
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Automatically sync with Admin Dashboard changes whenever Home screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBannersData()
    }, [fetchBannersData])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchBannersData()
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

  // Smooth loading indicator on first boot to prevent content jump/flickering
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
      <FlatList
        data={banners}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
        contentContainerClassName="pb-28 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A34A']} />
        }
        renderItem={({ item, index }) => {
          const isEven = index % 2 === 0
          const imageSrc = item.image || (item.imageUrl ? { uri: item.imageUrl } : null)

          return (
            <Pressable
              onPress={() => handleBannerPress(item)}
              android_ripple={{ color: '#ffffff22' }}
              className="mb-6"
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
        ListHeaderComponent={() => (
          <View className="flex-between flex-row w-full my-5">
            <DeliverTo />
            <CartButton />
          </View>
        )}
      />

      <FloatingCartPill />
    </SafeAreaView>
  )
}