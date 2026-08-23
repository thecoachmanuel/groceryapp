import { CreateUserParams, GetMenuParams, SignInParams } from '@/type'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from 'react-native-appwrite'

export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6a87786a0006db9d111d',
  platform: 'com.grocery.app',
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '6a877af5000bdb5165ac',
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID || '6a87822a000b821c4393',
  userCollectionId: 'user',
  categoriesCollectionId: 'categories',
  menuCollectionId: 'products',
  legacyMenuCollectionId: 'menu',
  customizationsCollectionId: 'customizations',
  menuCustomizationsCollectionId: 'menu_customizations',
  ordersCollectionId: 'orders',
  bannersCollectionId: 'banners',
  storesCollectionId: 'stores',
  walletsCollectionId: 'wallets',
  walletTransactionsCollectionId: 'wallet_transactions',
  sellerPayoutsCollectionId: 'seller_payouts',
  couponsCollectionId: 'coupons',
  platformPoliciesCollectionId: 'platform_policies',
}

export const client = new Client()

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform)

export const account = new Account(client)
export const databases = new Databases(client)
const avatars = new Avatars(client)
export const storage = new Storage(client);

export const createUser = async ({
  email,
  password,
  name,
  role = 'customer',
}: CreateUserParams) => {
  try {
    try {
      await account.deleteSession('current')
    } catch {
      // Ignore if no active session
    }

    const newAccount = await account.create(ID.unique(), email, password, name)
    if (!newAccount) throw new Error('Account creation failed')

    await signIn({ email, password })

    const avatarUrl = avatars.getInitialsURL(name)

    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      { email, name, accountId: newAccount.$id, avatar: avatarUrl, role },
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const signIn = async ({ email, password }: SignInParams) => {
  try {
    // Delete any active session first to avoid "creation of a session is prohibited when a session is active"
    try {
      await account.deleteSession('current')
    } catch {
      // Ignore if no active session
    }

    const session = await account.createEmailPasswordSession(email, password)
    return session
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get()
    if (!currentAccount) return null

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('accountId', currentAccount.$id)],
    )

    if (!currentUser || currentUser.documents.length === 0) return null

    return currentUser.documents[0]
  } catch (e) {
    return null
  }
}

// ----------------------------------------------------
// ⚡ 10X IMAGE WEBP OPTIMIZATION HELPER
// ----------------------------------------------------
export const getOptimizedImageUrl = (url?: string, width = 400, height = 400, quality = 80) => {
  if (!url || typeof url !== 'string') return url || ''
  // Return the /view URL as-is — Appwrite /preview can fail for certain uploads
  // Just ensure the project param is present
  if (url.includes('/storage/buckets/') && url.includes('/files/')) {
    if (!url.includes('project=')) {
      return `${url}${url.includes('?') ? '&' : '?'}project=${appwriteConfig.projectId}`
    }
    return url
  }
  return url
}

// ----------------------------------------------------
// 👤 CUSTOMER PROFILE & ADMIN USER MANAGEMENT
// ----------------------------------------------------
export const updateUserProfile = async (
  userDocId: string,
  updates: { name?: string; phone?: string; avatar?: string },
) => {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userDocId,
      updates,
    )
  } catch (e: any) {
    throw new Error(e.message || 'Failed to update profile.')
  }
}

export const getAllCustomers = async () => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.orderDesc('$createdAt')],
    )
    return response.documents
  } catch (e: any) {
    console.error('Error fetching customers:', e)
    return []
  }
}

export const updateCustomerBlockStatus = async (userDocId: string, isBlocked: boolean) => {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userDocId,
      { isBlocked },
    )
  } catch (e: any) {
    throw new Error(e.message || 'Failed to update user block status.')
  }
}

export const adminUpdateCustomerEmail = async (userDocId: string, newEmail: string) => {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userDocId,
      { email: newEmail },
    )
  } catch (e: any) {
    throw new Error(e.message || 'Failed to update customer email.')
  }
}

// ----------------------------------------------------
// 🎨 BANNER ADS & PROMOTIONS MANAGEMENT
// ----------------------------------------------------
export const getBanners = async () => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.bannersCollectionId,
      [Query.orderAsc('displayOrder'), Query.limit(50)],
    )

    // Deduplicate strictly by document $id so admin edits persist cleanly without title collisions
    const uniqueMap = new Map<string, any>()
    for (const doc of response.documents || []) {
      if (doc?.$id) {
        uniqueMap.set(doc.$id, doc)
      }
    }
    return Array.from(uniqueMap.values())
  } catch (e) {
    console.error('Error fetching banners:', e)
    return []
  }
}

export const DEFAULT_GROCERY_PRODUCTS = [
  {
    id: 'gro_1',
    name: 'Fresh Hass Avocados (3 Pcs)',
    price: 2500,
    discountPrice: 2200,
    rating: 4.9,
    image_url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'gro_2',
    name: 'Organic Red Tomatoes (1kg)',
    price: 1800,
    discountPrice: 1500,
    rating: 4.8,
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'gro_3',
    name: 'Whole Fresh Milk (1L)',
    price: 1200,
    discountPrice: 1000,
    rating: 4.7,
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'gro_4',
    name: 'Farm Fresh Eggs (Crate of 30)',
    price: 4500,
    discountPrice: 4200,
    rating: 4.9,
    image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80',
  },
]

export const seedDefaultBannersIfEmpty = async () => {
  try {
    const existing = await getBanners()
    if (existing && existing.length > 0) return existing

    const DEFAULT_PROMOS = [
      {
        title: '50% OFF',
        subtitle: 'On your first grocery order',
        imageUrl: 'https://static.vecteezy.com/system/resources/previews/044/844/600/large_2x/homemade-fresh-tasty-burger-with-meat-and-cheese-classic-cheese-burger-and-vegetable-ai-generated-free-png.png',
        gradientStart: '#B91C1C',
        gradientEnd: '#F87171',
        displayOrder: 1,
        isActive: true,
        targetType: 'category',
        targetId: 'burger',
      },
      {
        title: 'Fresh Farm Produce',
        subtitle: 'Direct from organic farm partners',
        imageUrl: 'https://static.vecteezy.com/system/resources/previews/023/742/417/large_2x/pepperoni-pizza-isolated-illustration-ai-generative-free-png.png',
        gradientStart: '#059669',
        gradientEnd: '#6EE7B7',
        displayOrder: 2,
        isActive: true,
        targetType: 'category',
        targetId: 'pizza',
      },
      {
        title: 'Express 30-Min Delivery',
        subtitle: 'Hot & fresh items at your doorstep',
        imageUrl: 'https://static.vecteezy.com/system/resources/previews/044/844/600/large_2x/homemade-fresh-tasty-burger-with-meat-and-cheese-classic-cheese-burger-and-vegetable-ai-generated-free-png.png',
        gradientStart: '#D97706',
        gradientEnd: '#FFD580',
        displayOrder: 3,
        isActive: true,
        targetType: 'category',
        targetId: 'fast-food',
      },
    ]

    const createdDocs = []
    for (const promo of DEFAULT_PROMOS) {
      const doc = await createBanner(promo)
      createdDocs.push(doc)
    }
    return createdDocs
  } catch (e) {
    console.error('Error seeding default banners:', e)
    return []
  }
}


