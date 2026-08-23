import 'dotenv/config';

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6a87786a0006db9d111d';
const DATABASE_ID = '6a877af5000bdb5165ac';
const API_KEY = process.env.APPWRITE_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'x-appwrite-project': PROJECT_ID,
  'x-appwrite-key': API_KEY,
};

async function createStoreCoordsAttributes() {
  console.log('Adding latitude and longitude attributes to stores collection...');

  const attributes = [
    { type: 'float', key: 'latitude', required: false, default: 6.4698 },
    { type: 'float', key: 'longitude', required: false, default: 3.5852 },
  ];

  for (const attr of attributes) {
    try {
      const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/stores/attributes/${attr.type}`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(attr),
      });
      const data = await res.json();
      console.log(`Attribute ${attr.key}:`, data.key || data.message || 'Created');
    } catch (err) {
      console.log(`Error adding ${attr.key}:`, err.message);
    }
  }

  console.log('Done creating store coordinate attributes!');
}

createStoreCoordsAttributes();
