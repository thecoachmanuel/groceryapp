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

function geocodeAddressCoords(address) {
  if (!address || !address.trim()) return { latitude: 6.4698, longitude: 3.5852 };
  const lower = address.toLowerCase();
  if (lower.includes('ikeja') || lower.includes('allen')) return { latitude: 6.6018, longitude: 3.3515 };
  if (lower.includes('victoria island') || lower.includes(' vi')) return { latitude: 6.4281, longitude: 3.4219 };
  if (lower.includes('ikoyi')) return { latitude: 6.4549, longitude: 3.4347 };
  if (lower.includes('lekki')) return { latitude: 6.4698, longitude: 3.5852 };
  return { latitude: 6.4698, longitude: 3.5852 };
}

const defaultStores = [
  { id: 'store_1', address: '14 Admiralty Way, Lekki Phase 1, Lagos', latitude: 6.4698, longitude: 3.5852 }
];

function updateStoreProfile(storeId, storeData) {
  const dataToSave = { ...storeData };
  if (dataToSave.address) {
    const coords = geocodeAddressCoords(dataToSave.address);
    dataToSave.latitude = coords.latitude;
    dataToSave.longitude = coords.longitude;
  }
  const idx = defaultStores.findIndex(s => s.id === storeId);
  if (idx !== -1) {
    defaultStores[idx] = { ...defaultStores[idx], ...dataToSave };
  }
  return defaultStores[idx];
}

console.log('--- TEST: Store Address Change Re-Geocoding ---');
console.log('1. Initial Store 1 Coords:', defaultStores[0]);

const updatedStore = updateStoreProfile('store_1', { address: '8 Allen Avenue, Ikeja, Lagos' });
console.log('2. Updated Store 1 Coords:', updatedStore);

const userCoords = { latitude: 6.4281, longitude: 3.4219 }; // User in Victoria Island
const dist = calculateHaversineDistanceKm(userCoords.latitude, userCoords.longitude, updatedStore.latitude, updatedStore.longitude);
console.log(`3. Distance from VI to NEW Store Location (Ikeja): ${dist} km`);
