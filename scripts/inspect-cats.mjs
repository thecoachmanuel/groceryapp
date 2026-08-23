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

async function inspectCategories() {
  const catsRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/categories/documents?limit=25`, { headers });
  const catsData = await catsRes.json();
  console.log('--- CATEGORIES IN DB ---');
  catsData.documents?.forEach(c => {
    console.log(`Cat: [${c.$id}] name="${c.name}" slug="${c.slug}"`);
  });
}

inspectCategories();
