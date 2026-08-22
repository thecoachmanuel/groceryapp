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
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
  platform: 'com.grocery.app',
  databaseId: '6a877af5000bdb5165ac',
  bucketId: '6a87822a000b821c4393',
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
    const newAccount = await account.create(ID.unique(), email, password, name)
    if (!newAccount) throw Error

    await signIn({ email, password })

    const avatarUrl = avatars.getInitialsURL(name)

    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      { email, name, accountId: newAccount.$id, avatar: avatarUrl, role },
    )
  } catch (e) {
    throw new Error(e as string)
  }
}

export const signIn = async ({ email, password }: SignInParams) => {
  try {
    const session = await account.createEmailPasswordSession(email, password)
    return session
  } catch (e) {
    throw new Error(e as string)
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

    const uniqueMap = new Map<string, any>()
    for (const doc of response.documents || []) {
      const key = (doc.title || doc.$id || '').trim().toLowerCase()
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, doc)
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

export const updateStoreProfile = async (storeId: string, storeData: Partial<any>) => {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.storesCollectionId,
      storeId,
      storeData,
    )
  } catch (e: any) {
    throw new Error(e.message || String(e))
  }
}

// ----------------------------------------------------
// 📦 PRODUCTS & MENU MANAGEMENT
// ----------------------------------------------------
export const getMenu = async ({ category, query, sellerId }: GetMenuParams) => {
  try {
    const queries: string[] = [Query.limit(100)]

    if (category && category !== 'all') queries.push(Query.equal('categories', category))
    if (query) queries.push(Query.search('name', query))
    if (sellerId) queries.push(Query.equal('sellerId', sellerId))

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
            allDocs.push(doc)
          }
        }
      } catch {
        // Skip inaccessible collection
      }
    }

    return allDocs
  } catch (e) {
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
    throw new Error(e as string)
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

  if (orderData.sellerId) {
    payload.sellerId = orderData.sellerId
  }
  if (orderData.orderNotes && orderData.orderNotes.trim()) {
    payload.orderNotes = orderData.orderNotes.trim()
  }

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
    return await uploadImageToStorage(fileUri, `avatar_${userId}`)
  } catch (e) {
    throw new Error(e as string)
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
    deliveryFee: 1000,
    freeDeliveryThreshold: 10000,
    appName: 'Grocery App',
    appLogo: null,
    appTagline: 'Fresh Groceries & Daily Essentials',
  }
}

export const getPlatformPolicies = async () => {
  try {
    // 1. Check local in-memory cache first
    if (Object.keys(localPolicyCache).length === 0) {
      // 2. Read from persistent AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(POLICY_STORAGE_KEY)
        if (stored) {
          localPolicyCache = JSON.parse(stored)
        }
      } catch (storageErr) {
        console.warn('Could not read policies from AsyncStorage:', storageErr)
      }
    }

    // 3. Sync from Appwrite database if available
    let docs: any = null
    try {
      docs = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.platformPoliciesCollectionId,
      )
    } catch {
      // Database offline/unavailable fallback
      return { ...defaultPolicies(), ...localPolicyCache }
    }

    if (docs && docs.documents && docs.documents.length > 0) {
      const dbDoc = docs.documents[0]
      // Merge defaults, dbDoc, and localPolicyCache so admin changes persist cleanly
      const merged = { ...defaultPolicies(), ...dbDoc, ...localPolicyCache }
      // Clean up undefined / null fields if dbDoc has valid numeric values
      if (dbDoc.deliveryFee !== undefined && dbDoc.deliveryFee !== null) {
        merged.deliveryFee = Number(dbDoc.deliveryFee)
      }
      if (dbDoc.freeDeliveryThreshold !== undefined && dbDoc.freeDeliveryThreshold !== null) {
        merged.freeDeliveryThreshold = Number(dbDoc.freeDeliveryThreshold)
      }
      localPolicyCache = merged
      AsyncStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(merged)).catch(() => { })
      return merged
    }

    const fallbackMerged = { ...defaultPolicies(), ...localPolicyCache }
    return fallbackMerged
  } catch (e) {
    return { ...defaultPolicies(), ...localPolicyCache }
  }
}

export const getDeliveryFeeSettings = async () => {
  try {
    const policy: any = await getPlatformPolicies()
    return {
      deliveryFee: Number(policy?.deliveryFee !== undefined ? policy.deliveryFee : 1000),
      freeDeliveryThreshold: Number(policy?.freeDeliveryThreshold !== undefined ? policy.freeDeliveryThreshold : 10000),
    }
  } catch {
    return { deliveryFee: 1000, freeDeliveryThreshold: 10000 }
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

    // 3. Resilient retry loop to sync to Appwrite
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        try {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.platformPoliciesCollectionId,
            'global_policy',
            payload,
          )
          return merged
        } catch (updateErr: any) {
          const errMsg = updateErr?.message || String(updateErr)
          if (errMsg.includes('document_not_found') || errMsg.includes('Document with the requested ID could not be found')) {
            await databases.createDocument(
              appwriteConfig.databaseId,
              appwriteConfig.platformPoliciesCollectionId,
              'global_policy',
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
            'deliveryFee',
            'freeDeliveryThreshold',
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
