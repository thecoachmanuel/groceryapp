import 'dotenv/config';

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = '6a877af5000bdb5165ac';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.log('⚠️ APPWRITE_API_KEY not found in .env');
  console.log('👉 To auto-create tables:');
  console.log('1. Go to Appwrite Console -> Project Overview -> API Keys');
  console.log('2. Click + Create API Key, set name "AdminKey", select "Databases" scope, and click Save');
  console.log('3. Copy the key and add it to .env: APPWRITE_API_KEY=your_secret_key');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'x-appwrite-project': PROJECT_ID,
  'x-appwrite-key': API_KEY,
};

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

async function createTable(tableId, tableName) {
  const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collectionId: tableId,
      name: tableName,
      permissions: [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")'
      ],
      documentSecurity: false,
    }),
  });


  const json = await res.json();
  if (res.ok) {
    console.log(`✅ Created table "${tableName}" (${tableId})`);
  } else if (json.code === 409) {
    console.log(`ℹ️ Table "${tableName}" already exists.`);
  } else {
    console.error(`❌ Error creating table "${tableName}":`, json.message);
  }
}

async function createStringAttr(tableId, key, size, required = true) {
  const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${tableId}/attributes/string`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, size, required }),
  });
  const json = await res.json();
  if (res.ok) console.log(`  + String attribute "${key}" created in ${tableId}`);
  else if (json.code === 409) console.log(`  . Attribute "${key}" already exists`);
  else console.error(`  x Error adding attribute "${key}":`, json.message);
}

async function createFloatAttr(tableId, key, required = true) {
  const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${tableId}/attributes/float`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, required }),
  });
  const json = await res.json();
  if (res.ok) console.log(`  + Float attribute "${key}" created in ${tableId}`);
  else if (json.code === 409) console.log(`  . Attribute "${key}" already exists`);
  else console.error(`  x Error adding attribute "${key}":`, json.message);
}

async function createIntegerAttr(tableId, key, required = true) {
  const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${tableId}/attributes/integer`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, required }),
  });
  const json = await res.json();
  if (res.ok) console.log(`  + Integer attribute "${key}" created in ${tableId}`);
  else if (json.code === 409) console.log(`  . Attribute "${key}" already exists`);
  else console.error(`  x Error adding attribute "${key}":`, json.message);
}

async function createBooleanAttr(tableId, key, required = true) {
  const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${tableId}/attributes/boolean`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, required }),
  });
  const json = await res.json();
  if (res.ok) console.log(`  + Boolean attribute "${key}" created in ${tableId}`);
  else if (json.code === 409) console.log(`  . Attribute "${key}" already exists`);
  else console.error(`  x Error adding attribute "${key}":`, json.message);
}


