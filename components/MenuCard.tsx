import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { MenuItem } from "@/type"
import { appwriteConfig, getOptimizedImageUrl } from "@/lib/appwrite"
import { useCartStore } from '@/store/cart.store'
import { useRouter } from 'expo-router'
import FastImage from '@/components/FastImage'

interface MenuCardProps {
  item: MenuItem
}

const MenuCard = ({ item }: MenuCardProps) => {
  const { $id, name, price, type, rating, discountPrice } = item
  const rawImage = item.image_url || (item as any).imageUrl || (item as any).image || ''
  let imageUrl = rawImage
  if (typeof rawImage === 'string' && rawImage.includes('/storage/buckets/') && !rawImage.includes('project=')) {
    imageUrl = `${rawImage}${rawImage.includes('?') ? '&' : '?'}project=${appwriteConfig.projectId}`
  }
  const { items, addItem, increaseQty, decreaseQty } = useCartStore()
  const router = useRouter()

  const cartItem = items.find((i) => i.id === $id)
  const quantity = cartItem?.quantity || 0

  const handleAddToCart = (e: any) => {
    e.stopPropagation()
    addItem({
      id: $id,
      name,
      price,
      image_url: imageUrl,
      customizations: [],
      sellerId: item.sellerId,
    })
  }

  const handleIncrease = (e: any) => {
    e.stopPropagation()
    increaseQty($id)
  }

  const handleDecrease = (e: any) => {
    e.stopPropagation()
    decreaseQty($id)
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: $id } })}
      className="bg-white rounded-[28px] p-3 border-2 border-primary/10 shadow-md shadow-black/5 flex-1 justify-between"
    >
      {/* Square Image Box */}
      <View className="w-full aspect-square bg-gray-50/90 rounded-2xl p-2 items-center justify-center relative overflow-hidden border border-primary/5 mb-2.5">
        <FastImage
          source={imageUrl}
          className="w-full h-full"
          contentFit="contain"
        />

        {/* Rating / Category Mini Pill */}
        {rating ? (
          <View className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded-full border border-primary/10 flex-row items-center shadow-sm">
            <Text className="text-[10px] text-amber-500 font-quicksand-bold mr-0.5">★</Text>
            <Text className="text-[10px] font-quicksand-bold text-dark-100">{rating}</Text>
          </View>
        ) : type ? (
          <View className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded-full border border-primary/10">
            <Text className="text-[9px] font-quicksand-bold text-primary" numberOfLines={1}>
              {type}
            </Text>
          </View>
        ) : null}

        {discountPrice && discountPrice < price ? (
          <View className="absolute top-2 right-2 bg-red-500 px-1.5 py-0.5 rounded-full">
            <Text className="text-[9px] font-quicksand-bold text-white uppercase">Sale</Text>
          </View>
        ) : null}
      </View>

      {/* Product Details */}
      <View className="flex-1 justify-between">
        <View className="mb-2">
          <Text
            className="text-dark-100 font-quicksand-bold text-sm leading-snug"
            numberOfLines={2}
          >
            {name}
          </Text>
          <Text className="text-gray-400 font-quicksand-medium text-[11px] mt-0.5" numberOfLines={1}>
            Fresh & Daily Essentials
          </Text>
        </View>

        {/* Bottom Price & Add / Incrementor Actions */}
        <View className="flex-row items-center justify-between pt-2 border-t border-primary/5 min-h-[36px]">
          <View>
            <Text className="text-primary font-quicksand-bold text-base">
              ₦ {Number(price || 0).toLocaleString()}
            </Text>
          </View>

          {quantity > 0 ? (
            <View className="flex-row items-center bg-primary rounded-full px-1.5 py-1 shadow-md shadow-primary/30">
              <TouchableOpacity
                onPress={handleDecrease}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-6 h-6 rounded-full bg-white/20 items-center justify-center active:bg-white/40"
              >
                <Text className="text-white font-quicksand-bold text-sm leading-none">-</Text>
              </TouchableOpacity>

              <Text className="text-white font-quicksand-bold text-xs mx-2 min-w-[12px] text-center">
                {quantity}
              </Text>

              <TouchableOpacity
                onPress={handleIncrease}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-6 h-6 rounded-full bg-white/20 items-center justify-center active:bg-white/40"
              >
                <Text className="text-white font-quicksand-bold text-sm leading-none">+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleAddToCart}
              className="bg-primary w-8 h-8 rounded-full items-center justify-center shadow-md shadow-primary/30 active:scale-95"
            >
              <Text className="text-white font-quicksand-bold text-base leading-none">+</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default MenuCard