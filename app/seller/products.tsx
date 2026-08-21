import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import useAuthStore from '@/store/auth.store'
import {
  getMenu,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  uploadImageToStorage,
} from '@/lib/appwrite'
import { images } from '@/constants'

export default function SellerProducts() {

  const router = useRouter()
  const { sellerStore } = useAuthStore()
  const sellerId = sellerStore?.$id || ''

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [discountPrice, setDiscountPrice] = useState('')
  const [stock, setStock] = useState('50')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)

  // Weight Variants List (kg / g)
  const [weightVariants, setWeightVariants] = useState<{ id: string; weight: string; price: number }[]>([])
  const [variantWeight, setVariantWeight] = useState('')
  const [variantPrice, setVariantPrice] = useState('')

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const [prods, cats] = await Promise.all([
        getMenu({ sellerId }),
        getCategories().catch(() => []),
      ])
      setProducts(prods)
      setCategories(cats)
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].name)
      }
    } catch (err) {
      console.error('Error fetching seller products:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [sellerId])

  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setDescription('')
    setPrice('')
    setDiscountPrice('')
    setStock('50')
    setImageUri(null)
    setWeightVariants([])
    setVariantWeight('')
    setVariantPrice('')
    if (categories.length > 0) setSelectedCategory(categories[0].name)
    setModalVisible(true)
  }

  const openEditModal = (prod: any) => {
    setEditingProduct(prod)
    setName(prod.name)
    setDescription(prod.description || '')
    setPrice(prod.price ? prod.price.toString() : '')
    setDiscountPrice(prod.discountPrice ? prod.discountPrice.toString() : '')
    setStock(prod.stock ? prod.stock.toString() : '50')
    setImageUri(prod.image_url || prod.imageUrl || prod.image || null)
    setSelectedCategory(prod.categories || prod.type || (categories[0]?.name || ''))

    try {
      const parsedWeightVars = prod.weightVariants ? JSON.parse(prod.weightVariants) : []
      setWeightVariants(parsedWeightVars)
    } catch {
      setWeightVariants([])
    }

    setModalVisible(true)
  }

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow gallery access to select product images.')
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
        finalImageUrl = await uploadImageToStorage(imageUri, 'prod')
      }

      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        stock: parseInt(stock) || 50,
        image_url: finalImageUrl,
        imageUrl: finalImageUrl,
        image: finalImageUrl,
        sellerId,
        categories: selectedCategory,
        categoryId: selectedCategory,
        weightVariants: weightVariants.length > 0 ? JSON.stringify(weightVariants) : undefined,
        isActive: true,
      }

      if (editingProduct) {
        await updateProduct(editingProduct.$id, payload)
        Alert.alert('Success', 'Product updated successfully!')
      } else {
        await createProduct(payload)
        Alert.alert('Success', 'Product added to inventory!')
      }

      setModalVisible(false)
      fetchInventory()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save product.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id: string, prodName: string) => {
    Alert.alert('Delete Product', `Delete "${prodName}" from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(id)
            fetchInventory()
          } catch (err: any) {
            Alert.alert('Error', err.message)
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-primary/10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 bg-white border border-primary/15 rounded-2xl shadow-sm active:opacity-70"
        >
          <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-lg font-quicksand-bold text-dark-100">
            Store Catalog
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            {sellerStore?.storeName || 'My Store'} Inventory
          </Text>
        </View>

        <TouchableOpacity
          onPress={openCreateModal}
          className="bg-primary px-3 py-2 rounded-2xl flex-row items-center shadow-md shadow-primary/30 active:opacity-80"
        >
          <Text className="text-white font-quicksand-bold text-xs">+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="p-5 pb-32"
          ListEmptyComponent={() => (
            <View className="items-center mt-20 px-8">
              <Text className="text-4xl mb-3">📦</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mb-1">
                Your Inventory is Empty
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-sm mb-5">
                Start listing your store products to sell on the marketplace!
              </Text>
              <TouchableOpacity
                onPress={openCreateModal}
                className="bg-primary px-6 py-3.5 rounded-2xl shadow-lg shadow-primary/30"
              >
                <Text className="text-white font-quicksand-bold text-sm">
                  + Add First Product
                </Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => {
            const hasWeightVars = item.weightVariants && JSON.parse(item.weightVariants).length > 0
            return (
              <View className="bg-white rounded-[28px] p-4 mb-4 flex-row items-center border border-primary/10 shadow-md">
                <Image
                  source={{ uri: item.image_url }}
                  className="w-20 h-20 rounded-2xl bg-gray-100 mr-4"
                  resizeMode="cover"
                />

                <View className="flex-1">
                  <Text className="text-base font-quicksand-bold text-dark-100 mb-0.5">
                    {item.name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-primary font-quicksand-bold text-sm">
                      ₦ {item.price}
                    </Text>
                    {item.discountPrice ? (
                      <Text className="text-gray-400 font-quicksand-medium text-xs line-through">
                        ₦ {item.discountPrice}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row flex-wrap gap-1.5 mt-1">
                    {item.categories ? (
                      <Text className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                        🏷️ {item.categories}
                      </Text>
                    ) : null}
                    {hasWeightVars && (
                      <Text className="text-[10px] bg-blue-500/10 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                        ⚖️ {JSON.parse(item.weightVariants).length} Weights
                      </Text>
                    )}
                  </View>
                </View>

                <View className="gap-2">
                  <TouchableOpacity
                    onPress={() => openEditModal(item)}
                    className="bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-full items-center"
                  >
                    <Text className="text-blue-700 font-quicksand-bold text-xs">Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteProduct(item.$id, item.name)}
                    className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full items-center"
                  >
                    <Text className="text-red-600 font-quicksand-bold text-xs">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Modal: Create / Edit Product */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss()
          setModalVisible(false)
        }}
      >
        <View className="flex-1 bg-black/60 justify-end">
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setModalVisible(false)
            }}
            className="flex-1"
          />
          <View className="bg-white rounded-t-[32px] p-6 max-h-[92%] shadow-2xl">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-quicksand-bold text-dark-100">
                {editingProduct ? 'Edit Inventory Item' : 'Add Product to Inventory'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Image Picker */}
              <TouchableOpacity
                onPress={handlePickImage}
                className="w-full h-36 bg-gray-50 border-2 border-dashed border-primary/30 rounded-2xl items-center justify-center overflow-hidden mb-4"
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="contain" />
                ) : (
                  <View className="items-center">
                    <Text className="text-3xl mb-1">📸</Text>
                    <Text className="text-primary font-quicksand-bold text-sm">
                      Select Product Image
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Assign Category */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1.5">
                Assign Product Category *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.name
                  return (
                    <TouchableOpacity
                      key={cat.$id || cat.name}
                      onPress={() => setSelectedCategory(cat.name)}
                      className={`px-3.5 py-2.5 rounded-2xl border-2 mr-2 flex-row items-center ${
                        isSelected ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Text className={`font-quicksand-bold text-xs ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                        🏷️ {cat.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Title */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Product Title *
              </Text>
              <TextInput
                placeholder="e.g. Fresh Yam Tuber / Basmati Rice"
                value={name}
                onChangeText={setName}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
              />

              {/* Description */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Description
              </Text>
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="Organic produce freshly harvested..."
                value={description}
                onChangeText={setDescription}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4 min-h-[80px]"
              />

              {/* Price & Stock Row */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                    Base Price (₦) *
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="1500"
                    value={price}
                    onChangeText={setPrice}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold"
                  />
                </View>

                <View className="flex-1">
                  <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                    Stock Quantity
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="50"
                    value={stock}
                    onChangeText={setStock}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold"
                  />
                </View>
              </View>

              {/* Weight & Size Variants Builder (kg / g) */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                ⚖️ Weight & Package Variants (Optional - e.g. 1kg, 2kg, 5kg)
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-[11px] mb-2.5">
                Set custom prices for each weight option (e.g. 1kg = ₦2,000, 5kg = ₦9,000).
              </Text>

              <View className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 mb-4">
                {/* Weight Presets */}
                <Text className="font-quicksand-semibold text-[10px] text-gray-400 mb-1.5 uppercase">
                  Quick Weight Presets:
                </Text>
                <View className="flex-row flex-wrap gap-1.5 mb-3">
                  {['500g', '1kg', '2kg', '5kg', '10kg', '25kg', '50kg'].map((w) => (
                    <TouchableOpacity
                      key={w}
                      onPress={() => setVariantWeight(w)}
                      className={`px-2.5 py-1 rounded-xl border ${
                        variantWeight === w ? 'bg-primary border-primary' : 'bg-white border-gray-300'
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
                    value={variantWeight}
                    onChangeText={setVariantWeight}
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-quicksand-semibold text-dark-100"
                  />
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Price (₦)"
                    value={variantPrice}
                    onChangeText={setVariantPrice}
                    className="w-28 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-quicksand-semibold text-dark-100"
                  />
                  <TouchableOpacity
                    onPress={addWeightVariant}
                    className="bg-primary px-3 rounded-xl items-center justify-center"
                  >
                    <Text className="text-white font-bold text-xs">+ Add Weight</Text>
                  </TouchableOpacity>
                </View>

                {weightVariants.map((wv) => (
                  <View key={wv.id} className="flex-row justify-between items-center py-2 border-t border-gray-200">
                    <View className="flex-row items-center">
                      <Text className="font-quicksand-bold text-xs text-primary mr-2">⚖️ {wv.weight}</Text>
                      <Text className="font-quicksand-semibold text-xs text-dark-100">— ₦{wv.price.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeWeightVariant(wv.id)}>
                      <Text className="text-red-500 font-bold text-xs">Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSaveProduct}
                disabled={submitting}
                className="bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/30 mt-2"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-quicksand-bold text-base">
                    {editingProduct ? 'Update Product' : 'Add to Inventory'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
