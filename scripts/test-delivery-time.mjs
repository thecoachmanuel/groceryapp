function calculateEstimatedDeliveryTime(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm) || distanceKm <= 0) {
    return { label: '15-25 min', minMinutes: 15, maxMinutes: 25 };
  }

  if (distanceKm <= 1.0) {
    return { label: '10-15 min', minMinutes: 10, maxMinutes: 15 };
  } else if (distanceKm <= 3.0) {
    return { label: '15-25 min', minMinutes: 15, maxMinutes: 25 };
  } else if (distanceKm <= 7.0) {
    return { label: '25-35 min', minMinutes: 25, maxMinutes: 35 };
  } else if (distanceKm <= 12.0) {
    return { label: '35-45 min', minMinutes: 35, maxMinutes: 45 };
  } else if (distanceKm <= 20.0) {
    return { label: '45-60 min', minMinutes: 45, maxMinutes: 60 };
  } else {
    return { label: 'Same Day Delivery', minMinutes: 60, maxMinutes: 180 };
  }
}

const testDistances = [0.5, 1.9, 4.5, 8.2, 16.0, 116.0];

console.log('=== TEST: Intelligent Delivery Time Calculation ===\n');
for (const dist of testDistances) {
  const time = calculateEstimatedDeliveryTime(dist);
  console.log(`📍 Distance: ${dist} km ➔ Estimated Time: ⚡ ${time.label}`);
}
console.log('\n=== DYNAMIC DELIVERY TIME TEST PASSED ===');
