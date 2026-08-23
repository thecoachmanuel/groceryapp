import CartButton from '@/components/CartButton'
import Filter from '@/components/Filter'
import FloatingCartPill from '@/components/FloatingCartPill'
import MenuCard from '@/components/MenuCard'
import Searchbar from '@/components/SearchBar'
import { getCategories, getMenu } from '@/lib/appwrite'
import useAppwrite from '@/lib/useAppwrite'
import { MenuItem } from '@/type'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Keyboard, Platform, StatusBar, Text, TouchableWithoutFeedback, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const Search = () => {
  const insets = useSafeAreaInsets()

  const params = useLocalSearchParams<{
    query: string
    category: string
  }>()

  const [liveQuery, setLiveQuery] = useState(params.query || '')
  const [liveCategory, setLiveCategory] = useState(params.category || 'all')

  // Fetch full inventory to allow instant zero-latency filtering
  const { data: allProducts, refetch, loading } = useAppwrite({
    fn: getMenu,
    params: {},
  })
  const { data: categories, refetch: refetchCategories } = useAppwrite({ fn: getCategories })

  // Sync external params only when initial navigation happens
  useEffect(() => {
    if (params.query !== undefined && params.query !== liveQuery) {
      setLiveQuery(params.query)
    }
  }, [params.query])

  useEffect(() => {
    if (params.category !== undefined && params.category !== liveCategory) {
      setLiveCategory(params.category)
    }
  }, [params.category])

  useFocusEffect(
    useCallback(() => {
      refetch({})
      refetchCategories()
    }, [])
  )

  // Real-time live filtering for instant results as user types or picks category
  const filteredProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return []
    return (allProducts as unknown as MenuItem[]).filter((item: any) => {
      // 1. Category Matching (by categoryId, category name, or item attributes)
      const selCat = String(liveCategory || 'all').toLowerCase().trim()
      const itemCatId = String(item.categoryId || '').toLowerCase().trim()
      const itemCatName = String(item.categories || item.category_name || item.category || '').toLowerCase().trim()
      const itemType = String(item.type || '').toLowerCase().trim()
      const itemName = String(item.name || '').toLowerCase().trim()
      const itemDesc = String(item.description || '').toLowerCase().trim()

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

      // 2. Search Text Matching (by product name, description, category)
      const q = liveQuery.toLowerCase().trim()
      const matchesQuery =
        q === '' ||
        itemName.includes(q) ||
        itemDesc.includes(q) ||
        itemCatId.includes(q) ||
        itemCatName.includes(q)

      return matchesCategory && matchesQuery
    })
  }, [allProducts, liveCategory, liveQuery])

  // Fully responsive dynamic bottom boundary calculations based on device safe-area insets
  const tabBottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)
  const tabHeight = 70
  const cartPillBottomOffset = tabBottomOffset + tabHeight + 10
  const listPaddingBottom = tabHeight + 40

  return (
    <View className="flex-1 bg-white relative" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="light-content" backgroundColor="#53B175" />

      {/* ── Hard Clipped Content Viewport Bounded at Bottom Edge of Floating Navigation ── */}
      <View
        style={{ flex: 1, marginBottom: tabBottomOffset }}
        className="overflow-hidden"
      >
        {/* ── Fixed Stable Top Header & Search Area (Green background spans into Status Bar) ── */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="pb-3 bg-white" style={{ backgroundColor: '#ffffff' }}>
            {/* Header Banner with Grocery Branding — Spanning directly to status bar */}
            <SafeAreaView edges={['top']} className="bg-primary rounded-b-[40px] shadow-lg shadow-primary/30" style={{ backgroundColor: '#53B175' }}>
              <View className="px-6 pt-2 pb-12">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-4">
                    <Text className="text-white text-2xl font-quicksand-bold leading-tight">
                      Stock your kitchen with fresh picks
                    </Text>
                    <Text className="text-white/80 text-xs font-quicksand-medium mt-1">
                      Farm-fresh produce & daily essentials delivered fast
                    </Text>
                  </View>
                  <View className="bg-white rounded-2xl p-2 shadow-md shadow-black/20">
                    <CartButton />
                  </View>
                </View>
              </View>
            </SafeAreaView>

            {/* Live Search & Category Filter Controls */}
            <View className="px-5 -mt-7 gap-3">
              <View className="bg-white rounded-2xl p-1.5 shadow-lg shadow-black/5 border border-primary/10">
                <Searchbar
                  value={liveQuery}
                  onChangeText={(text) => setLiveQuery(text)}
                  placeholder="Search fresh groceries, fruits, milk..."
                />
              </View>

              <View className="bg-white rounded-2xl p-2 shadow-lg shadow-black/5 border border-primary/10">
                <Filter
                  categories={(categories || []) as unknown as any}
                  activeCategory={liveCategory}
                  onSelectCategory={(cat) => setLiveCategory(cat)}
                />
              </View>

              <View className="flex-row items-center justify-between mt-1 px-1">
                <View className="flex-row items-center">
                  <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" style={{ backgroundColor: '#53B175' }} />
                  <Text className="text-dark-100 text-base font-quicksand-bold">
                    Popular Grocery Picks
                  </Text>
                </View>
                <View className="bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20" style={{ backgroundColor: 'rgba(83, 177, 117, 0.1)', borderColor: 'rgba(83, 177, 117, 0.2)' }}>
                  <Text className="text-[10px] text-primary font-quicksand-bold" style={{ color: '#53B175' }}>
                    {filteredProducts.length} Items Available
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* ── Real-Time Simultaneous Filtered Product Grid ── */}
        <FlatList
          data={filteredProducts}
          renderItem={({ item }) => (
            <View className="flex-1 max-w-[48%] mb-4">
              <MenuCard item={item} />
            </View>
          )}
          keyExtractor={(item) => item.$id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: listPaddingBottom, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={() => (
            loading ? (
              <View className="items-center mt-10">
                <ActivityIndicator size="large" color="#53B175" />
              </View>
            ) : (
              <View className="items-center mt-8 px-10">
                <View className="bg-white border-2 border-primary/15 rounded-[36px] px-8 py-10 items-center shadow-lg shadow-black/5 w-full">
                  <View className="w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center mb-3 border border-primary/20">
                    <Text className="text-3xl">🥦</Text>
                  </View>
                  <Text className="text-dark-100 text-lg font-quicksand-bold">
                    No Groceries Found
                  </Text>
                  <Text className="text-gray-400 text-xs font-quicksand-medium mt-1.5 text-center leading-relaxed">
                    {liveQuery
                      ? `No groceries matching "${liveQuery}".`
                      : 'Try selecting another category or clearing your search filter.'}
                  </Text>
                </View>
              </View>
            )
          )}
        />
      </View>

      <FloatingCartPill bottomOffset={cartPillBottomOffset} />
    </View>
  )
}

export default Search