export const createBanner = async (bannerData: {
  title: string
  subtitle?: string
  imageUrl: string
  gradientStart: string
  gradientEnd: string
  isActive?: boolean
  displayOrder?: number
  targetCategory?: string
}) => {
  try {
    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.bannersCollectionId,
      ID.unique(),
      {
        ...bannerData,
        isActive: bannerData.isActive ?? true,
        displayOrder: bannerData.displayOrder ?? 1,
      },
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const updateBanner = async (bannerId: string, bannerData: Partial<any>) => {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.bannersCollectionId,
      bannerId,
      bannerData,
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const deleteBanner = async (bannerId: string) => {
  try {
    return await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.bannersCollectionId,
      bannerId,
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const uploadImageToStorage = async (fileUri: string, prefix = 'prod') => {
  try {
    const extMatch = fileUri.match(/\.([a-zA-Z0-9]+)(\?|$)/)
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg'
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const fileName = `${prefix}_${Date.now()}.${ext}`

    const uploadedFile = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      {
        name: fileName,
        type: mimeType,
        size: 150000,
        uri: fileUri,
      } as any,
    )

    return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucketId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.projectId}`
  } catch (e: any) {
    console.error('uploadImageToStorage error:', e)
    throw new Error(e.message || 'Image upload failed.')
  }
}

export const deleteStorageFileByUrl = async (fileUrl?: string) => {
  if (!fileUrl || typeof fileUrl !== 'string') return
  if (!fileUrl.includes('/files/')) return
  try {
    const match = fileUrl.match(/\/files\/([a-zA-Z0-9_-]+)/)
    if (match && match[1]) {
      const fileId = match[1]
      await storage.deleteFile(appwriteConfig.bucketId, fileId).catch(() => { })
    }
  } catch (err) {
    console.warn('deleteStorageFileByUrl error:', err)
  }
}

// ----------------------------------------------------
// 🏪 STORES & SELLER MANAGEMENT
// ----------------------------------------------------
export const createSellerAccount = async ({
  email,
  password,
  name,
  storeName,
  phone,
}: {
  email: string
  password: string
  name: string
  storeName?: string
  phone?: string
}) => {
  try {
    const secondaryClient = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId)
      .setPlatform(appwriteConfig.platform)

    const secondaryAccount = new Account(secondaryClient)
    const newAuthUser = await secondaryAccount.create(ID.unique(), email, password, name)

    const avatarUrl = avatars.getInitialsURL(name)

    const profileDoc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        email,
        name,
        accountId: newAuthUser.$id,
        avatar: avatarUrl,
        role: 'seller',
        phone: phone || '',
      },
    )

    const storeDoc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.storesCollectionId,
      ID.unique(),
      {
        userId: profileDoc.$id,
        storeName: storeName || `${name}'s Store`,
        description: 'Quality grocery & items seller store',
        commissionRate: 10.0,
        status: 'active',
        phone: phone || '',
        address: '',
      },
    )

    return { profile: profileDoc, store: storeDoc }
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const getStores = async () => {
  try {
    const stores = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.storesCollectionId,
    )
    return stores.documents
  } catch (e) {
    console.error('Error getting stores:', e)
    return []
  }
}

export const DEFAULT_STORES = [
  {
    $id: 'store_1',
    id: 'store_1',
    storeName: 'Green Valley Organic Market',
    description: 'Farm-fresh organic fruits, vegetables & healthy daily picks',
    rating: 4.9,
    deliveryTime: '15-25 min',
    status: 'active',
    phone: '+234 802 345 6789',
    address: '14 Admiralty Way, Lekki Phase 1, Lagos',
    latitude: 6.4698,
    longitude: 3.5852,
    logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&auto=format&fit=crop&q=80',
  },
  {
    $id: 'store_2',
    id: 'store_2',
    storeName: 'Daily Supermarket & Bakery',
    description: 'Artisanal breads, fresh dairy, eggs, pantry & bakery items',
    rating: 4.8,
    deliveryTime: '20-30 min',
    status: 'active',
    phone: '+234 803 456 7890',
    address: '22 Victoria Island Boulevard, Lagos',
    latitude: 6.4281,
    longitude: 3.4219,
    logoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80',
  },
  {
    $id: 'store_3',
    id: 'store_3',
    storeName: 'Oceanic Seafood & Meat Corner',
    description: 'Fresh cuts of lean meat, poultry, fish & ocean catch',
    rating: 4.9,
    deliveryTime: '25-35 min',
    status: 'active',
    phone: '+234 805 678 9012',
    address: '5 Awolowo Road, Ikoyi, Lagos',
    latitude: 6.4549,
    longitude: 3.4347,
    logoUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&auto=format&fit=crop&q=80',
  },
  {
    $id: 'store_4',
    id: 'store_4',
    storeName: 'Sweet Treats & Snack Hub',
    description: 'Beverages, chocolates, ice creams, chips & party snacks',
    rating: 4.7,
    deliveryTime: '15-20 min',
    status: 'active',
    phone: '+234 809 123 4567',
    address: '8 Allen Avenue, Ikeja, Lagos',
    latitude: 6.6018,
    longitude: 3.3515,
    logoUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=1200&auto=format&fit=crop&q=80',
  },
]

export const DEFAULT_STORE_PRODUCTS: Record<string, any[]> = {
  store_1: [
    {
      $id: 'mock_gro_1',
      id: 'mock_gro_1',
      name: 'Fresh Hass Avocados (3 Pcs)',
      price: 2500,
      discountPrice: 2200,
      rating: 4.9,
      categories: 'Fruits & Vegetables',
      categoryId: 'Fruits & Vegetables',
      sellerId: 'store_1',
      image_url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&auto=format&fit=crop&q=80',
      description: 'Creamy, ripe organic Hass avocados imported fresh. Rich in healthy fats and potassium.',
    },
    {
      $id: 'mock_gro_2',
      id: 'mock_gro_2',
      name: 'Organic Red Tomatoes (1kg)',
      price: 1800,
      discountPrice: 1500,
      rating: 4.8,
      categories: 'Fruits & Vegetables',
      categoryId: 'Fruits & Vegetables',
      sellerId: 'store_1',
      image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
      description: 'Plump, vine-ripened red tomatoes ideal for salads, stews, and fresh cooking.',
    },
    {
      $id: 'mock_gro_3',
      id: 'mock_gro_3',
      name: 'Fresh Organic Spinach & Kale Mix (400g)',
      price: 1600,
      discountPrice: 1400,
      rating: 4.9,
      categories: 'Fruits & Vegetables',
      categoryId: 'Fruits & Vegetables',
      sellerId: 'store_1',
      image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80',
      description: 'Crisp, washed organic leafy greens packed with vitamins A, C, and iron.',
    },
    {
      $id: 'mock_gro_4',
      id: 'mock_gro_4',
      name: 'Freshly Squeezed Orange Juice (1L)',
      price: 2000,
      discountPrice: 1800,
      rating: 4.8,
      categories: 'Beverages & Drinks',
      categoryId: 'Beverages & Drinks',
      sellerId: 'store_1',
      image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop&q=80',
      description: '100% natural Valencia orange juice with pulp. No added sugar or preservatives.',
    },
    {
      $id: 'mock_gro_14',
      id: 'mock_gro_14',
      name: 'Frozen Mixed Berries (500g)',
      price: 4000,
      discountPrice: 3600,
      rating: 4.8,
      categories: 'Fruits & Vegetables',
      categoryId: 'Fruits & Vegetables',
      sellerId: 'store_1',
      image_url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&auto=format&fit=crop&q=80',
      description: 'Flash-frozen strawberries, blueberries, and raspberries. Great for smoothies.',
    },
  ],
  store_2: [
    {
      $id: 'mock_gro_5',
      id: 'mock_gro_5',
      name: 'Whole Fresh Milk (1 Litre)',
      price: 1200,
      discountPrice: 1000,
      rating: 4.7,
      categories: 'Dairy & Eggs',
      categoryId: 'Dairy & Eggs',
      sellerId: 'store_2',
      image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
      description: 'Pure, pasteurized whole cow milk rich in calcium and vitamin D.',
    },
    {
      $id: 'mock_gro_6',
      id: 'mock_gro_6',
      name: 'Farm Fresh Grade A Eggs (Crate of 30)',
      price: 4500,
      discountPrice: 4200,
      rating: 4.9,
      categories: 'Dairy & Eggs',
      categoryId: 'Dairy & Eggs',
      sellerId: 'store_2',
      image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop&q=80',
      description: 'Nutritious brown eggs harvested daily from free-range chicken farms.',
    },
    {
      $id: 'mock_gro_7',
      id: 'mock_gro_7',
      name: 'Whole Wheat Sliced Bread (700g)',
      price: 1500,
      discountPrice: 1350,
      rating: 4.8,
      categories: 'Bakery & Bread',
      categoryId: 'Bakery & Bread',
      sellerId: 'store_2',
      image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
      description: 'Freshly baked 100% whole grain wheat bread, soft and high in natural fiber.',
    },
    {
      $id: 'mock_gro_8',
      id: 'mock_gro_8',
      name: 'Artisanal Butter Croissants (Pack of 4)',
      price: 2800,
      discountPrice: 2500,
      rating: 4.9,
      categories: 'Bakery & Bread',
      categoryId: 'Bakery & Bread',
      sellerId: 'store_2',
      image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80',
      description: 'Flaky, buttery French-style breakfast pastries freshly baked each morning.',
    },
    {
      $id: 'mock_gro_15',
      id: 'mock_gro_15',
      name: 'Cold Pressed Extra Virgin Olive Oil (750ml)',
      price: 6500,
      discountPrice: 6000,
      rating: 4.9,
      categories: 'Pantry & Grains',
      categoryId: 'Pantry & Grains',
      sellerId: 'store_2',
      image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&auto=format&fit=crop&q=80',
      description: 'Premium cold-pressed extra virgin olive oil ideal for cooking and salad dressings.',
    },
  ],
  store_3: [
    {
      $id: 'mock_gro_9',
      id: 'mock_gro_9',
      name: 'Fresh Chicken Breast Fillets (1kg)',
      price: 5800,
      discountPrice: 5200,
      rating: 4.9,
      categories: 'Meat & Seafood',
      categoryId: 'Meat & Seafood',
      sellerId: 'store_3',
      image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&auto=format&fit=crop&q=80',
      description: 'Lean, skinless and boneless fresh chicken breast cuts packed with high protein.',
    },
    {
      $id: 'mock_gro_10',
      id: 'mock_gro_10',
      name: 'Fresh Atlantic Salmon Fillet (500g)',
      price: 8500,
      discountPrice: 7800,
      rating: 5.0,
      categories: 'Meat & Seafood',
      categoryId: 'Meat & Seafood',
      sellerId: 'store_3',
      image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80',
      description: 'Rich in Omega-3 fatty acids. Skin-on, boneless sushi-grade fresh salmon cut.',
    },
    {
      $id: 'mock_gro_11',
      id: 'mock_gro_11',
      name: 'Premium Angus Beef Steak (800g)',
      price: 9500,
      discountPrice: 8900,
      rating: 4.9,
      categories: 'Meat & Seafood',
      categoryId: 'Meat & Seafood',
      sellerId: 'store_3',
      image_url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=80',
      description: 'Tender, marbled premium beef cut seasoned for pan searing or grilling.',
    },
    {
      $id: 'mock_gro_12',
      id: 'mock_gro_12',
      name: 'Jumbo Tiger Prawns (1kg)',
      price: 11000,
      discountPrice: 9900,
      rating: 4.8,
      categories: 'Meat & Seafood',
      categoryId: 'Meat & Seafood',
      sellerId: 'store_3',
      image_url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800&auto=format&fit=crop&q=80',
      description: 'Wild-caught large ocean prawns cleaned and ready for stir-fries and barbecue.',
    },
  ],
  store_4: [
    {
      $id: 'mock_gro_13',
      id: 'mock_gro_13',
      name: 'Roasted Salted Cashew Nuts (250g)',
      price: 3200,
      discountPrice: 2900,
      rating: 4.7,
      categories: 'Snacks & Sweets',
      categoryId: 'Snacks & Sweets',
      sellerId: 'store_4',
      image_url: 'https://images.unsplash.com/photo-1536591375315-1b836815d230?w=800&auto=format&fit=crop&q=80',
      description: 'Crunchy jumbo cashew nuts slow-roasted and lightly salted to perfection.',
    },
    {
      $id: 'mock_gro_16',
      id: 'mock_gro_16',
      name: 'Freshly Squeezed Orange Juice (1L)',
      price: 2000,
      discountPrice: 1800,
      rating: 4.8,
      categories: 'Beverages & Drinks',
      categoryId: 'Beverages & Drinks',
      sellerId: 'store_4',
      image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop&q=80',
      description: '100% natural Valencia orange juice with pulp. No added sugar or artificial preservatives.',
    },
    {
      $id: 'mock_gro_17',
      id: 'mock_gro_17',
      name: 'Frozen Mixed Berries (500g)',
      price: 4000,
      discountPrice: 3600,
      rating: 4.8,
      categories: 'Fruits & Vegetables',
      categoryId: 'Fruits & Vegetables',
      sellerId: 'store_4',
      image_url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&auto=format&fit=crop&q=80',
      description: 'Flash-frozen strawberries, blueberries, and raspberries. Great for smoothies and desserts.',
    },
  ],
}

export const getStoreById = async (storeId: string) => {
  try {
    if (!storeId) return null

    // 1. Try direct document GET
    try {
      const doc = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.storesCollectionId,
        storeId,
      )
      if (doc) return doc
    } catch { }

    // 2. Try sellerId query
    try {
      const bySeller = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.storesCollectionId,
        [Query.equal('sellerId', storeId)],
      )
      if (bySeller?.documents && bySeller.documents.length > 0) return bySeller.documents[0]
    } catch { }

    // 3. Try userId query
    try {
      const byUser = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.storesCollectionId,
        [Query.equal('userId', storeId)],
      )
      if (byUser?.documents && byUser.documents.length > 0) return byUser.documents[0]
    } catch { }

    // 4. Fallback search all stores from Appwrite
    const all = await getStores()
    const foundLive = all.find(
      (s: any) =>
        s.$id === storeId ||
        s.id === storeId ||
        s.sellerId === storeId ||
        s.userId === storeId
    )
    if (foundLive) return foundLive

    // 5. Fallback search default stores
    const foundDefault = DEFAULT_STORES.find(
      (s) => s.$id === storeId || s.id === storeId
    )
    return foundDefault || null
  } catch (e) {
    console.error('Error fetching store by ID:', e)
    return DEFAULT_STORES.find((s) => s.$id === storeId || s.id === storeId) || null
  }
}

