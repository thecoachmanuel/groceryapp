import React, { useState } from 'react'
import {
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { images } from '@/constants'
import { usePagesStore } from '@/store/pages.store'

export default function FAQScreen() {
  const router = useRouter()
  const { faqs } = usePagesStore()
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id || null)

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

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
          Frequently Asked Questions
        </Text>

        <View className="size-5" />
      </View>

      <FlatList
        data={faqs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 14 }}
        renderItem={({ item }) => {
          const isOpen = openId === item.id

          return (
            <View className="bg-white rounded-[28px] border-2 border-primary/10 overflow-hidden shadow-lg shadow-black/10">
              <TouchableOpacity
                onPress={() => toggleFAQ(item.id)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between p-5"
              >
                <Text className="text-sm font-quicksand-bold text-dark-100 flex-1 pr-3">
                  {item.question}
                </Text>
                <Text className="text-primary font-bold text-sm">
                  {isOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {isOpen && (
                <View className="px-5 pb-5 pt-3 border-t-2 border-primary/10">
                  <Text className="text-xs font-quicksand-medium text-gray-500 leading-6">
                    {item.answer}
                  </Text>
                </View>
              )}
            </View>
          )
        }}
      />
    </SafeAreaView>
  )
}
