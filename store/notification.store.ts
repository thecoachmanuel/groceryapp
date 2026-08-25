import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { UserRole } from '@/type'

export interface AppNotification {
  id: string
  title: string
  body: string
  type: 'order' | 'wallet' | 'system' | 'seller_order' | 'admin_order' | 'broadcast' | 'promo'
  targetRole?: UserRole | 'all'
  targetUserId?: string
  targetSellerId?: string
  orderId?: string
  timestamp: string
  read: boolean
}

interface NotificationState {
  notifications: AppNotification[]
  readNotificationIds: string[]
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: (role?: UserRole, userId?: string, sellerId?: string) => void
  clearAll: () => void
  getFilteredNotifications: (role?: UserRole, userId?: string, sellerId?: string) => AppNotification[]
  getUnreadCount: (role?: UserRole, userId?: string, sellerId?: string) => number
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_welcome',
    title: 'Welcome to the App! 🎉',
    body: 'Explore fresh items, store picks, and fast doorstep delivery.',
    type: 'system',
    targetRole: 'all',
    timestamp: new Date().toISOString(),
    read: false,
  },
]

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: DEFAULT_NOTIFICATIONS,
      readNotificationIds: [],

      addNotification: (notif) => {
        const newId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const newNotif: AppNotification = {
          ...notif,
          id: newId,
          timestamp: new Date().toISOString(),
          read: false,
        }

        set((state) => {
          // Avoid duplicate notifications with same title & body within 10 seconds
          const isDuplicate = state.notifications.some(
            (existing) =>
              existing.title === newNotif.title &&
              existing.body === newNotif.body &&
              Math.abs(new Date(existing.timestamp).getTime() - new Date(newNotif.timestamp).getTime()) < 10000
          )

          if (isDuplicate) return state

          return {
            notifications: [newNotif, ...state.notifications].slice(0, 100),
          }
        })
      },

      markAsRead: (id: string) => {
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          )
          const newReadIds = state.readNotificationIds.includes(id)
            ? state.readNotificationIds
            : [...state.readNotificationIds, id]

          return {
            notifications: updated,
            readNotificationIds: newReadIds,
          }
        })
      },

      markAllAsRead: (role, userId, sellerId) => {
        set((state) => {
          const newlyReadIds: string[] = []

          const updated = state.notifications.map((n) => {
            if (n.targetRole && n.targetRole !== 'all' && n.targetRole !== role) {
              return n
            }
            if (n.targetUserId && userId && n.targetUserId !== userId) {
              return n
            }
            if (n.targetSellerId && sellerId && n.targetSellerId !== sellerId) {
              return n
            }

            newlyReadIds.push(n.id)
            return { ...n, read: true }
          })

          const mergedReadIds = Array.from(new Set([...state.readNotificationIds, ...newlyReadIds]))

          return {
            notifications: updated,
            readNotificationIds: mergedReadIds,
          }
        })
      },

      clearAll: () => {
        set({ notifications: [], readNotificationIds: [] })
      },

      getFilteredNotifications: (role, userId, sellerId) => {
        const { notifications, readNotificationIds } = get()
        return notifications
          .filter((n) => {
            // 1. Role match
            if (n.targetRole && n.targetRole !== 'all' && n.targetRole !== role) {
              return false
            }
            // 2. Specific User ID match
            if (n.targetUserId && userId && n.targetUserId !== userId) {
              return false
            }
            // 3. Specific Seller ID match
            if (n.targetSellerId && sellerId && n.targetSellerId !== sellerId) {
              return false
            }
            return true
          })
          .map((n) => {
            // If ID was previously marked as read in persistent storage, ensure read is true
            if (readNotificationIds.includes(n.id)) {
              return { ...n, read: true }
            }
            return n
          })
      },

      getUnreadCount: (role, userId, sellerId) => {
        const list = get().getFilteredNotifications(role, userId, sellerId)
        return list.filter((n) => !n.read).length
      },
    }),
    {
      name: 'grocery-app-notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        readNotificationIds: state.readNotificationIds,
      }),
    }
  )
)

export default useNotificationStore
