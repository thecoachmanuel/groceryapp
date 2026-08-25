import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { LinearGradient } from 'expo-linear-gradient'
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  uploadImageToStorage,
  getCategories,
  getMenu,
  getStores,
} from '@/lib/appwrite'

import { images } from '@/constants'

const GRADIENT_PRESETS = [
  { label: 'Crimson Red', colors: ['#B91C1C', '#F87171'] },
  { label: 'Rose Pink', colors: ['#E11D48', '#EC4899'] },
  { label: 'Emerald Green', colors: ['#059669', '#6EE7B7'] },
  { label: 'Amber Gold', colors: ['#D97706', '#FFD580'] },
  { label: 'Indigo Purple', colors: ['#4F46E5', '#818CF8'] },
  { label: 'Dark Charcoal', colors: ['#1E293B', '#475569'] },
]

const APP_PAGES = [
  { id: '/orders', title: 'Orders History', subtitle: 'User past & active orders page', icon: '📦' },
  { id: '/wallet', title: 'My Wallet & Cashback', subtitle: 'User balance & transactions', icon: '👛' },
  { id: '/categories', title: 'Explore Categories', subtitle: 'All grocery category directory', icon: '🥦' },
  { id: '/stores', title: 'Stores Directory', subtitle: 'Nearby partner grocery stores', icon: '🏪' },
  { id: '/cart', title: 'Shopping Cart', subtitle: 'Items currently in user cart', icon: '🛒' },
  { id: '/address', title: 'Delivery Addresses', subtitle: 'Saved user delivery locations', icon: '🏠' },
  { id: '/menu/faq', title: 'FAQ & Help Center', subtitle: 'Frequently asked questions', icon: '❓' },
  { id: '/menu/contact', title: 'Contact Support', subtitle: 'Customer support page', icon: '📞' },
  { id: '/menu/about', title: 'About Nectar App', subtitle: 'Company information', icon: 'ℹ️' },
  { id: '/menu/terms', title: 'Terms & Conditions', subtitle: 'Legal policies and terms', icon: '📜' },
]

