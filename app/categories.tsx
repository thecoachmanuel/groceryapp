import CartButton from '@/components/CartButton'
import FastImage from '@/components/FastImage'
import FloatingCartPill from '@/components/FloatingCartPill'
import Searchbar from '@/components/SearchBar'
import { images } from '@/constants'
import { appwriteConfig, getCategories } from '@/lib/appwrite'
import useAppwrite from '@/lib/useAppwrite'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - 50) / 2

// Fallback category visual metadata & rich imagery
const CATEGORY_METADATA: Record<string, { image: string; emoji: string; subtitle: string; color: string }> = {
  All: {
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
    emoji: '🛍️',
    subtitle: 'All items & daily essentials',
    color: '#53B175',
  },
  'Fruits & Vegetables': {
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80',
    emoji: '🥦',
    subtitle: 'Farm-fresh organic picks',
    color: '#10B981',
  },
  'Dairy & Eggs': {
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    emoji: '🥛',
    subtitle: 'Fresh milk, butter & eggs',
    color: '#3B82F6',
  },
  'Bakery & Bread': {
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    emoji: '🍞',
    subtitle: 'Artisanal breads & pastries',
    color: '#F59E0B',
  },
  'Beverages & Drinks': {
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&auto=format&fit=crop&q=80',
    emoji: '🧃',
    subtitle: 'Natural juices, soda & water',
    color: '#EC4899',
  },
  'Meat & Seafood': {
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop&q=80',
    emoji: '🥩',
    subtitle: 'Prime cuts, poultry & fish',
    color: '#EF4444',
  },
  'Snacks & Confectionery': {
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
    emoji: '🍿',
    subtitle: 'Chips, biscuits & chocolates',
    color: '#8B5CF6',
  },
  'Snacks & Sweets': {
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
    emoji: '🍿',
    subtitle: 'Chips, sweets & candy',
    color: '#8B5CF6',
  },
  'Snacks': {
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
    emoji: '🍿',
    subtitle: 'Delicious snacks & treats',
    color: '#8B5CF6',
  },
  'Pantry & Grains': {
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    emoji: '🌾',
    subtitle: 'Rice, pasta, spices & oils',
    color: '#D97706',
  },
  'Frozen Foods': {
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
    emoji: '🧊',
    subtitle: 'Quick meals & frozen desserts',
    color: '#06B6D4',
  },
}