async function autoCreateSchema() {
  console.log('🚀 Starting automatic schema creation...');

  // 1. Orders Table
  await createTable('orders', 'orders');
  await createStringAttr('orders', 'userId', 255);
  await createStringAttr('orders', 'userName', 255);
  await createStringAttr('orders', 'userEmail', 255);
  await createStringAttr('orders', 'items', 10000);
  await createFloatAttr('orders', 'totalAmount');
  await createStringAttr('orders', 'deliveryAddress', 1000);
  await createStringAttr('orders', 'status', 50);
  await createStringAttr('orders', 'paymentReference', 255);
  await createStringAttr('orders', 'paymentStatus', 50);
  await createStringAttr('orders', 'createdAt', 255);
  await createStringAttr('orders', 'sellerId', 255, false);
  await createStringAttr('orders', 'orderNotes', 2000, false);

  // 2. Banners Table (Admin Banner Ads)
  await createTable('banners', 'banners');
  await createStringAttr('banners', 'title', 255);
  await createStringAttr('banners', 'subtitle', 255, false);
  await createStringAttr('banners', 'imageUrl', 1000);
  await createStringAttr('banners', 'gradientStart', 50);
  await createStringAttr('banners', 'gradientEnd', 50);
  await createBooleanAttr('banners', 'isActive', false);
  await createIntegerAttr('banners', 'displayOrder', false);
  await createStringAttr('banners', 'targetCategory', 255, false);
  await createStringAttr('banners', 'targetType', 50, false);
  await createStringAttr('banners', 'targetId', 255, false);

  // 3. Stores Table (Sellers)
  await createTable('stores', 'stores');
  await createStringAttr('stores', 'userId', 255);
  await createStringAttr('stores', 'storeName', 255);
  await createStringAttr('stores', 'description', 1000, false);
  await createStringAttr('stores', 'logoUrl', 1000, false);
  await createStringAttr('stores', 'bannerUrl', 1000, false);
  await createStringAttr('stores', 'address', 500, false);
  await createStringAttr('stores', 'phone', 50, false);
  await createFloatAttr('stores', 'commissionRate', false);
  await createStringAttr('stores', 'status', 50, false);
  await createFloatAttr('stores', 'walletBalance', false);
  await createStringAttr('stores', 'allowedCategories', 1000, false);

  // 4. Categories Table
  await createTable('categories', 'categories');
  await createStringAttr('categories', 'name', 255);
  await createStringAttr('categories', 'slug', 255, false);
  await createStringAttr('categories', 'iconUrl', 1000, false);
  await createBooleanAttr('categories', 'isActive', false);

  // 5. Products Table (or menu collection)
  await createTable('products', 'products');
  await createStringAttr('products', 'name', 255);
  await createStringAttr('products', 'description', 2000, false);
  await createFloatAttr('products', 'price');
  await createFloatAttr('products', 'discountPrice', false);
  await createIntegerAttr('products', 'stock', false);
  await createStringAttr('products', 'image_url', 1000);
  await createStringAttr('products', 'sellerId', 255, false);
  await createStringAttr('products', 'categoryId', 255, false);
  await createBooleanAttr('products', 'isActive', false);
  await createStringAttr('products', 'extras', 10000, false);
  await createIntegerAttr('products', 'calories', false);
  await createIntegerAttr('products', 'protein', false);

  // 6. User Table additions
  await createStringAttr('user', 'role', 50, false);
  await createStringAttr('user', 'phone', 50, false);
  await createFloatAttr('user', 'walletBalance', false);
  await createStringAttr('user', 'status', 50, false);

  // 7. Customer Wallets Table
  await createTable('wallets', 'wallets');
  await createStringAttr('wallets', 'userId', 255);
  await createFloatAttr('wallets', 'balance');
  await createStringAttr('wallets', 'currency', 50, false);
  await createStringAttr('wallets', 'updatedAt', 255, false);

  // 8. Wallet Transactions Table
  await createTable('wallet_transactions', 'wallet_transactions');
  await createStringAttr('wallet_transactions', 'userId', 255);
  await createFloatAttr('wallet_transactions', 'amount');
  await createStringAttr('wallet_transactions', 'type', 50);
  await createStringAttr('wallet_transactions', 'category', 50, false);
  await createStringAttr('wallet_transactions', 'description', 500, false);
  await createStringAttr('wallet_transactions', 'reference', 255, false);
  await createStringAttr('wallet_transactions', 'createdAt', 255);

  // 9. Seller Payouts & Settlement Logs Table
  await createTable('seller_payouts', 'seller_payouts');
  await createStringAttr('seller_payouts', 'sellerId', 255);
  await createStringAttr('seller_payouts', 'storeName', 255, false);
  await createFloatAttr('seller_payouts', 'amount');
  await createFloatAttr('seller_payouts', 'commissionDeducted', false);
  await createStringAttr('seller_payouts', 'status', 50);
  await createStringAttr('seller_payouts', 'paymentMethod', 50, false);
  await createStringAttr('seller_payouts', 'reference', 255, false);
  await createStringAttr('seller_payouts', 'createdAt', 255);

  // 10. Discount Coupons & Promotions Table
  await createTable('coupons', 'coupons');
  await createStringAttr('coupons', 'code', 50);
  await createStringAttr('coupons', 'discountType', 50);
  await createFloatAttr('coupons', 'discountValue');
  await createFloatAttr('coupons', 'minCartAmount', false);
  await createFloatAttr('coupons', 'maxDiscountAmount', false);
  await createStringAttr('coupons', 'validUntil', 255, false);
  await createIntegerAttr('coupons', 'usageLimit', false);
  await createIntegerAttr('coupons', 'usedCount', false);
  await createBooleanAttr('coupons', 'isActive', false);

  // 11. Platform Policies Configuration Table
  await createTable('platform_policies', 'platform_policies');
  await createStringAttr('platform_policies', 'cartMode', 50, false);
  await createBooleanAttr('platform_policies', 'productApprovalRequired', false);
  await createBooleanAttr('platform_policies', 'sellerOrderCancellationAllowed', false);
  await createFloatAttr('platform_policies', 'defaultCommissionRate', false);
  await createStringAttr('platform_policies', 'updatedAt', 255, false);

  console.log('\n🎉 Auto schema setup finished!');
}


autoCreateSchema();

