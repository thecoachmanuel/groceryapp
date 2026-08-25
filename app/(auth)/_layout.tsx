import { images } from '@/constants'
import useAuthStore from '@/store/auth.store'
import useBrandingStore from '@/store/branding.store'
import { Redirect, Slot } from 'expo-router'
import {
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
  const { appLogo, loginGraphic, hideAuthLogo } = useBrandingStore()

  if (isLoading) return null

  if (isAuthenticated) return <Redirect href="/" />

  const graphicSource = loginGraphic && (loginGraphic.startsWith('http') || loginGraphic.startsWith('file:'))
    ? { uri: loginGraphic }
    : images.loginGraphic

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
            source={graphicSource}
            className="size-full rounded-b-lg"
            resizeMode="stretch"
          />
          {!hideAuthLogo && (
            appLogo ? (
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
            )
          )}
        </View>
        <Slot />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}