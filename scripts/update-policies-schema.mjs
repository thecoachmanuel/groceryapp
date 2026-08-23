import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6a87786a0006db9d111d')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const databaseId = '6a877af5000bdb5165ac';
const collectionId = 'platform_policies';

async function addDeliveryAttributes() {
  console.log('Checking platform_policies schema attributes...');
  
  const attrs = [
    { key: 'feePerItem', type: 'float', required: false, default: 100 },
    { key: 'deliveryIncrementType', type: 'string', size: 50, required: false, default: 'per_item' },
    { key: 'deliveryIncrementRate', type: 'float', required: false, default: 0 },
    { key: 'deliveryIncrementStep', type: 'float', required: false, default: 5000 },
    { key: 'maxDeliveryFee', type: 'float', required: false, default: 5000 },
  ];

  for (const attr of attrs) {
    try {
      if (attr.type === 'float') {
        await databases.createFloatAttribute(databaseId, collectionId, attr.key, attr.required, undefined, undefined, attr.default);
        console.log(`Created float attribute: ${attr.key}`);
      } else if (attr.type === 'string') {
        await databases.createStringAttribute(databaseId, collectionId, attr.key, attr.size, attr.required, attr.default);
        console.log(`Created string attribute: ${attr.key}`);
      }
    } catch (err) {
      console.log(`Attribute ${attr.key}: ${err.message}`);
    }
  }
}

addDeliveryAttributes();
