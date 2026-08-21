import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { usePathname, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import useAuthStore from '@/store/auth.store'
import { account } from '@/lib/appwrite'

interface SidebarDrawerProps {
  visible: boolean
  onClose: () => void
  type: 'admin' | 'seller'
}

export default function SidebarDrawer({ visible, onClose, type }: SidebarDrawerProps) {
  const router = useRouter()
  const currentPath = usePathname()
  const { user, sellerStore, fetchAuthenticatedUser } = useAuthStore()
  const [loggingOut, setLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true)
            onClose()
            await account.deleteSession('current')
            await fetchAuthenticatedUser()
            router.replace('/(auth)/sign-in' as any)
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Logout failed')
          } finally {
            setLoggingOut(false)
          }
        },
      },
    ])
  }

  const navigateTo = (path: string) => {
    onClose()
    if (currentPath !== path) {
      router.push(path as any)
    }
  }

  const adminNavItems = [
    { label: 'Admin Dashboard', icon: '📊', path: '/admin/dashboard', desc: 'System overview & metrics' },
    { label: 'App Branding', icon: '🎨', path: '/admin/branding', desc: 'App name & logo customizer' },
    { label: 'Broadcast & Promos', icon: '📣', path: '/admin/broadcast', desc: 'Push alerts & promo codes' },
    { label: 'All Orders', icon: '📦', path: '/admin/orders', desc: 'Fulfillment & track orders' },
    { label: 'Products Catalog', icon: '🛒', path: '/admin/products', desc: 'Manage menu & stock' },
    { label: 'Category List', icon: '🏷️', path: '/admin/categories', desc: 'Product categories' },
    { label: 'Home Banner Ads', icon: '📢', path: '/admin/banners', desc: 'App home banner ads' },
    { label: 'Promo Coupons', icon: '🎟️', path: '/admin/coupons', desc: 'Discounts & promo codes' },
    { label: 'Customer Wallets', icon: '👛', path: '/admin/customers', desc: 'Accounts & wallet logs' },
    { label: 'Seller Stores', icon: '🏪', path: '/admin/sellers', desc: 'Store partners & payouts' },
    { label: 'Platform Policies', icon: '⚙️', path: '/admin/policies', desc: 'Cart rules & refund policy' },
  ]

  const sellerNavItems = [
    { label: 'Seller Dashboard', icon: '📊', path: '/seller/dashboard', desc: 'Sales & active pipeline' },
    { label: 'Store Orders', icon: '📦', path: '/seller/orders', desc: 'Fulfill customer orders' },
    { label: 'Product Inventory', icon: '🍎', path: '/seller/products', desc: 'Stock & pricing' },
    { label: 'Store Settings', icon: '🏪', path: '/seller/store-settings', desc: 'Store info & address' },
  ]

  const navItems = type === 'admin' ? adminNavItems : sellerNavItems
  const roleTitle = type === 'admin' ? '👑 App Owner (Admin)' : '🏪 Seller Partner'
  const storeName = sellerStore?.storeName || user?.name || 'Workspace'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', flexDirection: 'row' }}>
        {/* Drawer Panel */}
        <View
          style={{
            width: '84%',
            maxWidth: 330,
            backgroundColor: '#FFFFFF',
            height: '100%',
            borderTopRightRadius: 36,
            borderBottomRightRadius: 36,
            borderRightWidth: 2,
            borderColor: 'rgba(22, 163, 74, 0.2)',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowOffset: { width: 4, height: 0 },
            shadowRadius: 16,
            elevation: 20,
          }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header Profile Section */}
            <View className="px-5 pt-4 pb-5 bg-primary/5 border-b-2 border-primary/10">
              <View className="flex-row justify-between items-center mb-3">
                <View className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex-row items-center">
                  <Text className="text-primary font-quicksand-bold text-[10px] uppercase tracking-wider">
                    {roleTitle}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 bg-white rounded-full items-center justify-center border border-gray-200 shadow-sm"
                >
                  <Text className="font-bold text-gray-500 text-xs">✕</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center">
                <Image
                  source={{ uri: (user as any)?.avatar || `https://cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(user?.name || 'User')}` }}
                  className="w-12 h-12 rounded-full border-2 border-primary/30 mr-3 bg-white"
                />
                <View className="flex-1">
                  <Text className="font-quicksand-bold text-dark-100 text-base" numberOfLines={1}>
                    {type === 'seller' ? storeName : user?.name || 'Admin'}
                  </Text>
                  <Text className="text-gray-400 font-quicksand-medium text-xs" numberOfLines={1}>
                    {user?.email}
                  </Text>
                </View>
              </View>
            </View>

            {/* Navigation List */}
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Category Header */}
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                <Text className="text-dark-100 font-quicksand-bold text-xs uppercase tracking-widest">
                  Workspace Navigation
                </Text>
              </View>
              <View className="h-px bg-primary/10 mb-4" />

              {/* Nav Items */}
              <View className="gap-2.5">
                {navItems.map((item) => {
                  const isActive = currentPath === item.path
                  return (
                    <TouchableOpacity
                      key={item.path}
                      activeOpacity={0.8}
                      onPress={() => navigateTo(item.path)}
                      style={{
                        backgroundColor: isActive ? 'rgba(22, 163, 74, 0.08)' : '#FFFFFF',
                        borderWidth: 2,
                        borderColor: isActive ? '#16A34A' : 'rgba(22, 163, 74, 0.1)',
                        borderRadius: 20,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        shadowColor: '#000',
                        shadowOpacity: isActive ? 0.08 : 0.03,
                        shadowOffset: { width: 0, height: 2 },
                        shadowRadius: 6,
                        elevation: isActive ? 4 : 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: isActive ? '#16A34A' : 'rgba(22, 163, 74, 0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}>
                          <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontFamily: 'Quicksand-Bold',
                            fontSize: 13,
                            color: isActive ? '#16A34A' : '#1A1A2E',
                          }}>
                            {item.label}
                          </Text>
                          <Text style={{
                            fontFamily: 'Quicksand-Medium',
                            fontSize: 10,
                            color: '#9CA3AF',
                            marginTop: 1,
                          }}>
                            {item.desc}
                          </Text>
                        </View>
                      </View>
                      <Text style={{
                        fontFamily: 'Quicksand-Bold',
                        fontSize: 14,
                        color: isActive ? '#16A34A' : '#D1D5DB',
                      }}>
                        →
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* System Switch Header */}
              <View className="flex-row items-center mt-6 mb-2">
                <View className="w-2 h-2 bg-primary rounded-full mr-2" />
                <Text className="text-dark-100 font-quicksand-bold text-xs uppercase tracking-widest">
                  Quick Actions
                </Text>
              </View>
              <View className="h-px bg-primary/10 mb-4" />

              {/* Customer App Mode Switch */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigateTo('/(tabs)')}
                style={{
                  backgroundColor: 'rgba(22, 163, 74, 0.05)',
                  borderWidth: 2,
                  borderColor: 'rgba(22, 163, 74, 0.2)',
                  borderRadius: 20,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, marginRight: 10 }}>🛒</Text>
                  <View>
                    <Text style={{ fontFamily: 'Quicksand-Bold', fontSize: 13, color: '#16A34A' }}>
                      Customer App Mode
                    </Text>
                    <Text style={{ fontFamily: 'Quicksand-Medium', fontSize: 10, color: '#6B7280' }}>
                      Switch to shopping interface
                    </Text>
                  </View>
                </View>
                <Text style={{ color: '#16A34A', fontWeight: 'bold' }}>→</Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLogout}
                disabled={loggingOut}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderWidth: 2,
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  borderRadius: 20,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {loggingOut ? (
                  <ActivityIndicator color="#DC2626" size="small" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={17} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={{ fontFamily: 'Quicksand-Bold', fontSize: 13, color: '#DC2626' }}>
                      Log Out
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>

        {/* Backdrop Touch to Close */}
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </View>
    </Modal>
  )
}
