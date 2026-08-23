import CustomButton from '@/components/CustomButton'
import CustomInput from '@/components/CustomInput'
import { signIn, account } from '@/lib/appwrite'
import { Link, router } from 'expo-router'
import { useState, useEffect } from 'react'
import { Alert, Platform, Text, View } from 'react-native'
import * as Sentry from '@sentry/react-native'
import useAuthStore from '@/store/auth.store'
import useOnboardingStore from '@/store/onboarding.store'

const SignIn = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const { fetchAuthenticatedUser } = useAuthStore()
  const { hasCompletedOnboarding } = useOnboardingStore()

  useEffect(() => {
    const checkSession = async () => {
      try {
        await account.get()
        await fetchAuthenticatedUser()
        const state = useAuthStore.getState()
        if (state.isAdmin) {
          router.replace('/admin/dashboard' as any)
        } else if (state.isSeller) {
          router.replace('/seller/dashboard' as any)
        } else {
          router.replace('/(tabs)')
        }
      } catch {
        if (Platform.OS !== 'web' && !hasCompletedOnboarding) {
          router.replace('/onboarding' as any)
        }
      }
    }
    checkSession()
  }, [hasCompletedOnboarding])

  const submit = async () => {
    const { email, password } = form

    if (!email || !password)
      return Alert.alert('Error', 'Please enter valid email address & password.')

    setIsSubmitting(true)

    const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@grocery.com'
    const adminPassword = process.env.EXPO_PUBLIC_ADMIN_PASSWORD || 'admin123'

    const isAdminLogin = email.trim().toLowerCase() === adminEmail.toLowerCase()

    try {
      if (isAdminLogin) {
        if (password !== adminPassword) {
          throw new Error('Invalid Admin password. Please check your credentials.')
        }

        try {
          await signIn({ email: adminEmail, password: adminPassword })
        } catch (signInErr: any) {
          const errStr = String(signInErr?.message || signInErr).toLowerCase()
          if (errStr.includes('invalid credentials') || errStr.includes('user_not_found') || errStr.includes('not found')) {
            // Auto create Admin user in Appwrite if first time logging in as Admin
            try {
              const { createUser } = await import('@/lib/appwrite')
              await createUser({
                email: adminEmail,
                password: adminPassword,
                name: 'App Owner (Admin)',
                role: 'admin',
              })
            } catch (createErr: any) {
              const createErrStr = String(createErr?.message || createErr).toLowerCase()
              if (!createErrStr.includes('already exists')) {
                throw createErr
              }
              // If user already exists, try signing in once more after session clear
              await signIn({ email: adminEmail, password: adminPassword })
            }
          } else {
            throw signInErr
          }
        }

        await fetchAuthenticatedUser()
        Alert.alert('Admin Portal Unlocked', 'Welcome back, App Owner!')
        router.replace('/admin/dashboard' as any)
        return
      }

      // Regular Sign In (Seller or Customer)
      await signIn({ email, password })
      await fetchAuthenticatedUser()

      const state = useAuthStore.getState()
      if (state.isSeller) {
        Alert.alert('Seller Portal', 'Welcome back to your Seller Workspace!')
        router.replace('/seller/dashboard' as any)
      } else {
        router.replace('/(tabs)')
      }
    } catch (error: any) {
      Alert.alert('Error', error.message)
      Sentry.captureException(error)
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <View className="gap-10 bg-white rounded-lg p-5 mt-20">
      <CustomInput
        placeholder="Enter your email"
        value={form.email}
        onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
        label="Email"
        keyboardType="email-address"
      />
      <CustomInput
        placeholder="Enter your password"
        value={form.password}
        onChangeText={(text) =>
          setForm((prev) => ({ ...prev, password: text }))
        }
        label="Password"
        secureTextEntry={true}
      />
      <CustomButton title="Sign-In" isLoading={isSubmitting} onPress={submit} />
      <View className="flex justify-center mt-5 flex-row gap-2">
        <Text className="base-regular text-gray-100">
          Dont have an account?
        </Text>
        <Link href="/sign-up" className="base-bold text-primary">
          Sign Up
        </Link>
      </View>
      <View className="flex justify-center mt-2 flex-row gap-1">
        <Text className="base-regular text-gray-400">Want a tour?</Text>
        <Link href={"/onboarding" as any} className="base-bold text-gray-700 underline">
          View Onboarding
        </Link>
      </View>
    </View>
  )
}

export default SignIn