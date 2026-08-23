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

async function createDistanceAttributes() {
  console.log('Adding distance pricing attributes to platform_policies collection...');

  const attributes = [
    { type: 'string', key: 'deliveryPricingMode', size: 30, required: false, default: 'flat' },
    { type: 'float', key: 'distanceBaseRate', required: false, default: 800 },
    { type: 'float', key: 'distanceMidRate', required: false, default: 1200 },
    { type: 'float', key: 'distanceFarRate', required: false, default: 1800 },
    { type: 'float', key: 'distancePerKmRate', required: false, default: 150 },
    { type: 'float', key: 'maxDeliveryRadiusKm', required: false, default: 20 },
  ];

  for (const attr of attributes) {
    try {
      const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/platform_policies/attributes/${attr.type}`;
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

  console.log('Done creating distance attributes!');
}

createDistanceAttributes();
