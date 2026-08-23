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

async function addExtraProducts() {
  const storesRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/stores/documents?limit=25`, { headers });
  const storesData = await storesRes.json();
  const stores = storesData.documents || [];

  const greenValley = stores.find(s => s.storeName?.includes('Green Valley')) || stores[0];
  const dailySuper = stores.find(s => s.storeName?.includes('Daily Supermarket')) || stores[1] || stores[0];
  const primeMeats = stores.find(s => s.storeName?.includes('Prime Meats') || s.storeName?.includes('Oceanic')) || stores[2] || stores[0];

  const EXTRA_PRODUCTS = [
    {
      name: 'Fresh Atlantic Salmon Fillet (500g)',
      description: 'Rich in Omega-3 fatty acids. Skin-on, boneless sushi-grade fresh salmon cut.',
      price: 8500,
      discountPrice: 7800,
      stock: 25,
      categoryId: 'Meat & Seafood',
      sellerId: primeMeats?.$id,
      image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Premium Angus Beef Steak (800g)',
      description: 'Tender, marbled premium beef cut seasoned for pan searing or grilling.',
      price: 9500,
      discountPrice: 8900,
      stock: 20,
      categoryId: 'Meat & Seafood',
      sellerId: primeMeats?.$id,
      image_url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Jumbo Tiger Prawns (1kg)',
      description: 'Wild-caught large ocean prawns cleaned and ready for stir-fries and barbecue.',
      price: 11000,
      discountPrice: 9900,
      stock: 15,
      categoryId: 'Meat & Seafood',
      sellerId: primeMeats?.$id,
      image_url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Fresh Organic Spinach & Kale Mix (400g)',
      description: 'Crisp, washed organic leafy greens packed with vitamins A, C, and iron.',
      price: 1600,
      discountPrice: 1400,
      stock: 35,
      categoryId: 'Fruits & Vegetables',
      sellerId: greenValley?.$id,
      image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop&q=80',
    },
    {
      name: 'Artisanal Butter Croissants (Pack of 4)',
      description: 'Flaky, buttery French-style breakfast pastries freshly baked each morning.',
      price: 2800,
      discountPrice: 2500,
      stock: 30,
      categoryId: 'Bakery & Bread',
      sellerId: dailySuper?.$id,
      image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80',
    }
  ];

  for (const p of EXTRA_PRODUCTS) {
    const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/products/documents`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          discountPrice: p.discountPrice,
          stock: p.stock,
          categoryId: p.categoryId,
          sellerId: p.sellerId,
          image_url: p.image_url,
          isActive: true,
        }
      })
    });
    const resJson = await res.json();
    if (res.ok) {
      console.log(`+ Added extra product: "${p.name}"`);
    } else {
      console.warn(`- Failed to add "${p.name}":`, resJson.message);
    }
  }

  console.log('Finished adding extra store products!');
}

addExtraProducts();
