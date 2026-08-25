import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6a87786a0006db9d111d';
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || '6a877af5000bdb5165ac';
const BUCKET_ID = process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID || '6a87822a000b821c4393';
const POLICIES_COLLECTION = 'platform_policies';
const API_KEY = process.env.APPWRITE_API_KEY;

const iconPath = path.resolve(process.cwd(), 'assets/images/adaptive-icon.png');
const fallbackIconPath = path.resolve(process.cwd(), 'assets/images/icon.png');

async function syncAppIconToDatabase() {
  console.log('🚀 Starting App Icon & Adaptive Icon Sync to Appwrite Database...');

  const targetPath = fs.existsSync(iconPath) ? iconPath : fallbackIconPath;

  if (!fs.existsSync(targetPath)) {
    console.error('❌ Could not find adaptive-icon.png or icon.png in assets/images/');
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(targetPath);
  const fileName = path.basename(targetPath);

  console.log(`📁 Uploading ${fileName} (${fileBuffer.length} bytes) to Appwrite Storage...`);

  const formData = new FormData();
  const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
  formData.append('fileId', 'unique()');
  formData.append('file', fileBlob, fileName);

  const headers = {
    'x-appwrite-project': PROJECT_ID,
  };
  if (API_KEY) {
    headers['x-appwrite-key'] = API_KEY;
  }

  try {
    const uploadRes = await fetch(`${ENDPOINT}/storage/buckets/${BUCKET_ID}/files`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const uploadData = await uploadRes.json();

    if (!uploadData.$id) {
      console.error('❌ Failed to upload icon file to Appwrite Storage:', uploadData);
      process.exit(1);
    }

    const fileId = uploadData.$id;
    const fileUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
    console.log('✅ File uploaded successfully! Storage URL:', fileUrl);

    // 2. Fetch or update platform policies document
    console.log('🔄 Syncing app logo URL to Appwrite Platform Policies collection...');
    const listRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${POLICIES_COLLECTION}/documents`, {
      headers: {
        'Content-Type': 'application/json',
        'x-appwrite-project': PROJECT_ID,
        ...(API_KEY ? { 'x-appwrite-key': API_KEY } : {}),
      },
    });

    const listData = await listRes.json();

    const updatePayload = {
      appLogo: fileUrl,
      updatedAt: new Date().toISOString(),
    };

    if (listData.documents && listData.documents.length > 0) {
      const docId = listData.documents[0].$id;
      const updateRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${POLICIES_COLLECTION}/documents/${docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-appwrite-project': PROJECT_ID,
          ...(API_KEY ? { 'x-appwrite-key': API_KEY } : {}),
        },
        body: JSON.stringify({ data: updatePayload }),
      });
      const updateResult = await updateRes.json();
      console.log('🎉 Successfully updated existing branding document:', updateResult.$id ? 'SUCCESS' : updateResult);
    } else {
      const createRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${POLICIES_COLLECTION}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-appwrite-project': PROJECT_ID,
          ...(API_KEY ? { 'x-appwrite-key': API_KEY } : {}),
        },
        body: JSON.stringify({
          documentId: 'unique()',
          data: updatePayload,
        }),
      });
      const createResult = await createRes.json();
      console.log('🎉 Successfully created platform branding document:', createResult.$id ? 'SUCCESS' : createResult);
    }

    console.log('\n🌟 SYNC COMPLETE! Your adaptive icon is now live in your Appwrite Database & Storage.');
  } catch (err) {
    console.error('❌ Error during icon sync:', err);
  }
}

syncAppIconToDatabase();
