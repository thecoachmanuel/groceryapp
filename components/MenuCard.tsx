import FastImage from '@/components/FastImage'
import { images } from '@/constants'
import { appwriteConfig } from "@/lib/appwrite"
import { useCartStore } from '@/store/cart.store'
import { MenuItem } from "@/type"
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

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
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: $id } })}
      className="bg-white rounded-2xl p-3 border border-[#F1F1F1] flex-1 justify-between mb-3"
      style={{ borderColor: '#F1F1F1' }}
    >
      {/* Rectangle Image Box */}
      <View className="w-full aspect-[4/3] bg-gray-50/90 rounded-xl items-center justify-center relative overflow-hidden mb-2.5">
        <FastImage
          source={imageUrl}
          className="w-full h-full"
          contentFit="cover"
        />

        {/* Rating / Category Mini Pill */}
        {rating ? (
          <View className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded-full border border-[#F1F1F1] flex-row items-center shadow-sm" style={{ borderColor: '#F1F1F1' }}>
            <Text className="text-[10px] text-amber-500 font-quicksand-bold mr-0.5">★</Text>
            <Text className="text-[10px] font-quicksand-bold text-dark-100">{rating}</Text>
          </View>
        ) : type ? (
          <View className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded-full border border-[#F1F1F1]" style={{ borderColor: '#F1F1F1' }}>
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
          <View className="absolute bottom-2 left-2 bg-black/65 px-2 py-0.5 rounded-full backdrop-blur-md flex-row items-center">
            <Image
              source={images.location}
              className="w-2.5 h-2.5 mr-1"
              resizeMode="contain"
              tintColor="#FFFFFF"
            />
            <Text className="text-[9px] font-quicksand-bold text-white">
              {(item as any).distanceKm} km
            </Text>
          </View>
        )}
      </View>

      {/* Product Details */}
      <View className="flex-1 justify-between">
        <View className="mb-2">
          <Text
            className="text-dark-100 font-quicksand-bold text-base leading-tight"
            numberOfLines={2}
          >
            {name}
          </Text>
          <Text className="text-gray-400 font-quicksand-medium text-xs mt-1" numberOfLines={1}>
            {item.description ? item.description : ((item as any).categories || item.type || 'Fresh & Daily Essentials')}
          </Text>
        </View>

        {/* Bottom Price & Add / Incrementor Actions */}
        <View className="flex-row items-center justify-between pt-2 border-t border-[#F1F1F1] min-h-[44px]" style={{ borderTopColor: '#F1F1F1' }}>
          <View className="flex-1 mr-2">
            {isSale ? (
              <View className="flex-row items-baseline flex-wrap">
                <Text className="text-dark-100 font-quicksand-bold text-lg mr-1.5">
                  ₦ {Number(discountPrice).toLocaleString()}
                </Text>
                <Text className="text-gray-400 font-quicksand-medium text-xs line-through">
                  ₦ {Number(price).toLocaleString()}
                </Text>
              </View>
            ) : (
              <Text className="text-dark-100 font-quicksand-bold text-lg">
                ₦ {Number(price || 0).toLocaleString()}
              </Text>
            )}
          </View>

          {quantity > 0 ? (
            <View
              className="flex-row items-center rounded-[17px] px-2 py-1.5"
              style={{ backgroundColor: '#53B175' }}
            >
              <TouchableOpacity
                onPress={handleDecrease}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-7 h-7 rounded-xl bg-white/20 items-center justify-center active:bg-white/40"
              >
                <Ionicons name="remove" size={18} color="#ffffff" />
              </TouchableOpacity>

              <Text className="text-white font-quicksand-bold text-xs mx-2 min-w-[12px] text-center">
                {quantity}
              </Text>

              <TouchableOpacity
                onPress={handleIncrease}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-7 h-7 rounded-xl bg-white/20 items-center justify-center active:bg-white/40"
              >
                <Ionicons name="add" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAddToCart}
              className="w-11 h-11 rounded-[17px] items-center justify-center active:scale-95"
              style={{ backgroundColor: '#53B175' }}
            >
              <Ionicons name="add" size={26} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default MenuCard