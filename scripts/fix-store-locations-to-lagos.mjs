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

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function geocodeAddress(address) {
  if (!address) return { latitude: 6.4698, longitude: 3.5852 };
  const lower = address.toLowerCase();

  if (lower.includes('ibadan') || lower.includes('paul hendrickse')) {
    return { latitude: 7.4477, longitude: 3.8967 };
  }
  if (lower.includes('ikeja') || lower.includes('allen')) {
    return { latitude: 6.6018, longitude: 3.3515 };
  }
  if (lower.includes('ikoyi') || lower.includes('harbor')) {
    return { latitude: 6.4549, longitude: 3.4347 };
  }
  if (lower.includes('lekki') || lower.includes('central plaza')) {
    return { latitude: 6.4698, longitude: 3.5852 };
  }
  return { latitude: 6.4698, longitude: 3.5852 };
}

async function fixStoreLocations() {
  console.log('Fetching stores from Appwrite...');
  const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${STORES_COLLECTION}/documents?limit=50`, { headers });
  const data = await res.json();

  if (!data.documents) {
    console.log('No documents found or error:', data);
    return;
  }

  for (const doc of data.documents) {
    const coords = geocodeAddress(doc.address);
    console.log(`Updating Store "${doc.storeName}" ($id: ${doc.$id})`);
    console.log(`  Address: ${doc.address}`);
    console.log(`  Assigned Coords: Lat ${coords.latitude}, Lng ${coords.longitude}`);

    try {
      const updateRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${STORES_COLLECTION}/documents/${doc.$id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          data: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }
        }),
      });
      const result = await updateRes.json();
      console.log(`  Update Result: ${result.$id ? 'SUCCESS (Updated lat/lng)' : result.message}`);
    } catch (err) {
      console.log(`  Error updating ${doc.storeName}:`, err.message);
    }
    await delay(300);
    console.log('');
  }

  console.log('Done fixing store locations in database!');
}

fixStoreLocations();