export default function AllCategoriesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const { data: dbCategories, refetch, loading } = useAppwrite({
    fn: getCategories,
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

  const resolveCategoryImageUrl = (url?: string) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null
    let formatted = url.trim()
    if (formatted.startsWith('http') && !formatted.includes('project=')) {
      formatted = `${formatted}${formatted.includes('?') ? '&' : '?'}project=${appwriteConfig.projectId}`
    }
    return formatted
  }

  // Combine database categories with rich fallback metadata (excluding 'All')
  const allCategories = useMemo(() => {
    const defaultList = Object.keys(CATEGORY_METADATA)
      .filter((name) => name !== 'All')
      .map((name, idx) => {
        const meta = CATEGORY_METADATA[name]
        return {
          id: `cat_def_${idx + 1}`,
          name,
          image: meta.image,
          emoji: meta.emoji,
          subtitle: meta.subtitle,
        }
      })

    if (!dbCategories || dbCategories.length === 0) {
      return defaultList
    }

    const seen = new Set<string>()
    const formatted: any[] = []

    dbCategories.forEach((c: any) => {
      const name = c.name || 'Category'
      const key = name.toLowerCase().trim()
      if (key === 'all' || seen.has(key)) return
      seen.add(key)

      const rawImg = c.iconUrl || c.image_url || c.imageUrl
      const customImg = rawImg ? resolveCategoryImageUrl(rawImg) : null
      const meta = CATEGORY_METADATA[name]

      formatted.push({
        id: c.$id || c.id || name,
        name,
        image: customImg || meta?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
        emoji: meta?.emoji || '🥦',
        subtitle: meta?.subtitle || 'Fresh quality selection',
      })
    })

    return formatted
  }, [dbCategories])

  // Filter categories via real-time search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return allCategories

    return allCategories.filter((cat) => {
      const name = cat.name.toLowerCase()
      const subtitle = (cat.subtitle || '').toLowerCase()
      return name.includes(q) || subtitle.includes(q)
    })
  }, [allCategories, searchQuery])

  const handleSelectCategory = (cat: any) => {
    router.push({
      pathname: '/(tabs)/search',
      params: { category: cat.name },
    } as any)
  }

  const bottomBoundary = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)

  return (
    <View className="flex-1 bg-white relative" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Viewport Bounded Content Container ── */}
      <View style={{ flex: 1, marginBottom: bottomBoundary }} className="overflow-hidden">
        {/* Header matching Find Products Page design */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="pt-2 pb-2 bg-white border-b border-[#F1F1F1]" style={{ backgroundColor: '#ffffff', borderColor: '#F1F1F1' }}>
            <SafeAreaView edges={['top']} className="bg-white px-5 pt-2 pb-2" style={{ backgroundColor: '#ffffff' }}>
              {/* Top Title Row with Back Button & Cart */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2 bg-gray-50 border border-[#F1F1F1] rounded-2xl active:opacity-70 mr-3"
                    style={{ borderColor: '#F1F1F1' }}
                  >
                    <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" tintColor="#181C2E" />
                  </TouchableOpacity>

                  <View className="flex-1">
                    <Text className="text-2xl font-quicksand-bold font-bold text-dark-100">
                      Explore Categories
                    </Text>
                    <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                      Browse all grocery categories & departments
                    </Text>
                  </View>
                </View>

                <View className="bg-gray-50 border border-[#F1F1F1] rounded-2xl p-1.5" style={{ borderColor: '#F1F1F1' }}>
                  <CartButton />
                </View>
              </View>

              {/* Search Bar matching Home & Store detail design */}
              <View className="my-1">
                <Searchbar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search categories..."
                />
              </View>

              {/* Quick Summary Pill Bar */}
              <View className="flex-row items-center justify-between mt-2 px-0.5">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" style={{ backgroundColor: '#53B175' }} />
                  <Text className="text-dark-100 text-xs font-quicksand-semibold">
                    All Categories
                  </Text>
                </View>
                <Text className="text-[11px] text-gray-400 font-quicksand-medium">
                  {filteredCategories.length} Categories
                </Text>
              </View>
            </SafeAreaView>
          </View>
        </TouchableWithoutFeedback>

        {/* ── Categories Grid ── */}
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id || item.name}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 6 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#53B175"
              colors={['#53B175']}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View className="items-center justify-center py-20">
                <ActivityIndicator size="large" color="#53B175" />
                <Text className="font-quicksand-semibold text-sm text-gray-400 mt-4">
                  Loading categories...
                </Text>
              </View>
            ) : (
              <View className="items-center justify-center py-16 px-5">
                <Text className="text-5xl mb-3">🔍</Text>
                <Text className="font-quicksand-bold text-lg text-dark-100 text-center">
                  No Categories Found
                </Text>
                <Text className="font-quicksand-medium text-xs text-gray-400 text-center mt-1">
                  No categories match "{searchQuery}". Try searching something else!
                </Text>
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  className="mt-4 bg-primary px-5 py-2.5 rounded-full active:scale-95 shadow-md shadow-primary/20"
                  style={{ backgroundColor: '#53B175' }}
                >
                  <Text className="text-white font-quicksand-bold text-xs">Clear Search</Text>
                </TouchableOpacity>
              </View>
            )
          }
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => handleSelectCategory(item)}
                style={{ width: CARD_WIDTH, height: 175, borderColor: '#F1F1F1' }}
                className="bg-white border border-[#F1F1F1] rounded-2xl overflow-hidden mb-4 flex-col justify-between p-3 active:scale-95"
              >
                {/* Hero Category Banner / Image */}
                <View className="w-full h-28 bg-gray-50/90 rounded-xl relative justify-center items-center overflow-hidden">
                  <FastImage
                    source={item.image}
                    className="w-full h-full"
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>

                {/* Category Text */}
                <View className="mt-1.5 w-full items-start justify-center flex-1">
                  <Text className="font-quicksand-bold font-bold text-dark-100 text-sm text-left leading-tight" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-[11px] text-left mt-0.5 leading-snug" numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* Floating Cart Pill */}
      <FloatingCartPill bottomOffset={bottomBoundary + 10} />
    </View>
  )
}
