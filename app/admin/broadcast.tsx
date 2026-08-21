import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import useNotificationStore from '@/store/notification.store'
import { images } from '@/constants'
import { UserRole } from '@/type'

const PRESET_BROADCASTS = [
  {
    title: 'Weekend Grocery Blitz 🥬',
    body: 'Enjoy up to 25% off all organic veggies and fruits this weekend! Fast 30-min delivery.',
    type: 'promo' as const,
    targetRole: 'customer' as const,
  },
  {
    title: 'Flash Sale: Free Delivery on Orders Above ₦5,000! 🚚',
    body: 'Stock up your pantry today and get 100% free delivery on all orders.',
    type: 'promo' as const,
    targetRole: 'customer' as const,
  },
  {
    title: 'Seller Notice: High Weekend Demand Expected 🏪',
    body: 'Please ensure your inventory and product stocks are up-to-date for peak weekend grocery traffic.',
    type: 'broadcast' as const,
    targetRole: 'seller' as const,
  },
  {
    title: 'System Maintenance Notice ⚙️',
    body: 'Scheduled payment gateway maintenance tonight from 2:00 AM to 2:30 AM.',
    type: 'system' as const,
    targetRole: 'all' as const,
  },
]

export default function AdminBroadcastScreen() {
  const router = useRouter()
  const { addNotification } = useNotificationStore()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetRole, setTargetRole] = useState<UserRole | 'all'>('customer')
  const [notifType, setNotifType] = useState<'promo' | 'broadcast' | 'system'>('promo')
  const [promoCode, setPromoCode] = useState('')
  const [sending, setSending] = useState(false)

  const handleApplyPreset = (preset: typeof PRESET_BROADCASTS[0]) => {
    setTitle(preset.title)
    setBody(preset.body)
    setNotifType(preset.type)
    setTargetRole(preset.targetRole)
  }

  const handleSendBroadcast = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a notification title.')
      return
    }
    if (!body.trim()) {
      Alert.alert('Validation Error', 'Please enter a notification message body.')
      return
    }

    try {
      setSending(true)
      Keyboard.dismiss()

      const finalBody = promoCode.trim()
        ? `${body.trim()} (Use Code: ${promoCode.trim().toUpperCase()})`
        : body.trim()

      addNotification({
        title: title.trim(),
        body: finalBody,
        type: notifType,
        targetRole: targetRole,
      })

      Alert.alert(
        'Broadcast Dispatched 🚀',
        `Notification sent successfully to ${
          targetRole === 'all'
            ? 'All Users (Customers & Sellers)'
            : targetRole === 'customer'
            ? 'All Customers'
            : 'All Sellers'
        }!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setTitle('')
              setBody('')
              setPromoCode('')
              router.back()
            },
          },
        ]
      )
    } catch (err: any) {
      Alert.alert('Send Error', err.message || 'Could not send broadcast.')
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <StatusBar barStyle="dark-content" backgroundColor="#E6F7EC" />

      {/* Header Bar */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-primary/20 shadow-sm shadow-black/5"
          >
            <Image source={images.arrowBack} className="w-5 h-5" resizeMode="contain" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-xl font-quicksand-bold text-dark-100">
              Broadcast Center
            </Text>
            <Text className="text-xs text-primary font-quicksand-bold">
              Send Promo & Alerts
            </Text>
          </View>

          <View className="w-10" />
        </View>
      </TouchableWithoutFeedback>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Presets Carousel */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2.5">
            <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-xs font-quicksand-bold text-gray-400 uppercase tracking-wider">
              Quick Broadcast Templates
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2.5">
            {PRESET_BROADCASTS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleApplyPreset(preset)}
                className="bg-white border-2 border-primary/15 rounded-2xl p-3.5 mr-2 shadow-sm max-w-[220px]"
              >
                <Text className="text-xs font-quicksand-bold text-dark-100 mb-1" numberOfLines={1}>
                  {preset.title}
                </Text>
                <Text className="text-[11px] font-quicksand-medium text-gray-500" numberOfLines={2}>
                  {preset.body}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                    <Text className="text-[9px] font-quicksand-bold text-primary capitalize">
                      {preset.targetRole}
                    </Text>
                  </View>
                  <Text className="text-[10px] font-quicksand-bold text-primary">Use Template →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Live Notification Preview Box */}
        <View className="bg-white rounded-[28px] p-5 mb-5 border-2 border-primary/20 shadow-xl shadow-black/5">
          <View className="flex-row items-center mb-2">
            <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
            <Text className="text-xs font-quicksand-bold text-gray-400 uppercase tracking-wider">
              Live Customer Device Preview
            </Text>
          </View>
          <View className="h-px bg-primary/10 mb-3" />

          <View className="bg-green-50/70 rounded-2xl p-4 border border-primary/30 flex-row items-start">
            <View className="w-10 h-10 rounded-2xl bg-primary/15 items-center justify-center mr-3">
              <Text className="text-xl">
                {notifType === 'promo' ? '🎟️' : notifType === 'broadcast' ? '📢' : '⚙️'}
              </Text>
            </View>
            <View className="flex-1 pr-1">
              <Text className="font-quicksand-bold text-dark-100 text-sm">
                {title || 'Your Notification Title Here'}
              </Text>
              <Text className="text-xs font-quicksand-medium text-gray-600 mt-1 leading-relaxed">
                {body || 'Your broadcast message preview will appear here as you type.'}
                {promoCode ? ` (Use Code: ${promoCode.toUpperCase()})` : ''}
              </Text>
              <View className="mt-2 self-start bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                <Text className="text-[10px] text-primary font-quicksand-bold">
                  Target: {targetRole === 'all' ? 'All Users' : targetRole === 'customer' ? 'Customers' : 'Sellers'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dispatch Form */}
        <View className="bg-white rounded-[28px] p-6 mb-6 border-2 border-primary/15 shadow-lg shadow-black/5">
          {/* Target Audience Selector */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-2">
            1. TARGET AUDIENCE *
          </Text>
          <View className="flex-row gap-2 mb-4">
            {(
              [
                { label: '👥 All Users', value: 'all' },
                { label: '🛒 Customers', value: 'customer' },
                { label: '🏪 Sellers', value: 'seller' },
              ] as const
            ).map((opt) => {
              const isSelected = targetRole === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setTargetRole(opt.value)}
                  className={`flex-1 py-3 rounded-2xl items-center border-2 ${
                    isSelected
                      ? 'bg-primary border-primary shadow-sm shadow-primary/20'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`font-quicksand-bold text-xs ${
                      isSelected ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Notification Category */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-2">
            2. NOTIFICATION TYPE *
          </Text>
          <View className="flex-row gap-2 mb-4">
            {(
              [
                { label: '🎟️ Promo / Deal', value: 'promo' },
                { label: '📢 Announcement', value: 'broadcast' },
                { label: '⚙️ System Alert', value: 'system' },
              ] as const
            ).map((opt) => {
              const isSelected = notifType === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setNotifType(opt.value)}
                  className={`flex-1 py-2.5 rounded-2xl items-center border-2 ${
                    isSelected
                      ? 'bg-primary/15 border-primary'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    className={`font-quicksand-bold text-xs ${
                      isSelected ? 'text-primary' : 'text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Title Input */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5">
            NOTIFICATION TITLE *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Mega Weekend Grocery Discount! 🍅"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-3 font-quicksand-bold text-sm text-dark-100 mb-4"
          />

          {/* Message Body Input */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5">
            MESSAGE BODY *
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="e.g. Order farm-fresh produce now and get 20% off all orders placed before 8 PM."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            className="bg-gray-50 border-2 border-primary/15 rounded-2xl p-4 font-quicksand-medium text-xs text-dark-100 mb-4 min-h-[90px]"
          />

          {/* Optional Promo Code */}
          <Text className="text-xs font-quicksand-bold text-gray-500 mb-1.5">
            ATTACH PROMO / COUPON CODE (OPTIONAL)
          </Text>
          <TextInput
            value={promoCode}
            onChangeText={setPromoCode}
            placeholder="e.g. GROCERY20"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            className="bg-gray-50 border-2 border-primary/15 rounded-2xl px-4 py-2.5 font-quicksand-bold text-sm text-dark-100"
          />
        </View>

        {/* Send Broadcast Action Button */}
        <TouchableOpacity
          onPress={handleSendBroadcast}
          disabled={sending}
          activeOpacity={0.88}
          className="bg-primary py-4 rounded-2xl items-center justify-center shadow-lg shadow-primary/30"
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-quicksand-bold text-base">
              Send Broadcast Alert 🚀
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
