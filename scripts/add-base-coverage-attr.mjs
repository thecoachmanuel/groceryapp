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

async function addBaseCoverage() {
  console.log('Sending request to Appwrite...');
  try {
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/platform_policies/attributes/float`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key: 'baseCoverageThreshold', required: false, default: 10000 }),
    });
    const text = await res.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}

addBaseCoverage();
