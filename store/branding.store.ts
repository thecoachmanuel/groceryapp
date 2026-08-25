import { create } from 'zustand'
import { getAppBranding, updateAppBranding } from '@/lib/appwrite'

export interface BrandingState {
  appName: string
  appLogo: string | null // URL or local asset uri, null = default app logo
  appTagline: string
  loginGraphic: string | null // URL or uri for the top corner login graphic
  hideAuthLogo: boolean // toggle to hide app logo from login screen
  isLoading: boolean
  setAppName: (name: string) => void
  setAppLogo: (logoUri: string | null) => void
  setAppTagline: (tagline: string) => void
  setLoginGraphic: (graphicUri: string | null) => void
  setHideAuthLogo: (hide: boolean) => void
  saveBranding: (
    name: string,
    logoUri: string | null,
    tagline?: string,
    loginGraphicUri?: string | null,
    hideAuthLogo?: boolean
  ) => Promise<void>
  fetchBranding: () => Promise<void>
}

export const DEFAULT_APP_NAME = ''
export const DEFAULT_APP_TAGLINE = 'Fresh Finds & Daily Essentials'
export const DEFAULT_APP_LOGO = 'https://cloud.appwrite.io/v1/storage/buckets/6a87822a000b821c4393/files/6a8cad2157fa090a00d9/view?project=6a87786a0006db9d111d'

export const useBrandingStore = create<BrandingState>((set, get) => ({
  appName: DEFAULT_APP_NAME,
  appLogo: DEFAULT_APP_LOGO,
  appTagline: DEFAULT_APP_TAGLINE,
  loginGraphic: null,
  hideAuthLogo: false,
  isLoading: false,

  setAppName: (appName: string) => set({ appName }),
  setAppLogo: (appLogo: string | null) => set({ appLogo }),
  setAppTagline: (appTagline: string) => set({ appTagline }),
  setLoginGraphic: (loginGraphic: string | null) => set({ loginGraphic }),
  setHideAuthLogo: (hideAuthLogo: boolean) => set({ hideAuthLogo }),

  saveBranding: async (
    name: string,
    logoUri: string | null,
    tagline?: string,
    loginGraphicUri?: string | null,
    hideAuthLogo?: boolean
  ) => {
    const finalTagline = tagline ?? get().appTagline
    const finalLoginGraphic = loginGraphicUri !== undefined ? loginGraphicUri : get().loginGraphic
    const finalHideLogo = hideAuthLogo !== undefined ? hideAuthLogo : get().hideAuthLogo
    set({
      appName: name,
      appLogo: logoUri,
      appTagline: finalTagline,
      loginGraphic: finalLoginGraphic,
      hideAuthLogo: finalHideLogo,
    })
    try {
      await updateAppBranding({
        appName: name,
        appLogo: logoUri,
        appTagline: finalTagline,
        loginGraphic: finalLoginGraphic,
        hideAuthLogo: finalHideLogo,
      })
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
          loginGraphic: data.loginGraphic || null,
          hideAuthLogo: Boolean(data.hideAuthLogo),
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
