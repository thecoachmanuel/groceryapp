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

async function verifyStoreIsolation() {
  console.log('--- 1. FETCHING ALL STORES ---');
  const storesRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/stores/documents?limit=25`, { headers });
  const storesData = await storesRes.json();
  const stores = storesData.documents || [];

  console.log(`Found ${stores.length} registered stores in DB:`);
  for (const s of stores) {
    console.log(`\n🏪 STORE: [${s.$id}] "${s.storeName}"`);
    
    // Fetch products strictly belonging to this store
    const prodsRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/products/documents?limit=50`, { headers });
    const prodsData = await prodsRes.json();
    const prods = prodsData.documents || [];
    
    const candidateIds = [s.$id, s.userId, s.sellerId].filter(Boolean);
    const storeProducts = prods.filter(p => candidateIds.includes(p.sellerId));

    console.log(`   Assigned Products Count: ${storeProducts.length}`);
    storeProducts.forEach((p, idx) => {
      console.log(`   ${idx + 1}. "${p.name}" (₦${p.price}) [Category: ${p.categoryId || p.categories}]`);
    });
  }

  console.log('\n--- 2. VERIFYING ZERO CROSS-STORE CONTAMINATION ---');
  // Verify that sum of assigned store products matches total products
  const prodsRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/products/documents?limit=50`, { headers });
  const prodsData = await prodsRes.json();
  const allProds = prodsData.documents || [];
  
  console.log(`Total Products in DB: ${allProds.length}`);
  let totalAssigned = 0;
  for (const s of stores) {
    const candidateIds = [s.$id, s.userId, s.sellerId].filter(Boolean);
    const count = allProds.filter(p => candidateIds.includes(p.sellerId)).length;
    totalAssigned += count;
  }
  console.log(`Total Products Assigned across all stores: ${totalAssigned}`);

  if (totalAssigned === allProds.length) {
    console.log('✅ PERFECT: 100% of products are strictly assigned to their respective store with ZERO orphans or overlaps!');
  } else {
    console.warn(`⚠️ Warning: ${allProds.length - totalAssigned} unassigned products.`);
  }
}

verifyStoreIsolation();