export default function AdminBanners() {
  const router = useRouter()
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Live Dropdown Selection Options
  const [categoriesList, setCategoriesList] = useState<any[]>([])
  const [productsList, setProductsList] = useState<any[]>([])
  const [storesList, setStoresList] = useState<any[]>([])
  const [showDropdownPanel, setShowDropdownPanel] = useState(false)
  const [dropdownFilter, setDropdownFilter] = useState('')

  // Modal State for Add / Edit Banner
  const [modalVisible, setModalVisible] = useState(false)
  const [editingBanner, setEditingBanner] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form Fields
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].colors)
  const [displayOrder, setDisplayOrder] = useState('1')
  const [isActive, setIsActive] = useState(true)
  const [hideTextOverlay, setHideTextOverlay] = useState(false)
  const [targetType, setTargetType] = useState<'product' | 'category' | 'store' | 'page' | 'external'>('category')
  const [targetId, setTargetId] = useState('')

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const data = await getBanners()
      setBanners(data)
    } catch (err) {
      console.error('Error fetching banners:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDropdownOptions = async () => {
    try {
      const [cats, prods, stores] = await Promise.all([
        getCategories().catch(() => []),
        getMenu({}).catch(() => []),
        getStores().catch(() => []),
      ])
      setCategoriesList(cats || [])
      setProductsList(prods || [])
      setStoresList(stores || [])
    } catch (e) {
      console.error('Error fetching dropdown choices:', e)
    }
  }

  useEffect(() => {
    fetchBanners()
    fetchDropdownOptions()
  }, [])

  const getSelectedTargetLabel = () => {
    if (!targetId) return `Select ${targetType.toUpperCase()} target from dropdown...`
    if (targetType === 'category') {
      const found = categoriesList.find(
        (c) => c.name?.toLowerCase() === targetId.toLowerCase() || c.$id === targetId
      )
      return found ? `🏷️ Category: ${found.name}` : `🏷️ Category: ${targetId}`
    } else if (targetType === 'product') {
      const found = productsList.find((p) => (p.$id || p.id) === targetId)
      return found ? `🛒 Product: ${found.name} ($${found.price})` : `🛒 Product ID: ${targetId}`
    } else if (targetType === 'store') {
      const found = storesList.find((s) => (s.$id || s.id) === targetId)
      return found ? `🏪 Store: ${found.name}` : `🏪 Store ID: ${targetId}`
    } else if (targetType === 'page') {
      const found = APP_PAGES.find((p) => p.id === targetId)
      return found ? `${found.icon} ${found.title} (${found.id})` : `📄 Route: ${targetId}`
    }
    return targetId
  }

  const getFilteredDropdownItems = () => {
    const query = dropdownFilter.trim().toLowerCase()
    if (targetType === 'category') {
      return categoriesList
        .filter((c) => !query || (c.name || '').toLowerCase().includes(query))
        .map((c) => ({
          id: c.name || c.$id,
          title: c.name,
          subtitle: `Category • ${c.$id || 'Appwrite'}`,
          icon: '🏷️',
          image: (c.iconUrl || c.imageUrl || c.image_url || null) as string | null,
        }))
    } else if (targetType === 'product') {
      return productsList
        .filter((p) => !query || (p.name || '').toLowerCase().includes(query))
        .map((p) => ({
          id: p.$id || p.id,
          title: p.name,
          subtitle: `$${p.price} • ${p.storeName || 'Store'}`,
          icon: '🛒',
          image: (p.image_url || p.imageUrl || p.image || null) as string | null,
        }))
    } else if (targetType === 'store') {
      return storesList
        .filter((s) => !query || (s.name || '').toLowerCase().includes(query))
        .map((s) => ({
          id: s.$id || s.id,
          title: s.name,
          subtitle: s.address || s.tagline || 'Partner Store',
          icon: '🏪',
          image: (s.logoUrl || s.logo || s.bannerUrl || null) as string | null,
        }))
    } else if (targetType === 'page') {
      return APP_PAGES.filter(
        (p) => !query || p.title.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
      ).map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        icon: p.icon,
        image: null as string | null,
      }))
    }
    return []
  }

  const openCreateModal = () => {
    setEditingBanner(null)
    setTitle('')
    setSubtitle('')
    setImageUri(null)
    setSelectedGradient(GRADIENT_PRESETS[0].colors)
    setDisplayOrder((banners.length + 1).toString())
    setIsActive(true)
    setHideTextOverlay(false)
    setTargetType('category')
    setTargetId('')
    setModalVisible(true)
  }

  const openEditModal = (banner: any) => {
    setEditingBanner(banner)
    setTitle(banner.title || '')
    setSubtitle(banner.subtitle || '')
    setImageUri(banner.imageUrl)
    setSelectedGradient([banner.gradientStart || '#B91C1C', banner.gradientEnd || '#F87171'])
    setDisplayOrder(banner.displayOrder?.toString() || '1')
    setIsActive(banner.isActive ?? true)
    setHideTextOverlay(
      Boolean(
        banner.hideTextOverlay ||
        banner.bannerMode === 'image' ||
        banner.subtitle === '[HIDE_TEXT]' ||
        (banner.subtitle && banner.subtitle.includes('[HIDE_TEXT]')) ||
        banner.title === 'Full Image Banner'
      )
    )
    setTargetType(banner.targetType || 'category')
    setTargetId(banner.targetId || banner.targetCategory || '')
    setModalVisible(true)
  }

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Media library access is required to upload banner images.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      })

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not select image')
    }
  }

  const handleSaveBanner = async () => {
    if (!hideTextOverlay && !title.trim()) {
      return Alert.alert('Validation Error', 'Please provide a title for the banner ad.')
    }
    if (!imageUri) {
      return Alert.alert('Validation Error', 'Please select an image/PNG for the banner ad.')
    }

    try {
      setSubmitting(true)
      let finalImageUrl = imageUri

      if (!imageUri.startsWith('http')) {
        finalImageUrl = await uploadImageToStorage(imageUri, 'banner')
      }

      const bannerData = {
        title: title.trim() || 'Full Image Banner',
        subtitle: subtitle.trim(),
        imageUrl: finalImageUrl,
        gradientStart: selectedGradient[0],
        gradientEnd: selectedGradient[1],
        displayOrder: parseInt(displayOrder) || 1,
        isActive,
        hideTextOverlay,
        targetType,
        targetId: targetId.trim(),
        targetCategory: targetType === 'category' ? targetId.trim() : undefined,
      }

      if (editingBanner) {
        await updateBanner(editingBanner.$id, bannerData)
        Alert.alert('Success', 'Banner ad updated successfully!')
      } else {
        await createBanner(bannerData)
        Alert.alert('Success', 'New Banner ad published successfully!')
      }

      setModalVisible(false)
      fetchBanners()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save banner ad.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBanner = async (bannerId: string) => {
    Alert.alert('Delete Banner Ad', 'Are you sure you want to delete this home banner ad?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBanner(bannerId)
            Alert.alert('Deleted', 'Banner ad removed.')
            fetchBanners()
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not delete banner')
          }
        },
      },
    ])
  }

  const toggleBannerStatus = async (banner: any) => {
    try {
      await updateBanner(banner.$id, { isActive: !banner.isActive })
      fetchBanners()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
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
            Banner Ads Manager
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            Home Tab Advertisements
          </Text>
        </View>

        <TouchableOpacity
          onPress={openCreateModal}
          className="bg-primary px-3 py-1.5 rounded-full flex-row items-center"
        >
          <Text className="text-white font-quicksand-bold text-xs">+ New Banner</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#53B175" />
        </View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.$id}
          contentContainerClassName="p-5 pb-32"
          ListEmptyComponent={() => (
            <View className="items-center mt-20 px-8">
              <Text className="text-4xl mb-3">🖼️</Text>
              <Text className="text-xl font-quicksand-bold text-dark-100 mb-1">
                No Custom Banners Yet
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-center text-sm mb-5">
                Add advert banners with PNG images & vibrant gradient colors to showcase on the Customer Home tab.
              </Text>
              <TouchableOpacity
                onPress={openCreateModal}
                className="bg-primary px-6 py-3 rounded-full shadow-lg shadow-primary/30"
              >
                <Text className="text-white font-quicksand-bold text-sm">+ Add First Banner</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item, index }) => {
            const isEven = index % 2 === 0
            const gradientColors = [item.gradientStart || '#B91C1C', item.gradientEnd || '#F87171']
            const imageSrc = item.imageUrl ? { uri: item.imageUrl } : null
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
              <View className="bg-white rounded-[28px] p-5 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                    <Text className="text-dark-100 font-quicksand-bold text-sm">
                      {isDirectImage ? 'Direct Image Home Banner' : 'Text Card Home Banner'}
                    </Text>
                  </View>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Priority #{item.displayOrder || index + 1}
                  </Text>
                </View>

                {/* Banner Preview Card - Exact Customer App Styling */}
                <View className="mb-4 overflow-hidden rounded-[8px]" style={{ borderRadius: 8, height: 115 }}>
                  {isDirectImage && imageSrc ? (
                    <Image
                      source={imageSrc}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={gradientColors as [string, string]}
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
                            {imageSrc ? (
                              <Image
                                source={imageSrc}
                                className="w-full h-full"
                                style={{ maxHeight: '100%', flex: 1 }}
                                resizeMode="contain"
                              />
                            ) : null}
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
                            <View className="bg-white/30 px-3.5 py-1 rounded-full mt-0.5">
                              <Text className="text-xs font-quicksand-bold text-white">
                                Order Now
                              </Text>
                            </View>
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
                            <View className="bg-white/30 px-3.5 py-1 rounded-full mt-0.5">
                              <Text className="text-xs font-quicksand-bold text-white">
                                Order Now
                              </Text>
                            </View>
                          </View>
                          <View className="w-1/2 justify-center items-end pl-2">
                            {imageSrc ? (
                              <Image
                                source={imageSrc}
                                className="w-full h-full"
                                style={{ maxHeight: '100%', flex: 1 }}
                                resizeMode="contain"
                              />
                            ) : null}
                          </View>
                        </>
                      )}
                    </LinearGradient>
                  )}
                </View>

                {/* Banner Info & Action Controls */}
                <View className="flex-row justify-between items-center pt-3 border-t-2 border-primary/10">
                  <TouchableOpacity
                    onPress={() => toggleBannerStatus(item)}
                    className={`px-3.5 py-1.5 rounded-full border ${
                      item.isActive
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-gray-100 border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-xs font-quicksand-bold ${
                        item.isActive ? 'text-green-700' : 'text-gray-500'
                      }`}
                    >
                      {item.isActive ? '🟢 Active on Home' : '⚪ Hidden'}
                    </Text>
                  </TouchableOpacity>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      className="bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-2xl active:opacity-80"
                    >
                      <Text className="text-blue-700 font-quicksand-bold text-xs">✏️ Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteBanner(item.$id)}
                      className="bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-2xl active:opacity-80"
                    >
                      <Text className="text-red-600 font-quicksand-bold text-xs">🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Modal: Create / Edit Banner */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[32px] p-6 max-h-[92%] shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-quicksand-bold text-dark-100">
                {editingBanner ? 'Edit Advert Banner' : 'Create New Banner Ad'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl active:opacity-80"
              >
                <Text className="text-primary font-quicksand-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Live Customer App Live Banner Preview Card */}
              <Text className="font-quicksand-bold text-xs text-primary uppercase tracking-wider mb-2">
                📱 Customer App Live Preview
              </Text>

              <View className="mb-5 overflow-hidden rounded-[8px]" style={{ borderRadius: 8, height: 115 }}>
                {hideTextOverlay ? (
                  imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center bg-gray-100 p-2">
                      <Text className="text-2xl mb-1">🖼️</Text>
                      <Text className="text-gray-500 font-quicksand-semibold text-xs text-center">
                        Select Full Banner Image Below
                      </Text>
                    </View>
                  )
                ) : (
                  <LinearGradient
                    colors={[
                      selectedGradient?.[0] && selectedGradient[0].trim() ? selectedGradient[0] : '#B91C1C',
                      selectedGradient?.[1] && selectedGradient[1].trim() ? selectedGradient[1] : '#F87171',
                    ]}
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
                    <View className="w-1/2 justify-center items-start pr-2">
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          className="w-full h-full"
                          style={{ maxHeight: '100%', flex: 1 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center bg-black/10 rounded-lg border border-white/20 p-1">
                          <Text className="text-xl mb-0.5">🖼️</Text>
                          <Text className="text-white/70 font-quicksand-semibold text-[9px] text-center">
                            Select PNG Graphic
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="w-1/2 justify-center items-end pl-2">
                      <Text className="text-xl font-quicksand-bold text-white mb-0.5 text-right" numberOfLines={1}>
                        {title.trim() || 'Banner Title'}
                      </Text>
                      <Text className="text-[10px] font-quicksand-medium text-white/80 mb-1.5 text-right" numberOfLines={1}>
                        {subtitle.trim() || 'Tagline / Subtitle description'}
                      </Text>
                      <View className="bg-white/30 px-3.5 py-1 rounded-full mt-0.5">
                        <Text className="text-xs font-quicksand-bold text-white">
                          Order Now
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                )}
              </View>

              {/* Form Fields */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
                Banner Image / PNG Graphic *
              </Text>

              <TouchableOpacity
                onPress={handlePickImage}
                className="w-full h-32 bg-gray-50 border-2 border-dashed border-primary/30 rounded-2xl items-center justify-center overflow-hidden mb-4"
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="contain" />
                ) : (
                  <View className="items-center">
                    <Text className="text-2xl mb-1">🖼️</Text>
                    <Text className="text-primary font-quicksand-bold text-xs">
                      Tap to Choose Image / PNG
                    </Text>
                    <Text className="text-gray-400 font-quicksand-medium text-[10px]">
                      Transparent PNGs work best
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Banner Mode Toggle: Direct Image vs Text Overlay */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
                Banner Display Mode
              </Text>
              <View className="flex-row gap-2 mb-5">
                <TouchableOpacity
                  onPress={() => setHideTextOverlay(false)}
                  className={`flex-1 p-3 rounded-2xl border-2 items-center justify-center ${
                    !hideTextOverlay ? 'border-primary bg-primary/10' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <Text className="text-lg mb-1">🎨</Text>
                  <Text className={`font-quicksand-bold text-xs ${!hideTextOverlay ? 'text-primary' : 'text-gray-700'}`}>
                    Text & Button Overlay
                  </Text>
                  <Text className="text-[10px] font-quicksand-medium text-gray-400 text-center mt-0.5">
                    Renders title, tagline & Order Now button
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setHideTextOverlay(true)}
                  className={`flex-1 p-3 rounded-2xl border-2 items-center justify-center ${
                    hideTextOverlay ? 'border-primary bg-primary/10' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <Text className="text-lg mb-1">🖼️</Text>
                  <Text className={`font-quicksand-bold text-xs ${hideTextOverlay ? 'text-primary' : 'text-gray-700'}`}>
                    Direct Banner Image
                  </Text>
                  <Text className="text-[10px] font-quicksand-medium text-gray-400 text-center mt-0.5">
                    Pure image banner without text overlay
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Target Link Configuration */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
                On-Tap Action / Target Destination *
              </Text>

              {/* Target Type Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {[
                  { id: 'category', label: '🏷️ Category', desc: 'Category Page' },
                  { id: 'product', label: '🛒 Product', desc: 'Product Details' },
                  { id: 'store', label: '🏪 Store', desc: 'Store Page' },
                  { id: 'page', label: '📄 App Page', desc: 'App Screen' },
                ].map((typeItem) => {
                  const isSelected = targetType === typeItem.id
                  return (
                    <TouchableOpacity
                      key={typeItem.id}
                      onPress={() => {
                        setTargetType(typeItem.id as any)
                        setShowDropdownPanel(true)
                      }}
                      className={`mr-2 px-3.5 py-2.5 rounded-2xl border-2 ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Text className={`font-quicksand-bold text-xs ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                        {typeItem.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Target Dropdown Selection Field */}
              <Text className="text-xs font-quicksand-semibold text-gray-500 mb-1">
                Selected Destination Target:
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setShowDropdownPanel(!showDropdownPanel)
                }}
                className="w-full bg-gray-50 border-2 border-primary/25 rounded-2xl px-4 py-3.5 flex-row justify-between items-center mb-2 shadow-sm active:bg-primary/10"
              >
                <View className="flex-1 pr-2">
                  <Text className="font-quicksand-bold text-sm text-dark-100" numberOfLines={1}>
                    {getSelectedTargetLabel()}
                  </Text>
                  <Text className="text-[10px] font-quicksand-semibold text-primary">
                    {showDropdownPanel ? 'Tap to close choices ▲' : 'Tap to expand & select from choices ▼'}
                  </Text>
                </View>
                <View className="bg-primary/10 px-2.5 py-1 rounded-full">
                  <Text className="text-primary font-quicksand-bold text-xs">
                    {showDropdownPanel ? 'Close ▲' : 'Choose ▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Inline Expandable Dropdown Selection Panel */}
              {showDropdownPanel && (
                <View className="bg-gray-100/90 border-2 border-primary/20 rounded-2xl p-3 mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-quicksand-bold text-xs text-dark-100">
                      Available {targetType.toUpperCase()} Choices:
                    </Text>
                    <Text className="font-quicksand-medium text-[10px] text-gray-400">
                      Tap any item to select
                    </Text>
                  </View>

                  {/* Filter Search Input */}
                  <View className="bg-white rounded-xl px-3 py-2 flex-row items-center mb-2.5 border border-gray-200">
                    <Text className="text-gray-400 text-xs mr-2">🔍</Text>
                    <TextInput
                      placeholder={`Search ${targetType}...`}
                      value={dropdownFilter}
                      onChangeText={setDropdownFilter}
                      className="flex-1 text-xs font-quicksand-semibold text-dark-100 p-0"
                    />
                    {dropdownFilter ? (
                      <TouchableOpacity onPress={() => setDropdownFilter('')}>
                        <Text className="text-gray-400 font-bold text-xs">✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Choice List Items */}
                  <View className="max-h-64 overflow-hidden">
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                      {getFilteredDropdownItems().length === 0 ? (
                        <View className="items-center py-4">
                          <Text className="text-gray-400 font-quicksand-medium text-xs">
                            No {targetType} items found matching search
                          </Text>
                        </View>
                      ) : (
                        getFilteredDropdownItems().map((item) => {
                          const isSelected =
                            targetId === item.id || targetId.toLowerCase() === (item.title || '').toLowerCase()
                          return (
                            <TouchableOpacity
                              key={item.id}
                              activeOpacity={0.8}
                              onPress={() => {
                                setTargetId(item.id)
                                setShowDropdownPanel(false)
                              }}
                              className={`p-3 mb-2 rounded-xl border flex-row items-center justify-between ${
                                isSelected
                                  ? 'border-primary bg-primary/10'
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <View className="flex-row items-center flex-1 pr-2">
                                {item.image ? (
                                  <Image
                                    source={{ uri: item.image }}
                                    className="w-8 h-8 rounded-lg mr-2.5 bg-gray-100"
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View className="w-8 h-8 rounded-lg mr-2.5 bg-primary/10 items-center justify-center">
                                    <Text className="text-sm">{item.icon || '🏷️'}</Text>
                                  </View>
                                )}
                                <View className="flex-1">
                                  <Text className="font-quicksand-bold text-dark-100 text-xs mb-0.5" numberOfLines={1}>
                                    {item.title}
                                  </Text>
                                  <Text className="font-quicksand-medium text-gray-400 text-[10px]" numberOfLines={1}>
                                    {item.subtitle}
                                  </Text>
                                </View>
                              </View>

                              <View
                                className={`w-5 h-5 rounded-full border items-center justify-center ${
                                  isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                                }`}
                              >
                                {isSelected && <Text className="text-white text-[10px] font-bold">✓</Text>}
                              </View>
                            </TouchableOpacity>
                          )
                        })
                      )}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* Manual Override Input */}
              <TextInput
                placeholder={
                  targetType === 'category'
                    ? 'Or type custom category name...'
                    : targetType === 'product'
                    ? 'Or paste product ID...'
                    : targetType === 'store'
                    ? 'Or paste store ID...'
                    : 'Or enter custom route (e.g. /orders)...'
                }
                value={targetId}
                onChangeText={setTargetId}
                className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-dark-100 font-quicksand-semibold mb-4"
              />

              {/* Title Input */}
              {!hideTextOverlay && (
                <>
                  <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                    Offer Title *
                  </Text>
                  <TextInput
                    placeholder="e.g. Smash Feast Special"
                    value={title}
                    onChangeText={setTitle}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
                  />

                  <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                    Subtitle / Tagline (Optional)
                  </Text>
                  <TextInput
                    placeholder="e.g. 20% Discount on Burgers"
                    value={subtitle}
                    onChangeText={setSubtitle}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
                  />
                </>
              )}

              {/* Gradient Color Selection */}
              {!hideTextOverlay && (
                <>
                  <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
                    Card Gradient Style
                  </Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                    {GRADIENT_PRESETS.map((preset, idx) => {
                      const isSelected =
                        selectedGradient?.[0] === preset.colors[0] && selectedGradient?.[1] === preset.colors[1]
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setSelectedGradient([preset.colors[0], preset.colors[1]])}
                          className={`mr-2.5 px-3 py-2.5 rounded-2xl border-2 flex-row items-center ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <View className="flex-row items-center mr-2">
                            <View
                              className="w-3.5 h-3.5 rounded-full border border-white -mr-1 z-10 shadow-sm"
                              style={{ backgroundColor: preset.colors[0] }}
                            />
                            <View
                              className="w-3.5 h-3.5 rounded-full border border-white"
                              style={{ backgroundColor: preset.colors[1] }}
                            />
                          </View>
                          <Text
                            className={`font-quicksand-bold text-xs ${
                              isSelected ? 'text-primary' : 'text-gray-700'
                            }`}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>

                  {/* Custom Hex Gradient Inputs */}
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1">
                      <Text className="text-xs font-quicksand-semibold text-gray-500 mb-1">
                        Start Color (Hex)
                      </Text>
                      <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2">
                        <View
                          className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                          style={{ backgroundColor: selectedGradient[0] || '#B91C1C' }}
                        />
                        <TextInput
                          value={selectedGradient[0] || ''}
                          onChangeText={(val) => setSelectedGradient([val, selectedGradient[1] || '#F87171'])}
                          placeholder="#B91C1C"
                          className="flex-1 text-xs font-quicksand-bold text-dark-100 p-0"
                        />
                      </View>
                    </View>

                    <View className="flex-1">
                      <Text className="text-xs font-quicksand-semibold text-gray-500 mb-1">
                        End Color (Hex)
                      </Text>
                      <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2">
                        <View
                          className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                          style={{ backgroundColor: selectedGradient[1] || '#F87171' }}
                        />
                        <TextInput
                          value={selectedGradient[1] || ''}
                          onChangeText={(val) => setSelectedGradient([selectedGradient[0] || '#B91C1C', val])}
                          placeholder="#F87171"
                          className="flex-1 text-xs font-quicksand-bold text-dark-100 p-0"
                        />
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* Display Order */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Display Priority Order (1, 2, 3...)
              </Text>
              <TextInput
                keyboardType="numeric"
                placeholder="1"
                value={displayOrder}
                onChangeText={setDisplayOrder}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-6"
              />

              {/* Action Buttons */}
              <TouchableOpacity
                onPress={handleSaveBanner}
                disabled={submitting}
                className="bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/30"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-quicksand-bold text-base">
                    {editingBanner ? 'Save Changes' : 'Publish Banner Ad'}
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
