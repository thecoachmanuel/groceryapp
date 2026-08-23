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

async function fixFroshSellerCoords() {
  const storeId = '6a8a3a9f00392d2f9979';
  console.log('Syncing Frosh seller coordinates with address "University of Ibadan, Ibadan"...');

  // University of Ibadan coordinates: 7.4477, 3.8967
  const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${STORES_COLLECTION}/documents/${storeId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      data: {
        address: 'University of Ibadan, Ibadan, Oyo State',
        latitude: 7.4477,
        longitude: 3.8967,
      }
    })
  });

  const data = await res.json();
  console.log('Update result:', data.$id ? 'SUCCESS! Frosh seller is now set to University of Ibadan (7.4477, 3.8967)' : data.message);
}

fixFroshSellerCoords();
