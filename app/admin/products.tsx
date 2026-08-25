import FastImage from '@/components/FastImage'
import { images } from '@/constants'
import {
  appwriteConfig,
  createProduct,
  deleteProduct,
  deleteStorageFileByUrl,
  getCategories,
  getMenu,
  getStores,
  updateProduct,
  uploadImageToStorage,
} from '@/lib/appwrite'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

// Intelligent taxonomy mapping for auto-assigning product categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Vegetables': ['veg', 'vegetable', 'tomato', 'potato', 'onion', 'pepper', 'spinach', 'carrot', 'cabbage', 'lettuce', 'cucumber', 'garlic', 'ginger', 'yam', 'cassava', 'plantain', 'leaf', 'broccoli', 'mushroom', 'chili', 'peppers'],
  'Fruits': ['fruit', 'apple', 'banana', 'orange', 'berry', 'strawberry', 'mango', 'watermelon', 'pineapple', 'grape', 'lemon', 'lime', 'avocado', 'papaya', 'guava', 'pear', 'citrus'],
  'Dairy & Eggs': ['milk', 'dairy', 'egg', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'mayo', 'mayonnaise'],
  'Meat & Poultry': ['meat', 'chicken', 'beef', 'fish', 'pork', 'turkey', 'sausage', 'bacon', 'prawn', 'shrimp', 'salmon', 'goat', 'lamb', 'mutton', 'steak', 'suya'],
  'Bakery & Bread': ['bread', 'bakery', 'cake', 'cookie', 'biscuit', 'croissant', 'donut', 'doughnut', 'toast', 'pie', 'pastry', 'bun', 'muffin', 'loaf'],
  'Grains & Pasta': ['rice', 'pasta', 'spaghetti', 'noodle', 'macaroni', 'flour', 'grain', 'oat', 'cereal', 'wheat', 'beans', 'couscous', 'garri', 'semovita', 'poundo', 'corn', 'indomie'],
  'Drinks & Beverages': ['drink', 'beverage', 'juice', 'water', 'soda', 'coke', 'cola', 'tea', 'coffee', 'wine', 'beer', 'malt', 'energy', 'pepsi', 'fanta', 'sprite'],
  'Oils & Spices': ['oil', 'spice', 'seasoning', 'salt', 'maggi', 'curry', 'thyme', 'vinegar', 'sauce', 'ketchup', 'olive', 'palm oil', 'groundnut oil', 'vegetable oil'],
  'Snacks & Sweets': ['snack', 'sweet', 'candy', 'chocolate', 'chips', 'crisps', 'popcorn', 'peanut', 'cashew', 'nuts', 'biscuit'],
  'Household': ['soap', 'detergent', 'clean', 'tissue', 'bleach', 'wash', 'sponge', 'household', 'toilet', 'paper', 'toothpaste'],
}

// Function to classify a product based on its name and description
function classifyProduct(name: string, description: string = '', availableCategories: any[] = []): string {
  const text = `${name} ${description}`.toLowerCase()

  // 1. Direct match with existing category names
  for (const cat of availableCategories) {
    if (text.includes(cat.name.toLowerCase())) {
      return cat.name
    }
  }

  // 2. Keyword heuristic mapping
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        // Try to match with existing category that contains this name
        const match = availableCategories.find(
          (c) => c.name.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(c.name.toLowerCase())
        )
        return match ? match.name : (availableCategories[0]?.name || catName)
      }
    }
  }

  // 3. Fallback
  return availableCategories[0]?.name || 'Groceries'
}

