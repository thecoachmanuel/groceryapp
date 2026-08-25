import React from 'react'
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { images } from '@/constants'
import { usePagesStore } from '@/store/pages.store'

export default function ContactScreen() {
  const router = useRouter()
  const { supportPhone, supportEmail, supportHours } = usePagesStore()

  const handleCall = () => {
    Linking.openURL(`tel:${supportPhone}`).catch(() => {
      Alert.alert('Call Error', `Unable to make phone call. Dial manually: ${supportPhone}`)
    })
  }

  const handleEmail = () => {
    Linking.openURL(`mailto:${supportEmail}`).catch(() => {
      Alert.alert('Email Error', `Unable to open email client. Contact: ${supportEmail}`)
    })
  }

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
          Help & Support
        </Text>

        <View className="size-5" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Support Header Card */}
        <View className="bg-primary rounded-[28px] p-6 mb-6 text-white shadow-xl shadow-primary/30">
          <Text className="text-white text-2xl font-quicksand-bold mb-1">
            We are here to help! 👋
          </Text>
          <Text className="text-white/80 font-quicksand-medium text-xs leading-5">
            Have questions about your order, delivery, or account? Reach out to our 24/7 customer service desk.
          </Text>
        </View>

        {/* Action Cards */}
        <View className="gap-4">
          {/* Phone Call Button */}
          <TouchableOpacity
            onPress={handleCall}
            activeOpacity={0.8}
            className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/10 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-2xl bg-green-500/10 items-center justify-center mr-4 border border-green-500/20">
                <Text className="text-2xl">📞</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-quicksand-semibold text-gray-400 uppercase tracking-wider">
                  Call Customer Care
                </Text>
                <Text className="text-base font-quicksand-bold text-dark-100 mt-0.5">
                  {supportPhone}
                </Text>
                <Text className="text-xs font-quicksand-medium text-primary mt-0.5" style={{ color: '#53B175' }}>
                  {supportHours}
                </Text>
              </View>
            </View>
            <Text className="text-primary font-bold text-lg" style={{ color: '#53B175' }}>→</Text>
          </TouchableOpacity>

          {/* Email Support Button */}
          <TouchableOpacity
            onPress={handleEmail}
            activeOpacity={0.8}
            className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/10 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-2xl bg-blue-500/10 items-center justify-center mr-4 border border-blue-500/20">
                <Text className="text-2xl">✉️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-quicksand-semibold text-gray-400 uppercase tracking-wider">
                  Email Support Desk
                </Text>
                <Text className="text-base font-quicksand-bold text-dark-100 mt-0.5">
                  {supportEmail}
                </Text>
                <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                  Average response time: 15 mins
                </Text>
              </View>
            </View>
            <Text className="text-primary font-bold text-lg" style={{ color: '#53B175' }}>→</Text>
          </TouchableOpacity>

          {/* FAQ Navigation Card */}
          <TouchableOpacity
            onPress={() => router.push('/menu/faq' as any)}
            activeOpacity={0.8}
            className="bg-white rounded-[28px] p-5 border-2 border-primary/10 shadow-lg shadow-black/10 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-2xl bg-purple-500/10 items-center justify-center mr-4 border border-purple-500/20">
                <Text className="text-2xl">💡</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-quicksand-semibold text-gray-400 uppercase tracking-wider">
                  Instant Answers
                </Text>
                <Text className="text-base font-quicksand-bold text-dark-100 mt-0.5">
                  Browse FAQs
                </Text>
                <Text className="text-xs font-quicksand-medium text-gray-400 mt-0.5">
                  Find answers to common delivery questions
                </Text>
              </View>
            </View>
            <Text className="text-primary font-bold text-lg" style={{ color: '#53B175' }}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
