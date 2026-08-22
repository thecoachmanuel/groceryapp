import CartButton from '@/components/CartButton'
import FastImage from '@/components/FastImage'
import { images } from '@/constants'
import { appwriteConfig, getMenuItemById } from '@/lib/appwrite'
import { useCartStore } from '@/store/cart.store'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const SAMPLE_CUSTOMIZATIONS = [
  { id: 'c1', name: 'Extra Cheese', price: 40, type: 'topping' },
  { id: 'c2', name: 'Chilled Coke', price: 40, type: 'side' },
  { id: 'c3', name: 'Crispy Fries', price: 90, type: 'side' },
  { id: 'c4', name: 'Beef Bacon', price: 80, type: 'topping' },
]

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)

  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCustomizations, setSelectedCustomizations] = useState<any[]>([])
  const [selectedWeightVariant, setSelectedWeightVariant] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    async function loadItem() {
      if (!id) return
      try {
        setLoading(true)
        const data = await getMenuItemById(id)
        setItem(data)
        if (data?.weightVariants) {
          try {
            const parsed = JSON.parse(data.weightVariants)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSelectedWeightVariant(parsed[0])
            }
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching product:', err)
      } finally {
        setLoading(false)
      }
    }
    loadItem()
  }, [id])

  const toggleCustomization = (cus: any) => {
    if (selectedCustomizations.some((c) => c.id === cus.id)) {
      setSelectedCustomizations((prev) => prev.filter((c) => c.id !== cus.id))
    } else {
      setSelectedCustomizations((prev) => [...prev, cus])
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg-light justify-center items-center">
        <ActivityIndicator size="large" color="#16A34A" />
      </SafeAreaView>
    )
  }

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-bg-light justify-center items-center px-6">
        <Text className="text-xl font-quicksand-bold text-dark-100 mb-4">
          Product Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary px-6 py-3 rounded-full"
        >
          <Text className="text-white font-quicksand-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const rawImage = item.image_url || (item as any).imageUrl || (item as any).image || ''
  let imageUrl = rawImage
  if (typeof rawImage === 'string' && rawImage.includes('/storage/buckets/') && !rawImage.includes('project=')) {
    imageUrl = `${rawImage}${rawImage.includes('?') ? '&' : '?'}project=${appwriteConfig.projectId}`
  }

  const weightVariantsList: any[] = item.weightVariants ? JSON.parse(item.weightVariants) : []
  const baseUnitPrice = selectedWeightVariant ? selectedWeightVariant.price : item.price
  const extraCost = selectedCustomizations.reduce((acc, c) => acc + c.price, 0)
  const totalPrice = (baseUnitPrice + extraCost) * quantity

  const handleAddToCart = () => {
    const displayName = selectedWeightVariant
      ? `${item.name} (${selectedWeightVariant.weight})`
      : item.name

    addItem({
      id: selectedWeightVariant ? `${item.$id}_${selectedWeightVariant.weight}` : item.$id,
      name: displayName,
      price: baseUnitPrice,
      image_url: imageUrl,
      customizations: selectedCustomizations,
    })
    router.push('/(tabs)/cart')
  }

  const extrasList: any[] = item.extras ? JSON.parse(item.extras) : []
  const hasNutrition = (item.calories && item.calories > 0) || (item.protein && item.protein > 0)

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-5 pt-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-md shadow-black/10"
          >
            <FastImage
              source={images.arrowBack}
              className="w-5 h-5"
              contentFit="contain"
            />
          </TouchableOpacity>
          <Text className="font-quicksand-bold text-lg text-dark-100">
            Details
          </Text>
          <CartButton />
        </View>

        {/* Product Image Banner */}
        <View className="items-center my-6">
          <View className="w-72 h-72 bg-white rounded-[40px] p-6 shadow-xl shadow-black/10 items-center justify-center border border-primary/10">
            <FastImage
              source={imageUrl}
              className="w-full h-full"
              contentFit="contain"
            />
          </View>
        </View>

        {/* Info Container — Spans Seamlessly Downwards */}
        <View className="flex-1 bg-white rounded-t-[40px] px-6 pt-8 pb-28 shadow-lg shadow-black/10 border-t border-primary/10 min-h-[500px]">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-3">
              <Text className="text-2xl font-quicksand-bold text-dark-100">
                {item.name}
              </Text>
              <View className="flex-row items-center mt-2">
                <Text className="text-yellow-500 font-quicksand-bold text-base mr-1">
                  ★ {item.rating || 4.8}
                </Text>
                <Text className="text-gray-400 font-quicksand-medium text-sm">
                  (120+ reviews)
                </Text>
              </View>
            </View>
            <Text className="text-3xl font-quicksand-bold text-primary">
              ₦ {baseUnitPrice.toLocaleString()}
            </Text>
          </View>

          {/* Selectable Weight & Package Variants */}
          {weightVariantsList.length > 0 && (
            <View className="my-5">
              <Text className="text-dark-100 font-quicksand-bold text-base mb-2.5">
                ⚖️ Select Package Weight / Size
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {weightVariantsList.map((wv, idx) => {
                  const isSelected = selectedWeightVariant?.id === wv.id || selectedWeightVariant?.weight === wv.weight
                  return (
                    <TouchableOpacity
                      key={wv.id || idx}
                      onPress={() => setSelectedWeightVariant(wv)}
                      className={`px-4 py-3 rounded-2xl mr-3 border-2 items-center ${isSelected ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                        }`}
                    >
                      <Text className={`font-quicksand-bold text-xs ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                        {wv.weight}
                      </Text>
                      <Text className={`font-quicksand-semibold text-[11px] mt-0.5 ${isSelected ? 'text-white/90' : 'text-primary'}`}>
                        ₦ {wv.price.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* Conditional Calorie & Protein Badges */}
          {hasNutrition && (
            <View className="flex-row gap-4 my-6">
              {item.calories && item.calories > 0 ? (
                <View className="flex-1 bg-primary/10 rounded-2xl p-3 flex-row items-center border border-primary/20">
                  <Text className="text-2xl mr-2">🔥</Text>
                  <View>
                    <Text className="text-xs text-gray-500 font-quicksand-semibold">
                      Calories
                    </Text>
                    <Text className="text-base font-quicksand-bold text-dark-100">
                      {item.calories} kcal
                    </Text>
                  </View>
                </View>
              ) : null}

              {item.protein && item.protein > 0 ? (
                <View className="flex-1 bg-primary/10 rounded-2xl p-3 flex-row items-center border border-primary/20">
                  <Text className="text-2xl mr-2">🥩</Text>
                  <View>
                    <Text className="text-xs text-gray-500 font-quicksand-semibold">
                      Protein
                    </Text>
                    <Text className="text-base font-quicksand-bold text-dark-100">
                      {item.protein} g
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* Description */}
          <Text className="text-dark-100 font-quicksand-bold text-lg mb-2">
            Description
          </Text>
          <Text className="text-gray-500 font-quicksand-medium leading-relaxed text-sm mb-6">
            {item.description ||
              'Prepared fresh with organic high-quality ingredients, delivered right to your doorstep hot and ready.'}
          </Text>

          {/* Conditional Extras / Customization Selection */}
          {extrasList.length > 0 && (
            <>
              <Text className="text-dark-100 font-quicksand-bold text-lg mb-3">
                Add Extras / Customization
              </Text>
              {extrasList.map((cus: any, idx: number) => {
                const cusId = cus.id || `ext_${idx}`
                const isSelected = selectedCustomizations.some(
                  (c) => c.id === cusId,
                )
                return (
                  <TouchableOpacity
                    key={cusId}
                    onPress={() => toggleCustomization({ ...cus, id: cusId })}
                    className={`flex-row justify-between items-center p-4 rounded-2xl mb-3 border ${isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-gray-50'
                      }`}
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-6 h-6 rounded-lg items-center justify-center mr-3 border ${isSelected
                          ? 'bg-primary border-primary'
                          : 'border-gray-400 bg-white'
                          }`}
                      >
                        {isSelected && (
                          <Text className="text-white text-xs font-bold">✓</Text>
                        )}
                      </View>
                      <Text className="text-dark-100 font-quicksand-semibold">
                        {cus.name}
                      </Text>
                    </View>
                    <Text className="text-primary font-quicksand-bold">
                      + ₦ {cus.price}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white px-6 py-4 border-t border-primary/10 shadow-2xl">
        <TouchableOpacity
          onPress={handleAddToCart}
          activeOpacity={0.88}
          className="w-full bg-primary rounded-full py-4 items-center justify-center shadow-lg shadow-primary/30"
        >
          <Text className="text-white font-quicksand-bold text-base">
            Add to Cart • ₦ {totalPrice.toLocaleString()}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
