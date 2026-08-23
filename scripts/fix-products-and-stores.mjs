import 'dotenv/config';

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = '6a877af5000bdb5165ac';
const API_KEY = process.env.APPWRITE_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'x-appwrite-project': PROJECT_ID,
  'x-appwrite-key': API_KEY,
};

async function fixProductsAndStores() {
  // 1. Ensure 'categories' and 'storeId' attributes exist in 'products' collection if needed
  try {
    await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/products/attributes/string`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key: 'categories', size: 255, required: false })
    });
    await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/products/attributes/string`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key: 'storeId', size: 255, required: false })
    });
  } catch (e) {}

  console.log('Fetching stores...');
  const storesRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/stores/documents?limit=25`, { headers });
  const storesData = await storesRes.json();
  const stores = storesData.documents || [];
  console.log(`Found ${stores.length} stores:`);
  stores.forEach(s => console.log(`  - [${s.$id}] "${s.storeName}" (userId: ${s.userId})`));

  const greenValley = stores.find(s => s.storeName?.includes('Green Valley')) || stores[0];
  const dailySuper = stores.find(s => s.storeName?.includes('Daily Supermarket')) || stores[1] || stores[0];
  const primeMeats = stores.find(s => s.storeName?.includes('Prime Meats') || s.storeName?.includes('Oceanic')) || stores[2] || stores[0];

  console.log('\nGreen Valley ID:', greenValley?.$id);
  console.log('Daily Super ID:', dailySuper?.$id);
  console.log('Prime Meats ID:', primeMeats?.$id);

  console.log('\nFetching products...');
  const prodsRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/products/documents?limit=50`, { headers });
  const prodsData = await prodsRes.json();
  const prods = prodsData.documents || [];

  const updates = [
    { match: 'Avocados', storeId: greenValley?.$id, cat: 'Fruits & Vegetables' },
    { match: 'Tomatoes', storeId: greenValley?.$id, cat: 'Fruits & Vegetables' },
    { match: 'Milk', storeId: dailySuper?.$id, cat: 'Dairy & Eggs' },
    { match: 'Eggs', storeId: dailySuper?.$id, cat: 'Dairy & Eggs' },
    { match: 'Bread', storeId: dailySuper?.$id, cat: 'Bakery & Bread' },
    { match: 'Chicken', storeId: primeMeats?.$id, cat: 'Meat & Seafood' },
    { match: 'Orange Juice', storeId: greenValley?.$id, cat: 'Beverages & Drinks' },
    { match: 'Olive Oil', storeId: dailySuper?.$id, cat: 'Pantry & Grains' },
    { match: 'Berries', storeId: greenValley?.$id, cat: 'Fruits & Vegetables' },
  ];

  for (const p of prods) {
    const rule = updates.find(u => p.name.includes(u.match));
    if (rule && rule.storeId) {
      console.log(`Updating "${p.name}" -> store: ${rule.storeId}, cat: ${rule.cat}`);
      const patchUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections/products/documents/${p.$id}`;
      const res = await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          data: {
            sellerId: rule.storeId,
            categoryId: rule.cat,
            isActive: true,
          }
        })
      });
      const resJson = await res.json();
      if (res.ok) {
        console.log(`  ✅ Updated "${p.name}"`);
      } else {
        console.warn(`  ⚠️ Failed to update "${p.name}":`, resJson.message);
      }
    }
  }

  console.log('\nDone updating products in Appwrite DB!');
}

fixProductsAndStores();