export const getStoreByUserId = async (userId: string) => {
  try {
    const store = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.storesCollectionId,
      [Query.equal('userId', userId)],
    )
    return store.documents[0] || null
  } catch (e) {
    return null
  }
}

export const updateStoreStatus = async (
  storeId: string,
  status: string,
  commissionRate?: number,
) => {
  try {
    const updateData: any = { status }
    if (commissionRate !== undefined) updateData.commissionRate = commissionRate

    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.storesCollectionId,
      storeId,
      updateData,
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const geocodeAddressCoords = async (address: string): Promise<{ latitude: number; longitude: number }> => {
  if (!address || !address.trim()) {
    return { latitude: 6.4698, longitude: 3.5852 }
  }

  const cleanAddr = address.trim()
  const lower = cleanAddr.toLowerCase()

  // 1. UTMOST FIX: Query OpenStreetMap Nominatim FIRST for exact street & building coordinates
  try {
    const searchQuery = lower.includes('nigeria') ? cleanAddr : `${cleanAddr}, Nigeria`
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
      headers: { 'User-Agent': 'GroceryApp-Mobile/1.0' }
    })
    const data = await res.json()
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        console.log(`[GEOCODE] Online match for "${cleanAddr}": Lat ${lat}, Lng ${lon}`)
        return { latitude: lat, longitude: lon }
      }
    }
  } catch (err) {
    console.log('[GEOCODE] Online geocoding offline/network fallback:', err)
  }

  // 2. BACKUP: Nationwide City & State Fast Dictionary (used if network fails or search returns empty)
  if (lower.includes('ibadan') || lower.includes('akinyele') || lower.includes('bodija') || lower.includes('paul hendrickse') || lower.includes('university of ibadan') || lower.includes(' ui ')) {
    return { latitude: 7.4477, longitude: 3.8967 }
  }
  if (lower.includes('abuja') || lower.includes('wuse') || lower.includes('maitama') || lower.includes('garki') || lower.includes('gwarinpa')) {
    return { latitude: 9.0765, longitude: 7.3986 }
  }
  if (lower.includes('port harcourt') || lower.includes('phc') || lower.includes('gra') || lower.includes('rumuokoro')) {
    return { latitude: 4.8156, longitude: 7.0498 }
  }
  if (lower.includes('kano')) {
    return { latitude: 12.0022, longitude: 8.5920 }
  }
  if (lower.includes('enugu')) {
    return { latitude: 6.4584, longitude: 7.5464 }
  }
  if (lower.includes('asaba')) {
    return { latitude: 6.1984, longitude: 6.7262 }
  }
  if (lower.includes('benin')) {
    return { latitude: 6.3350, longitude: 5.6037 }
  }
  if (lower.includes('abeokuta') || lower.includes('sango') || lower.includes('otta')) {
    return { latitude: 7.1475, longitude: 3.3619 }
  }
  if (lower.includes('owerri')) {
    return { latitude: 5.4832, longitude: 7.0358 }
  }
  if (lower.includes('calabar')) {
    return { latitude: 4.9757, longitude: 8.3417 }
  }
  if (lower.includes('uyo')) {
    return { latitude: 5.0377, longitude: 7.9128 }
  }
  if (lower.includes('akure')) {
    return { latitude: 7.2571, longitude: 5.2058 }
  }
  if (lower.includes('ilorin')) {
    return { latitude: 8.4799, longitude: 4.5418 }
  }
  if (lower.includes('kaduna')) {
    return { latitude: 10.5105, longitude: 7.4165 }
  }
  if (lower.includes('jos')) {
    return { latitude: 9.8965, longitude: 8.8583 }
  }

  // Lagos Areas Backup
  if (lower.includes('ikeja') || lower.includes('allen') || lower.includes('alausa') || lower.includes('computer village')) {
    return { latitude: 6.6018, longitude: 3.3515 }
  }
  if (lower.includes('victoria island') || lower.includes(' vi') || lower.includes('adeola') || lower.includes('ozumba')) {
    return { latitude: 6.4281, longitude: 3.4219 }
  }
  if (lower.includes('ikoyi') || lower.includes('awolowo') || lower.includes('bourdillon')) {
    return { latitude: 6.4549, longitude: 3.4347 }
  }
  if (lower.includes('lekki') || lower.includes('admiralty') || lower.includes('maroko')) {
    return { latitude: 6.4698, longitude: 3.5852 }
  }
  if (lower.includes('ajah') || lower.includes('sangotedo') || lower.includes('chevron') || lower.includes('vgc')) {
    return { latitude: 6.4678, longitude: 3.6012 }
  }
  if (lower.includes('yaba') || lower.includes('herbert macaulay') || lower.includes('sabo') || lower.includes('akoka')) {
    return { latitude: 6.5095, longitude: 3.3711 }
  }
  if (lower.includes('surulere') || lower.includes('bode thomas') || lower.includes('stadium') || lower.includes('ojuelegba')) {
    return { latitude: 6.4994, longitude: 3.3578 }
  }
  if (lower.includes('festac') || lower.includes('mile 2') || lower.includes('amuwo')) {
    return { latitude: 6.4650, longitude: 3.2840 }
  }
  if (lower.includes('maryland') || lower.includes('anthony') || lower.includes('mende')) {
    return { latitude: 6.5658, longitude: 3.3664 }
  }
  if (lower.includes('oshodi') || lower.includes('isolo') || lower.includes('ejigbo')) {
    return { latitude: 6.5367, longitude: 3.3283 }
  }
  if (lower.includes('magodo') || lower.includes('ojodu') || lower.includes('berger')) {
    return { latitude: 6.6268, longitude: 3.3789 }
  }
  if (lower.includes('gbagada') || lower.includes('oworonsoki') || lower.includes('oworonshoki')) {
    return { latitude: 6.5540, longitude: 3.3888 }
  }

  return { latitude: 6.5244, longitude: 3.3792 }
}

