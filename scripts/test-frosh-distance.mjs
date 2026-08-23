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

const customerInIbadan = { latitude: 7.4639, longitude: 3.9024 }; // Customer near Akinyele / UI
const froshSeller = { latitude: 7.4477, longitude: 3.8967 };     // Frosh seller at UI

const d = calculateHaversineDistanceKm(customerInIbadan.latitude, customerInIbadan.longitude, froshSeller.latitude, froshSeller.longitude);
console.log(`📍 Distance from Customer in Ibadan to Frosh Seller (UI): ${d} km`);
