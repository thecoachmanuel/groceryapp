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

async function testQuery() {
  const storeId = '6a8977d80023f2f43a90';
  const userId = 'seller_seed_1';
  
  // Appwrite Query.equal format in REST is equal("sellerId", ["val1", "val2"])
  const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/products/documents`, {
    method: 'GET',
    headers,
  });
  const data = await res.json();
  console.log('All prods in products collection:', data.documents?.length);
  const matching = (data.documents || []).filter(p => [storeId, userId].includes(p.sellerId));
  console.log('Matching prods for storeId/userId:', matching.length);
  matching.forEach(p => console.log('  ->', p.name, p.sellerId));
}

testQuery();
