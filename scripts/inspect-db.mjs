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

async function inspectDetail() {
  const storesRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/stores/documents?limit=25`, { headers });
  const storesData = await storesRes.json();
  console.log('--- STORE DETAILS ---');
  storesData.documents?.forEach(s => {
    console.log(JSON.stringify({
      $id: s.$id,
      storeName: s.storeName,
      userId: s.userId,
      sellerId: s.sellerId,
      phone: s.phone,
      address: s.address,
      status: s.status,
    }, null, 2));
  });

  const prodsRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/products/documents?limit=50`, { headers });
  const prodsData = await prodsRes.json();
  console.log('--- PRODUCT DETAILS ---');
  prodsData.documents?.forEach(p => {
    console.log(JSON.stringify({
      $id: p.$id,
      name: p.name,
      sellerId: p.sellerId,
      storeId: p.storeId,
      categoryId: p.categoryId,
      categories: p.categories,
    }, null, 2));
  });
}

inspectDetail();