export default function AdminProducts() {
  const router = useRouter()

  const [products, setProducts] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('all')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')

  // Modals
  const [modalVisible, setModalVisible] = useState(false)
  const [inspectModalVisible, setInspectModalVisible] = useState(false)
  const [inspectingProduct, setInspectingProduct] = useState<any>(null)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [discountPrice, setDiscountPrice] = useState('')
  const [stock, setStock] = useState('50')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSeller, setSelectedSeller] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)

  // Extras Form List
  const [extras, setExtras] = useState<{ id: string; name: string; price: number }[]>([])
  const [extraName, setExtraName] = useState('')
  const [extraPrice, setExtraPrice] = useState('')

  // Weight Variants List (kg / g)
  const [weightVariants, setWeightVariants] = useState<{ id: string; weight: string; price: number }[]>([])
  const [variantWeight, setVariantWeight] = useState('')
  const [variantPrice, setVariantPrice] = useState('')

  const fetchAdminInventory = async () => {
    try {
      setLoading(true)
      const [prods, storeList, catList] = await Promise.all([
        getMenu({ sellerId: selectedStoreFilter === 'all' ? undefined : selectedStoreFilter }),
        getStores().catch(() => []),
        getCategories().catch(() => []),
      ])

      // Auto-assign missing categories in memory and trigger background persistence
      let needsPersisting = false
      const updatedProds = prods.map((p: any) => {
        if (!p.categories || p.categories.trim() === '' || p.categories === 'all') {
          const assigned = classifyProduct(p.name, p.description, catList)
          needsPersisting = true
          // Background sync to database
          updateProduct(p.$id, { categories: assigned, categoryId: assigned }).catch(() => { })
          return { ...p, categories: assigned, categoryId: assigned }
        }
        return p
      })

      setProducts(updatedProds)
      setStores(storeList)
      setCategories(catList)
    } catch (err) {
      console.error('Error loading admin inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminInventory()
  }, [selectedStoreFilter])

  // Helper to guarantee valid Appwrite authenticated image URL with project query param
  const resolveProductImageUrl = (url?: string) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return images.logo
    }
    let formatted = url.trim()
    if (formatted.startsWith('http') && !formatted.includes('project=')) {
      formatted = `${formatted}${formatted.includes('?') ? '&' : '?'}project=${appwriteConfig.projectId}`
    }
    return formatted
  }

  // Filtered products based on search query & category filter
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categories?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCat =
        selectedCategoryFilter === 'all' ||
        p.categories?.toLowerCase() === selectedCategoryFilter.toLowerCase()

      return matchesSearch && matchesCat
    })
  }, [products, searchQuery, selectedCategoryFilter])

  // --- CRUD: CREATE ---
  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setDescription('')
    setPrice('')
    setDiscountPrice('')
    setStock('50')
    setImageUri(null)
    setExtras([])
    setWeightVariants([])
    setVariantWeight('')
    setVariantPrice('')
    setSelectedCategory(categories[0]?.name || 'Groceries')
    setSelectedSeller(stores[0]?.$id || '')
    setModalVisible(true)
  }

  // --- CRUD: READ / INSPECT ---
  const openInspectModal = (prod: any) => {
    setInspectingProduct(prod)
    setInspectModalVisible(true)
  }

  // --- CRUD: UPDATE ---
  const openEditModal = (prod: any) => {
    setEditingProduct(prod)
    setName(prod.name || '')
    setDescription(prod.description || '')
    setPrice(prod.price ? prod.price.toString() : '')
    setDiscountPrice(prod.discountPrice ? prod.discountPrice.toString() : '')
    setStock(prod.stock ? prod.stock.toString() : '50')
    setImageUri(prod.image_url || prod.imageUrl || prod.image || null)
    setSelectedCategory(prod.categories || prod.type || (categories[0]?.name || 'Groceries'))
    setSelectedSeller(prod.sellerId || stores[0]?.$id || '')

    try {
      const parsedExtras = prod.extras ? JSON.parse(prod.extras) : []
      setExtras(parsedExtras)
    } catch {
      setExtras([])
    }

    try {
      const parsedWeightVars = prod.weightVariants ? JSON.parse(prod.weightVariants) : []
      setWeightVariants(parsedWeightVars)
    } catch {
      setWeightVariants([])
    }

    setModalVisible(true)
  }

  // --- CRUD: QUICK UPDATE (Toggle Active / Inactive) ---
  const handleToggleProductStatus = async (prod: any) => {
    try {
      const newStatus = !(prod.isActive !== false)
      await updateProduct(prod.$id, { isActive: newStatus })
      setProducts((prev) =>
        prev.map((p) => (p.$id === prod.$id ? { ...p, isActive: newStatus } : p))
      )
    } catch (err: any) {
      Alert.alert('Status Error', err.message || 'Could not update product status.')
    }
  }

  // --- CRUD: QUICK STOCK ADJUSTMENT ---
  const handleQuickStockAdjust = async (prod: any, delta: number) => {
    try {
      const currentStock = typeof prod.stock === 'number' ? prod.stock : 50
      const newStock = Math.max(0, currentStock + delta)
      await updateProduct(prod.$id, { stock: newStock })
      setProducts((prev) =>
        prev.map((p) => (p.$id === prod.$id ? { ...p, stock: newStock } : p))
      )
    } catch (err: any) {
      Alert.alert('Stock Error', err.message || 'Could not adjust stock.')
    }
  }

  // --- CRUD: QUICK CHANGE CATEGORY DIRECTLY ON CARD ---
  const handleQuickChangeCategory = async (prod: any, targetCategory: string) => {
    try {
      await updateProduct(prod.$id, {
        categories: targetCategory,
        categoryId: targetCategory,
      })
      setProducts((prev) =>
        prev.map((p) =>
          p.$id === prod.$id ? { ...p, categories: targetCategory, categoryId: targetCategory } : p
        )
      )
    } catch (err: any) {
      Alert.alert('Update Error', err.message || 'Could not update category.')
    }
  }

  // --- CRUD: DELETE ---
  const handleDeleteProduct = async (id: string, prodName: string, imageUrl?: string) => {
    Alert.alert(
      'Permanent Database Wipe',
      `Are you sure you want to permanently delete "${prodName}"? It will be completely wiped from the database and storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(id, imageUrl)
              setProducts((prev) => prev.filter((p) => p.$id !== id))
              Alert.alert('Completely Wiped ✅', `"${prodName}" has been permanently deleted from the database.`)
              fetchAdminInventory()
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete product.')
            }
          },
        },
      ]
    )
  }

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please grant library permissions to pick image.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Image picker failed.')
    }
  }

  const addExtraItem = () => {
    if (!extraName.trim() || !extraPrice.trim()) {
      return Alert.alert('Validation Error', 'Enter both name and price for extra.')
    }
    const newExtra = {
      id: `ext_${Date.now()}`,
      name: extraName.trim(),
      price: parseFloat(extraPrice) || 0,
    }
    setExtras((prev) => [...prev, newExtra])
    setExtraName('')
    setExtraPrice('')
  }

  const removeExtraItem = (id: string) => {
    setExtras((prev) => prev.filter((e) => e.id !== id))
  }

  const addWeightVariant = () => {
    if (!variantWeight.trim() || !variantPrice.trim()) {
      return Alert.alert('Validation Error', 'Enter weight (e.g. 1kg) and variant price.')
    }
    const newVariant = {
      id: `wv_${Date.now()}`,
      weight: variantWeight.trim(),
      price: parseFloat(variantPrice) || 0,
    }
    setWeightVariants((prev) => [...prev, newVariant])
    setVariantWeight('')
    setVariantPrice('')
  }

  const removeWeightVariant = (id: string) => {
    setWeightVariants((prev) => prev.filter((v) => v.id !== id))
  }

  const handleSaveProduct = async () => {
    if (!name.trim() || !price.trim()) {
      return Alert.alert('Validation Error', 'Please enter product name and price.')
    }

    try {
      setSubmitting(true)
      let finalImageUrl = imageUri || 'https://cloud.appwrite.io/v1/storage/buckets/placeholder/files/view'

      if (imageUri && !imageUri.startsWith('http')) {
        if (editingProduct?.image_url || editingProduct?.imageUrl) {
          await deleteStorageFileByUrl(editingProduct.image_url || editingProduct.imageUrl)
        }
        finalImageUrl = await uploadImageToStorage(imageUri, 'prod')
      }

      const assignedCat = selectedCategory || classifyProduct(name, description, categories)

      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        stock: parseInt(stock) || 50,
        image_url: finalImageUrl,
        imageUrl: finalImageUrl,
        image: finalImageUrl,
        sellerId: selectedSeller || undefined,
        categories: assignedCat,
        categoryId: assignedCat,
        extras: extras.length > 0 ? JSON.stringify(extras) : undefined,
        weightVariants: weightVariants.length > 0 ? JSON.stringify(weightVariants) : undefined,
        isActive: true,
      }

      if (editingProduct) {
        await updateProduct(editingProduct.$id, payload)
        Alert.alert('Success ✅', `"${name}" updated successfully!`)
      } else {
        await createProduct(payload)
        Alert.alert('Success ✅', `New product "${name}" created!`)
      }

      setModalVisible(false)
      fetchAdminInventory()
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save product.')
    } finally {
      setSubmitting(false)
    }
  }

  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom || 0, 16)

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>
          {/* Top Header */}
          <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-white border-b-2 border-primary/10">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2.5 bg-white rounded-2xl items-center justify-center border-2 border-primary/10 shadow-sm active:opacity-70"
            >
              <FastImage source={images.arrowBack} className="w-5 h-5" contentFit="contain" />
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-lg font-quicksand-bold text-dark-100">
                Global Products Manager
              </Text>
              <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
                {filteredProducts.length} Products Active
              </Text>
            </View>

            <TouchableOpacity
              onPress={openCreateModal}
              className="bg-primary px-3.5 py-2 rounded-2xl flex-row items-center shadow-md shadow-primary/30 active:opacity-80 border-2 border-primary"
              style={{ backgroundColor: '#53B175', borderColor: '#53B175' }}
            >
              <Text className="text-white font-quicksand-bold text-xs">+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {/* Live Search & Filter Rectangle Card */}
          <View className="p-4 bg-white border-b-2 border-primary/10">
            <View className="flex-row items-center bg-gray-50/80 border-2 border-primary/10 rounded-2xl px-3.5 py-2 mb-3">
              <Text className="text-base mr-2">🔍</Text>
              <TextInput
                placeholder="Search products by title, category, description..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 font-quicksand-semibold text-xs text-dark-100"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                  <Text className="text-gray-400 font-bold text-xs">✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Store Filter Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              <TouchableOpacity
                onPress={() => setSelectedStoreFilter('all')}
                className={`px-3.5 py-1.5 rounded-2xl mr-2 border-2 ${selectedStoreFilter === 'all'
                    ? 'bg-primary border-primary'
                    : 'bg-gray-50/70 border-primary/10'
                  }`}
              >
                <Text
                  className={`font-quicksand-bold text-xs ${selectedStoreFilter === 'all' ? 'text-white' : 'text-gray-700'
                    }`}
                >
                  🏪 All Stores
                </Text>
              </TouchableOpacity>

              {stores.map((st) => (
                <TouchableOpacity
                  key={st.$id}
                  onPress={() => setSelectedStoreFilter(st.$id)}
                  className={`px-3.5 py-1.5 rounded-2xl mr-2 border-2 ${selectedStoreFilter === st.$id
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50/70 border-primary/10'
                    }`}
                >
                  <Text
                    className={`font-quicksand-bold text-xs ${selectedStoreFilter === st.$id ? 'text-white' : 'text-gray-700'
                      }`}
                  >
                    {st.storeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Category Quick Chips */}
            {categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  onPress={() => setSelectedCategoryFilter('all')}
                  className={`px-3 py-1 rounded-xl mr-2 border-2 ${selectedCategoryFilter === 'all'
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50/70 border-primary/10'
                    }`}
                >
                  <Text
                    className={`font-quicksand-bold text-[11px] ${selectedCategoryFilter === 'all' ? 'text-white' : 'text-gray-600'
                      }`}
                  >
                    All Categories
                  </Text>
                </TouchableOpacity>

                {categories.map((cat) => {
                  const isSelected = selectedCategoryFilter.toLowerCase() === cat.name.toLowerCase()
                  return (
                    <TouchableOpacity
                      key={cat.$id || cat.name}
                      onPress={() => setSelectedCategoryFilter(cat.name)}
                      className={`px-3 py-1 rounded-xl mr-2 border-2 ${isSelected
                          ? 'bg-primary border-primary'
                          : 'bg-gray-50/70 border-primary/10'
                        }`}
                    >
                      <Text
                        className={`font-quicksand-bold text-[11px] ${isSelected ? 'text-white' : 'text-gray-700'
                          }`}
                      >
                        🏷️ {cat.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Product List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="p-5"
          contentContainerStyle={{ paddingBottom: bottomInset + 32 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={() => (
            <View className="items-center mt-16 px-8">
              <View className="w-20 h-20 bg-primary/10 rounded-[28px] items-center justify-center mb-4 border-2 border-primary/20">
                <Text className="text-3xl">🥦</Text>
              </View>
              <Text className="text-xl font-quicksand-bold text-dark-100 mb-1">
                No Products Found
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-xs mb-5 leading-relaxed">
                {searchQuery
                  ? `No products matching "${searchQuery}".`
                  : 'No products in the selected store or category filter.'}
              </Text>
              <TouchableOpacity
                onPress={openCreateModal}
                className="bg-primary px-6 py-3 rounded-2xl shadow-md shadow-primary/30 border-2 border-primary"
              >
                <Text className="text-white font-quicksand-bold text-xs">+ Add First Product</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => {
            const hasExtras = item.extras && JSON.parse(item.extras).length > 0
            const hasWeightVars = item.weightVariants && JSON.parse(item.weightVariants).length > 0
            const resolvedImg = resolveProductImageUrl(item.image_url)
            const stockNum = typeof item.stock === 'number' ? item.stock : 50
            const sellerStoreName = stores.find((s) => s.$id === item.sellerId)?.storeName
            const isActive = item.isActive !== false

            return (
              /* Rectangle Card synced with Order Details Page Style */
              <View className="bg-white rounded-none p-5 mb-5 border-2 border-primary/10 shadow-lg shadow-black/5">
                {/* Header Section: Status Indicator & Category Badge */}
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <View className={`w-2.5 h-2.5 rounded-full mr-2 ${isActive ? 'bg-primary' : 'bg-gray-400'}`} />
                    <Text className="text-dark-100 text-sm font-quicksand-bold">
                      {isActive ? 'Active Catalog Item' : 'Paused / Hidden'}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    {item.categories ? (
                      <View className="bg-primary/10 border-2 border-primary/20 px-2.5 py-0.5 rounded-xl">
                        <Text className="text-[10px] text-primary font-quicksand-bold">
                          🏷️ {item.categories}
                        </Text>
                      </View>
                    ) : null}

                    {sellerStoreName ? (
                      <View className="bg-gray-100 border-2 border-gray-200 px-2.5 py-0.5 rounded-xl">
                        <Text className="text-[10px] text-gray-600 font-quicksand-semibold">
                          🏪 {sellerStoreName}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Divider Line */}
                <View className="h-px bg-primary/10 mb-4" />

                {/* Main Product Info Rectangle */}
                <View className="flex-row items-center mb-4">
                  {/* High-Resolution Guaranteed Product Image */}
                  <View className="w-24 h-24 rounded-none overflow-hidden bg-primary/5 mr-4 border-2 border-primary/15 items-center justify-center">
                    <FastImage
                      source={resolvedImg}
                      className="w-full h-full"
                      contentFit="cover"
                    />
                  </View>

                  <View className="flex-1 pr-1">
                    <Text className="text-base font-quicksand-bold text-dark-100 leading-tight mb-1" numberOfLines={2}>
                      {item.name}
                    </Text>

                    {item.description ? (
                      <Text className="text-gray-400 font-quicksand-medium text-xs mb-2" numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View className="flex-row items-center justify-between">
                      <Text className="text-primary font-quicksand-bold text-lg">
                        ₦ {Number(item.price || 0).toLocaleString()}
                      </Text>

                      <View
                        className={`px-2.5 py-1 rounded-xl border-2 ${stockNum > 10
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-amber-500/10 border-amber-500/20'
                          }`}
                      >
                        <Text
                          className={`text-[11px] font-quicksand-bold ${stockNum > 10 ? 'text-green-700' : 'text-amber-700'
                            }`}
                        >
                          {stockNum > 10 ? `🟢 ${stockNum} in stock` : `🟠 Low: ${stockNum}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Weight & Extras Specification Rectangle Box */}
                {(hasWeightVars || hasExtras) && (
                  <View className="bg-gray-50/70 rounded-2xl p-3 mb-4 border-2 border-primary/10 gap-1.5">
                    {hasWeightVars && (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-quicksand-bold text-blue-700">
                          ⚖️ Weight Variants ({JSON.parse(item.weightVariants).length}):
                        </Text>
                        <Text className="text-[11px] font-quicksand-semibold text-gray-600">
                          {JSON.parse(item.weightVariants).map((w: any) => `${w.weight}: ₦${w.price.toLocaleString()}`).join(' • ')}
                        </Text>
                      </View>
                    )}
                    {hasExtras && (
                      <View className="flex-row items-center justify-between pt-1 border-t border-primary/10">
                        <Text className="text-xs font-quicksand-bold text-purple-700">
                          ✨ Extras Add-ons ({JSON.parse(item.extras).length}):
                        </Text>
                        <Text className="text-[11px] font-quicksand-semibold text-gray-600">
                          {JSON.parse(item.extras).map((e: any) => `${e.name} (+₦${e.price})`).join(' • ')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Quick Stock & Category Management Strip */}
                <View className="bg-primary/5 rounded-2xl p-2.5 mb-4 border-2 border-primary/10 flex-row justify-between items-center">
                  <Text className="text-xs font-quicksand-bold text-dark-100">
                    📦 Quick Stock: <Text className="text-primary">{stockNum} units</Text>
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleQuickStockAdjust(item, -10)}
                      className="bg-white border-2 border-primary/20 px-2.5 py-1 rounded-xl active:bg-gray-100"
                    >
                      <Text className="text-dark-100 font-quicksand-bold text-xs">-10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickStockAdjust(item, 10)}
                      className="bg-primary border-2 border-primary px-2.5 py-1 rounded-xl active:opacity-80"
                    >
                      <Text className="text-white font-quicksand-bold text-xs">+10</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Divider Line */}
                <View className="h-px bg-primary/10 mb-3" />

                {/* Full CRUD Actions Button Strip */}
                <View className="flex-row justify-between items-center">
                  <TouchableOpacity
                    onPress={() => handleToggleProductStatus(item)}
                    className={`px-3 py-2 rounded-2xl border-2 ${isActive
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-green-500/10 border-green-500/20'
                      }`}
                  >
                    <Text className={`font-quicksand-bold text-xs ${isActive ? 'text-amber-700' : 'text-green-700'}`}>
                      {isActive ? '⏸️ Pause' : '▶️ Activate'}
                    </Text>
                  </TouchableOpacity>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => openInspectModal(item)}
                      className="bg-gray-100 border-2 border-gray-200 px-3 py-2 rounded-2xl active:opacity-80"
                    >
                      <Text className="text-dark-100 font-quicksand-bold text-xs">Inspect 🔍</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      className="bg-blue-500/10 border-2 border-blue-500/30 px-3.5 py-2 rounded-2xl active:opacity-80"
                    >
                      <Text className="text-blue-700 font-quicksand-bold text-xs">Edit ✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteProduct(item.$id, item.name, item.image_url || item.imageUrl || item.image)}
                      className="bg-red-500/10 border-2 border-red-500/30 px-3.5 py-2 rounded-2xl active:opacity-80"
                    >
                      <Text className="text-red-600 font-quicksand-bold text-xs">Delete 🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* --- CRUD: INSPECT MODAL (Rectangle & Line Design) --- */}
      <Modal
        visible={inspectModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss()
          setInspectModalVisible(false)
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setInspectModalVisible(false)
            }}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-[36px] p-6 w-full max-w-sm border-2 border-primary/20 shadow-2xl z-10">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
                <Text className="text-lg font-quicksand-bold text-dark-100">Product Details</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setInspectModalVisible(false)
                }}
                className="px-3 py-1 bg-primary/10 border-2 border-primary/20 rounded-xl"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <View className="h-px bg-primary/10 mb-4" />

            {inspectingProduct && (
              <ScrollView showsVerticalScrollIndicator={false} className="max-h-[400px]">
                <View className="w-full h-40 rounded-2xl overflow-hidden bg-primary/5 mb-4 border-2 border-primary/15">
                  <FastImage
                    source={resolveProductImageUrl(inspectingProduct.image_url)}
                    className="w-full h-full"
                    contentFit="contain"
                  />
                </View>

                <View className="bg-gray-50/70 rounded-2xl p-4 mb-3 border-2 border-primary/10 gap-2">
                  <Text className="text-base font-quicksand-bold text-dark-100">
                    {inspectingProduct.name}
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-gray-500 leading-relaxed">
                    {inspectingProduct.description || 'No description provided.'}
                  </Text>
                  <View className="h-px bg-primary/10 my-1" />
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-quicksand-bold text-gray-500">Base Price:</Text>
                    <Text className="text-sm font-quicksand-bold text-primary">₦{Number(inspectingProduct.price || 0).toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-quicksand-bold text-gray-500">Available Stock:</Text>
                    <Text className="text-xs font-quicksand-bold text-dark-100">{inspectingProduct.stock || 50} units</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-quicksand-bold text-gray-500">Category:</Text>
                    <Text className="text-xs font-quicksand-bold text-primary">{inspectingProduct.categories || 'General'}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-quicksand-bold text-gray-500">Store ID:</Text>
                    <Text className="text-xs font-quicksand-bold text-dark-100">{inspectingProduct.sellerId || 'Platform Main'}</Text>
                  </View>
                </View>

                <View className="flex-row gap-3 mt-2">
                  <TouchableOpacity
                    onPress={() => {
                      setInspectModalVisible(false)
                      openEditModal(inspectingProduct)
                    }}
                    className="flex-1 bg-blue-500 py-3 rounded-2xl items-center shadow-md shadow-blue-500/20"
                  >
                    <Text className="text-white font-quicksand-bold text-xs">Edit Product ✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setInspectModalVisible(false)
                      handleDeleteProduct(
                        inspectingProduct.$id,
                        inspectingProduct.name,
                        inspectingProduct.image_url || inspectingProduct.imageUrl || inspectingProduct.image
                      )
                    }}
                    className="flex-1 bg-red-500/10 border-2 border-red-500/20 py-3 rounded-2xl items-center"
                  >
                    <Text className="text-red-600 font-quicksand-bold text-xs">Delete 🗑️</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* --- CRUD: CREATE & UPDATE MODAL (Rectangle & Line Design) --- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss()
          setModalVisible(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-black/60 justify-end"
        >
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setModalVisible(false)
            }}
            className="flex-1"
          />

          <View className="bg-white rounded-t-[36px] p-6 max-h-[92%] shadow-2xl border-t-2 border-primary/20">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
                <View>
                  <Text className="text-xl font-quicksand-bold text-dark-100">
                    {editingProduct ? 'Edit Platform Product' : 'Add Platform Product'}
                  </Text>
                  <Text className="text-[11px] text-primary font-quicksand-semibold">
                    Global Catalog CRUD Manager
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setModalVisible(false)
                }}
                className="px-3.5 py-1.5 bg-primary/10 border-2 border-primary/20 rounded-2xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <View className="h-px bg-primary/10 mb-4" />

            <ScrollView
              contentContainerStyle={{ paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Product Image Section */}
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                <Text className="text-dark-100 text-xs font-quicksand-bold uppercase">1. Product Image</Text>
              </View>
              <TouchableOpacity
                onPress={handlePickImage}
                className="w-full h-40 bg-gray-50/80 border-2 border-dashed border-primary/30 rounded-2xl items-center justify-center overflow-hidden mb-5 relative"
              >
                {imageUri ? (
                  <View className="w-full h-full relative items-center justify-center bg-gray-50">
                    <FastImage
                      source={resolveProductImageUrl(imageUri)}
                      className="w-full h-full"
                      contentFit="contain"
                    />
                    <View className="absolute bottom-2 right-2 bg-black/60 px-3 py-1.5 rounded-xl border border-white/20">
                      <Text className="text-white font-quicksand-bold text-[10px]">Change Photo 📸</Text>
                    </View>
                  </View>
                ) : (
                  <View className="items-center">
                    <Text className="text-3xl mb-1">📸</Text>
                    <Text className="text-primary font-quicksand-bold text-sm">
                      Select Product Image
                    </Text>
                    <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                      Tap to choose high quality photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Category Assignment Section */}
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                <Text className="text-dark-100 text-xs font-quicksand-bold uppercase">2. Assign Category</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.name
                  return (
                    <TouchableOpacity
                      key={cat.$id || cat.name}
                      onPress={() => setSelectedCategory(cat.name)}
                      className={`px-3.5 py-2.5 rounded-2xl border-2 mr-2 flex-row items-center ${isSelected ? 'bg-primary border-primary' : 'bg-gray-50/80 border-primary/15'
                        }`}
                    >
                      <Text className={`font-quicksand-bold text-xs ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                        🏷️ {cat.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Store Assignment Section */}
              {stores.length > 0 && (
                <>
                  <View className="flex-row items-center mb-2">
                    <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                    <Text className="text-dark-100 text-xs font-quicksand-bold uppercase">3. Assign Seller Store</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                    {stores.map((st) => {
                      const isSelected = selectedSeller === st.$id
                      return (
                        <TouchableOpacity
                          key={st.$id}
                          onPress={() => setSelectedSeller(st.$id)}
                          className={`px-3.5 py-2 rounded-2xl border-2 mr-2 ${isSelected ? 'bg-primary border-primary' : 'bg-gray-50/80 border-primary/15'
                            }`}
                        >
                          <Text className={`font-quicksand-bold text-xs ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                            🏪 {st.storeName}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </>
              )}

              {/* Title & Description Section */}
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                <Text className="text-dark-100 text-xs font-quicksand-bold uppercase">4. Basic Information</Text>
              </View>

              <Text className="font-quicksand-bold text-xs text-gray-500 mb-1">Product Title *</Text>
              <TextInput
                placeholder="e.g. Organic Basmati Rice"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                className="w-full bg-gray-50/80 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-semibold mb-3 text-dark-100 text-sm"
              />

              <Text className="font-quicksand-bold text-xs text-gray-500 mb-1">Description</Text>
              <TextInput
                placeholder="Product description and details..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
                className="w-full bg-gray-50/80 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-semibold mb-4 text-dark-100 text-sm"
              />

              <View className="flex-row gap-3 mb-5">
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-xs text-gray-500 mb-1">Base Price (₦) *</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="1500"
                    placeholderTextColor="#9CA3AF"
                    value={price}
                    onChangeText={setPrice}
                    className="w-full bg-gray-50/80 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-bold text-dark-100 text-sm"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-xs text-red-500 mb-1">Sale Price (₦)</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="e.g. 1200"
                    placeholderTextColor="#9CA3AF"
                    value={discountPrice}
                    onChangeText={setDiscountPrice}
                    className="w-full bg-gray-50/80 border-2 border-red-500/20 rounded-2xl px-4 py-3 font-quicksand-bold text-red-600 text-sm"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-xs text-gray-500 mb-1">Stock</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="50"
                    placeholderTextColor="#9CA3AF"
                    value={stock}
                    onChangeText={setStock}
                    className="w-full bg-gray-50/80 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-bold text-dark-100 text-sm"
                  />
                </View>
              </View>

              {/* Weight & Size Variants Builder (kg / g) */}
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                <Text className="text-dark-100 text-xs font-quicksand-bold uppercase">5. Weight & Package Variants (Optional)</Text>
              </View>

              <View className="bg-gray-50/70 rounded-2xl p-4 border-2 border-primary/10 mb-5">
                <Text className="font-quicksand-semibold text-[10px] text-gray-400 mb-1.5 uppercase">
                  Quick Weight Presets:
                </Text>
                <View className="flex-row flex-wrap gap-1.5 mb-3">
                  {['500g', '1kg', '2kg', '5kg', '10kg', '25kg', '50kg'].map((w) => (
                    <TouchableOpacity
                      key={w}
                      onPress={() => setVariantWeight(w)}
                      className={`px-3 py-1.5 rounded-xl border-2 ${variantWeight === w ? 'bg-primary border-primary' : 'bg-white border-primary/15'
                        }`}
                    >
                      <Text className={`font-quicksand-bold text-[11px] ${variantWeight === w ? 'text-white' : 'text-gray-700'}`}>
                        {w}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="flex-row gap-2 mb-3">
                  <TextInput
                    placeholder="Weight (e.g. 1kg)"
                    placeholderTextColor="#9CA3AF"
                    value={variantWeight}
                    onChangeText={setVariantWeight}
                    className="flex-1 bg-white border-2 border-primary/15 rounded-xl px-3 py-2 text-xs font-quicksand-semibold text-dark-100"
                  />
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Price (₦)"
                    placeholderTextColor="#9CA3AF"
                    value={variantPrice}
                    onChangeText={setVariantPrice}
                    className="w-28 bg-white border-2 border-primary/15 rounded-xl px-3 py-2 text-xs font-quicksand-semibold text-dark-100"
                  />
                  <TouchableOpacity
                    onPress={addWeightVariant}
                    className="bg-primary px-3 rounded-xl items-center justify-center border-2 border-primary"
                  >
                    <Text className="text-white font-bold text-xs">+ Add</Text>
                  </TouchableOpacity>
                </View>

                {weightVariants.map((wv) => (
                  <View key={wv.id} className="flex-row justify-between items-center py-2 border-t-2 border-primary/10">
                    <View className="flex-row items-center">
                      <Text className="font-quicksand-bold text-xs text-primary mr-2">⚖️ {wv.weight}</Text>
                      <Text className="font-quicksand-semibold text-xs text-dark-100">— ₦{wv.price.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeWeightVariant(wv.id)}>
                      <Text className="text-red-500 font-bold text-xs">Remove ✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Extras & Add-ons Builder */}
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                <Text className="text-dark-100 text-xs font-quicksand-bold uppercase">6. Extras & Add-ons (Optional)</Text>
              </View>
              <View className="bg-gray-50/70 rounded-2xl p-4 border-2 border-primary/10 mb-5">
                <View className="flex-row gap-2 mb-2">
                  <TextInput
                    placeholder="Extra Item Name (e.g. Extra Sauce)"
                    placeholderTextColor="#9CA3AF"
                    value={extraName}
                    onChangeText={setExtraName}
                    className="flex-1 bg-white border-2 border-primary/15 rounded-xl px-3 py-2 text-xs font-quicksand-semibold text-dark-100"
                  />
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Price (₦)"
                    placeholderTextColor="#9CA3AF"
                    value={extraPrice}
                    onChangeText={setExtraPrice}
                    className="w-24 bg-white border-2 border-primary/15 rounded-xl px-3 py-2 text-xs font-quicksand-semibold text-dark-100"
                  />
                  <TouchableOpacity
                    onPress={addExtraItem}
                    className="bg-primary px-3 rounded-xl items-center justify-center border-2 border-primary"
                  >
                    <Text className="text-white font-bold text-xs">+ Add</Text>
                  </TouchableOpacity>
                </View>

                {extras.map((ex) => (
                  <View key={ex.id} className="flex-row justify-between items-center py-2 border-t-2 border-primary/10">
                    <Text className="font-quicksand-semibold text-xs text-dark-100">
                      • {ex.name} (+ ₦{ex.price})
                    </Text>
                    <TouchableOpacity onPress={() => removeExtraItem(ex.id)}>
                      <Text className="text-red-500 font-bold text-xs">Remove ✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSaveProduct}
                disabled={submitting}
                className="bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/30 mt-2 border-2 border-primary"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-quicksand-bold text-base">
                    {editingProduct ? 'Save Product Changes' : 'Create Product Now'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}
