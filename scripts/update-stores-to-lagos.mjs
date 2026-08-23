import 'dotenv/config';

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6a87786a0006db9d111d';
const DATABASE_ID = '6a877af5000bdb5165ac';
const STORES_COLLECTION = process.env.EXPO_PUBLIC_APPWRITE_STORES_COLLECTION_ID || 'stores';
const API_KEY = process.env.APPWRITE_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'x-appwrite-project': PROJECT_ID,
  'x-appwrite-key': API_KEY,
};

async function updateStoresToLagosAddresses() {
  console.log('Updating stores to Lagos locations...');

  const updates = [
    { id: '6a8977d80023f2f43a90', name: 'Green Valley Organic Market', address: '12 Admiralty Way, Lekki Phase 1, Lagos', latitude: 6.4698, longitude: 3.5852 },
    { id: '6a8a3a9f00392d2f9979', name: 'Frosh seller', address: '15 Allen Avenue, Ikeja, Lagos', latitude: 6.6018, longitude: 3.3515 },
  ];

  for (const store of updates) {
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${STORES_COLLECTION}/documents/${store.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        data: {
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
        }
      })
    });
    const data = await res.json();
    console.log(`Updated Store "${store.name}" to address "${store.address}":`, data.$id ? 'SUCCESS' : data.message);
  }
}

updateStoresToLagosAddresses();
