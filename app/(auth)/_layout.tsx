import { images } from '@/constants'
import useAuthStore from '@/store/auth.store'
import useBrandingStore from '@/store/branding.store'
import { Redirect, Slot } from 'expo-router'
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native'

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const { appLogo } = useBrandingStore()

  if (isLoading && Platform.OS !== 'web') {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <ActivityIndicator size="small" color="#53B175" />
      </View>
    )
  }

  if (isAuthenticated) return <Redirect href="/(tabs)" />

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="bg-white h-full"
        style={{ backgroundColor: '#ffffff' }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="w-full relative"
          style={{ height: Dimensions.get('screen').height / 2.25 }}
        >
          <ImageBackground
            source={images.loginGraphic}
            className="size-full rounded-b-lg"
            resizeMode="stretch"
          />
          {appLogo ? (
            appLogo.startsWith('http') || appLogo.startsWith('file:') ? (
              <Image
                source={{ uri: appLogo }}
                className="self-center size-36 absolute -bottom-14 z-10 rounded-3xl bg-white p-2 border-2 border-primary/20 shadow-xl shadow-black/10"
                resizeMode="contain"
              />
            ) : (
              <View className="self-center size-32 absolute -bottom-12 z-10 rounded-3xl bg-white items-center justify-center border-2 border-primary/20 shadow-xl shadow-black/10">
                <Text className="text-6xl">{appLogo}</Text>
              </View>
            )
          ) : (
            <Image
              source={images.logo}
              className="self-center size-40 absolute -bottom-16 z-10"
            />
          )}
        </View>
        <Slot />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}