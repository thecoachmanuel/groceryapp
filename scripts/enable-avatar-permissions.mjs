import 'dotenv/config';

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6a87786a0006db9d111d';
const DATABASE_ID = '6a877af5000bdb5165ac';
const BUCKET_ID = '6a87822a000b821c4393';
const USER_COLLECTION_ID = 'user';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('❌ APPWRITE_API_KEY not found in .env');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'x-appwrite-project': PROJECT_ID,
  'x-appwrite-key': API_KEY,
};

async function enablePermissions() {
  console.log('🔓 Enabling avatar upload & update permissions for all users and admin...');

  // 1. Update Storage Bucket Permissions
  try {
    const bucketUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}`;
    const bucketRes = await fetch(bucketUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'grocery-assets',
        permissions: [
          'read("any")',
          'create("any")',
          'update("any")',
          'delete("any")',
        ],
        fileSecurity: false,
      }),
    });

    const bucketJson = await bucketRes.json();
    if (bucketRes.ok) {
      console.log('✅ Storage Bucket permissions updated: Read, Create, Update, Delete for all users!');
    } else {
      console.log('ℹ️ Storage Bucket update response:', bucketJson.message || bucketJson);
    }
  } catch (err) {
    console.error('Error updating bucket permissions:', err);
  }

  // 2. Update User Table Permissions
  try {
    const userTableUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${USER_COLLECTION_ID}`;
    const userTableRes = await fetch(userTableUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'user',
        permissions: [
          'read("any")',
          'create("any")',
          'update("any")',
          'delete("any")',
        ],
        documentSecurity: false,
      }),
    });

    const userTableJson = await userTableRes.json();
    if (userTableRes.ok) {
      console.log('✅ User Table permissions updated: Read, Create, Update, Delete for all users!');
    } else {
      console.log('ℹ️ User Table update response:', userTableJson.message || userTableJson);
    }
  } catch (err) {
    console.error('Error updating user table permissions:', err);
  }

  console.log('\n🎉 Permissions setup complete! All users & admin can now upload and update profile pictures.');
}

enablePermissions();
