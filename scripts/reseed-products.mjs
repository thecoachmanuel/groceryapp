import 'dotenv/config';

const ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = '6a877af5000bdb5165ac';
const MENU_COLLECTION_ID = 'products';
const LEGACY_MENU_COLLECTION_ID = 'menu';
const CATEGORIES_COLLECTION_ID = 'categories';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('❌ APPWRITE_API_KEY missing in .env');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'x-appwrite-project': PROJECT_ID,
  'x-appwrite-key': API_KEY,
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json;
}

// 1. Categories to seed / verify
const SEED_CATEGORIES = [
  { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', iconUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&auto=format&fit=crop&q=80' },
  { name: 'Dairy & Eggs', slug: 'dairy-eggs', iconUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80' },
  { name: 'Bakery & Bread', slug: 'bakery-bread', iconUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80' },
  { name: 'Meat & Poultry', slug: 'meat-poultry', iconUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&auto=format&fit=crop&q=80' },
  { name: 'Beverages', slug: 'beverages', iconUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200&auto=format&fit=crop&q=80' },
  { name: 'Snacks & Sweets', slug: 'snacks-sweets', iconUrl: 'https://images.unsplash.com/photo-1509358271058-acd05cc93228?w=200&auto=format&fit=crop&q=80' },
  { name: 'Pantry & Staples', slug: 'pantry-staples', iconUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80' },
  { name: 'Frozen Foods', slug: 'frozen-foods', iconUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=200&auto=format&fit=crop&q=80' },
];

// 2. 10 High-Quality Products with direct Unsplash CDN Image URLs
const SEED_PRODUCTS = [
  {
    name: 'Fresh Hass Avocados (3 Pcs)',
    description: 'Creamy, ripe organic Hass avocados imported fresh. Rich in healthy fats and potassium.',
    price: 2500,
    discountPrice: 2200,
    stock: 50,
    categoryName: 'Fruits & Vegetables',
    categorySlug: 'fruits-vegetables',
    image_url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&auto=format&fit=crop&q=80',
    calories: 160,
    protein: 2,
  },
  {
    name: 'Organic Red Tomatoes (1kg)',
    description: 'Plump, vine-ripened red tomatoes ideal for salads, stews, and fresh cooking.',
    price: 1800,
    discountPrice: 1500,
    stock: 80,
    categoryName: 'Fruits & Vegetables',
    categorySlug: 'fruits-vegetables',
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
    calories: 22,
    protein: 1,
  },
  {
    name: 'Whole Fresh Milk (1 Litre)',
    description: 'Pure, pasteurized whole cow milk rich in calcium and vitamin D.',
    price: 1200,
    discountPrice: 1000,
    stock: 60,
    categoryName: 'Dairy & Eggs',
    categorySlug: 'dairy-eggs',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
    calories: 149,
    protein: 8,
  },
  {
    name: 'Farm Fresh Grade A Eggs (Crate of 30)',
    description: 'Nutritious brown eggs harvested daily from free-range chicken farms.',
    price: 4500,
    discountPrice: 4200,
    stock: 40,
    categoryName: 'Dairy & Eggs',
    categorySlug: 'dairy-eggs',
    image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop&q=80',
    calories: 72,
    protein: 6,
  },
  {
    name: 'Whole Wheat Sliced Bread (700g)',
    description: 'Freshly baked 100% whole grain wheat bread, soft and high in natural fiber.',
    price: 1500,
    discountPrice: 1350,
    stock: 45,
    categoryName: 'Bakery & Bread',
    categorySlug: 'bakery-bread',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    calories: 120,
    protein: 4,
  },
  {
    name: 'Fresh Chicken Breast Fillets (1kg)',
    description: 'Lean, skinless and boneless fresh chicken breast cuts packed with high protein.',
    price: 5800,
    discountPrice: 5200,
    stock: 35,
    categoryName: 'Meat & Poultry',
    categorySlug: 'meat-poultry',
    image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&auto=format&fit=crop&q=80',
    calories: 165,
    protein: 31,
  },
  {
    name: 'Freshly Squeezed Orange Juice (1L)',
    description: '100% natural Valencia orange juice with pulp. No added sugar or artificial preservatives.',
    price: 2000,
    discountPrice: 1800,
    stock: 50,
    categoryName: 'Beverages',
    categorySlug: 'beverages',
    image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop&q=80',
    calories: 110,
    protein: 2,
  },
  {
    name: 'Roasted Salted Cashew Nuts (250g)',
    description: 'Crunchy jumbo cashew nuts slow-roasted and lightly salted to perfection.',
    price: 3200,
    discountPrice: 2900,
    stock: 65,
    categoryName: 'Snacks & Sweets',
    categorySlug: 'snacks-sweets',
    image_url: 'https://images.unsplash.com/photo-1509358271058-acd05cc93228?w=800&auto=format&fit=crop&q=80',
    calories: 157,
    protein: 5,
  },
  {
    name: 'Cold Pressed Extra Virgin Olive Oil (750ml)',
    description: 'Premium Mediterranean cold-pressed extra virgin olive oil for salads and cooking.',
    price: 6500,
    discountPrice: 6000,
    stock: 30,
    categoryName: 'Pantry & Staples',
    categorySlug: 'pantry-staples',
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&auto=format&fit=crop&q=80',
    calories: 119,
    protein: 0,
  },
  {
    name: 'Frozen Mixed Berries (500g)',
    description: 'Flash-frozen strawberries, blueberries, and raspberries. Great for smoothies and desserts.',
    price: 4000,
    discountPrice: 3600,
    stock: 40,
    categoryName: 'Frozen Foods',
    categorySlug: 'frozen-foods',
    image_url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&auto=format&fit=crop&q=80',
    calories: 70,
    protein: 1,
  },
];

async function wipeCollection(collId) {
  const listUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collId}/documents?limit=100`;
  try {
    const listData = await fetchJson(listUrl);
    const existingDocs = listData.documents || [];
    console.log(`🗑️ Found ${existingDocs.length} items in "${collId}" to delete.`);
    for (const doc of existingDocs) {
      const delUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collId}/documents/${doc.$id}`;
      await fetch(delUrl, { method: 'DELETE', headers }).catch(() => {});
      console.log(`  - Deleted from ${collId}: "${doc.name || doc.title || doc.$id}"`);
    }
  } catch (err) {
    console.warn(`Wipe "${collId}" warning:`, err.message);
  }
}

async function main() {
  console.log('🚀 Starting clean product wipe & 10-product re-seed process...');

  // 1. Fetch & Delete All Products from 'products' and 'menu' collections
  await wipeCollection(MENU_COLLECTION_ID);
  await wipeCollection(LEGACY_MENU_COLLECTION_ID);

  // 2. Ensure Categories Exist & Build ID Map
  const categoryMap = {};
  for (const cat of SEED_CATEGORIES) {
    const catCheckUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${CATEGORIES_COLLECTION_ID}/documents?queries[]=${encodeURIComponent(`equal("name", ["${cat.name}"])`)}`;
    try {
      const catData = await fetchJson(catCheckUrl);
      if (catData.documents && catData.documents.length > 0) {
        const existingCat = catData.documents[0];
        categoryMap[cat.name] = existingCat.$id;
        categoryMap[cat.slug] = existingCat.$id;
      } else {
        const createCatUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${CATEGORIES_COLLECTION_ID}/documents`;
        const newCat = await fetchJson(createCatUrl, {
          method: 'POST',
          body: JSON.stringify({
            documentId: 'unique()',
            data: {
              name: cat.name,
              slug: cat.slug,
              iconUrl: cat.iconUrl,
              isActive: true,
            },
          }),
        });
        categoryMap[cat.name] = newCat.$id;
        categoryMap[cat.slug] = newCat.$id;
        console.log(`+ Created Category "${cat.name}" (${newCat.$id})`);
      }
    } catch (catErr) {
      console.warn(`Category "${cat.name}" setup warning:`, catErr.message);
    }
  }

  // 3. Create 10 Fresh Products with Unsplash Images
  console.log('\n📦 Seeding 10 fresh grocery products into "products" collection...');
  for (const p of SEED_PRODUCTS) {
    const catId = categoryMap[p.categoryName] || categoryMap[p.categorySlug] || '';
    const payload = {
      name: p.name,
      description: p.description,
      price: p.price,
      discountPrice: p.discountPrice,
      stock: p.stock,
      image_url: p.image_url,
      categories: p.categoryName,
      categoryId: catId,
      isActive: true,
      calories: p.calories,
      protein: p.protein,
    };

    const createProdUrl = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${MENU_COLLECTION_ID}/documents`;

    // Attempt creation stripping unknown attrs if schema rejects
    let currentPayload = { ...payload };
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(createProdUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            documentId: 'unique()',
            data: currentPayload,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          console.log(`  ✅ [${p.categoryName}] "${p.name}" (₦${p.price})`);
          break;
        } else {
          const match = (json.message || '').match(/Unknown attribute:\s*"([^"]+)"/i);
          if (match && match[1]) {
            delete currentPayload[match[1]];
            continue;
          }
          console.error(`  ❌ Failed creating "${p.name}":`, json.message);
          break;
        }
      } catch (err) {
        console.error(`  ❌ Error creating "${p.name}":`, err.message);
        break;
      }
    }
  }

  console.log('\n🎉 Product re-seed finished successfully!');
}

main();
