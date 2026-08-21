import React, { useEffect, useState, useMemo } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import {
  appwriteConfig,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadImageToStorage,
} from '@/lib/appwrite'
import { images } from '@/constants'
import FastImage from '@/components/FastImage'

// Quick Category Presets for instant setup
const CATEGORY_PRESETS = [
  { name: 'Fresh Vegetables', slug: 'vegetables', icon: '🥦' },
  { name: 'Fresh Fruits', slug: 'fruits', icon: '🍎' },
  { name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: '🥛' },
  { name: 'Meat & Poultry', slug: 'meat-poultry', icon: '🍗' },
  { name: 'Bakery & Bread', slug: 'bakery', icon: '🍞' },
  { name: 'Drinks & Beverages', slug: 'beverages', icon: '🧃' },
  { name: 'Rice, Grains & Pasta', slug: 'grains-pasta', icon: '🍚' },
  { name: 'Oils & Spices', slug: 'oils-spices', icon: '🫒' },
  { name: 'Snacks & Sweets', slug: 'snacks', icon: '🍪' },
  { name: 'Household & Cleaning', slug: 'household', icon: '🧼' },
]

export default function AdminCategories() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [categoryName, setCategoryName] = useState('')
  const [slug, setSlug] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [autoSlug, setAutoSlug] = useState(true)

  const fetchCategoriesList = async () => {
    try {
      setLoading(true)
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategoriesList()
  }, [])

  // Helper to resolve Appwrite Storage URL with project query param
  const resolveCategoryImageUrl = (url?: string) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return null
    }
    let formatted = url.trim()
    if (formatted.startsWith('http') && !formatted.includes('project=')) {
      formatted = `${formatted}${formatted.includes('?') ? '&' : '?'}project=${appwriteConfig.projectId}`
    }
    return formatted
  }

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q)
    )
  }, [categories, searchQuery])

  const openCreateModal = (preset?: { name: string; slug: string }) => {
    setEditingCategory(null)
    setCategoryName(preset ? preset.name : '')
    setSlug(preset ? preset.slug : '')
    setAutoSlug(!preset)
    setImageUri(null)
    setModalVisible(true)
  }

  const openEditModal = (cat: any) => {
    setEditingCategory(cat)
    setCategoryName(cat.name || '')
    setSlug(cat.slug || '')
    setAutoSlug(false)
    setImageUri(cat.iconUrl || cat.image_url || null)
    setModalVisible(true)
  }

  const handleNameChange = (text: string) => {
    setCategoryName(text)
    if (autoSlug && !editingCategory) {
      setSlug(
        text
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
    }
  }

  const handlePickCategoryIcon = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please grant library permissions to pick category image.')
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

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      return Alert.alert('Validation Error', 'Please enter a category name.')
    }

    try {
      setSubmitting(true)
      let finalIconUrl = imageUri || ''

      if (imageUri && (imageUri.startsWith('file:') || imageUri.startsWith('ph:'))) {
        finalIconUrl = await uploadImageToStorage(imageUri, 'cat')
      }

      const generatedSlug =
        slug.trim() ||
        categoryName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

      const payload = {
        name: categoryName.trim(),
        slug: generatedSlug,
        iconUrl: finalIconUrl,
        image_url: finalIconUrl,
      }

      if (editingCategory) {
        await updateCategory(editingCategory.$id, payload)
        Alert.alert('Success', `Category "${categoryName}" updated!`)
      } else {
        await createCategory(payload.name, payload.slug, payload.iconUrl)
        Alert.alert('Success', `Category "${categoryName}" created!`)
      }

      setModalVisible(false)
      setCategoryName('')
      setSlug('')
      setImageUri(null)
      fetchCategoriesList()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save category.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    Alert.alert('Delete Category', `Are you sure you want to delete "${name}"? Products under this category may become uncategorized.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(id)
            fetchCategoriesList()
          } catch (err: any) {
            Alert.alert('Error', err.message)
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      {/* Top Header */}
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-primary/10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 bg-white border border-primary/15 rounded-2xl shadow-sm active:opacity-70"
        >
          <FastImage source={images.arrowBack} className="w-5 h-5" contentFit="contain" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-lg font-quicksand-bold text-dark-100">
            Category Management
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            {categories.length} System Categories
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => openCreateModal()}
          className="bg-primary px-3.5 py-2 rounded-2xl flex-row items-center shadow-md shadow-primary/30 active:opacity-80"
        >
          <Text className="text-white font-quicksand-bold text-xs">+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Overview Header Card */}
      <View className="p-5 pb-2 bg-white border-b border-gray-100">
        {/* Live Search Bar */}
        <View className="flex-row items-center bg-gray-50 border-2 border-primary/10 rounded-2xl px-3.5 py-2.5 mb-3">
          <Text className="text-base mr-2">🔍</Text>
          <TextInput
            placeholder="Search categories by name or slug..."
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

        {/* Quick Add Presets Strip */}
        <View>
          <Text className="text-[11px] font-quicksand-bold text-gray-400 uppercase tracking-wider mb-2">
            Quick Add Suggested Categories:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-1">
            {CATEGORY_PRESETS.map((preset) => {
              const alreadyExists = categories.some(
                (c) => c.name?.toLowerCase() === preset.name.toLowerCase() || c.slug === preset.slug
              )
              return (
                <TouchableOpacity
                  key={preset.slug}
                  onPress={() => openCreateModal(preset)}
                  disabled={alreadyExists}
                  className={`px-3 py-1.5 rounded-xl border mr-2 flex-row items-center ${
                    alreadyExists
                      ? 'bg-gray-100 border-gray-200 opacity-60'
                      : 'bg-primary/5 border-primary/20 active:bg-primary/15'
                  }`}
                >
                  <Text className="text-xs mr-1">{preset.icon}</Text>
                  <Text
                    className={`font-quicksand-bold text-xs ${
                      alreadyExists ? 'text-gray-400' : 'text-primary'
                    }`}
                  >
                    {preset.name} {alreadyExists ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>

      {/* Category List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="p-5 pb-32"
          ListEmptyComponent={() => (
            <View className="items-center mt-16 px-8">
              <View className="w-20 h-20 bg-primary/10 rounded-3xl items-center justify-center mb-4 border border-primary/20">
                <Text className="text-3xl">🏷️</Text>
              </View>
              <Text className="text-xl font-quicksand-bold text-dark-100 mb-1">
                No Categories Found
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-xs mb-5 leading-relaxed">
                {searchQuery
                  ? `No categories matching "${searchQuery}".`
                  : 'Start by creating categories or choosing from the quick presets above.'}
              </Text>
              <TouchableOpacity
                onPress={() => openCreateModal()}
                className="bg-primary px-6 py-3 rounded-2xl shadow-md shadow-primary/30"
              >
                <Text className="text-white font-quicksand-bold text-xs">+ Add First Category</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item, index }) => {
            const rawImg = item.iconUrl || item.image_url
            const resolvedImg = resolveCategoryImageUrl(rawImg)

            return (
              <View className="bg-white rounded-[28px] p-4 mb-4 border-2 border-primary/10 shadow-lg shadow-black/5">
                <View className="flex-row items-center">
                  {/* Category Thumbnail */}
                  <View className="w-16 h-16 rounded-2xl overflow-hidden bg-primary/5 mr-3.5 border-2 border-primary/15 items-center justify-center">
                    {resolvedImg ? (
                      <FastImage
                        source={resolvedImg}
                        className="w-full h-full"
                        contentFit="cover"
                      />
                    ) : (
                      <View className="items-center justify-center">
                        <Text className="text-2xl">🏷️</Text>
                      </View>
                    )}
                  </View>

                  {/* Category Info */}
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <View className="w-2 h-2 rounded-full bg-primary" />
                      <Text className="text-base font-quicksand-bold text-dark-100" numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    <View className="flex-row flex-wrap items-center gap-1.5">
                      <View className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-lg">
                        <Text className="text-[10px] text-gray-500 font-quicksand-semibold">
                          /{item.slug || 'no-slug'}
                        </Text>
                      </View>
                      <View className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
                        <Text className="text-[10px] text-primary font-quicksand-bold">
                          #{index + 1}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      className="bg-blue-500/10 border border-blue-500/30 px-3 py-2 rounded-xl active:opacity-80"
                    >
                      <Text className="text-blue-700 font-quicksand-bold text-xs">Edit ✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDelete(item.$id, item.name)}
                      className="bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-xl active:opacity-80"
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

      {/* Modal: Create / Edit Category with Pure Light Rectangle & Line Design */}
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

          <View className="bg-white rounded-t-[36px] p-6 max-h-[90%] shadow-2xl border-t-2 border-primary/20">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
                <View>
                  <Text className="text-xl font-quicksand-bold text-dark-100">
                    {editingCategory ? 'Edit Category' : 'Create Category'}
                  </Text>
                  <Text className="text-[11px] text-primary font-quicksand-semibold">
                    Global Catalog Taxonomy
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setModalVisible(false)
                }}
                className="px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 50 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Category Image Picker */}
              <Text className="font-quicksand-bold text-xs text-gray-500 mb-1.5">
                Category Image / Icon Banner
              </Text>
              <TouchableOpacity
                onPress={handlePickCategoryIcon}
                className="w-full h-36 bg-gray-50 border-2 border-dashed border-primary/30 rounded-2xl items-center justify-center overflow-hidden mb-4 relative"
              >
                {imageUri ? (
                  <View className="w-full h-full relative items-center justify-center bg-gray-50">
                    <FastImage
                      source={resolveCategoryImageUrl(imageUri) || imageUri}
                      className="w-full h-full"
                      contentFit="contain"
                    />
                    <View className="absolute bottom-2 right-2 bg-black/60 px-2.5 py-1 rounded-lg">
                      <Text className="text-white font-quicksand-bold text-[10px]">Change Image 📸</Text>
                    </View>
                  </View>
                ) : (
                  <View className="items-center">
                    <Text className="text-3xl mb-1">📸</Text>
                    <Text className="text-primary font-quicksand-bold text-sm">
                      Upload Category Image
                    </Text>
                    <Text className="text-gray-400 font-quicksand-medium text-[11px] mt-0.5">
                      Tap to select image from your device
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Category Name */}
              <Text className="font-quicksand-bold text-xs text-gray-500 mb-1">
                Category Name *
              </Text>
              <TextInput
                placeholder="e.g. Fresh Vegetables"
                placeholderTextColor="#9CA3AF"
                value={categoryName}
                onChangeText={handleNameChange}
                className="w-full bg-gray-50 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-bold text-sm mb-4 text-dark-100"
              />

              {/* Category Slug */}
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-quicksand-bold text-xs text-gray-500">
                  URL / Filter Slug *
                </Text>
                <TouchableOpacity onPress={() => setAutoSlug(!autoSlug)}>
                  <Text className="text-primary font-quicksand-bold text-[11px]">
                    {autoSlug ? '🔒 Auto-Sync On' : '🔓 Custom Slug'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder="e.g. fresh-vegetables"
                placeholderTextColor="#9CA3AF"
                value={slug}
                onChangeText={setSlug}
                autoCapitalize="none"
                className="w-full bg-gray-50 border-2 border-primary/10 rounded-2xl px-4 py-3 font-quicksand-semibold text-xs mb-5 text-dark-100"
              />

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="flex-1 bg-gray-100 border border-gray-200 py-3.5 rounded-2xl items-center active:opacity-80"
                >
                  <Text className="text-gray-700 font-quicksand-bold text-xs">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveCategory}
                  disabled={submitting}
                  className="flex-1 bg-primary py-3.5 rounded-2xl items-center shadow-lg shadow-primary/30 justify-center active:opacity-80"
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-quicksand-bold text-xs">
                      {editingCategory ? 'Save Changes' : 'Create Category'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}
