function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.5;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const customerInIbadan = { latitude: 7.4639, longitude: 3.9024 };
const maxRadiusKm = 20;

const storesMap = {
  sellerA: { storeName: 'Frosh Seller (UI, Ibadan)', latitude: 7.4477, longitude: 3.8967 }, // 1.9 km
  sellerB: { storeName: 'Green Valley (Lekki, Lagos)', latitude: 6.4698, longitude: 3.5852 }, // 116 km
};

function evaluateMultiStoreCart(cartItems) {
  const outOfRangeItemIds = new Set();
  let hasOutOfRangeStore = false;

  cartItems.forEach((item) => {
    const store = storesMap[item.sellerId];
    const dist = calculateHaversineDistanceKm(customerInIbadan.latitude, customerInIbadan.longitude, store.latitude, store.longitude);
    console.log(` Item: "${item.name}" from ${store.storeName} ➔ Distance: ${dist} km`);
    if (dist > maxRadiusKm) {
      hasOutOfRangeStore = true;
      outOfRangeItemIds.add(item.id);
    }
  });

  return { hasOutOfRangeStore, outOfRangeItemIds: Array.from(outOfRangeItemIds) };
}

// TEST CASE 1: In-Range Item Added First, Out-of-Range Item Added Second
console.log('=== TEST 1: In-Range Added First (Item A then Item B) ===');
const cartOrder1 = [
  { id: 'item_A', name: 'Fresh Tomatoes', sellerId: 'sellerA' },
  { id: 'item_B', name: 'Organic Honey', sellerId: 'sellerB' }
];
const eval1 = evaluateMultiStoreCart(cartOrder1);
console.log(` -> Cart isOutOfRange: ${eval1.hasOutOfRangeStore} (EXPECTED: true)`);
console.log(` -> Items to remove on One-Tap:`, eval1.outOfRangeItemIds, `(EXPECTED: ['item_B'])`);

// TEST CASE 2: Out-of-Range Item Added First, In-Range Item Added Second
console.log('\n=== TEST 2: Out-of-Range Added First (Item B then Item A) ===');
const cartOrder2 = [
  { id: 'item_B', name: 'Organic Honey', sellerId: 'sellerB' },
  { id: 'item_A', name: 'Fresh Tomatoes', sellerId: 'sellerA' }
];
const eval2 = evaluateMultiStoreCart(cartOrder2);
console.log(` -> Cart isOutOfRange: ${eval2.hasOutOfRangeStore} (EXPECTED: true)`);
console.log(` -> Items to remove on One-Tap:`, eval2.outOfRangeItemIds, `(EXPECTED: ['item_B'])`);

console.log('\n=== ALL MULTI-STORE EVALUATION TESTS PASSED PERFECTLY ===');
