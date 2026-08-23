import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import LocationPickerModal from '@/components/LocationPickerModal'
import useAuthStore from '@/store/auth.store'
import { deleteStorageFileByUrl, updateStoreProfile, uploadImageToStorage } from '@/lib/appwrite'
import { images } from '@/constants'

export default function SellerStoreSettings() {
  const router = useRouter()
  const { sellerStore, fetchAuthenticatedUser } = useAuthStore()

  const [storeName, setStoreName] = useState(sellerStore?.storeName || '')
  const [description, setDescription] = useState(sellerStore?.description || '')
  const [address, setAddress] = useState(sellerStore?.address || '')
  const [phone, setPhone] = useState(sellerStore?.phone || '')
  const [logoUrl, setLogoUrl] = useState<string | null>(sellerStore?.logoUrl || null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(sellerStore?.bannerUrl || null)
  const [latitude, setLatitude] = useState<number | null>(sellerStore?.latitude != null ? Number(sellerStore.latitude) : null)
  const [longitude, setLongitude] = useState<number | null>(sellerStore?.longitude != null ? Number(sellerStore.longitude) : null)
  const [mapPickerVisible, setMapPickerVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })
      if (!result.canceled && result.assets[0]?.uri) {
        setLogoUrl(result.assets[0].uri)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Image picker failed.')
    }
  }

  const handlePickBanner = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      })
      if (!result.canceled && result.assets[0]?.uri) {
        setBannerUrl(result.assets[0].uri)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Image picker failed.')
    }
  }

  const handleSaveStoreProfile = async () => {
    if (!storeName.trim()) {
      return Alert.alert('Validation Error', 'Please enter store name.')
    }

    try {
      setSubmitting(true)
      let finalLogo = logoUrl
      let finalBanner = bannerUrl

      if (logoUrl && (logoUrl.startsWith('file:') || logoUrl.startsWith('ph:'))) {
        if (sellerStore?.logoUrl) {
          await deleteStorageFileByUrl(sellerStore.logoUrl)
        }
        finalLogo = await uploadImageToStorage(logoUrl, 'store_logo')
      }
      if (bannerUrl && (bannerUrl.startsWith('file:') || bannerUrl.startsWith('ph:'))) {
        if (sellerStore?.bannerUrl) {
          await deleteStorageFileByUrl(sellerStore.bannerUrl)
        }
        finalBanner = await uploadImageToStorage(bannerUrl, 'store_banner')
      }

      if (sellerStore?.$id) {
        await updateStoreProfile(sellerStore.$id, {
          storeName: storeName.trim(),
          description: description.trim(),
          address: address.trim(),
          phone: phone.trim(),
          logoUrl: finalLogo,
          bannerUrl: finalBanner,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
        })
        await fetchAuthenticatedUser()
        Alert.alert('Success', 'Store profile details saved!')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save store settings.')
    } finally {
      setSubmitting(false)
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
            Store Profile & Settings
          </Text>
          <Text className="text-[10px] text-primary font-quicksand-bold uppercase">
            Store Front Setup
          </Text>
        </View>

        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-[32px] p-6 border border-primary/10 shadow-lg shadow-black/10">
          {/* Banner Graphic Selector */}
          <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
            Store Front Cover Banner
          </Text>
          <TouchableOpacity
            onPress={handlePickBanner}
            className="w-full h-32 bg-gray-100 rounded-2xl overflow-hidden mb-6 border border-gray-200 justify-center items-center"
          >
            {bannerUrl ? (
              <Image source={{ uri: bannerUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="items-center">
                <Text className="text-2xl mb-1">🖼️</Text>
                <Text className="text-primary font-quicksand-bold text-xs">Upload Cover Banner</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Logo Selector */}
          <Text className="font-quicksand-bold text-sm text-dark-100 mb-2">
            Store Logo Icon
          </Text>
          <TouchableOpacity
            onPress={handlePickLogo}
            className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden border-2 border-primary/30 justify-center items-center self-center mb-6"
          >
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="items-center">
                <Text className="text-2xl mb-1">🏪</Text>
                <Text className="text-primary font-quicksand-bold text-[10px]">Add Logo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Store Name */}
          <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
            Store Name *
          </Text>
          <TextInput
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Fresh Bites Grocery"
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold mb-4"
          />

          {/* Description */}
          <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
            Store Description
          </Text>
          <TextInput
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            placeholder="Quality groceries, fresh produce and daily items..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold mb-4 min-h-[80px]"
          />

          {/* Address */}
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-quicksand-bold text-sm text-dark-100">
              Store Address *
            </Text>
            <TouchableOpacity
              onPress={() => setMapPickerVisible(true)}
              className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-xl flex-row items-center active:opacity-80"
            >
              <Text className="text-xs font-quicksand-bold text-primary">📍 Set Location on Map</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 12 Commerce Street, Lagos"
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold mb-1"
          />
          {latitude && longitude ? (
            <Text className="text-xs text-green-600 font-quicksand-bold mb-4">
              ✓ Map Location Pin Set ({latitude.toFixed(4)}, {longitude.toFixed(4)})
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Phone */}
          <Text className="font-quicksand-bold text-sm text-dark-100 mb-1">
            Contact Phone Number
          </Text>
          <TextInput
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            placeholder="+234..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-quicksand-semibold mb-6"
          />

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSaveStoreProfile}
            disabled={submitting}
            className="bg-primary py-4 rounded-2xl items-center shadow-lg shadow-primary/30"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-quicksand-bold text-base">
                Save Store Settings
              </Text>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        titleNote="Pin Store Location on Map"
        onSelectLocation={(loc) => {
          setAddress(loc.address)
          setLatitude(loc.latitude)
          setLongitude(loc.longitude)
        }}
      />
    </SafeAreaView>
  )
}
