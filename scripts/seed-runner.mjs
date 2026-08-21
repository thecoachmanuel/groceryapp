import dummyData from '../lib/data.ts';

const ENDPOINT = 'https://cloud.appwrite.io/v1';
const PROJECT_ID = '6a87786a0006db9d111d';
const DATABASE_ID = '6a877af5000bdb5165ac';

const COLLECTIONS = {
  categories: 'categories',
  customizations: 'customizations',
  menu: 'menu',
  menuCustomizations: 'menu_customizations',
};

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function createDoc(collectionId, data) {
  const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-appwrite-project': PROJECT_ID,
    },
    body: JSON.stringify({
      documentId: generateId(),
      data: data,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error(`Failed to insert into ${collectionId}:`, json.message || json);
    throw new Error(json.message || 'Failed');
  }
  return json;
}

async function runSeed() {
  console.log('🌱 Starting Appwrite database seeding...');
  
  try {
    const categoryMap = {};
    for (const cat of dummyData.categories) {
      console.log(`Adding Category: ${cat.name}`);
      const doc = await createDoc(COLLECTIONS.categories, cat);
      categoryMap[cat.name] = doc.$id;
    }

    const customizationMap = {};
    for (const cus of dummyData.customizations) {
      console.log(`Adding Customization: ${cus.name}`);
      const doc = await createDoc(COLLECTIONS.customizations, cus);
      customizationMap[cus.name] = doc.$id;
    }

    for (const item of dummyData.menu) {
      console.log(`Adding Menu Item: ${item.name}`);
      const menuDoc = await createDoc(COLLECTIONS.menu, {
        name: item.name,
        description: item.description,
        image_url: item.image_url,
        price: item.price,
        rating: item.rating,
        calories: item.calories,
        protein: item.protein,
        categories: categoryMap[item.category_name],
      });

      for (const cusName of item.customizations) {
        if (customizationMap[cusName]) {
          await createDoc(COLLECTIONS.menuCustomizations, {
            menu: menuDoc.$id,
            customizations: customizationMap[cusName],
          });
        }
      }
    }

    console.log('🎉 Seeding complete successfully!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
}

runSeed();
