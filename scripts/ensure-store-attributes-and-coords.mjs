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

async function ensureAttributesAndMigrateStores() {
  console.log('=== Migration & Verification: Appwrite Stores Location ===');

  // 1. Provision attributes
  const attributes = [
    { type: 'float', key: 'latitude', required: false, default: 6.4698 },
    { type: 'float', key: 'longitude', required: false, default: 3.5852 },
  ];

  for (const attr of attributes) {
    try {
      const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${STORES_COLLECTION}/attributes/${attr.type}`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(attr),
      });
      const data = await res.json();
      console.log(`Attribute ${attr.key}:`, data.key || data.message || 'Ready');
    } catch (err) {
      console.log(`Attribute ${attr.key} status:`, err.message);
    }
  }

  await delay(1000);

  // 2. Migrate existing store documents
  console.log('\nFetching store documents...');
  const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${STORES_COLLECTION}/documents?limit=50`, { headers });
  const data = await res.json();

  if (!data.documents || data.documents.length === 0) {
    console.log('No store documents to migrate.');
    return;
  }

  for (const doc of data.documents) {
    let lat = doc.latitude;
    let lon = doc.longitude;

    if (lat == null || lon == null) {
      const coords = geocodeAddress(doc.address);
      lat = coords.latitude;
      lon = coords.longitude;
    }

    console.log(`Store "${doc.storeName}" ($id: ${doc.$id})`);
    console.log(`  Address: ${doc.address || '(none)'}`);
    console.log(`  Latitude: ${lat}, Longitude: ${lon}`);

    try {
      const updateRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${STORES_COLLECTION}/documents/${doc.$id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          data: {
            latitude: Number(lat),
            longitude: Number(lon),
          }
        }),
      });
      const result = await updateRes.json();
      console.log(`  Status: ${result.$id ? '✅ Canonical Location Saved' : result.message}`);
    } catch (e) {
      console.log('  Update status:', e.message);
    }
    await delay(300);
    console.log('');
  }

  console.log('=== Migration Complete ===');
}

ensureAttributesAndMigrateStores();