export const updateStoreProfile = async (storeId: string, storeData: Partial<any>) => {
  try {
    const dataToSave = { ...storeData }

    // Auto-allocate latitude & longitude immediately whenever address is entered or updated (no matter the state)
    if (dataToSave.address) {
      const coords = await geocodeAddressCoords(dataToSave.address)
      dataToSave.latitude = coords.latitude
      dataToSave.longitude = coords.longitude
    }

    // Update default stores in-memory array if storeId matches
    const defIdx = DEFAULT_STORES.findIndex((s) => s.$id === storeId || s.id === storeId)
    if (defIdx !== -1) {
      DEFAULT_STORES[defIdx] = { ...DEFAULT_STORES[defIdx], ...dataToSave }
    }

    try {
      return await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.storesCollectionId,
        storeId,
        dataToSave,
      )
    } catch {
      return defIdx !== -1 ? DEFAULT_STORES[defIdx] : dataToSave
    }
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

// ----------------------------------------------------
// ⚡ DYNAMIC DELIVERY TIME ESTIMATION ENGINE
// ----------------------------------------------------
export const calculateEstimatedDeliveryTime = (
  distanceKm: number
): { label: string; minMinutes: number; maxMinutes: number } => {
  if (distanceKm == null || isNaN(distanceKm) || distanceKm <= 0) {
    return { label: '15-25 min', minMinutes: 15, maxMinutes: 25 }
  }

  if (distanceKm <= 1.0) {
    return { label: '10-15 min', minMinutes: 10, maxMinutes: 15 }
  } else if (distanceKm <= 3.0) {
    return { label: '15-25 min', minMinutes: 15, maxMinutes: 25 }
  } else if (distanceKm <= 7.0) {
    return { label: '25-35 min', minMinutes: 25, maxMinutes: 35 }
  } else if (distanceKm <= 12.0) {
    return { label: '35-45 min', minMinutes: 35, maxMinutes: 45 }
  } else if (distanceKm <= 20.0) {
    return { label: '45-60 min', minMinutes: 45, maxMinutes: 60 }
  } else {
    return { label: 'Same Day Delivery', minMinutes: 60, maxMinutes: 180 }
  }
}

// ----------------------------------------------------
// 📍 LOCATION PROXIMITY INTELLIGENCE
// ----------------------------------------------------
export const sortStoresByProximity = (
  storesList: any[],
  customerLat?: number | null,
  customerLon?: number | null
): any[] => {
  if (!storesList || storesList.length === 0) return []
  const userLat = customerLat || 6.5244 // Default to Lagos Central if location pending
  const userLon = customerLon || 3.3792

  const mapped = storesList.map((st: any) => {
    let distKm = 2.5
    if (st && st.latitude != null && st.longitude != null) {
      distKm = calculateHaversineDistanceKm(userLat, userLon, Number(st.latitude), Number(st.longitude))
    }
    const timeEst = calculateEstimatedDeliveryTime(distKm)
    return {
      ...st,
      distanceKm: distKm,
      estimatedDeliveryTime: timeEst.label,
    }
  })

  // Sort stores ascending by distance (nearest stores first)
  return mapped.sort((a, b) => a.distanceKm - b.distanceKm)
}

export const sortProductsByProximity = (
  productsList: any[],
  storesList: any[],
  customerLat?: number | null,
  customerLon?: number | null
): any[] => {
  if (!productsList || productsList.length === 0) return []
  const sortedStores = sortStoresByProximity(storesList, customerLat, customerLon)
  const storeDistanceMap: Record<string, number> = {}

  for (const st of sortedStores) {
    const sId = st.$id || st.id
    if (sId) {
      storeDistanceMap[sId] = st.distanceKm ?? 2.5
    }
  }

  const mapped = productsList.map((p: any) => {
    const sId = p.sellerId || p.seller_id || p.storeId
    const distKm = sId && storeDistanceMap[sId] != null ? storeDistanceMap[sId] : 5.0
    return {
      ...p,
      distanceKm: distKm,
    }
  })

  // Sort products ascending by seller proximity
  return mapped.sort((a, b) => a.distanceKm - b.distanceKm)
}

// ----------------------------------------------------
// 📦 PRODUCTS & MENU MANAGEMENT
// ----------------------------------------------------
export const getMenu = async ({ category, query, sellerId }: GetMenuParams = {}) => {
  try {
    const queries: string[] = [Query.limit(100)]

    if (query) queries.push(Query.search('name', query))

    if (sellerId) {
      if (Array.isArray(sellerId)) {
        if (sellerId.length > 0) {
          queries.push(Query.equal('sellerId', sellerId))
        }
      } else if (typeof sellerId === 'string' && sellerId.trim() !== '') {
        queries.push(Query.equal('sellerId', sellerId))
      }
    }

    const collectionsToQuery = [
      appwriteConfig.menuCollectionId,
      appwriteConfig.legacyMenuCollectionId,
    ].filter(Boolean)

    const allDocs: any[] = []
    const seenIds = new Set<string>()

    for (const collId of collectionsToQuery) {
      try {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          collId,
          queries,
        )
        for (const doc of res.documents) {
          if (!seenIds.has(doc.$id)) {
            seenIds.add(doc.$id)
            const normalized = {
              ...doc,
              categories: doc.categories || doc.categoryId || 'General',
              categoryId: doc.categoryId || doc.categories || 'General',
              sellerId: doc.sellerId || doc.storeId || '',
            }
            allDocs.push(normalized)
          }
        }
      } catch {
        // Skip inaccessible collection
      }
    }

    // Apply category filter if requested
    if (category && category !== 'all') {
      const catLower = category.toLowerCase().trim()
      return allDocs.filter((d) => {
        const c1 = String(d.categories || '').toLowerCase()
        const c2 = String(d.categoryId || '').toLowerCase()
        const c3 = String(d.category || '').toLowerCase()
        const c4 = String(d.type || '').toLowerCase()
        return c1.includes(catLower) || c2.includes(catLower) || c3.includes(catLower) || c4.includes(catLower)
      })
    }

    return allDocs
  } catch (e) {
    console.error('Error fetching menu:', e)
    return []
  }
}

/**
 * Strictly fetches products that belong to a specific store.
 * Returns only products assigned to this store, without cross-store contamination.
 */
export const getProductsByStore = async (storeOrId: string | any) => {
  try {
    if (!storeOrId) return []

    let storeDoc: any = null
    let storeParamId = ''

    if (typeof storeOrId === 'object' && storeOrId !== null) {
      storeDoc = storeOrId
      storeParamId = storeDoc.$id || storeDoc.id || ''
    } else if (typeof storeOrId === 'string') {
      storeParamId = storeOrId
      storeDoc = await getStoreById(storeOrId)
    }

    const candidateIds = Array.from(
      new Set([
        storeDoc?.$id,
        storeDoc?.id,
        storeDoc?.userId,
        storeDoc?.sellerId,
        storeParamId,
      ])
    ).filter(Boolean) as string[]

    if (candidateIds.length === 0) return []

    // Fetch products filtered by candidate store IDs
    const allLiveProducts = await getMenu({})

    const matchedProducts = allLiveProducts.filter((p: any) => {
      if (!p) return false
      const pSeller = String(p.sellerId || p.storeId || p.sellerStoreId || '').trim()
      return candidateIds.some((cid) => cid && (cid === pSeller || pSeller.includes(cid)))
    })

    if (matchedProducts.length > 0) {
      return matchedProducts
    }

    // If it's a fallback mock store ID (e.g. store_1, store_2, store_3, store_4), provide its dedicated mock items
    const mockKey = candidateIds.find((id) => id && DEFAULT_STORE_PRODUCTS[id])
    if (mockKey && DEFAULT_STORE_PRODUCTS[mockKey]) {
      return DEFAULT_STORE_PRODUCTS[mockKey]
    }

    // For real stores in the database with 0 items, return empty array (do NOT dump other stores' items!)
    return []
  } catch (err) {
    console.error('Error in getProductsByStore:', err)
    return []
  }
}

export const getMenuItemById = async (id: string) => {
  try {
    try {
      return await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.menuCollectionId,
        id,
      )
    } catch {
      return await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.legacyMenuCollectionId,
        id,
      )
    }
  } catch (e) {
    console.warn(`Product ID "${id}" not found in database:`, e)
    return null
  }
}

export const createProduct = async (productData: Partial<any>) => {
  try {
    let currentPayload: any = {
      ...productData,
      stock: productData.stock ?? 100,
      isActive: productData.isActive ?? true,
    }

    // Strip system attributes if present
    delete currentPayload.$id
    delete currentPayload.$createdAt
    delete currentPayload.$updatedAt
    delete currentPayload.$permissions
    delete currentPayload.$databaseId
    delete currentPayload.$collectionId

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.menuCollectionId,
          ID.unique(),
          currentPayload,
        )
      } catch (err: any) {
        const errMsg = err?.message || ''
        const match = errMsg.match(/Unknown attribute:\s*"([^"]+)"/i)
        if (match && match[1]) {
          const badKey = match[1]
          console.warn(`[createProduct] Stripping unknown attribute "${badKey}"`)
          delete currentPayload[badKey]
          continue
        }
        throw err
      }
    }
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const updateProduct = async (productId: string, productData: Partial<any>) => {
  const collectionsToTry = [
    appwriteConfig.menuCollectionId,
    appwriteConfig.legacyMenuCollectionId,
  ].filter(Boolean)

  let sanitizedPayload: any = { ...productData }

  // Strip system attributes if present
  delete sanitizedPayload.$id
  delete sanitizedPayload.$createdAt
  delete sanitizedPayload.$updatedAt
  delete sanitizedPayload.$permissions
  delete sanitizedPayload.$databaseId
  delete sanitizedPayload.$collectionId

  let lastSuccessResult = null
  let updateErrors: any[] = []

  for (const collId of collectionsToTry) {
    try {
      let currentPayload = { ...sanitizedPayload }
      // Retry loop to strip unknown schema attributes automatically
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await databases.updateDocument(
            appwriteConfig.databaseId,
            collId,
            productId,
            currentPayload,
          )
          lastSuccessResult = res
          break
        } catch (updateErr: any) {
          const errMsg = updateErr?.message || ''
          const match = errMsg.match(/Unknown attribute:\s*"([^"]+)"/i)
          if (match && match[1]) {
            const badKey = match[1]
            console.warn(`[updateProduct] Stripping unknown attribute "${badKey}" on collection ${collId}`)
            delete currentPayload[badKey]
            continue
          }
          throw updateErr
        }
      }
    } catch (collErr: any) {
      updateErrors.push(collErr)
    }
  }

  if (lastSuccessResult) {
    return lastSuccessResult
  }

  if (updateErrors.length > 0) {
    throw new Error(updateErrors[0]?.message || 'Failed to update product.')
  }
}

