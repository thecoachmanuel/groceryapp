import { Ionicons } from '@expo/vector-icons'
import { images } from '@/constants'
import useAuthStore from '@/store/auth.store'
import useNotificationStore from '@/store/notification.store'
import { TabBarIconProps } from '@/type'
import cn from 'clsx'
import { Redirect, Tabs } from 'expo-router'
import { Image, Platform, Text, View } from 'react-native'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TabBarIcon = ({
  focused,
  icon,
  title,
  badgeCount,
  ioniconName,
}: TabBarIconProps & { badgeCount?: number; ioniconName?: keyof typeof Ionicons.glyphMap }) => (
  <View
    className={cn(
      'flex items-center justify-center w-16 h-14 rounded-2xl mt-6 relative',
      focused ? 'bg-primary/10' : ''
    )}
  >
    {ioniconName ? (
      <Ionicons
        name={ioniconName}
        size={22}
        color={focused ? '#53B175' : '#9CA3AF'}
      />
    ) : (
      <Image
        source={icon}
        className="size-6"
        resizeMode="contain"
        tintColor={focused ? '#53B175' : '#9CA3AF'}
      />
    )}

    {badgeCount !== undefined && badgeCount > 0 && (
      <View className="absolute top-1 right-2 bg-red-500 rounded-full min-w-[17px] h-[17px] items-center justify-center px-1 border border-white">
        <Text className="text-[9px] text-white font-bold">
          {badgeCount > 99 ? '99+' : badgeCount}
        </Text>
      </View>
    )}

    <Text
      className={cn(
        'text-[10px] mt-0.5 font-quicksand-semibold',
        focused ? 'text-primary' : 'text-gray-400'
      )}
    >
      {title}
    </Text>
  </View>
)

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { isAuthenticated, user, role, sellerStore } = useAuthStore()
  const { getUnreadCount } = useNotificationStore()

  const currentUserId = user?.$id || (user as any)?.accountId
  const sellerStoreId = sellerStore?.$id || (user as any)?.storeId
  const unreadNotifCount = getUnreadCount(role, currentUserId, sellerStoreId)

  const tabBottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: '#ffffff' },
        tabBarStyle: {
          borderRadius: 35,
          marginHorizontal: Platform.OS === 'web' ? 'auto' : 15,
          maxWidth: Platform.OS === 'web' ? 450 : undefined,
          width: Platform.OS === 'web' ? '92%' : undefined,
          left: 0,
          right: 0,
          height: 70,
          position: 'absolute',
          bottom: tabBottomOffset,
          backgroundColor: '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      {/* 1. Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon title="Home" icon={images.home} focused={focused} />
          ),
        }}
      />

      {/* 2. Discover */}
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon title="Discover" icon={images.search} focused={focused} />
          ),
        }}
      />

      {/* 3. Orders / Cart */}
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon title="Orders" icon={images.bag} focused={focused} />
          ),
        }}
      />

      {/* 4. Alerts / Notifications (Outline Icon Type, Positioned After Orders) */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              title="Alerts"
              icon={images.envelope}
              ioniconName={focused ? 'notifications' : 'notifications-outline'}
              focused={focused}
              badgeCount={unreadNotifCount}
            />
          ),
        }}
      />

      {/* 5. Account / Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              title="Account"
              icon={images.person}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  )
}