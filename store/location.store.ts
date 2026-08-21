import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface SavedAddress {
  id: string
  label: 'Home' | 'Work' | 'Other'
  address: string
  landmark?: string
  latitude: number
  longitude: number
  isDefault?: boolean
}

type LocationState = {
  address: string
  latitude: number | null
  longitude: number | null
  isCaptured: boolean
  savedAddresses: SavedAddress[]
  setAddress: (address: string) => void
  setLocation: (
    address: string,
    coords?: { latitude: number; longitude: number },
    isCaptured?: boolean
  ) => void
  addSavedAddress: (newAddr: Omit<SavedAddress, 'id'>) => void
  updateSavedAddress: (id: string, updated: Partial<SavedAddress>) => void
  deleteSavedAddress: (id: string) => void
  selectSavedAddress: (addressObj: SavedAddress) => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      address: 'Detecting location...',
      latitude: null,
      longitude: null,
      isCaptured: false,
      savedAddresses: [],

      setAddress: (address: string) =>
        set((state) => ({
          address,
          isCaptured: address !== 'Detecting location...' && address.trim() !== '',
        })),

      setLocation: (address, coords, isCaptured = true) =>
        set({
          address,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          isCaptured,
        }),

      addSavedAddress: (newAddr) =>
        set((state) => {
          // Enforce maximum 1 Home address and 1 Work address
          const filtered =
            newAddr.label === 'Home' || newAddr.label === 'Work'
              ? state.savedAddresses.filter((addr) => addr.label !== newAddr.label)
              : state.savedAddresses

          const created: SavedAddress = {
            id: `${newAddr.label.toLowerCase()}_${Date.now()}`,
            ...newAddr,
          }
          return {
            savedAddresses: [...filtered, created],
            address: created.address,
            latitude: created.latitude,
            longitude: created.longitude,
            isCaptured: true,
          }
        }),

      updateSavedAddress: (id, updated) =>
        set((state) => ({
          savedAddresses: state.savedAddresses.map((addr) =>
            addr.id === id ? { ...addr, ...updated } : addr
          ),
        })),

      deleteSavedAddress: (id) =>
        set((state) => ({
          savedAddresses: state.savedAddresses.filter((addr) => addr.id !== id),
        })),

      selectSavedAddress: (addressObj) =>
        set({
          address: addressObj.address,
          latitude: addressObj.latitude,
          longitude: addressObj.longitude,
          isCaptured: true,
        }),
    }),
    {
      name: 'grocery-customer-addresses-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedAddresses: state.savedAddresses,
        address: state.address,
        latitude: state.latitude,
        longitude: state.longitude,
        isCaptured: state.isCaptured,
      }),
    }
  )
)

export default useLocationStore
