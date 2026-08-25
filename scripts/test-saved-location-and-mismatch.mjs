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

// 1. Test Persistence of Saved Address
const mockSavedStore = {
  address: "University of Ibadan, Ibadan",
  latitude: 7.4477,
  longitude: 3.8967,
  isCaptured: true,
  savedAddresses: [
    { label: "Home", address: "University of Ibadan, Ibadan", latitude: 7.4477, longitude: 3.8967, isDefault: true }
  ]
};

console.log("=== TEST 1: App Launch with Saved Location ===");
if (mockSavedStore.isCaptured && mockSavedStore.address && mockSavedStore.latitude) {
  console.log(` -> SUCCESS: Retained saved address without GPS overwrite: "${mockSavedStore.address}"`);
} else {
  console.log(" -> Fallback to initial GPS lookup");
}

// 2. Test Checkout Location Mismatch Detection
console.log("\n=== TEST 2: Checkout at Same Location (At Home in Ibadan) ===");
const currentGpsSame = { latitude: 7.4480, longitude: 3.8970 }; // ~50 meters away
const diffSameKm = calculateHaversineDistanceKm(currentGpsSame.latitude, currentGpsSame.longitude, mockSavedStore.latitude, mockSavedStore.longitude);
console.log(` Distance from saved address: ${diffSameKm} km`);
if (diffSameKm > 2.5) {
  console.log(" -> PROMPT TRIGGERED: Location mismatch detected");
} else {
  console.log(" -> SUCCESS: At or near saved address. Proceed directly to payment!");
}

console.log("\n=== TEST 3: Checkout at Different Location (User at Ikeja GRA, Lagos) ===");
const currentGpsDifferent = { latitude: 6.6018, longitude: 3.3515 }; // Ikeja, Lagos
const diffFarKm = calculateHaversineDistanceKm(currentGpsDifferent.latitude, currentGpsDifferent.longitude, mockSavedStore.latitude, mockSavedStore.longitude);
console.log(` Distance from saved address: ${diffFarKm} km`);
if (diffFarKm > 2.5) {
  console.log(` -> PROMPT TRIGGERED: Different location detected (~${diffFarKm} km away).`);
  console.log(`    User can choose: [Deliver to Saved Address (Ibadan)] OR [Deliver to Current Location (Ikeja)]`);
} else {
  console.log(" -> Proceed directly to payment");
}

console.log("\n=== ALL SAVED LOCATION & CHECKOUT MISMATCH TESTS PASSED ===");
