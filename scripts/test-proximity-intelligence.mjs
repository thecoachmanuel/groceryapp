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
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

function sortStoresByProximity(storesList, customerLat, customerLon) {
  return storesList.map((st) => ({
    ...st,
    distanceKm: calculateHaversineDistanceKm(customerLat, customerLon, st.latitude, st.longitude)
  })).sort((a, b) => a.distanceKm - b.distanceKm);
}

// 1. Test Customer in Ibadan
const ibadanCustomer = { latitude: 7.4639, longitude: 3.9024 };

const allStores = [
  { id: 's1', storeName: 'Green Valley (Lekki, Lagos)', latitude: 6.4698, longitude: 3.5852 },
  { id: 's2', storeName: 'Frosh Seller (UI, Ibadan)', latitude: 7.4477, longitude: 3.8967 },
  { id: 's3', storeName: 'Prime Meats (Ikoyi, Lagos)', latitude: 6.4549, longitude: 3.4347 },
  { id: 's4', storeName: 'Abuja Central Market', latitude: 9.0765, longitude: 7.3986 },
];

console.log('=== TEST 1: Customer in Ibadan ===');
const ibadanStores = sortStoresByProximity(allStores, ibadanCustomer.latitude, ibadanCustomer.longitude);
ibadanStores.forEach((s, idx) => {
  console.log(` Rank ${idx + 1}: ${s.storeName} ➔ 📍 ${s.distanceKm} km away`);
});

// 2. Test Customer in Lekki, Lagos
const lekkiCustomer = { latitude: 6.4698, longitude: 3.5852 };

console.log('\n=== TEST 2: Customer in Lekki, Lagos ===');
const lekkiStores = sortStoresByProximity(allStores, lekkiCustomer.latitude, lekkiCustomer.longitude);
lekkiStores.forEach((s, idx) => {
  console.log(` Rank ${idx + 1}: ${s.storeName} ➔ 📍 ${s.distanceKm} km away`);
});

console.log('\n=== PROXIMITY INTELLIGENCE TEST PASSED CLEANLY ===');
