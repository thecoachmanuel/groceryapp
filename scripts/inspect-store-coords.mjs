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

async function inspectStores() {
  const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${STORES_COLLECTION}/documents?limit=10`, { headers });
  const data = await res.json();
  if (!data.documents) {
    console.log('Error or empty:', JSON.stringify(data));
    return;
  }
  console.log(`\nFound ${data.documents.length} stores:\n`);
  for (const doc of data.documents) {
    console.log(`Store: ${doc.storeName}`);
    console.log(`  $id:      ${doc.$id}`);
    console.log(`  address:  ${doc.address || '(none)'}`);
    console.log(`  latitude: ${doc.latitude ?? '(missing)'}`);
    console.log(`  longitude:${doc.longitude ?? '(missing)'}`);
    console.log('');
  }
}

inspectStores();
