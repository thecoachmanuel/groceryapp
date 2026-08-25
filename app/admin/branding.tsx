import { images } from '@/constants'
import { uploadImageToStorage } from '@/lib/appwrite'
import useBrandingStore, { DEFAULT_APP_NAME, DEFAULT_APP_TAGLINE } from '@/store/branding.store'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const PRESET_ICONS = ['🥦', '🛒', '🥬', '🍎', '🥑', '🧺', '📦', '🍇', '🍋', '🌿', '🍓', '🥕']

export default function AdminBrandingManager() {
  const router = useRouter()
  const { appName, appLogo, appTagline, loginGraphic, hideAuthLogo, saveBranding, fetchBranding } = useBrandingStore()

  const [name, setName] = useState(appName)
  const [tagline, setTagline] = useState(appTagline)
  const [logoUri, setLogoUri] = useState<string | null>(appLogo)
  const [loginGraphicUri, setLoginGraphicUri] = useState<string | null>(loginGraphic)
  const [hideLogo, setHideLogo] = useState(hideAuthLogo)
  const [customUrl, setCustomUrl] = useState('')
  const [customGraphicUrl, setCustomGraphicUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingGraphic, setUploadingGraphic] = useState(false)

  useEffect(() => {
    fetchBranding()
  }, [])

  useEffect(() => {
    setName(appName)
    setTagline(appTagline)
    setLogoUri(appLogo)
    setLoginGraphicUri(loginGraphic)
    setHideLogo(hideAuthLogo)
  }, [appName, appLogo, appTagline, loginGraphic, hideAuthLogo])

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo library access to upload a new app logo.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      })

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setUploadingImage(true)
        try {
          const uploadedUrl = await uploadImageToStorage(result.assets[0].uri, 'app_logo')
          setLogoUri(uploadedUrl)
          Alert.alert('Logo Uploaded ✅', 'Logo uploaded successfully. Tap "Save Branding" to deploy.')
        } catch (err: any) {
          Alert.alert('Upload Error', err.message || 'Could not upload image. Using local preview.')
          setLogoUri(result.assets[0].uri)
        } finally {
          setUploadingImage(false)
        }
      }
    } catch (err: any) {
      Alert.alert('Picker Error', err.message || 'Could not pick image.')
      setUploadingImage(false)
    }
  }

  const handlePickLoginGraphic = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo library access to upload a login graphic.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      })

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setUploadingGraphic(true)
        try {
          const uploadedUrl = await uploadImageToStorage(result.assets[0].uri, 'login_graphic')
          setLoginGraphicUri(uploadedUrl)
          Alert.alert('Login Graphic Uploaded ✅', 'Image uploaded successfully. Tap "Save Branding" to deploy.')
        } catch (err: any) {
          Alert.alert('Upload Error', err.message || 'Could not upload image. Using local preview.')
          setLoginGraphicUri(result.assets[0].uri)
        } finally {
          setUploadingGraphic(false)
        }
      }
    } catch (err: any) {
      Alert.alert('Picker Error', err.message || 'Could not pick image.')
      setUploadingGraphic(false)
    }
  }

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return
    setLogoUri(customUrl.trim())
    setCustomUrl('')
    Alert.alert('Logo URL Set', 'Logo URL applied. Tap "Save Branding" to deploy.')
  }

  const handleApplyCustomGraphicUrl = () => {
    if (!customGraphicUrl.trim()) return
    setLoginGraphicUri(customGraphicUrl.trim())
    setCustomGraphicUrl('')
    Alert.alert('Login Graphic URL Set', 'Image URL applied. Tap "Save Branding" to deploy.')
  }

  const handleResetDefaults = () => {
    Alert.alert('Reset Branding', 'Reset app name, logo, and login graphic to default platform settings?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset Defaults',
        style: 'destructive',
        onPress: async () => {
          setName(DEFAULT_APP_NAME)
          setTagline(DEFAULT_APP_TAGLINE)
          setLogoUri(null)
          setLoginGraphicUri(null)
          setHideLogo(false)
          await saveBranding(DEFAULT_APP_NAME, null, DEFAULT_APP_TAGLINE, null, false)
          Alert.alert('Reset Done ✅', 'App branding and login graphic restored to default.')
        },
      },
    ])
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'App Name cannot be empty.')
      return
    }

    try {
      setSaving(true)
      Keyboard.dismiss()
      await saveBranding(name.trim(), logoUri, tagline.trim(), loginGraphicUri, hideLogo)
      Alert.alert('Branding Updated 🚀', `App Name is now "${name.trim()}" and branding settings have been deployed globally!`)
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Could not save branding changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-primary/20 shadow-sm shadow-black/5"
          >
            <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-xl font-quicksand-bold text-dark-100">
              App Branding
            </Text>
            <Text className="text-xs text-primary font-quicksand-bold">
              Name & Logo Customizer
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleResetDefaults}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl active:opacity-80"
          >
            <Text className="text-red-600 font-quicksand-bold text-xs">Reset</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Live Preview Card */}
        <View className="bg-white rounded-[32px] p-6 mb-6 border-2 border-primary/20 shadow-xl shadow-black/5 items-center">
          <View className="flex-row items-center self-start mb-3">
            <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-xs font-quicksand-bold text-gray-400 uppercase tracking-wider">
              Live Brand Identity Preview
            </Text>
          </View>

          {/* Logo Display Box */}
          <View className="w-28 h-28 bg-primary/10 rounded-3xl items-center justify-center border-2 border-primary/30 mb-4 overflow-hidden shadow-inner">
            {logoUri ? (
              logoUri.startsWith('http') || logoUri.startsWith('file:') ? (
                <Image source={{ uri: logoUri }} className="w-full h-full" resizeMode="contain" />
              ) : (
                <Text className="text-6xl">{logoUri}</Text>
              )
            ) : (
              <Image source={images.logo} className="w-20 h-20" resizeMode="contain" />
            )}
          </View>

          <Text className="text-2xl font-quicksand-bold text-dark-100 text-center">
            {name || 'Grocery App'}
          </Text>
          <Text className="text-xs font-quicksand-semibold text-primary mt-1 text-center">
            {tagline || 'Fresh Groceries & Daily Essentials'}
          </Text>

          <View className="mt-3 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            <Text className="text-[10px] text-primary font-quicksand-bold">
              {logoUri ? 'Custom Brand Logo Active' : 'Default Embedded Logo Active'}
            </Text>
          </View>
        </View>

        {/* Form Card 1: App Name & Tagline */}
        <View className="bg-white rounded-[28px] p-6 mb-5 border-2 border-primary/15 shadow-lg shadow-black/5">
          <View className="flex-row items-center mb-2">
            <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-base font-quicksand-bold text-dark-100">
              1. Brand Names & Titles
            </Text>
          </View>
          <View className="h-px bg-primary/10 mb-4" />

          {/* App Name Input */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5">
            APP DISPLAY NAME *
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. FreshMart, QuickGrocery"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-3 font-quicksand-bold text-base text-dark-100 mb-4"
          />

          {/* App Tagline Input */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5">
            APP TAGLINE / SUBTITLE
          </Text>
          <TextInput
            value={tagline}
            onChangeText={setTagline}
            placeholder="e.g. Fresh Groceries & Daily Essentials"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-3 font-quicksand-semibold text-sm text-dark-100"
          />
        </View>

        {/* Form Card 2: App Logo Customizer */}
        <View className="bg-white rounded-[28px] p-6 mb-6 border-2 border-primary/15 shadow-lg shadow-black/5">
          <View className="flex-row items-center mb-2">
            <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-base font-quicksand-bold text-dark-100">
              2. App Logo Customizer
            </Text>
          </View>
          <View className="h-px bg-primary/10 mb-4" />

          {/* Upload Image Button */}
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploadingImage}
            className="w-full py-4 bg-primary/10 border-2 border-dashed border-primary/40 rounded-2xl items-center justify-center mb-4 active:opacity-80"
          >
            {uploadingImage ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#53B175" />
                <Text className="text-primary font-quicksand-bold text-sm">Uploading Logo...</Text>
              </View>
            ) : (
              <View className="items-center">
                <Text className="text-2xl mb-1">🖼️</Text>
                <Text className="text-primary font-quicksand-bold text-sm">
                  Upload Custom Logo from Device
                </Text>
                <Text className="text-gray-400 font-quicksand-medium text-[11px] mt-0.5">
                  Select square PNG / JPG image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Preset Brand Icons */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-2">
            OR CHOOSE A PRESET BRAND ICON
          </Text>
          <View className="flex-row flex-wrap gap-2.5 mb-4">
            {PRESET_ICONS.map((icon) => {
              const isSelected = logoUri === icon
              return (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setLogoUri(icon)}
                  className={`w-12 h-12 rounded-2xl items-center justify-center border-2 ${isSelected
                      ? 'bg-primary/20 border-primary'
                      : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <Text className="text-2xl">{icon}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Custom Web URL Option */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5">
            OR ENTER DIRECT IMAGE URL
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="https://example.com/logo.png"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              className="flex-1 bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-2.5 font-quicksand-medium text-xs text-dark-100"
            />
            <TouchableOpacity
              onPress={handleApplyCustomUrl}
              className="bg-primary/10 border-2 border-primary/30 px-4 py-2.5 rounded-2xl items-center justify-center active:opacity-80"
            >
              <Text className="text-primary font-quicksand-bold text-xs">Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Toggle Hide Site Logo on Login */}
          <View className="mt-4 pt-4 border-t border-primary/10 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-quicksand-bold text-dark-100">
                Hide Logo on Login Screen
              </Text>
              <Text className="text-[11px] font-quicksand-medium text-gray-400 mt-0.5">
                When enabled, the floating logo badge will be hidden on login and sign-up screens
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setHideLogo(!hideLogo)}
              activeOpacity={0.8}
              className={`w-12 h-7 rounded-full p-1 justify-center ${hideLogo ? 'bg-primary items-end' : 'bg-gray-200 items-start'}`}
              style={hideLogo ? { backgroundColor: '#53B175' } : { backgroundColor: '#E5E7EB' }}
            >
              <View className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Card 3: Login Top Header Graphic */}
        <View className="bg-white rounded-[28px] p-6 mb-6 border-2 border-primary/15 shadow-lg shadow-black/5">
          <View className="flex-row items-center mb-2">
            <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-base font-quicksand-bold text-dark-100">
              3. Login Screen Top Header Graphic
            </Text>
          </View>
          <View className="h-px bg-primary/10 mb-4" />

          {/* Graphic Preview */}
          <View className="w-full h-36 rounded-2xl overflow-hidden mb-4 border-2 border-primary/20 bg-gray-50 relative justify-center items-center shadow-inner">
            <Image
              source={
                loginGraphicUri
                  ? { uri: loginGraphicUri }
                  : images.loginGraphic
              }
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-2 right-2 bg-black/60 px-2.5 py-1 rounded-full">
              <Text className="text-white text-[10px] font-quicksand-bold">
                {loginGraphicUri ? 'Custom Graphic Active' : 'Default Illustration'}
              </Text>
            </View>
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handlePickLoginGraphic}
            disabled={uploadingGraphic}
            className="w-full py-4 bg-primary/10 border-2 border-dashed border-primary/40 rounded-2xl items-center justify-center mb-4 active:opacity-80"
          >
            {uploadingGraphic ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#53B175" />
                <Text className="text-primary font-quicksand-bold text-sm">Uploading Image...</Text>
              </View>
            ) : (
              <View className="items-center">
                <Text className="text-2xl mb-1">🌄</Text>
                <Text className="text-primary font-quicksand-bold text-sm">
                  Upload Login Top Graphic from Device
                </Text>
                <Text className="text-gray-400 font-quicksand-medium text-[11px] mt-0.5">
                  Select banner image (16:9 recommended)
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Direct URL Input */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5">
            OR ENTER DIRECT IMAGE URL
          </Text>
          <View className="flex-row gap-2 mb-3">
            <TextInput
              value={customGraphicUrl}
              onChangeText={setCustomGraphicUrl}
              placeholder="https://example.com/banner.jpg"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              className="flex-1 bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-2.5 font-quicksand-medium text-xs text-dark-100"
            />
            <TouchableOpacity
              onPress={handleApplyCustomGraphicUrl}
              className="bg-primary/10 border-2 border-primary/30 px-4 py-2.5 rounded-2xl items-center justify-center active:opacity-80"
            >
              <Text className="text-primary font-quicksand-bold text-xs">Apply</Text>
            </TouchableOpacity>
          </View>

          {loginGraphicUri && (
            <TouchableOpacity
              onPress={() => setLoginGraphicUri(null)}
              className="py-2 items-center justify-center bg-gray-100 rounded-xl active:opacity-70"
            >
              <Text className="text-gray-600 font-quicksand-bold text-xs">
                Revert to Default Login Illustration
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save & Deploy Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
          className="bg-primary py-4 rounded-2xl items-center justify-center shadow-lg shadow-primary/30"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-quicksand-bold text-base">
              Save & Deploy Branding 🚀
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
