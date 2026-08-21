const ENDPOINT = 'https://cloud.appwrite.io/v1';
const PROJECT_ID = '6a87786a0006db9d111d';
const DATABASE_ID = '6a877af5000bdb5165ac';
const COLLECTION_ID = 'orders';

async function createOrdersCollection() {
  console.log('📦 Attempting to auto-create the "orders" table in Appwrite...');
  
  const createCollectionUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections`;
  const res = await fetch(createCollectionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-appwrite-project': PROJECT_ID,
    },
    body: JSON.stringify({
      collectionId: COLLECTION_ID,
      name: 'orders',
      permissions: [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")'
      ],
      documentSecurity: false,
    }),
  });

  const json = await res.json();
  if (res.ok) {
    console.log('✅ Created "orders" collection successfully!');
  } else {
    console.log('Response:', json);
  }
}

createOrdersCollection();
