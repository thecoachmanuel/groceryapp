import FastImage from '@/components/FastImage'
import { useCartStore } from '@/store/cart.store'
import { useRouter } from 'expo-router'
import React from 'react'
import { Platform, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface FloatingCartPillProps {
  bottomOffset?: number
}

export default function FloatingCartPill({ bottomOffset: customBottomOffset }: FloatingCartPillProps = {}) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { items, getTotalItems, getTotalPrice } = useCartStore()

  const totalItems = getTotalItems()
  const totalPrice = getTotalPrice()

  if (totalItems <= 0) return null

  // Extract up to 3 product thumbnail images
  const itemImages = items
    .map((item) => item.image_url || (item as any).image || '')
    .filter(Boolean)
    .slice(0, 3)

  const safeBottom = Platform.OS === 'ios'
    ? Math.max(insets.bottom || 0, 12)
    : (insets.bottom > 0 ? insets.bottom : 0)

  // Bottom tab bar height is 70. Pill sits 10px directly above the bottom nav bar (70 + 10 = 80).
  const defaultTabPillOffset = safeBottom + 80

  const bottomOffset = customBottomOffset !== undefined
    ? customBottomOffset
    : defaultTabPillOffset

  return (
    <View
      style={{ position: 'absolute', bottom: bottomOffset, left: 0, right: 0, zIndex: 999 }}
      className="items-center px-5 pointer-events-box-none"
    >
      <TouchableOpacity
        onPress={() => router.push('/cart' as any)}
        activeOpacity={0.9}
        className="bg-primary rounded-full px-5 py-3 flex-row items-center justify-between shadow-2xl shadow-primary/40 border-2 border-white self-stretch max-w-sm mx-auto"
        style={{ backgroundColor: '#53B175' }}
      >
        {/* Stacked Product Thumbnails */}
        <View className="flex-row items-center mr-3">
          {itemImages.length > 0 ? (
            <View className="flex-row items-center mr-2">
              {itemImages.map((uri, idx) => (
                <FastImage
                  key={idx}
                  source={uri}
                  className={`w-9 h-9 rounded-full border-2 border-white bg-white ${idx > 0 ? '-ml-4' : ''
                    }`}
                  contentFit="cover"
                />
              ))}
            </View>
          ) : (
            <View className="w-9 h-9 rounded-full bg-white/20 items-center justify-center mr-2">
              <Text className="text-base">🛒</Text>
            </View>
          )}

          <View>
            <Text className="text-white font-quicksand-bold text-sm">
              View Cart • {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </Text>
            <Text className="text-white/80 font-quicksand-medium text-xs">
              Total: ₦ {totalPrice.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Action Chevron Pill */}
        <View className="bg-white/20 rounded-full px-3 py-1.5 flex-row items-center">
          <Text className="text-white font-quicksand-bold text-xs mr-1">Checkout</Text>
          <Text className="text-white font-bold text-sm">→</Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}
