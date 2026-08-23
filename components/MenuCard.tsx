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

  const isSale = discountPrice && discountPrice < price
  const effectivePrice = isSale ? discountPrice : price

  const handleAddToCart = (e: any) => {
    e.stopPropagation()
    addItem({
      id: $id,
      name,
      price: effectivePrice,
      image_url: imageUrl,
      customizations: [],
      sellerId: item.sellerId || (item as any).seller_id || (item as any).storeId,
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
    <View className="bg-white rounded-[28px] p-3 border-2 border-primary/10 shadow-md shadow-black/5 flex-1 justify-between">
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: $id } })}
        className="w-full flex-1"
      >
        {/* Rectangle Image Box */}
        <View className="w-full aspect-[4/3] bg-gray-50/90 rounded-2xl items-center justify-center relative overflow-hidden border border-primary/5 mb-2.5">
          <FastImage
            source={imageUrl}
            className="w-full h-full"
            contentFit="cover"
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

          {isSale ? (
            <View className="absolute top-2 right-2 bg-red-500 px-2 py-0.5 rounded-full shadow-sm">
              <Text className="text-[9px] font-quicksand-bold text-white uppercase tracking-wider">Sale</Text>
            </View>
          ) : null}

          {/* Proximity Distance Badge */}
          {(item as any).distanceKm != null && (item as any).distanceKm < 100 && (
            <View className="absolute bottom-2 left-2 bg-black/65 px-2 py-0.5 rounded-full backdrop-blur-md">
              <Text className="text-[9px] font-quicksand-bold text-white">
                📍 {(item as any).distanceKm} km
              </Text>
            </View>
          )}
        </View>

        {/* Product Details */}
        <View className="mb-2">
          <Text
            className="text-dark-100 font-quicksand-bold text-sm leading-snug"
            numberOfLines={2}
          >
            {name}
          </Text>
          <Text className="text-gray-400 font-quicksand-medium text-[11px] mt-0.5" numberOfLines={1}>
            {item.description ? item.description : ((item as any).categories || item.type || 'Fresh & Daily Essentials')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Bottom Price & Add / Incrementor Actions */}
      <View className="flex-row items-center justify-between pt-2 border-t border-primary/5 min-h-[36px]">
        <View className="flex-1 mr-2">
          {isSale ? (
            <View className="flex-row items-baseline flex-wrap">
              <Text className="text-primary font-quicksand-bold text-base mr-1.5">
                ₦ {Number(discountPrice).toLocaleString()}
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-[11px] line-through">
                ₦ {Number(price).toLocaleString()}
              </Text>
            </View>
          ) : (
            <Text className="text-primary font-quicksand-bold text-base">
              ₦ {Number(price || 0).toLocaleString()}
            </Text>
          )}
        </View>

        {quantity > 0 ? (
          <View
            className="flex-row items-center bg-primary rounded-full px-1.5 py-1 shadow-md shadow-primary/30"
            style={{ backgroundColor: '#53B175' }}
          >
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
            style={{ backgroundColor: '#53B175' }}
          >
            <Text className="text-white font-quicksand-bold text-base leading-none">+</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default MenuCard