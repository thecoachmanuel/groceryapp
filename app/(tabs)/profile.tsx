import { account, appwriteConfig, uploadAvatar, updateUserProfile } from '@/lib/appwrite'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import useAuthStore from '@/store/auth.store'
import * as ImagePicker from 'expo-image-picker'
import AddressManagerModal from '@/components/AddressManagerModal'
import useBrandingStore from '@/store/branding.store'

const Profile = () => {
  const router = useRouter()
  const { user, isLoading, fetchAuthenticatedUser, role, isAdmin, isSeller } = useAuthStore()
  const { appName } = useBrandingStore()
  const [loggingOut, setLoggingOut] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editProfileVisible, setEditProfileVisible] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [addressModalVisible, setAddressModalVisible] = useState(false)

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
        await fetchAuthenticatedUser()
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

  if (isLoading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light">
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    )
  }

  const avatarUrl = user.avatar || `https://cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(
    user.name,
  )}&project=${appwriteConfig.projectId}`

  const isAdminUser = isAdmin || user.email === adminEmail || (user as any).role === 'admin'
  const isSellerUser = isSeller || (user as any).role === 'seller'

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center', paddingBottom: 100 }}>
        <View className="bg-white w-full rounded-3xl p-6 items-center shadow-lg shadow-black/10 border border-primary/10">
          {/* Avatar Container with Upload Badge */}
          <TouchableOpacity
            onPress={handlePickAvatar}
            onLongPress={() => setAdminModalVisible(true)}
            disabled={uploadingAvatar}
            className="relative w-32 h-32 rounded-full overflow-hidden shadow-md shadow-black/20 mb-3 border-4 border-primary/20"
          >
            {uploadingAvatar ? (
              <View className="w-full h-full bg-black/40 justify-center items-center">
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <Image
                source={{ uri: avatarUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            )}
            <View className="absolute bottom-0 left-0 right-0 bg-primary/80 py-1 items-center">
              <Text className="text-white text-[10px] font-bold">📷 EDIT</Text>
            </View>
          </TouchableOpacity>

          <Text className="text-2xl font-quicksand-bold text-dark-100">
            {user.name}
          </Text>
          <Text className="text-gray-400 mt-0.5 text-sm font-quicksand-medium">{user.email}</Text>

          {/* Role Badge */}
          <View className="mt-2 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
            <Text className="text-primary font-quicksand-bold text-xs uppercase tracking-wider">
              {isAdminUser ? '👑 App Owner (Admin)' : isSellerUser ? '🏪 Seller Partner' : '🛒 Customer Account'}
            </Text>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            onPress={() => {
              setEditName(user.name)
              setEditPhone((user as any).phone || '')
              setEditProfileVisible(true)
            }}
            className="mt-4 bg-primary/10 px-5 py-2 rounded-full border border-primary/30 flex-row items-center"
          >
            <Text className="text-primary font-quicksand-bold text-xs mr-1.5">✏️ Edit Profile</Text>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View className="w-full mt-6 gap-3">
            {/* Admin Control Panel Access (Only for logged in Admin) */}
            {isAdminUser && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/admin/dashboard' as any)}
                className="bg-primary/10 border-2 border-primary/40 p-4 rounded-[28px] flex-row justify-between items-center shadow-lg shadow-primary/10 mb-1"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-2xl bg-primary/20 items-center justify-center mr-3 border border-primary/30">
                    <Text className="text-xl">👑</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-quicksand-bold text-primary text-sm">
                      Admin Control Panel
                    </Text>
                    <Text className="text-gray-500 font-quicksand-medium text-xs">
                      Switch to Admin Dashboard
                    </Text>
                  </View>
                </View>
                <View className="bg-primary px-3 py-1 rounded-full">
                  <Text className="text-white font-quicksand-bold text-xs">Open →</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Customer My Orders Button */}
            <TouchableOpacity
              onPress={() => router.push('/orders' as any)}
              className="bg-white border-2 border-primary/10 p-4 rounded-[28px] flex-row justify-between items-center shadow-lg shadow-black/10"
            >
              <View className="flex-row items-center">
                <Text className="text-xl mr-3">📦</Text>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-sm">
                    My Orders History
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Track ongoing & past orders live
                  </Text>
                </View>
              </View>
              <Text className="text-primary font-bold text-lg">→</Text>
            </TouchableOpacity>

            {/* Customer Wallet & Financials */}
            <TouchableOpacity
              onPress={() => router.push('/wallet' as any)}
              className="bg-white border-2 border-primary/10 p-4 rounded-[28px] flex-row justify-between items-center shadow-lg shadow-black/10"
            >
              <View className="flex-row items-center">
                <Text className="text-xl mr-3">👛</Text>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-sm">
                    My Digital Wallet & Balance
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Fund wallet & view transaction history
                  </Text>
                </View>
              </View>
              <Text className="text-primary font-bold text-lg">→</Text>
            </TouchableOpacity>

            {/* Saved Delivery Addresses */}
            <TouchableOpacity
              onPress={() => router.push('/address' as any)}
              className="bg-white border-2 border-primary/10 p-4 rounded-[28px] flex-row justify-between items-center shadow-lg shadow-black/10"
            >
              <View className="flex-row items-center">
                <Text className="text-xl mr-3">🏠</Text>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-sm">
                    Saved Delivery Addresses
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Manage 🏠 Home, 💼 Work & custom locations
                  </Text>
                </View>
              </View>
              <Text className="text-primary font-bold text-lg">→</Text>
            </TouchableOpacity>

            {/* Help & Information Section */}
            <View className="mt-4 mb-1">
              <Text className="text-xs font-quicksand-bold text-gray-400 uppercase tracking-widest px-1">
                Help & Information
              </Text>
            </View>

            {/* FAQ */}
            <TouchableOpacity
              onPress={() => router.push('/menu/faq' as any)}
              className="bg-white border-2 border-primary/10 p-4 rounded-[28px] flex-row justify-between items-center shadow-lg shadow-black/10"
            >
              <View className="flex-row items-center">
                <Text className="text-xl mr-3">❓</Text>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-sm">
                    Frequently Asked Questions
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Delivery, payments & order help
                  </Text>
                </View>
              </View>
              <Text className="text-primary font-bold text-lg">→</Text>
            </TouchableOpacity>

            {/* About Us */}
            <TouchableOpacity
              onPress={() => router.push('/menu/about' as any)}
              className="bg-white border-2 border-primary/10 p-4 rounded-[28px] flex-row justify-between items-center shadow-lg shadow-black/10"
            >
              <View className="flex-row items-center">
                <Text className="text-xl mr-3">ℹ️</Text>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-sm">
                    About {appName}
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Our story, mission & app details
                  </Text>
                </View>
              </View>
              <Text className="text-primary font-bold text-lg">→</Text>
            </TouchableOpacity>

            {/* Help & Support */}
            <TouchableOpacity
              onPress={() => router.push('/menu/contact' as any)}
              className="bg-white border-2 border-primary/10 p-4 rounded-[28px] flex-row justify-between items-center shadow-lg shadow-black/10"
            >
              <View className="flex-row items-center">
                <Text className="text-xl mr-3">🎧</Text>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-sm">
                    Help & Support
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Contact support, email or call us
                  </Text>
                </View>
              </View>
              <Text className="text-primary font-bold text-lg">→</Text>
            </TouchableOpacity>

            {/* Terms & Privacy */}
            <TouchableOpacity
              onPress={() => router.push('/menu/terms' as any)}
              className="bg-white border-2 border-primary/10 p-4 rounded-[28px] flex-row justify-between items-center shadow-lg shadow-black/10"
            >
              <View className="flex-row items-center">
                <Text className="text-xl mr-3">📜</Text>
                <View>
                  <Text className="font-quicksand-bold text-dark-100 text-sm">
                    Terms & Privacy Policy
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs">
                    Legal terms & privacy protection
                  </Text>
                </View>
              </View>
              <Text className="text-primary font-bold text-lg">→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              disabled={loggingOut}
              className="bg-red-500 p-4 rounded-2xl w-full items-center justify-center shadow-md shadow-red-500/20"
            >
              {loggingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-quicksand-bold text-base">
                  Logout
                </Text>
              )}
            </TouchableOpacity>
          </View>


          {/* Footer - Secret 5-tap Admin trigger */}
          <TouchableOpacity onPress={handleVersionTap} className="mt-8 items-center">
            <Text className="text-gray-300 font-quicksand-medium text-xs">
              {appName} v1.0.0 • 2026
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setAdminModalVisible(false)
            }}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl z-10">
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
              >
                <Text className="text-white font-quicksand-bold">Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal (Read-Only Email Protection — Pure Light Mode Design) */}
      <Modal
        visible={editProfileVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss()
          setEditProfileVisible(false)
        }}
      >
        <View className="flex-1 bg-slate-900/40 justify-center items-center px-5">
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss()
              setEditProfileVisible(false)
            }}
            className="absolute inset-0"
          />

          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border-2 border-primary/20 shadow-2xl z-10">
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
              className="bg-white border-2 border-primary/10 rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-3 text-dark-100 shadow-sm shadow-black/5"
            />

            {/* Phone Number Input */}
            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Mobile Phone Number</Text>
            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +234 801 234 5678"
              placeholderTextColor="#9CA3AF"
              className="bg-white border-2 border-primary/10 rounded-2xl px-4 py-2.5 font-quicksand-semibold text-sm mb-3 text-dark-100 shadow-sm shadow-black/5"
            />

            {/* Locked Email Field (Read-Only for Customer) */}
            <Text className="text-xs font-quicksand-bold text-gray-400 mb-1">Email Address 🔒</Text>
            <View className="bg-gray-50 border-2 border-primary/10 rounded-2xl px-4 py-2.5 mb-1 flex-row items-center justify-between">
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
                className="flex-1 bg-red-500/10 border-2 border-red-500/20 py-3 rounded-full items-center active:opacity-80"
              >
                <Text className="text-red-600 font-quicksand-bold text-xs">Cancel</Text>
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
    </SafeAreaView>
  )
}

export default Profile