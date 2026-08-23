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

async function createDeliveryAttributes() {
  console.log('Creating delivery increment attributes in platform_policies collection...');

  const attributes = [
    { url: 'float', body: { key: 'feePerItem', required: false, default: 100 } },
    { url: 'string', body: { key: 'deliveryIncrementType', size: 50, required: false, default: 'per_item' } },
    { url: 'float', body: { key: 'deliveryIncrementRate', required: false, default: 0 } },
    { url: 'float', body: { key: 'deliveryIncrementStep', required: false, default: 5000 } },
    { url: 'float', body: { key: 'maxDeliveryFee', required: false, default: 5000 } },
  ];

  for (const attr of attributes) {
    try {
      const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/platform_policies/attributes/${attr.url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(attr.body),
      });
      const data = await res.json();
      console.log(`Attribute ${attr.body.key}:`, data.key || data.message);
    } catch (err) {
      console.log(`Attribute ${attr.body.key} error:`, err.message);
    }
  }

  console.log('Done!');
}

createDeliveryAttributes();
