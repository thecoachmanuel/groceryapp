import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  Image,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { images } from '@/constants'
import { useOnboardingStore } from '@/store/onboarding.store'

const { width } = Dimensions.get('window')

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Delivery Location',
    text: 'Set your location for fast delivery to your doorstep.',
    image: images.onboardingLocation,
  },
  {
    id: '2',
    title: 'Fresh Finds',
    text: 'Browse, add to cart, and checkout with ease.',
    image: images.onboardingCart,
  },
  {
    id: '3',
    title: 'Doorstep Delivery',
    text: 'Relax while we deliver your order straight to your doorstep.',
    image: images.onboardingDelivery,
  },
]

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const { completeOnboarding } = useOnboardingStore()

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0)
    }
  }, [])

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 })

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
    }
  }

  const handleComplete = () => {
    completeOnboarding()
    router.replace('/(auth)/sign-in' as any)
  }

  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1

  const renderItem = ({ item, index }: { item: (typeof ONBOARDING_DATA)[0]; index: number }) => (
    <View style={{ width }} className="flex-1 items-center justify-center px-6">
      {/* Image area */}
      <View className="w-full items-center justify-center mb-10" style={{ height: '52%' }}>
        <Image
          source={item.image}
          style={{ width: '85%', height: '100%' }}
          resizeMode="contain"
        />
      </View>

      {/* Step indicator */}
      <View className="flex-row items-center gap-1.5 mb-5">
        {ONBOARDING_DATA.map((_, i) => (
          <View
            key={i}
            className={`h-1.5 rounded-full ${i === index ? 'w-6 bg-primary' : 'w-1.5 bg-gray-200'
              }`}
          />
        ))}
      </View>

      {/* Text block */}
      <View className="items-center gap-2 px-4">
        <Text className="text-2xl font-quicksand-bold text-center text-dark-100">
          {item.title}
        </Text>
        <Text className="text-sm font-quicksand-medium text-center text-gray-500 leading-6">
          {item.text}
        </Text>
      </View>
    </View>
  )

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <FlatList
          ref={flatListRef}
          data={ONBOARDING_DATA}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          style={{ flex: 1 }}
        />

        {/* Navigation bottom bar */}
        <View className="px-6 pb-8 flex-row items-center justify-between">
          <TouchableOpacity onPress={handleComplete} activeOpacity={0.7} className="px-2 py-1">
            <Text className="text-sm font-quicksand-bold text-gray-400">
              {isLastSlide ? '' : 'Skip'}
            </Text>
          </TouchableOpacity>

          {isLastSlide ? (
            <TouchableOpacity
              onPress={handleComplete}
              activeOpacity={0.8}
              className="w-11 h-11 rounded-2xl bg-primary items-center justify-center shadow-md shadow-primary/30"
            >
              <Ionicons name="checkmark" color="#ffffff" size={20} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.8}
              className="w-11 h-11 rounded-2xl bg-primary items-center justify-center shadow-md shadow-primary/30"
            >
              <Ionicons name="arrow-forward" color="#ffffff" size={20} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
  </SafeAreaProvider>
  )
}
