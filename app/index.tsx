import { Redirect } from 'expo-router'
import useAuthStore from '@/store/auth.store'

export default function RootIndex() {
  const { isAuthenticated, role } = useAuthStore()

  if (isAuthenticated) {
    if (role === 'admin') {
      return <Redirect href="/admin/dashboard" />
    }
    if (role === 'seller') {
      return <Redirect href="/seller/dashboard" />
    }
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/(tabs)" />
}
