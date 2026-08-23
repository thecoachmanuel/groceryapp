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

async function getPoliciesDoc() {
  const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/platform_policies/documents`, { headers });
  const data = await res.json();
  console.log('Policies documents:', JSON.stringify(data, null, 2));
}

getPoliciesDoc();
