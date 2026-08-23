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

export default function AdminBanners() {
  const router = useRouter()
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
  const [targetType, setTargetType] = useState<'product' | 'category' | 'external'>('category')
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

  useEffect(() => {
    fetchBanners()
  }, [])

  const openCreateModal = () => {
    setEditingBanner(null)
    setTitle('')
    setSubtitle('')
    setImageUri(null)
    setSelectedGradient(GRADIENT_PRESETS[0].colors)
    setDisplayOrder((banners.length + 1).toString())
    setIsActive(true)
    setTargetType('category')
    setTargetId('')
    setModalVisible(true)
  }

  const openEditModal = (banner: any) => {
    setEditingBanner(banner)
    setTitle(banner.title)
    setSubtitle(banner.subtitle || '')
    setImageUri(banner.imageUrl)
    setSelectedGradient([banner.gradientStart || '#B91C1C', banner.gradientEnd || '#F87171'])
    setDisplayOrder(banner.displayOrder?.toString() || '1')
    setIsActive(banner.isActive ?? true)
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
    if (!title.trim()) {
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
        title: title.trim(),
        subtitle: subtitle.trim(),
        imageUrl: finalImageUrl,
        gradientStart: selectedGradient[0],
        gradientEnd: selectedGradient[1],
        displayOrder: parseInt(displayOrder) || 1,
        isActive,
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

            return (
              <View className="bg-white rounded-[28px] p-5 mb-5 border-2 border-primary/10 shadow-lg shadow-black/10">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                    <Text className="text-dark-100 font-quicksand-bold text-sm">
                      Customer App Home Banner
                    </Text>
                  </View>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Priority #{item.displayOrder || index + 1}
                  </Text>
                </View>

                {/* Banner Preview Card - Exact Customer App Styling */}
                <View className="mb-4 overflow-hidden rounded-[24px] shadow-md shadow-black/10">
                  <LinearGradient
                    colors={gradientColors as [string, string]}
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
                          {imageSrc ? (
                            <Image
                              source={imageSrc}
                              className="w-full h-full"
                              style={{ maxHeight: '100%', flex: 1 }}
                              resizeMode="contain"
                            />
                          ) : null}
                        </View>
                        <View className="w-1/2 justify-center items-end pl-3">
                          <Text className="text-3xl font-quicksand-bold text-white mb-1 text-right" numberOfLines={2}>
                            {item.title}
                          </Text>
                          {item.subtitle ? (
                            <Text className="text-xs font-quicksand-medium text-white/80 mb-3 text-right" numberOfLines={2}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                          <View className="bg-white/30 px-5 py-2 rounded-full mt-1">
                            <Text className="text-sm font-quicksand-bold text-white">
                              Order Now
                            </Text>
                          </View>
                        </View>
                      </>
                    ) : (
                      <>
                        <View className="w-1/2 justify-center items-start pr-3">
                          <Text className="text-3xl font-quicksand-bold text-white mb-1 text-left" numberOfLines={2}>
                            {item.title}
                          </Text>
                          {item.subtitle ? (
                            <Text className="text-xs font-quicksand-medium text-white/80 mb-3 text-left" numberOfLines={2}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                          <View className="bg-white/30 px-5 py-2 rounded-full mt-1">
                            <Text className="text-sm font-quicksand-bold text-white">
                              Order Now
                            </Text>
                          </View>
                        </View>
                        <View className="w-1/2 justify-center items-end pl-3">
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

              <View className="mb-5 overflow-hidden rounded-[24px] shadow-md shadow-black/10">
                <LinearGradient
                  colors={[
                    selectedGradient?.[0] && selectedGradient[0].trim() ? selectedGradient[0] : '#B91C1C',
                    selectedGradient?.[1] && selectedGradient[1].trim() ? selectedGradient[1] : '#F87171',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 24,
                    flexDirection: 'row',
                    padding: 20,
                    minHeight: 180,
                  }}
                >
                  <View className="w-1/2 justify-center items-start pr-3">
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        className="w-full h-full"
                        style={{ maxHeight: '100%', flex: 1 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center bg-black/10 rounded-2xl border border-white/20 p-2">
                        <Text className="text-2xl mb-1">🖼️</Text>
                        <Text className="text-white/70 font-quicksand-semibold text-[10px] text-center">
                          Select Graphic Image
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="w-1/2 justify-center items-end pl-3">
                    <Text className="text-3xl font-quicksand-bold text-white mb-1 text-right" numberOfLines={2}>
                      {title.trim() || 'Banner Title'}
                    </Text>
                    <Text className="text-xs font-quicksand-medium text-white/80 mb-3 text-right" numberOfLines={2}>
                      {subtitle.trim() || 'Tagline / Subtitle description'}
                    </Text>
                    <View className="bg-white/30 px-5 py-2 rounded-full mt-1">
                      <Text className="text-sm font-quicksand-bold text-white">
                        Order Now
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
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

              {/* Title Input */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Offer Title *
              </Text>
              <TextInput
                placeholder="e.g. Smash Feast Special"
                value={title}
                onChangeText={setTitle}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
              />

              {/* Subtitle Input */}
              <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
                Subtitle / Tagline (Optional)
              </Text>
              <TextInput
                placeholder="e.g. 20% Discount on Burgers"
                value={subtitle}
                onChangeText={setSubtitle}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-dark-100 font-quicksand-semibold mb-4"
              />

              {/* Gradient Color Selection */}
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
