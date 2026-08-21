import { create } from 'zustand'
import { getAppBranding, updateAppBranding } from '@/lib/appwrite'

export interface BrandingState {
  appName: string
  appLogo: string | null // URL or local asset uri, null = default app logo
  appTagline: string
  isLoading: boolean
  setAppName: (name: string) => void
  setAppLogo: (logoUri: string | null) => void
  setAppTagline: (tagline: string) => void
  saveBranding: (name: string, logoUri: string | null, tagline?: string) => Promise<void>
  fetchBranding: () => Promise<void>
}

export const DEFAULT_APP_NAME = 'Grocery App'
export const DEFAULT_APP_TAGLINE = 'Fresh Groceries & Daily Essentials'

export const useBrandingStore = create<BrandingState>((set, get) => ({
  appName: DEFAULT_APP_NAME,
  appLogo: null,
  appTagline: DEFAULT_APP_TAGLINE,
  isLoading: false,

  setAppName: (appName: string) => set({ appName }),
  setAppLogo: (appLogo: string | null) => set({ appLogo }),
  setAppTagline: (appTagline: string) => set({ appTagline }),

  saveBranding: async (name: string, logoUri: string | null, tagline?: string) => {
    const finalTagline = tagline ?? get().appTagline
    set({ appName: name, appLogo: logoUri, appTagline: finalTagline })
    try {
      await updateAppBranding({ appName: name, appLogo: logoUri, appTagline: finalTagline })
    } catch (e) {
      console.warn('Error persisting branding to cloud:', e)
    }
  },

  fetchBranding: async () => {
    try {
      set({ isLoading: true })
      const data = await getAppBranding()
      if (data) {
        set({
          appName: data.appName || DEFAULT_APP_NAME,
          appLogo: data.appLogo || null,
          appTagline: data.appTagline || DEFAULT_APP_TAGLINE,
        })
      }
    } catch (e) {
      console.warn('Error fetching cloud branding:', e)
    } finally {
      set({ isLoading: false })
    }
  },
}))

export default useBrandingStore
