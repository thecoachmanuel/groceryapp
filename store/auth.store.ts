import { create } from 'zustand';
import { getCurrentUser, getStoreByUserId } from "@/lib/appwrite";
import { User, UserRole, Store } from '@/type';

type AuthState = {
    isAuthenticated: boolean;
    isAdmin: boolean;
    isSeller: boolean;
    role: UserRole;
    user: User | null;
    sellerStore: Store | null;
    isLoading: boolean;

    setIsAuthenticated: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    fetchAuthenticatedUser: () => Promise<void>;
}

const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@grocery.com';

const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isAdmin: false,
    isSeller: false,
    role: 'customer',
    user: null,
    sellerStore: null,
    isLoading: true,

    setIsAuthenticated: (value) => set({ isAuthenticated: value }),
    setUser: (user) => {
        const isAdmin = user?.email === adminEmail || (user as any)?.role === 'admin';
        const isSeller = (user as any)?.role === 'seller';
        const role: UserRole = isAdmin ? 'admin' : isSeller ? 'seller' : 'customer';
        set({ user, isAdmin, isSeller, role });
    },
    setLoading: (value) => set({ isLoading: value }),

    fetchAuthenticatedUser: async () => {
        set({ isLoading: true });

        try {
            const user = await getCurrentUser();

            if (user) {
                if ((user as any).isBlocked) {
                    try {
                        const { account } = await import('@/lib/appwrite')
                        await account.deleteSession('current')
                    } catch (err) {}
                    const { Alert } = await import('react-native')
                    Alert.alert(
                        'Account Suspended 🚫',
                        'Your customer account has been suspended by an Administrator. Please contact support.',
                    )
                    set({
                        isAuthenticated: false,
                        user: null,
                        isAdmin: false,
                        isSeller: false,
                        role: 'customer',
                        sellerStore: null,
                    })
                    return
                }

                const isAdmin = (user as any).email === adminEmail || (user as any).role === 'admin';
                const isSeller = (user as any).role === 'seller';
                const role: UserRole = isAdmin ? 'admin' : isSeller ? 'seller' : 'customer';

                let sellerStore: Store | null = null;
                if (isSeller) {
                    sellerStore = (await getStoreByUserId(user.$id)) as unknown as Store;
                }

                set({
                    isAuthenticated: true,
                    user: user as unknown as User,
                    isAdmin,
                    isSeller,
                    role,
                    sellerStore,
                });
            } else {
                set({
                    isAuthenticated: false,
                    user: null,
                    isAdmin: false,
                    isSeller: false,
                    role: 'customer',
                    sellerStore: null,
                });
            }
        } catch (e) {
            console.log('fetchAuthenticatedUser error', e);
            set({
                isAuthenticated: false,
                user: null,
                isAdmin: false,
                isSeller: false,
                role: 'customer',
                sellerStore: null,
            });
        } finally {
            set({ isLoading: false });
        }
    }
}))

export default useAuthStore;