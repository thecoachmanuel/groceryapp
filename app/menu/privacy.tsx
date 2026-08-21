import React from 'react'
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { images } from '@/constants'
import { usePagesStore } from '@/store/pages.store'

export default function PrivacyScreen() {
  const router = useRouter()
  const { privacy } = usePagesStore()

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <StatusBar barStyle="dark-content" backgroundColor="#E6F7EC" />

      {/* Header Bar - Clean header without white rectangle background */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace('/(tabs)/profile' as any)
          }}
          className="p-1"
        >
          <Image source={images.arrowBack} className="size-5" resizeMode="contain" />
        </TouchableOpacity>

        <Text className="text-lg font-quicksand-bold text-dark-100">
          Privacy Policy
        </Text>

        <View className="size-5" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View className="bg-white rounded-[28px] p-6 border-2 border-primary/10 shadow-lg shadow-black/10">
          <Text className="text-lg font-quicksand-bold text-dark-100 mb-3">
            🔒 Data Privacy & Security
          </Text>
          <Text className="text-xs font-quicksand-medium text-gray-600 leading-6">
            {privacy}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
