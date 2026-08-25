import CartButton from '@/components/CartButton'
import { images } from '@/constants'
import { account, appwriteConfig, updateUserProfile, uploadAvatar } from '@/lib/appwrite'
import useAuthStore from '@/store/auth.store'
import useBrandingStore from '@/store/branding.store'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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

const Profile = () => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, isLoading, fetchAuthenticatedUser, role, isAdmin, isSeller } = useAuthStore()
  const { appName } = useBrandingStore()
  const [loggingOut, setLoggingOut] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editProfileVisible, setEditProfileVisible] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Secret Admin Access State
  const [adminModalVisible, setAdminModalVisible] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [tapCount, setTapCount] = useState(0)

  const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@grocery.com'
  const targetPin = process.env.EXPO_PUBLIC_ADMIN_PIN || '1234'

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please grant photo library access to change your avatar.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]?.uri) {
        setUploadingAvatar(true)
        const newAvatarUrl = await uploadAvatar(
          (user as any)?.$id || 'user',
          (user as any)?.$id || '',
          result.assets[0].uri,
        )
        if (user) {
          useAuthStore.getState().setUser({ ...user, avatar: newAvatarUrl })
        }
        await fetchAuthenticatedUser(true)
        Alert.alert('Success', 'Profile avatar updated!')
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not update avatar.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Secret Tap Trigger for App Owner / Admin
  const handleVersionTap = () => {
    const newCount = tapCount + 1
    setTapCount(newCount)
    if (newCount >= 5) {
      setTapCount(0)
      setAdminModalVisible(true)
    }
  }

  const handleAdminVerify = () => {
    if (adminPin === targetPin || user?.email === adminEmail || isAdmin) {
      setAdminModalVisible(false)
      setAdminPin('')
      router.push('/admin/dashboard' as any)
    } else {
      Alert.alert('Access Denied', 'Invalid Admin Passcode.')
    }
  }

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true)
            await account.deleteSession('current')
            await fetchAuthenticatedUser()
            router.replace('/(auth)/sign-in' as any)
          } catch (error) {
            console.log(error)
          } finally {
            setLoggingOut(false)
          }
        },
      },
    ])
  }

  const tabBottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)

  if (isLoading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-white" style={{ backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#53B175" />
      </View>
    )
  }

  const avatarUrl = user.avatar || `https://cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(
    user.name,
  )}&project=${appwriteConfig.projectId}`

  const isAdminUser = isAdmin || user.email === adminEmail || (user as any).role === 'admin'
  const isSellerUser = isSeller || (user as any).role === 'seller'

  return (
    <View className="flex-1 bg-white relative" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Viewport Bounded Content Container ── */}
      <View style={{ flex: 1, marginBottom: tabBottomOffset }} className="overflow-hidden">
        {/* Header matching Find Products Page design */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="pt-2 pb-2 bg-white border-b border-[#F1F1F1]" style={{ backgroundColor: '#ffffff', borderColor: '#F1F1F1' }}>
            <SafeAreaView edges={['top']} className="bg-white px-5 pt-2 pb-2" style={{ backgroundColor: '#ffffff' }}>
              {/* Top Title Row */}
              <View className="flex-row items-center justify-between mb-1">
                <View>
                  <Text className="text-2xl font-quicksand-bold font-bold text-dark-100">
                    My Account
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                    Manage orders, wallet & personal profile
                  </Text>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </TouchableWithoutFeedback>

        {/* Scrollable Profile Settings Body */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
        >
          {/* User Profile Card */}
          <View className="bg-white rounded-3xl p-5 items-center border border-[#F1F1F1] mb-5" style={{ borderColor: '#F1F1F1' }}>
            {/* Avatar Container with Edit Badge */}
            <TouchableOpacity
              onPress={handlePickAvatar}
              onLongPress={() => setAdminModalVisible(true)}
              disabled={uploadingAvatar}
              className="relative w-24 h-24 rounded-full overflow-hidden mb-3 border-2 border-primary/20 bg-gray-50 items-center justify-center"
            >
              {uploadingAvatar ? (
                <View className="w-full h-full bg-black/40 justify-center items-center">
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%', borderRadius: 9999 }}
                  resizeMode="cover"
                />
              )}
              <View className="absolute bottom-0 left-0 right-0 py-0.5 items-center" style={{ backgroundColor: '#53B175' }}>
                <Text className="text-white text-[9px] font-quicksand-bold">📷 EDIT</Text>
              </View>
            </TouchableOpacity>

            <Text className="text-xl font-quicksand-bold font-bold text-dark-100 text-center">
              {user.name}
            </Text>
            <Text className="text-gray-400 text-xs font-quicksand-medium mt-0.5">{user.email}</Text>

            {/* Role Badge */}
            {(isAdminUser || isSellerUser) && (
              <View className="mt-2 px-3 py-1 rounded-full border flex-row items-center" style={{ backgroundColor: 'rgba(83, 177, 117, 0.08)', borderColor: 'rgba(83, 177, 117, 0.2)' }}>
                <Text className="font-quicksand-bold text-[11px] uppercase tracking-wide" style={{ color: '#53B175' }}>
                  {isAdminUser ? '👑 App Owner (Admin)' : '🏪 Seller Partner'}
                </Text>
              </View>
            )}

            {/* Edit Profile Button */}
            <TouchableOpacity
              onPress={() => {
                setEditName(user.name)
                setEditPhone((user as any).phone || '')
                setEditProfileVisible(true)
              }}
              className="mt-3 px-4 py-1.5 rounded-full border flex-row items-center active:scale-95"
              style={{ backgroundColor: 'rgba(83, 177, 117, 0.08)', borderColor: 'rgba(83, 177, 117, 0.2)' }}
            >
              <Text className="font-quicksand-bold text-xs" style={{ color: '#53B175' }}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Action Navigation Cards */}
          <View className="gap-3">
            {/* Admin Control Panel Access */}
            {isAdminUser && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push('/admin/dashboard' as any)}
                className="bg-primary/10 border border-primary/30 p-3.5 rounded-2xl flex-row justify-between items-center mb-1"
                style={{ backgroundColor: 'rgba(83, 177, 117, 0.08)', borderColor: 'rgba(83, 177, 117, 0.3)' }}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-xl bg-primary/20 items-center justify-center mr-3">
                    <Text className="text-lg">👑</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-quicksand-bold text-sm" style={{ color: '#53B175' }}>
                      Admin Control Panel
                    </Text>
                    <Text className="text-gray-500 font-quicksand-medium text-xs">
                      Switch to Admin Dashboard
                    </Text>
                  </View>
                </View>
                <View className="bg-primary px-3 py-1 rounded-full" style={{ backgroundColor: '#53B175' }}>
                  <Text className="text-white font-quicksand-bold text-xs">Open →</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* My Orders */}
            <TouchableOpacity
              onPress={() => router.push('/orders' as any)}
              className="bg-white border border-[#F1F1F1] p-3.5 rounded-2xl flex-row justify-between items-center"
              style={{ borderColor: '#F1F1F1' }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-[#F1F1F1]">
                  <Text className="text-lg">📦</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold font-bold text-dark-100 text-sm">
                    Orders
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Track ongoing & past orders live
                  </Text>
                </View>
              </View>
              <Text className="font-quicksand-bold font-bold text-sm" style={{ color: '#53B175' }}>→</Text>
            </TouchableOpacity>

            {/* Wallet */}
            <TouchableOpacity
              onPress={() => router.push('/wallet' as any)}
              className="bg-white border border-[#F1F1F1] p-3.5 rounded-2xl flex-row justify-between items-center"
              style={{ borderColor: '#F1F1F1' }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-[#F1F1F1]">
                  <Text className="text-lg">👛</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold font-bold text-dark-100 text-sm">
                    My Wallet
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Fund wallet & view transaction history
                  </Text>
                </View>
              </View>
              <Text className="font-quicksand-bold font-bold text-sm" style={{ color: '#53B175' }}>→</Text>
            </TouchableOpacity>

            {/* Delivery Address */}
            <TouchableOpacity
              onPress={() => router.push('/address' as any)}
              className="bg-white border border-[#F1F1F1] p-3.5 rounded-2xl flex-row justify-between items-center"
              style={{ borderColor: '#F1F1F1' }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-[#F1F1F1]">
                  <Text className="text-lg">🏠</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold font-bold text-dark-100 text-sm">
                    Delivery Address
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Manage Home, Work & custom locations
                  </Text>
                </View>
              </View>
              <Text className="font-quicksand-bold font-bold text-sm" style={{ color: '#53B175' }}>→</Text>
            </TouchableOpacity>

            {/* Help & Information Section Title */}
            <View className="mt-3 mb-0.5">
              <Text className="text-[11px] font-quicksand-bold font-bold text-gray-400 uppercase tracking-wider px-1">
                Help & Information
              </Text>
            </View>

            {/* FAQ */}
            <TouchableOpacity
              onPress={() => router.push('/menu/faq' as any)}
              className="bg-white border border-[#F1F1F1] p-3.5 rounded-2xl flex-row justify-between items-center"
              style={{ borderColor: '#F1F1F1' }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-[#F1F1F1]">
                  <Text className="text-lg">❓</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold font-bold text-dark-100 text-sm">
                    Help & FAQs
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Delivery, payments & order help
                  </Text>
                </View>
              </View>
              <Text className="font-quicksand-bold font-bold text-sm" style={{ color: '#53B175' }}>→</Text>
            </TouchableOpacity>

            {/* About */}
            <TouchableOpacity
              onPress={() => router.push('/menu/about' as any)}
              className="bg-white border border-[#F1F1F1] p-3.5 rounded-2xl flex-row justify-between items-center"
              style={{ borderColor: '#F1F1F1' }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-[#F1F1F1]">
                  <Text className="text-lg">ℹ️</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold font-bold text-dark-100 text-sm">
                    About
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Our story, mission & app details
                  </Text>
                </View>
              </View>
              <Text className="font-quicksand-bold font-bold text-sm" style={{ color: '#53B175' }}>→</Text>
            </TouchableOpacity>

            {/* Contact Support */}
            <TouchableOpacity
              onPress={() => router.push('/menu/contact' as any)}
              className="bg-white border border-[#F1F1F1] p-3.5 rounded-2xl flex-row justify-between items-center"
              style={{ borderColor: '#F1F1F1' }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-[#F1F1F1]">
                  <Text className="text-lg">🎧</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold font-bold text-dark-100 text-sm">
                    Contact Support
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Contact support, email or call us
                  </Text>
                </View>
              </View>
              <Text className="font-quicksand-bold font-bold text-sm" style={{ color: '#53B175' }}>→</Text>
            </TouchableOpacity>

            {/* Terms & Privacy */}
            <TouchableOpacity
              onPress={() => router.push('/menu/terms' as any)}
              className="bg-white border border-[#F1F1F1] p-3.5 rounded-2xl flex-row justify-between items-center mb-2"
              style={{ borderColor: '#F1F1F1' }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-[#F1F1F1]">
                  <Text className="text-lg">📜</Text>
                </View>
                <View>
                  <Text className="font-quicksand-bold font-bold text-dark-100 text-sm">
                    Terms & Privacy Policy
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
                    Legal terms & privacy protection
                  </Text>
                </View>
              </View>
              <Text className="font-quicksand-bold font-bold text-sm" style={{ color: '#53B175' }}>→</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              onPress={handleLogout}
              disabled={loggingOut}
              className="bg-red-500 py-3.5 px-4 rounded-2xl w-full items-center justify-center active:scale-98 mt-2"
            >
              {loggingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-quicksand-bold text-sm">
                  Logout Account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer - Secret 5-tap Admin trigger */}
          <TouchableOpacity onPress={handleVersionTap} className="mt-6 items-center">
            <Text className="text-gray-400 font-quicksand-medium text-xs">
              {appName} v1.0.0 • 2026
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Secret Admin Passcode Modal */}
      <Modal
        visible={adminModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss()
          setAdminModalVisible(false)
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setAdminModalVisible(false)
            }}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center z-10 border border-[#F1F1F1]" style={{ borderColor: '#F1F1F1' }}>
            <Text className="text-3xl mb-2">🔐</Text>
            <Text className="text-xl font-quicksand-bold text-dark-100 mb-1">
              App Owner Gatekeeper
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-xs text-center mb-5">
              Enter secret admin passcode to launch management portal.
            </Text>

            <TextInput
              secureTextEntry
              keyboardType="numeric"
              placeholder="Enter Admin PIN"
              value={adminPin}
              onChangeText={setAdminPin}
              className="w-full bg-gray-100 border border-gray-300 rounded-2xl px-4 py-3 text-center text-lg font-bold mb-4"
            />

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss()
                  setAdminModalVisible(false)
                }}
                className="flex-1 bg-gray-200 py-3 rounded-full items-center"
              >
                <Text className="text-gray-700 font-quicksand-bold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAdminVerify}
                className="flex-1 bg-primary py-3 rounded-full items-center"
                style={{ backgroundColor: '#53B175' }}
              >
                <Text className="text-white font-quicksand-bold">Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss()
          setEditProfileVisible(false)
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setEditProfileVisible(false)
            }}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-[#F1F1F1] z-10" style={{ borderColor: '#F1F1F1' }}>
            <Text className="text-lg font-quicksand-bold text-dark-100 mb-1">
              Edit Account Profile
            </Text>
            <Text className="text-gray-400 font-quicksand-medium text-xs mb-4">
              Update your personal details below.
            </Text>

            {/* Name Input */}
            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Full Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              placeholderTextColor="#9CA3AF"
              className="bg-white border border-[#F1F1F1] rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-3 text-dark-100"
              style={{ borderColor: '#F1F1F1' }}
            />

            {/* Phone Number Input */}
            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Mobile Phone Number</Text>
            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +234 801 234 5678"
              placeholderTextColor="#9CA3AF"
              className="bg-white border border-[#F1F1F1] rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-3 text-dark-100"
              style={{ borderColor: '#F1F1F1' }}
            />

            {/* Locked Email Field */}
            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Email Address 🔒</Text>
            <View className="bg-gray-50 border border-[#F1F1F1] rounded-2xl px-4 py-2.5 mb-1 flex-row items-center justify-between" style={{ borderColor: '#F1F1F1' }}>
              <Text className="font-quicksand-semibold text-sm text-gray-600">{user.email}</Text>
              <Text className="text-xs text-gray-400 font-bold">🔒 LOCKED</Text>
            </View>
            <Text className="text-[10px] font-quicksand-medium text-gray-400 mb-5">
              Email cannot be changed by customer. Contact an Administrator to request email updates.
            </Text>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setEditProfileVisible(false)}
                className="flex-1 bg-gray-100 py-3 rounded-full items-center active:opacity-80"
              >
                <Text className="text-gray-700 font-quicksand-bold text-xs">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (!editName.trim()) {
                    Alert.alert('Validation Error', 'Please enter a valid name.')
                    return
                  }
                  setIsSavingProfile(true)
                  try {
                    await updateUserProfile((user as any).$id, {
                      name: editName.trim(),
                      phone: editPhone.trim(),
                    })
                    await fetchAuthenticatedUser()
                    setEditProfileVisible(false)
                    Alert.alert('Profile Updated', 'Your profile details have been saved successfully.')
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Could not update profile.')
                  } finally {
                    setIsSavingProfile(false)
                  }
                }}
                disabled={isSavingProfile}
                className="flex-1 bg-primary py-3 rounded-full items-center justify-center"
                style={{ backgroundColor: '#53B175' }}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-quicksand-bold text-xs">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default Profile