import { images } from '@/constants'
import { usePagesStore } from '@/store/pages.store'
import { useRouter } from 'expo-router'
import React from 'react'
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import useBrandingStore from '@/store/branding.store'

export default function AboutScreen() {
  const router = useRouter()
  const { aboutUs } = usePagesStore()
  const { appName, appLogo, appTagline } = useBrandingStore()

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
          About {appName}
        </Text>

        <View className="size-5" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Brand Hero Card */}
        <View className="bg-white rounded-[28px] p-6 items-center border-2 border-primary/10 shadow-lg shadow-black/10 mb-6">
          <View className="w-24 h-24 rounded-3xl bg-primary/10 items-center justify-center mb-4 border border-primary/20 overflow-hidden">
            {appLogo ? (
              appLogo.startsWith('http') || appLogo.startsWith('file:') ? (
                <Image source={{ uri: appLogo }} className="w-full h-full" resizeMode="contain" />
              ) : (
                <Text className="text-5xl">{appLogo}</Text>
              )
            ) : (
              <Image source={images.logo} className="w-16 h-16" resizeMode="contain" />
            )}
          </View>
          <Text className="text-2xl font-quicksand-bold text-dark-100 text-center">
            {appName}
          </Text>
          <Text className="text-xs font-quicksand-semibold text-primary mt-1 text-center">
            {appTagline}
          </Text>
          <Text className="text-gray-400 font-quicksand-medium text-xs mt-0.5">
            Version 1.0.0 (Build 2026)
          </Text>
        </View>

        {/* Story & Mission Card */}
        <View className="bg-white rounded-[28px] p-6 border-2 border-primary/10 shadow-lg shadow-black/10 mb-6">
          <Text className="text-base font-quicksand-bold text-dark-100 mb-3">
            Our Mission & Story
          </Text>
          <Text className="text-sm font-quicksand-medium text-gray-600 leading-6">
            {aboutUs}
          </Text>
        </View>

        {/* Key Features */}
        <View className="bg-white rounded-[28px] p-6 border-2 border-primary/10 shadow-lg shadow-black/10 gap-4">
          <Text className="text-base font-quicksand-bold text-dark-100">
            Why Choose Us?
          </Text>

          <View className="flex-row items-center py-1">
            <Text className="text-xl mr-3">⚡</Text>
            <View className="flex-1">
              <Text className="font-quicksand-bold text-dark-100 text-xs">
                Ultra-Fast Delivery
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-xs">
                From market to your doorstep in 30 minutes.
              </Text>
            </View>
          </View>

          <View className="flex-row items-center py-1 pt-3 border-t-2 border-primary/10">
            <Text className="text-xl mr-3">🥬</Text>
            <View className="flex-1">
              <Text className="font-quicksand-bold text-dark-100 text-xs">
                Guaranteed Freshness
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-xs">
                Sourced directly from verified local sellers.
              </Text>
            </View>
          </View>

          <View className="flex-row items-center py-1 pt-3 border-t-2 border-primary/10">
            <Text className="text-xl mr-3">💳</Text>
            <View className="flex-1">
              <Text className="font-quicksand-bold text-dark-100 text-xs">
                Secure Payments
              </Text>
              <Text className="text-gray-400 font-quicksand-medium text-xs">
                Encrypted transactions via Paystack & Cards.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