export const deleteProduct = async (productId: string, imageUrl?: string) => {
  const collectionsToTry = [
    appwriteConfig.menuCollectionId,
    appwriteConfig.legacyMenuCollectionId,
  ].filter(Boolean)

  let deletedCount = 0

  // 1. Wipe document permanently from all collections
  for (const collId of collectionsToTry) {
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        collId,
        productId,
      )
      deletedCount++
    } catch {
      // Document may not exist in this collection
    }
  }

  // 2. Also wipe associated image from storage bucket if it's an Appwrite file
  if (imageUrl && imageUrl.includes('/files/')) {
    try {
      const match = imageUrl.match(/\/files\/([a-zA-Z0-9_-]+)/)
      if (match && match[1]) {
        const fileId = match[1]
        await storage.deleteFile(appwriteConfig.bucketId, fileId).catch(() => { })
      }
    } catch {
      // Ignore storage cleanup error
    }
  }

  return { success: true, deletedCount }
}

// ----------------------------------------------------
// 🏷️ CATEGORY MANAGEMENT
// ----------------------------------------------------
export const getCategories = async () => {
  try {
    const categories = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId,
    )

    return categories.documents
  } catch (e) {
    throw new Error(e as string)
  }
}

export const createCategory = async (name: string, slug?: string, iconUrl?: string) => {
  try {
    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId,
      ID.unique(),
      { name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'), iconUrl: iconUrl || '', isActive: true },
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const updateCategory = async (categoryId: string, categoryData: Partial<any>) => {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId,
      categoryId,
      categoryData,
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const deleteCategory = async (categoryId: string) => {
  try {
    return await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId,
      categoryId,
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const subscribeToOrders = (callback: (response: any) => void) => {
  try {
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.ordersCollectionId}.documents`
    return client.subscribe(channel, (response) => {
      callback(response)
    })
  } catch (e) {
    console.error('Error subscribing to orders realtime:', e)
    return () => { }
  }
}


// ----------------------------------------------------
// 🛒 ORDERS MANAGEMENT
// ----------------------------------------------------
export const createOrder = async (orderData: {
  userId: string
  userName: string
  userEmail: string
  items: string
  totalAmount: number
  deliveryAddress: string
  paymentReference: string
  paymentStatus: string
  sellerId?: string
  orderNotes?: string
  storeLatitude?: number
  storeLongitude?: number
  customerLatitude?: number
  customerLongitude?: number
  deliveryDistanceKm?: number
  deliveryFee?: number
}) => {
  const payload: any = {
    userId: orderData.userId,
    userName: orderData.userName,
    userEmail: orderData.userEmail,
    items: orderData.items,
    totalAmount: Number(orderData.totalAmount),
    deliveryAddress: orderData.deliveryAddress,
    paymentReference: orderData.paymentReference,
    paymentStatus: orderData.paymentStatus,
    status: 'order_placed',
    createdAt: new Date().toISOString(),
  }

  if (orderData.sellerId) payload.sellerId = orderData.sellerId
  if (orderData.orderNotes && orderData.orderNotes.trim()) payload.orderNotes = orderData.orderNotes.trim()
  if (orderData.storeLatitude != null) payload.storeLatitude = Number(orderData.storeLatitude)
  if (orderData.storeLongitude != null) payload.storeLongitude = Number(orderData.storeLongitude)
  if (orderData.customerLatitude != null) payload.customerLatitude = Number(orderData.customerLatitude)
  if (orderData.customerLongitude != null) payload.customerLongitude = Number(orderData.customerLongitude)
  if (orderData.deliveryDistanceKm != null) payload.deliveryDistanceKm = Number(orderData.deliveryDistanceKm)
  if (orderData.deliveryFee != null) payload.deliveryFee = Number(orderData.deliveryFee)

  try {
    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.ordersCollectionId,
      ID.unique(),
      payload,
    )
  } catch (e: any) {
    console.warn('createOrder initial attempt failed, retrying without optional orderNotes:', e?.message || e)
    delete payload.orderNotes
    try {
      return await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        ID.unique(),
        payload,
      )
    } catch (err: any) {
      throw new Error(err?.message || String(err))
    }
  }
}

export const getUserOrders = async (userId: string) => {
  try {
    try {
      const orders = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [Query.equal('userId', userId), Query.orderDesc('$createdAt')],
      )
      return orders.documents
    } catch {
      const orders = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [Query.equal('userId', userId)],
      )
      return (orders.documents || []).sort((a: any, b: any) => {
        const timeA = new Date(a.$createdAt || a.createdAt || 0).getTime()
        const timeB = new Date(b.$createdAt || b.createdAt || 0).getTime()
        return timeB - timeA
      })
    }
  } catch (e) {
    console.warn('getUserOrders failed:', e)
    return []
  }
}

export const getSellerOrders = async (sellerId: string) => {
  try {
    try {
      const orders = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [Query.equal('sellerId', sellerId), Query.orderDesc('$createdAt')],
      )
      return orders.documents
    } catch {
      const orders = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [Query.equal('sellerId', sellerId)],
      )
      return (orders.documents || []).sort((a: any, b: any) => {
        const timeA = new Date(a.$createdAt || a.createdAt || 0).getTime()
        const timeB = new Date(b.$createdAt || b.createdAt || 0).getTime()
        return timeB - timeA
      })
    }
  } catch (e) {
    console.warn('getSellerOrders failed:', e)
    return []
  }
}

export const getOrderById = async (orderId: string) => {
  try {
    const order = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.ordersCollectionId,
      orderId,
    )
    return order
  } catch (e) {
    throw new Error(e as string)
  }
}

export const getAllOrders = async () => {
  try {
    // Attempt 1: Order by $createdAt with max limit
    try {
      const orders = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [Query.orderDesc('$createdAt'), Query.limit(100)],
      )
      if (orders && orders.documents && orders.documents.length > 0) {
        return orders.documents
      }
    } catch (q1) {
      console.warn('getAllOrders with $createdAt query failed, trying createdAt:', q1)
    }

    // Attempt 2: Order by createdAt
    try {
      const orders = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [Query.orderDesc('createdAt'), Query.limit(100)],
      )
      if (orders && orders.documents && orders.documents.length > 0) {
        return orders.documents
      }
    } catch (q2) {
      console.warn('getAllOrders with createdAt query failed, trying plain list:', q2)
    }

    // Attempt 3: Plain list without sort query, sort in JavaScript
    const orders = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.ordersCollectionId,
      [Query.limit(100)],
    )

    return (orders.documents || []).sort((a: any, b: any) => {
      const timeA = new Date(a.$createdAt || a.createdAt || 0).getTime()
      const timeB = new Date(b.$createdAt || b.createdAt || 0).getTime()
      return timeB - timeA
    })
  } catch (e) {
    console.error('getAllOrders failed:', e)
    return []
  }
}

export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.ordersCollectionId,
      orderId,
      { status },
    )
    return updated
  } catch (e) {
    throw new Error(e as string)
  }
}

export const uploadAvatar = async (userId: string, userDocId: string, fileUri: string) => {
  try {
    // 1. Delete previous custom avatar from Appwrite Storage if replacing an existing one
    if (userDocId) {
      try {
        const currentDoc = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          userDocId,
        )
        if (currentDoc?.avatar) {
          await deleteStorageFileByUrl(currentDoc.avatar)
        }
      } catch {
        // Non-fatal error during previous avatar lookup
      }
    }

    // 2. Upload new image file to Appwrite Storage
    const newAvatarUrl = await uploadImageToStorage(fileUri, `avatar_${userId}`)

    // 3. Update user profile document in database with the replacement avatar URL
    if (userDocId) {
      await updateUserProfile(userDocId, { avatar: newAvatarUrl })
    }

    return newAvatarUrl
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

// ----------------------------------------------------
// 👛 CUSTOMER WALLET FINANCIALS
// ----------------------------------------------------
export const getCustomerWallet = async (userId: string, altUserId?: string, userEmail?: string) => {
  try {
    const idsToTry = [userId]
    if (altUserId && altUserId !== userId) idsToTry.push(altUserId)
    if (userEmail && !idsToTry.includes(userEmail)) idsToTry.push(userEmail)

    for (const idToTest of idsToTry) {
      if (!idToTest) continue
      try {
        const docs = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.walletsCollectionId,
          [Query.equal('userId', idToTest)],
        )
        if (docs && docs.documents && docs.documents.length > 0) {
          return docs.documents[0]
        }
      } catch (queryErr) {
        console.warn('Wallet query with filter failed:', queryErr)
      }
    }

    // Fallback: list documents and filter in memory
    try {
      const allDocs = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.walletsCollectionId,
      )
      if (allDocs && allDocs.documents && allDocs.documents.length > 0) {
        const found = allDocs.documents.find((d: any) =>
          idsToTry.includes(d.userId) || (userEmail && d.userEmail === userEmail)
        )
        if (found) return found
      }
    } catch (listErr) {
      console.warn('Wallet fallback list failed:', listErr)
    }

    // Auto-create wallet if non-existent
    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.walletsCollectionId,
      ID.unique(),
      {
        userId,
        balance: 0.0,
        currency: 'NGN',
        updatedAt: new Date().toISOString(),
      },
    )
  } catch (e) {
    console.error('Error fetching wallet:', e)
    return { userId, balance: 0.0, currency: 'NGN' }
  }
}

export const creditCustomerWallet = async (
  userId: string,
  amount: number,
  category = 'deposit',
  description = 'Wallet deposit',
  reference = `DEP_${Date.now()}`,
) => {
  try {
    const wallet: any = await getCustomerWallet(userId)
    const currentBal = Number(wallet?.balance) || 0
    const newBalance = currentBal + Number(amount)

    let walletSaved = false

    if (wallet && wallet.$id) {
      try {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.walletsCollectionId,
          wallet.$id,
          { balance: newBalance, updatedAt: new Date().toISOString() },
        )
        walletSaved = true
      } catch (updErr) {
        console.warn('Failed to update existing wallet doc, falling back to create:', updErr)
      }
    }

    if (!walletSaved) {
      try {
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.walletsCollectionId,
          ID.unique(),
          {
            userId,
            balance: newBalance,
            currency: 'NGN',
            updatedAt: new Date().toISOString(),
          },
        )
      } catch (createErr) {
        console.error('Failed to create new wallet doc:', createErr)
      }
    }

    let tx: any = null
    try {
      tx = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.walletTransactionsCollectionId,
        ID.unique(),
        {
          userId,
          amount: Number(amount),
          type: 'credit',
          category,
          description,
          reference,
          createdAt: new Date().toISOString(),
        },
      )
    } catch (txErr) {
      console.warn('Transaction record failed, using fallback item:', txErr)
      tx = {
        $id: `tx_${Date.now()}`,
        userId,
        amount: Number(amount),
        type: 'credit',
        category,
        description,
        reference,
        createdAt: new Date().toISOString(),
      }
    }

    return { balance: newBalance, transaction: tx }
  } catch (e: any) {
    console.error('creditCustomerWallet error:', e)
    throw new Error(e.message || 'Deposit failed. Please try again.')
  }
}

export const debitCustomerWallet = async (
  userId: string,
  amount: number,
  category = 'order_payment',
  description = 'Order checkout payment',
  reference = `TX_${Date.now()}`,
) => {
  try {
    const wallet: any = await getCustomerWallet(userId)
    const currentBal = Number(wallet?.balance) || 0

    if (currentBal < amount) {
      throw new Error(`Insufficient wallet balance. Available: ₦${currentBal}, Required: ₦${amount}`)
    }

    const newBalance = currentBal - Number(amount)
    let walletSaved = false

    if (wallet && wallet.$id) {
      try {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.walletsCollectionId,
          wallet.$id,
          { balance: newBalance, updatedAt: new Date().toISOString() },
        )
        walletSaved = true
      } catch (updErr) {
        console.warn('Failed to update wallet balance on debit:', updErr)
      }
    }

    if (!walletSaved) {
      try {
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.walletsCollectionId,
          ID.unique(),
          {
            userId,
            balance: newBalance,
            currency: 'NGN',
            updatedAt: new Date().toISOString(),
          },
        )
      } catch (createErr) {
        console.error('Failed to create wallet doc on debit:', createErr)
      }
    }

    let tx: any = null
    try {
      tx = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.walletTransactionsCollectionId,
        ID.unique(),
        {
          userId,
          amount: Number(amount),
          type: 'debit',
          category,
          description,
          reference,
          createdAt: new Date().toISOString(),
        },
      )
    } catch (txErr) {
      console.warn('Debit transaction record failed, using fallback:', txErr)
      tx = {
        $id: `tx_${Date.now()}`,
        userId,
        amount: Number(amount),
        type: 'debit',
        category,
        description,
        reference,
        createdAt: new Date().toISOString(),
      }
    }

    return { balance: newBalance, transaction: tx }
  } catch (e: any) {
    console.error('debitCustomerWallet error:', e)
    throw new Error(e.message || String(e))
  }
}

export const recordWalletTransaction = async ({
  userId,
  amount,
  type = 'debit',
  category = 'order_payment',
  description = 'Transaction record',
  reference = `TX_${Date.now()}`,
}: {
  userId: string
  amount: number
  type?: 'credit' | 'debit'
  category?: string
  description?: string
  reference?: string
}) => {
  try {
    const tx = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.walletTransactionsCollectionId,
      ID.unique(),
      {
        userId,
        amount: Number(amount),
        type,
        category,
        description,
        reference,
        createdAt: new Date().toISOString(),
      },
    )
    return tx
  } catch (e: any) {
    console.warn('recordWalletTransaction failed, fallback returned:', e)
    return {
      $id: `tx_${Date.now()}`,
      userId,
      amount: Number(amount),
      type,
      category,
      description,
      reference,
      createdAt: new Date().toISOString(),
    }
  }
}

export const getWalletTransactions = async (userId: string, altUserId?: string, userEmail?: string) => {
  try {
    const idsToTry = [userId]
    if (altUserId && altUserId !== userId) idsToTry.push(altUserId)
    if (userEmail && !idsToTry.includes(userEmail)) idsToTry.push(userEmail)

    let allTxs: any[] = []
    for (const idToTest of idsToTry) {
      if (!idToTest) continue
      try {
        const txs = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.walletTransactionsCollectionId,
          [Query.equal('userId', idToTest), Query.orderDesc('createdAt')],
        )
        if (txs?.documents && txs.documents.length > 0) {
          allTxs = [...allTxs, ...txs.documents]
        }
      } catch (queryErr) {
        console.warn('Transactions query failed for ID:', idToTest, queryErr)
      }
    }

    if (allTxs.length === 0) {
      try {
        const fallback = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.walletTransactionsCollectionId,
        )
        if (fallback?.documents) {
          const matched = fallback.documents.filter((d: any) =>
            idsToTry.includes(d.userId) || (userEmail && d.userEmail === userEmail)
          )
          allTxs = [...allTxs, ...matched]
        }
      } catch (fbErr) {
        console.warn('Transactions list fallback failed:', fbErr)
      }
    }

    const uniqueTxs = Array.from(new Map(allTxs.map((item) => [item.$id, item])).values())
    return uniqueTxs.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  } catch (e) {
    console.error('Error fetching wallet transactions:', e)
    return []
  }
}

// ----------------------------------------------------
// 👥 CUSTOMER ACCOUNT MANAGEMENT
// ----------------------------------------------------
export const updateUserAccountStatus = async (userDocId: string, status: 'active' | 'suspended') => {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userDocId,
      { status },
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

// ----------------------------------------------------
// 💵 SELLER PAYOUTS & WALLETS
// ----------------------------------------------------
export const getSellerPayoutLogs = async (sellerId?: string) => {
  try {
    const queries = [Query.orderDesc('createdAt')]
    if (sellerId) queries.push(Query.equal('sellerId', sellerId))

    const payouts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.sellerPayoutsCollectionId,
      queries,
    )
    return payouts.documents
  } catch (e) {
    console.error('Error fetching seller payouts:', e)
    return []
  }
}

export const processSellerPayout = async ({
  sellerId,
  storeName,
  amount,
  commissionDeducted = 0,
  paymentMethod = 'Bank Transfer',
}: {
  sellerId: string
  storeName: string
  amount: number
  commissionDeducted?: number
  paymentMethod?: string
}) => {
  try {
    const doc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.sellerPayoutsCollectionId,
      ID.unique(),
      {
        sellerId,
        storeName,
        amount: Number(amount),
        commissionDeducted: Number(commissionDeducted),
        status: 'completed',
        paymentMethod,
        reference: `PAY_${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
    )
    return doc
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

// ----------------------------------------------------
// 🏷️ PROMOTIONS & DISCOUNT COUPONS
// ----------------------------------------------------
export const getCoupons = async () => {
  try {
    const coupons = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.couponsCollectionId,
    )
    return coupons.documents
  } catch (e) {
    console.error('Error fetching coupons:', e)
    return []
  }
}

export const createCoupon = async (couponData: {
  code: string
  discountType: 'flat' | 'percentage'
  discountValue: number
  minCartAmount?: number
  maxDiscountAmount?: number
  validUntil?: string
  usageLimit?: number
}) => {
  try {
    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.couponsCollectionId,
      ID.unique(),
      {
        code: couponData.code.toUpperCase().trim(),
        discountType: couponData.discountType,
        discountValue: Number(couponData.discountValue),
        minCartAmount: couponData.minCartAmount ? Number(couponData.minCartAmount) : 0,
        maxDiscountAmount: couponData.maxDiscountAmount ? Number(couponData.maxDiscountAmount) : 0,
        validUntil: couponData.validUntil || '2030-12-31',
        usageLimit: couponData.usageLimit ? Number(couponData.usageLimit) : 1000,
        usedCount: 0,
        isActive: true,
      },
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const validateAndApplyCoupon = async (code: string, cartTotal: number) => {
  try {
    const docs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.couponsCollectionId,
      [Query.equal('code', code.toUpperCase().trim()), Query.equal('isActive', true)],
    )

    if (!docs || docs.documents.length === 0) {
      throw new Error('Invalid or expired coupon code.')
    }

    const coupon: any = docs.documents[0]

    if (coupon.minCartAmount && cartTotal < coupon.minCartAmount) {
      throw new Error(`Minimum cart total of ₦${coupon.minCartAmount} required for coupon "${code.toUpperCase()}".`)
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error(`Coupon "${code.toUpperCase()}" usage limit has been reached.`)
    }

    let calculatedDiscount = 0
    if (coupon.discountType === 'flat') {
      calculatedDiscount = coupon.discountValue
    } else {
      calculatedDiscount = (cartTotal * coupon.discountValue) / 100
      if (coupon.maxDiscountAmount && calculatedDiscount > coupon.maxDiscountAmount) {
        calculatedDiscount = coupon.maxDiscountAmount
      }
    }

    return {
      coupon,
      discountAmount: calculatedDiscount,
      finalTotal: Math.max(0, cartTotal - calculatedDiscount),
    }
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

export const deleteCoupon = async (couponId: string) => {
  try {
    return await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.couponsCollectionId,
      couponId,
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

// ----------------------------------------------------
// ⚙️ PLATFORM POLICIES & SELLER PERMISSIONS
// ----------------------------------------------------
const POLICY_STORAGE_KEY = '@platform_policies'
let localPolicyCache: Record<string, any> = {}

function defaultPolicies() {
  return {
    cartMode: 'multi_seller',
    productApprovalRequired: false,
    sellerOrderCancellationAllowed: true,
    defaultCommissionRate: 10.0,
    refundsEnabled: true,
    deliveryPricingMode: 'flat',
    deliveryFee: 1000,
    baseCoverageThreshold: 10000,
    feePerItem: 200,
    deliveryIncrementType: 'amount_step',
    deliveryIncrementRate: 2,
    deliveryIncrementStep: 5000,
    maxDeliveryFee: 5000,
    freeDeliveryThreshold: 0,
    distanceBaseRate: 800,
    distanceMidRate: 1200,
    distanceFarRate: 1800,
    distancePerKmRate: 150,
    maxDeliveryRadiusKm: 20,
    appName: 'Grocery App',
    appLogo: null,
    appTagline: 'Fresh Groceries & Daily Essentials',
  }
}

export const getPlatformPolicies = async () => {
  try {
    // 1. Fetch live document from Appwrite Cloud database
    let docs: any = null
    try {
      docs = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.platformPoliciesCollectionId,
      )
    } catch (dbErr) {
      console.warn('Could not fetch policies from Appwrite DB, checking local cache:', dbErr)
    }

    if (docs && docs.documents && docs.documents.length > 0) {
      const dbDoc = docs.documents[0]
      const defaults = defaultPolicies()
      // Priority Order: defaultPolicies -> localPolicyCache -> dbDoc (dbDoc from Appwrite database HAS ABSOLUTE TOP PRIORITY)
      const merged = { ...defaults, ...localPolicyCache, ...dbDoc }

      // Clean numeric and string fields with safe fallbacks if null or undefined
      merged.deliveryPricingMode = (dbDoc.deliveryPricingMode === 'distance' || dbDoc.deliveryPricingMode === 'flat') ? dbDoc.deliveryPricingMode : defaults.deliveryPricingMode
      merged.deliveryFee = dbDoc.deliveryFee != null ? Number(dbDoc.deliveryFee) : defaults.deliveryFee
      merged.baseCoverageThreshold = dbDoc.baseCoverageThreshold != null ? Number(dbDoc.baseCoverageThreshold) : defaults.baseCoverageThreshold
      merged.feePerItem = dbDoc.feePerItem != null ? Number(dbDoc.feePerItem) : defaults.feePerItem
      merged.deliveryIncrementType = dbDoc.deliveryIncrementType != null ? String(dbDoc.deliveryIncrementType) : defaults.deliveryIncrementType
      merged.deliveryIncrementRate = dbDoc.deliveryIncrementRate != null ? Number(dbDoc.deliveryIncrementRate) : defaults.deliveryIncrementRate
      merged.deliveryIncrementStep = dbDoc.deliveryIncrementStep != null ? Number(dbDoc.deliveryIncrementStep) : defaults.deliveryIncrementStep
      merged.maxDeliveryFee = dbDoc.maxDeliveryFee != null ? Number(dbDoc.maxDeliveryFee) : defaults.maxDeliveryFee
      merged.freeDeliveryThreshold = dbDoc.freeDeliveryThreshold != null ? Number(dbDoc.freeDeliveryThreshold) : defaults.freeDeliveryThreshold
      merged.defaultCommissionRate = dbDoc.defaultCommissionRate != null ? Number(dbDoc.defaultCommissionRate) : defaults.defaultCommissionRate

      merged.distanceBaseRate = dbDoc.distanceBaseRate != null ? Number(dbDoc.distanceBaseRate) : defaults.distanceBaseRate
      merged.distanceMidRate = dbDoc.distanceMidRate != null ? Number(dbDoc.distanceMidRate) : defaults.distanceMidRate
      merged.distanceFarRate = dbDoc.distanceFarRate != null ? Number(dbDoc.distanceFarRate) : defaults.distanceFarRate
      merged.distancePerKmRate = dbDoc.distancePerKmRate != null ? Number(dbDoc.distancePerKmRate) : defaults.distancePerKmRate
      merged.maxDeliveryRadiusKm = dbDoc.maxDeliveryRadiusKm != null ? Number(dbDoc.maxDeliveryRadiusKm) : defaults.maxDeliveryRadiusKm

      merged.cartMode = dbDoc.cartMode || defaults.cartMode
      merged.productApprovalRequired = dbDoc.productApprovalRequired ?? defaults.productApprovalRequired
      merged.sellerOrderCancellationAllowed = dbDoc.sellerOrderCancellationAllowed ?? defaults.sellerOrderCancellationAllowed
      merged.refundsEnabled = dbDoc.refundsEnabled ?? defaults.refundsEnabled
      merged.appName = dbDoc.appName || defaults.appName
      merged.appLogo = dbDoc.appLogo !== undefined ? dbDoc.appLogo : defaults.appLogo
      merged.appTagline = dbDoc.appTagline || defaults.appTagline

      // Sync latest database values into in-memory cache and AsyncStorage
      localPolicyCache = merged
      AsyncStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(merged)).catch(() => { })
      return merged
    }

    // 2. Read from persistent AsyncStorage fallback if database document isn't created yet or offline
    try {
      const stored = await AsyncStorage.getItem(POLICY_STORAGE_KEY)
      if (stored) {
        localPolicyCache = JSON.parse(stored)
      }
    } catch { }

    return { ...defaultPolicies(), ...localPolicyCache }
  } catch (e) {
    return { ...defaultPolicies(), ...localPolicyCache }
  }
}

export interface DeliveryFeeSettings {
  deliveryPricingMode: 'flat' | 'distance'
  deliveryFee: number
  baseCoverageThreshold: number
  feePerItem: number
  deliveryIncrementType: 'per_item' | 'amount_percent' | 'amount_step'
  deliveryIncrementRate: number
  deliveryIncrementStep: number
  maxDeliveryFee: number
  freeDeliveryThreshold: number
  distanceBaseRate: number
  distanceMidRate: number
  distanceFarRate: number
  distancePerKmRate: number
  maxDeliveryRadiusKm: number
}

export const getDeliveryFeeSettings = async (): Promise<DeliveryFeeSettings> => {
  try {
    const policy: any = await getPlatformPolicies()
    return {
      deliveryPricingMode: policy?.deliveryPricingMode === 'distance' ? 'distance' : 'flat',
      deliveryFee: Number(policy?.deliveryFee != null ? policy.deliveryFee : 1000),
      baseCoverageThreshold: Number(policy?.baseCoverageThreshold != null ? policy.baseCoverageThreshold : 10000),
      feePerItem: Number(policy?.feePerItem != null ? policy.feePerItem : 200),
      deliveryIncrementType: (policy?.deliveryIncrementType || 'amount_step') as any,
      deliveryIncrementRate: Number(policy?.deliveryIncrementRate != null ? policy.deliveryIncrementRate : 2),
      deliveryIncrementStep: Number(policy?.deliveryIncrementStep != null ? policy.deliveryIncrementStep : 5000),
      maxDeliveryFee: Number(policy?.maxDeliveryFee != null ? policy.maxDeliveryFee : 5000),
      freeDeliveryThreshold: Number(policy?.freeDeliveryThreshold != null ? policy.freeDeliveryThreshold : 0),
      distanceBaseRate: Number(policy?.distanceBaseRate != null ? policy.distanceBaseRate : 800),
      distanceMidRate: Number(policy?.distanceMidRate != null ? policy.distanceMidRate : 1200),
      distanceFarRate: Number(policy?.distanceFarRate != null ? policy.distanceFarRate : 1800),
      distancePerKmRate: Number(policy?.distancePerKmRate != null ? policy.distancePerKmRate : 150),
      maxDeliveryRadiusKm: Number(policy?.maxDeliveryRadiusKm != null ? policy.maxDeliveryRadiusKm : 20),
    }
  } catch {
    return {
      deliveryPricingMode: 'flat',
      deliveryFee: 1000,
      baseCoverageThreshold: 10000,
      feePerItem: 200,
      deliveryIncrementType: 'amount_step',
      deliveryIncrementRate: 2,
      deliveryIncrementStep: 5000,
      maxDeliveryFee: 5000,
      freeDeliveryThreshold: 0,
      distanceBaseRate: 800,
      distanceMidRate: 1200,
      distanceFarRate: 1800,
      distancePerKmRate: 150,
      maxDeliveryRadiusKm: 20,
    }
  }
}

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.5
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return Math.round(distance * 10) / 10
}

export const calculateDynamicDeliveryFee = (
  totalItems: number,
  subtotal: number,
  settings: DeliveryFeeSettings,
  options?: {
    distanceKm?: number
    userLocation?: { latitude: number; longitude: number }
    storeLocation?: { latitude: number; longitude: number }
  }
) => {
  // 1. Free Delivery check
  if (settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold) {
    return {
      baseFee: settings.deliveryFee,
      incrementalFee: 0,
      totalDeliveryFee: 0,
      isFree: true,
      distanceKm: 0,
      isOutOfRange: false,
      breakdownText: 'FREE Delivery (High-value order offer 🎉)',
    }
  }

  let distanceKm = options?.distanceKm
  if (distanceKm === undefined && options?.userLocation && options?.storeLocation) {
    distanceKm = calculateHaversineDistanceKm(
      options.userLocation.latitude,
      options.userLocation.longitude,
      options.storeLocation.latitude,
      options.storeLocation.longitude
    )
  }
  if (distanceKm === undefined) {
    distanceKm = 2.5
  }

  const isDistanceMode = settings.deliveryPricingMode === 'distance'
  let baseFee = Math.max(0, Number(settings.deliveryFee || 0))
  let tierLabel = 'Standard'
  let isOutOfRange = false

  if (isDistanceMode) {
    const distBase = Number(settings.distanceBaseRate || 800)
    const distMid = Number(settings.distanceMidRate || 1200)
    const distFar = Number(settings.distanceFarRate || 1800)
    const perKm = Number(settings.distancePerKmRate || 150)
    const maxRadius = Number(settings.maxDeliveryRadiusKm || 20)

    if (maxRadius > 0 && distanceKm > maxRadius) {
      isOutOfRange = true
    }

    if (distanceKm <= 3) {
      baseFee = distBase
      tierLabel = `Zone 1 (0–3 km: ${distanceKm} km)`
    } else if (distanceKm <= 7) {
      baseFee = distMid
      tierLabel = `Zone 2 (3–7 km: ${distanceKm} km)`
    } else if (distanceKm <= 12) {
      baseFee = distFar
      tierLabel = `Zone 3 (7–12 km: ${distanceKm} km)`
    } else {
      const rawExtra = Math.ceil(distanceKm - 12)
      const extraKm = isOutOfRange ? Math.min(15, rawExtra) : rawExtra
      baseFee = distFar + extraKm * perKm
      tierLabel = isOutOfRange ? `Out of Delivery Radius (${distanceKm} km)` : `Zone 4 (${distanceKm} km)`
    }
  }

  const baseCoverage = Math.max(0, Number(settings.baseCoverageThreshold !== undefined ? settings.baseCoverageThreshold : 10000))

  // 2. Base Coverage: Covers any order up to baseCoverageThreshold (e.g. ₦10,000)
  if (baseCoverage > 0 && subtotal <= baseCoverage) {
    return {
      baseFee,
      incrementalFee: 0,
      totalDeliveryFee: baseFee,
      isFree: false,
      distanceKm,
      isOutOfRange,
      breakdownText: `${isDistanceMode ? tierLabel : 'Base'} ₦${baseFee.toLocaleString()} (Covers orders up to ₦${baseCoverage.toLocaleString()})`,
    }
  }

  // 3. Excess Calculation for orders above baseCoverageThreshold
  const excessAmount = Math.max(0, subtotal - baseCoverage)
  let incrementalFee = 0
  let breakdownText = `${isDistanceMode ? tierLabel : 'Base'} ₦${baseFee.toLocaleString()} (Up to ₦${baseCoverage.toLocaleString()})`

  if (settings.deliveryIncrementType === 'amount_percent') {
    const rate = Number(settings.deliveryIncrementRate || 0)
    incrementalFee = Math.round(excessAmount * (rate / 100))
    if (rate > 0) {
      breakdownText += ` + (${rate}% on ₦${excessAmount.toLocaleString()} over ₦${baseCoverage.toLocaleString()})`
    }
  } else if (settings.deliveryIncrementType === 'amount_step') {
    const step = Math.max(1, Number(settings.deliveryIncrementStep || 5000))
    const perStep = Number(settings.feePerItem || 200)
    const stepCount = Math.ceil(excessAmount / step)
    incrementalFee = stepCount * perStep
    if (stepCount > 0 && perStep > 0) {
      breakdownText += ` + (${stepCount} tier × ₦${perStep.toLocaleString()} for ₦${excessAmount.toLocaleString()} over ₦${baseCoverage.toLocaleString()})`
    }
  } else {
    // per_item
    const extraItems = Math.max(0, totalItems - 1)
    const perItem = Number(settings.feePerItem || 0)
    incrementalFee = extraItems * perItem
    if (extraItems > 0 && perItem > 0) {
      breakdownText += ` + (₦${perItem.toLocaleString()} × ${extraItems} extra ${extraItems === 1 ? 'item' : 'items'})`
    }
  }

  let total = baseFee + incrementalFee

  if (settings.maxDeliveryFee > 0 && total > settings.maxDeliveryFee) {
    total = settings.maxDeliveryFee
    breakdownText += ` (Capped at ₦${settings.maxDeliveryFee.toLocaleString()})`
  }

  return {
    baseFee,
    incrementalFee,
    totalDeliveryFee: Math.max(0, total),
    isFree: false,
    distanceKm,
    isOutOfRange,
    breakdownText,
  }
}

export const updatePlatformPolicies = async (policyData: Partial<any>) => {
  try {
    // 1. Get current complete policies to prevent wiping existing settings
    const existing = await getPlatformPolicies()
    const merged = { ...existing, ...policyData, updatedAt: new Date().toISOString() }

    // 2. Immediately save to in-memory and persistent AsyncStorage
    localPolicyCache = merged
    await AsyncStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(merged)).catch(() => { })

    let payload = { ...merged }
    delete payload.$id
    delete payload.$createdAt
    delete payload.$updatedAt
    delete payload.$permissions
    delete payload.$databaseId
    delete payload.$collectionId

    const targetDocId = existing?.$id || 'global_policy'

    // 3. Resilient retry loop to sync to Appwrite
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        try {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.platformPoliciesCollectionId,
            targetDocId,
            payload,
          )
          return merged
        } catch (updateErr: any) {
          const errMsg = updateErr?.message || String(updateErr)
          if (errMsg.includes('document_not_found') || errMsg.includes('Document with the requested ID could not be found')) {
            await databases.createDocument(
              appwriteConfig.databaseId,
              appwriteConfig.platformPoliciesCollectionId,
              targetDocId,
              payload,
            )
            return merged
          }
          throw updateErr
        }
      } catch (e: any) {
        const errStr = e?.message || String(e)

        // Detect attribute name rejected by Appwrite schema
        const match = errStr.match(/Unknown attribute:\s*"([^"]+)"/i) || errStr.match(/Attribute not found:\s*"([^"]+)"/i)
        if (match && match[1] && match[1] in payload) {
          const unknownAttr = match[1]
          delete (payload as any)[unknownAttr]
          continue
        }

        if (errStr.toLowerCase().includes('unknown attribute')) {
          const coreKeys = [
            'cartMode',
            'productApprovalRequired',
            'sellerOrderCancellationAllowed',
            'defaultCommissionRate',
            'refundsEnabled',
            'deliveryPricingMode',
            'deliveryFee',
            'baseCoverageThreshold',
            'feePerItem',
            'deliveryIncrementType',
            'deliveryIncrementRate',
            'deliveryIncrementStep',
            'maxDeliveryFee',
            'freeDeliveryThreshold',
            'distanceBaseRate',
            'distanceMidRate',
            'distanceFarRate',
            'distancePerKmRate',
            'maxDeliveryRadiusKm',
            'appName',
            'appLogo',
            'appTagline',
            'updatedAt',
          ]
          const sanitized: any = {}
          for (const k of coreKeys) {
            if (k in payload) sanitized[k] = (payload as any)[k]
          }
          payload = sanitized
          continue
        }

        break
      }
    }

    return merged
  } catch (err) {
    console.warn('updatePlatformPolicies encountered an error, returning cached state:', err)
    return { ...defaultPolicies(), ...localPolicyCache, ...policyData }
  }
}

export const getRefundPolicy = async (): Promise<boolean> => {
  try {
    const policy: any = await getPlatformPolicies()
    return policy?.refundsEnabled !== false
  } catch {
    return true
  }
}

// ----------------------------------------------------
// 🎨 APP BRANDING & LOGO IDENTITY
// ----------------------------------------------------
export const getAppBranding = async () => {
  try {
    const policies: any = await getPlatformPolicies()
    return {
      appName: policies?.appName || 'Grocery App',
      appLogo: policies?.appLogo !== undefined ? policies.appLogo : null,
      appTagline: policies?.appTagline || 'Fresh Groceries & Daily Essentials',
    }
  } catch {
    return {
      appName: 'Grocery App',
      appLogo: null,
      appTagline: 'Fresh Groceries & Daily Essentials',
    }
  }
}

export const updateAppBranding = async (branding: {
  appName?: string
  appLogo?: string | null
  appTagline?: string
}) => {
  return await updatePlatformPolicies(branding)
}
