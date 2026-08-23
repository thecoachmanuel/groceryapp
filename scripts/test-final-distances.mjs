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

const customerLekki = { latitude: 6.4698, longitude: 3.5852 };

const stores = [
  { name: 'Green Valley Organic Market (Lekki)', latitude: 6.4698, longitude: 3.5852 },
  { name: 'Daily Supermarket & Bakery (Lekki)', latitude: 6.4698, longitude: 3.5852 },
  { name: 'Prime Meats & Seafood Depot (Ikoyi)', latitude: 6.4549, longitude: 3.4347 },
  { name: 'Frosh seller (Ikeja)', latitude: 6.6018, longitude: 3.3515 },
];

console.log('--- TEST: Calculated Delivery Distances for Customer in Lekki ---');
for (const s of stores) {
  const d = calculateHaversineDistanceKm(customerLekki.latitude, customerLekki.longitude, s.latitude, s.longitude);
  console.log(`📍 Customer ➔ ${s.name}: ${d} km`);
}
console.log('--- ALL DISTANCES ARE LOCAL LAGOS DISTANCES ---');
