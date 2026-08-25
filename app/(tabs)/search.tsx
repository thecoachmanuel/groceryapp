import CartButton from '@/components/CartButton'
import Filter from '@/components/Filter'
import FloatingCartPill from '@/components/FloatingCartPill'
import MenuCard from '@/components/MenuCard'
import Searchbar from '@/components/SearchBar'
import { images } from '@/constants'
import { getCategories, getMenu } from '@/lib/appwrite'
import useAppwrite from '@/lib/useAppwrite'
import { MenuItem } from '@/type'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const Search = () => {
  const insets = useSafeAreaInsets()

  const params = useLocalSearchParams<{
    query: string
    category: string
  }>()

  const [liveQuery, setLiveQuery] = useState(params.query || '')
  const [liveCategory, setLiveCategory] = useState(params.category || 'all')
  const [filterModalVisible, setFilterModalVisible] = useState(false)

  // Fetch full inventory for instant zero-latency live filtering
  const { data: allProducts, refetch, loading } = useAppwrite({
    fn: getMenu,
    params: {},
  })
  const { data: categories, refetch: refetchCategories } = useAppwrite({ fn: getCategories })

  // Sync external navigation parameters
  useEffect(() => {
    if (params.query !== undefined && params.query !== liveQuery) {
      setLiveQuery(params.query)
    }
  }, [params.query])

  useEffect(() => {
    if (params.category !== undefined) {
      setLiveCategory(params.category || 'all')
    }
  }, [params.category])

  useFocusEffect(
    useCallback(() => {
      if (params.category !== undefined) {
        setLiveCategory(params.category || 'all')
      }
      refetch({})
      refetchCategories()
    }, [params.category])
  )

  // Real-time live filtering for instant results as user types or picks category
  const filteredProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return []
    return (allProducts as unknown as MenuItem[]).filter((item: any) => {
      // 1. Category Matching
      const selCat = String(liveCategory || 'all').toLowerCase().trim()
      const itemCatId = String(item.categoryId || '').toLowerCase().trim()
      const itemCatName = String(item.categories || item.category_name || item.category || '').toLowerCase().trim()
      const itemType = String(item.type || '').toLowerCase().trim()

      let matchesCategory = false
      if (!selCat || selCat === 'all') {
        matchesCategory = true
      } else {
        matchesCategory =
          itemCatId === selCat ||
          itemCatName === selCat ||
          itemType === selCat ||
          (itemCatId !== '' && (itemCatId.includes(selCat) || selCat.includes(itemCatId))) ||
          (itemCatName !== '' && (itemCatName.includes(selCat) || selCat.includes(itemCatName)))
      }

      // 2. Search Text Matching
      const q = liveQuery.toLowerCase().trim()
      const itemName = String(item.name || '').toLowerCase().trim()
      const itemDesc = String(item.description || '').toLowerCase().trim()

      const matchesQuery =
        q === '' ||
        itemName.includes(q) ||
        itemDesc.includes(q) ||
        itemCatId.includes(q) ||
        itemCatName.includes(q)

      return matchesCategory && matchesQuery
    })
  }, [allProducts, liveCategory, liveQuery])

  // Fully responsive dynamic bottom boundary calculations
  const tabBottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)
  const tabHeight = 70
  const cartPillBottomOffset = tabBottomOffset + tabHeight + 10
  const listPaddingBottom = tabHeight + 40

  const availableCategoriesList = useMemo(() => {
    const CATEGORY_IMAGES: Record<string, string> = {
      'Fruits & Vegetables': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&auto=format&fit=crop&q=80',
      'Dairy & Eggs': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80',
      'Bakery & Bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80',
      'Beverages & Drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&auto=format&fit=crop&q=80',
      'Meat & Seafood': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&auto=format&fit=crop&q=80',
      'Snacks & Confectionery': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80',
      'Pantry & Grains': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop&q=80',
      'Frozen Foods': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&auto=format&fit=crop&q=80',
    }

    const defaultCats = [
      { id: 'all', name: 'All Categories', icon: '🛍️', image: null },
      { id: 'Fruits & Vegetables', name: 'Fruits & Vegetables', icon: '🥦', image: CATEGORY_IMAGES['Fruits & Vegetables'] },
      { id: 'Dairy & Eggs', name: 'Dairy & Eggs', icon: '🥛', image: CATEGORY_IMAGES['Dairy & Eggs'] },
      { id: 'Bakery & Bread', name: 'Bakery & Bread', icon: '🍞', image: CATEGORY_IMAGES['Bakery & Bread'] },
      { id: 'Beverages & Drinks', name: 'Beverages & Drinks', icon: '🧃', image: CATEGORY_IMAGES['Beverages & Drinks'] },
      { id: 'Meat & Seafood', name: 'Meat & Seafood', icon: '🥩', image: CATEGORY_IMAGES['Meat & Seafood'] },
      { id: 'Snacks & Confectionery', name: 'Snacks & Confectionery', icon: '🍿', image: CATEGORY_IMAGES['Snacks & Confectionery'] },
      { id: 'Pantry & Grains', name: 'Pantry & Grains', icon: '🌾', image: CATEGORY_IMAGES['Pantry & Grains'] },
      { id: 'Frozen Foods', name: 'Frozen Foods', icon: '🧊', image: CATEGORY_IMAGES['Frozen Foods'] },
    ]

    if (!categories || categories.length === 0) return defaultCats

    const seen = new Set<string>(['all'])
    const result = [{ id: 'all', name: 'All Categories', icon: '🛍️', image: null }]

    categories.forEach((c: any) => {
      const name = c.name || 'Category'
      const key = name.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        const rawImg = c.iconUrl || c.image_url || c.imageUrl || c.image
        result.push({
          id: name,
          name,
          icon: c.icon || '🏷️',
          image: rawImg || CATEGORY_IMAGES[name] || null,
        })
      }
    })

    return result
  }, [categories])

  return (
    <View className="flex-1 bg-white relative" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Viewport Bounded Content Container ── */}
      <View
        style={{ flex: 1, marginBottom: tabBottomOffset }}
        className="overflow-hidden"
      >
        {/* Header & Search Controls */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="pt-2 pb-2 bg-white border-b border-[#F1F1F1]" style={{ backgroundColor: '#ffffff', borderColor: '#F1F1F1' }}>
            <SafeAreaView edges={['top']} className="bg-white px-5 pt-2 pb-2" style={{ backgroundColor: '#ffffff' }}>
              {/* Discover Header Title & Cart */}
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-2xl font-quicksand-bold font-bold text-dark-100">
                    Find Products
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                    Search groceries & filter by category
                  </Text>
                </View>

                <View className="bg-gray-50 border border-[#F1F1F1] rounded-2xl p-1.5" style={{ borderColor: '#F1F1F1' }}>
                  <CartButton />
                </View>
              </View>

              {/* Search Bar & Filter Icon Row */}
              <View className="flex-row items-center gap-2.5 mb-2">
                {/* Store-Style Pill Search Bar */}
                <View className="flex-1">
                  <Searchbar
                    value={liveQuery}
                    onChangeText={(text) => setLiveQuery(text)}
                    placeholder="Search fresh groceries, fruits, milk..."
                  />
                </View>

                {/* Category Filter Icon Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setFilterModalVisible(true)}
                  className={`w-11 h-11 rounded-full items-center justify-center border ${
                    liveCategory && liveCategory !== 'all'
                      ? 'bg-primary border-primary'
                      : 'bg-white border-primary/20'
                  }`}
                  style={{
                    borderColor: liveCategory && liveCategory !== 'all' ? '#53B175' : '#E8F5EE',
                    ...(Platform.OS === 'android'
                      ? { elevation: 4 }
                      : {
                          shadowColor: '#000',
                          shadowOpacity: 0.06,
                          shadowRadius: 10,
                          shadowOffset: { width: 0, height: 5 },
                        }),
                  }}
                >
                  <Ionicons
                    name="options-outline"
                    size={20}
                    color={liveCategory && liveCategory !== 'all' ? '#ffffff' : '#181C2E'}
                  />
                </TouchableOpacity>
              </View>

              {/* Horizontal Category Pill Bar */}
              <View className="mt-1">
                <Filter
                  categories={(categories || []) as unknown as any}
                  activeCategory={liveCategory}
                  onSelectCategory={(cat) => setLiveCategory(cat)}
                />
              </View>

              {/* Summary Status Bar */}
              <View className="flex-row items-center justify-between mt-2.5 px-0.5">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-primary rounded-full mr-2" style={{ backgroundColor: '#53B175' }} />
                  <Text className="text-dark-100 text-xs font-quicksand-semibold">
                    {liveCategory && liveCategory !== 'all' ? `Category: ${liveCategory}` : 'All Categories'}
                  </Text>
                </View>

                <Text className="text-[11px] text-gray-400 font-quicksand-medium">
                  {filteredProducts.length} items found
                </Text>
              </View>
            </SafeAreaView>
          </View>
        </TouchableWithoutFeedback>

        {/* ── Filtered Product Grid ── */}
        <FlatList
          data={filteredProducts}
          renderItem={({ item }) => (
            <View className="flex-1 max-w-[48%] mb-4">
              <MenuCard item={item} />
            </View>
          )}
          keyExtractor={(item) => item.$id || item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: listPaddingBottom, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={() => (
            loading ? (
              <View className="items-center mt-12">
                <ActivityIndicator size="large" color="#53B175" />
              </View>
            ) : (
              <View className="items-center mt-8 px-6">
                <View className="bg-white border border-[#F1F1F1] rounded-3xl p-8 items-center w-full" style={{ borderColor: '#F1F1F1' }}>
                  <Text className="text-4xl mb-3">🔍</Text>
                  <Text className="text-dark-100 text-base font-quicksand-bold">
                    No Groceries Found
                  </Text>
                  <Text className="text-gray-400 text-xs font-quicksand-medium mt-1.5 text-center leading-relaxed">
                    {liveQuery
                      ? `No items matching "${liveQuery}".`
                      : 'Try selecting another category or clearing your search filter.'}
                  </Text>
                  {(liveQuery || (liveCategory && liveCategory !== 'all')) ? (
                    <TouchableOpacity
                      onPress={() => {
                        setLiveQuery('')
                        setLiveCategory('all')
                      }}
                      className="mt-4 bg-primary px-5 py-2.5 rounded-full active:scale-95"
                      style={{ backgroundColor: '#53B175' }}
                    >
                      <Text className="text-white font-quicksand-bold text-xs">Reset All Filters</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )
          )}
        />
      </View>

      {/* ── CATEGORY FILTER SELECTION MODAL ── */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-5 max-h-[75%]">
            {/* Modal Header without bottom line */}
            <View className="flex-row justify-between items-center pb-2 mb-3">
              <View>
                <Text className="font-quicksand-bold text-lg text-dark-100">
                  Filter by Category
                </Text>
                <Text className="font-quicksand-medium text-xs text-gray-400">
                  Select a category to filter products
                </Text>
              </View>

              {/* Clean X button without background circle */}
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                className="p-1"
              >
                <Text className="text-gray-400 font-bold text-base">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Category Options List */}
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
              {availableCategoriesList.map((catItem) => {
                const isSelected =
                  (liveCategory || 'all').toLowerCase().trim() === catItem.id.toLowerCase().trim()

                return (
                  <TouchableOpacity
                    key={catItem.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      setLiveCategory(catItem.id)
                      setFilterModalVisible(false)
                    }}
                    className={`p-3.5 mb-2.5 rounded-2xl border flex-row items-center justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-[#F1F1F1] bg-gray-50/80'
                    }`}
                    style={{ borderColor: isSelected ? '#53B175' : '#F1F1F1' }}
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      {/* Category Thumbnail Image or Shopping Bags Icon on the left */}
                      {catItem.id === 'all' || !catItem.image ? (
                        <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3 border border-primary/20" style={{ backgroundColor: 'rgba(83, 177, 117, 0.12)', borderColor: 'rgba(83, 177, 117, 0.25)' }}>
                          <Text className="text-xl">🛍️</Text>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: catItem.image }}
                          className="w-10 h-10 rounded-xl mr-3 bg-gray-100"
                          resizeMode="cover"
                        />
                      )}
                      <Text className="font-quicksand-bold text-dark-100 text-sm">
                        {catItem.name}
                      </Text>
                    </View>

                    <View
                      className={`w-6 h-6 rounded-full border items-center justify-center ${
                        isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                      }`}
                      style={{ borderColor: isSelected ? '#53B175' : '#D1D5DB' }}
                    >
                      {isSelected && <Text className="text-white text-xs font-bold">✓</Text>}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* Action Button */}
            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              className="bg-primary py-3.5 rounded-2xl items-center mt-3"
              style={{ backgroundColor: '#53B175' }}
            >
              <Text className="text-white font-quicksand-bold text-sm">
                Apply Category Filter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FloatingCartPill bottomOffset={cartPillBottomOffset} />
    </View>
  )
}

export default Search
