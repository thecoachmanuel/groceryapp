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

function calculateDynamicDeliveryFee(totalItems, subtotal, settings, options) {
  if (settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold) {
    return {
      baseFee: settings.deliveryFee,
      incrementalFee: 0,
      totalDeliveryFee: 0,
      isFree: true,
      distanceKm: 0,
      isOutOfRange: false,
      breakdownText: 'FREE Delivery (High-value order offer 🎉)',
    };
  }

  let distanceKm = options?.distanceKm;
  if (distanceKm === undefined && options?.userLocation && options?.storeLocation) {
    distanceKm = calculateHaversineDistanceKm(
      options.userLocation.latitude,
      options.userLocation.longitude,
      options.storeLocation.latitude,
      options.storeLocation.longitude
    );
  }
  if (distanceKm === undefined) {
    distanceKm = 2.5;
  }

  const isDistanceMode = settings.deliveryPricingMode === 'distance';
  let baseFee = Math.max(0, Number(settings.deliveryFee || 0));
  let tierLabel = 'Standard';
  let isOutOfRange = false;

  if (isDistanceMode) {
    const distBase = Number(settings.distanceBaseRate || 800);
    const distMid = Number(settings.distanceMidRate || 1200);
    const distFar = Number(settings.distanceFarRate || 1800);
    const perKm = Number(settings.distancePerKmRate || 150);
    const maxRadius = Number(settings.maxDeliveryRadiusKm || 20);

    if (maxRadius > 0 && distanceKm > maxRadius) {
      isOutOfRange = true;
    }

    if (distanceKm <= 3) {
      baseFee = distBase;
      tierLabel = `Zone 1 (0–3 km: ${distanceKm} km)`;
    } else if (distanceKm <= 7) {
      baseFee = distMid;
      tierLabel = `Zone 2 (3–7 km: ${distanceKm} km)`;
    } else if (distanceKm <= 12) {
      baseFee = distFar;
      tierLabel = `Zone 3 (7–12 km: ${distanceKm} km)`;
    } else {
      const extraKm = Math.ceil(distanceKm - 12);
      baseFee = distFar + extraKm * perKm;
      tierLabel = `Zone 4 (${distanceKm} km)`;
    }
  }

  const baseCoverage = Math.max(0, Number(settings.baseCoverageThreshold !== undefined ? settings.baseCoverageThreshold : 10000));

  if (baseCoverage > 0 && subtotal <= baseCoverage) {
    return {
      baseFee,
      incrementalFee: 0,
      totalDeliveryFee: baseFee,
      isFree: false,
      distanceKm,
      isOutOfRange,
      breakdownText: `${isDistanceMode ? tierLabel : 'Base'} ₦${baseFee.toLocaleString()} (Covers orders up to ₦${baseCoverage.toLocaleString()})`,
    };
  }

  const excessAmount = Math.max(0, subtotal - baseCoverage);
  let incrementalFee = 0;
  let breakdownText = `${isDistanceMode ? tierLabel : 'Base'} ₦${baseFee.toLocaleString()} (Up to ₦${baseCoverage.toLocaleString()})`;

  if (settings.deliveryIncrementType === 'amount_percent') {
    const rate = Number(settings.deliveryIncrementRate || 0);
    incrementalFee = Math.round(excessAmount * (rate / 100));
    if (rate > 0) {
      breakdownText += ` + (${rate}% on ₦${excessAmount.toLocaleString()} over ₦${baseCoverage.toLocaleString()})`;
    }
  } else if (settings.deliveryIncrementType === 'amount_step') {
    const step = Math.max(1, Number(settings.deliveryIncrementStep || 5000));
    const perStep = Number(settings.feePerItem || 200);
    const stepCount = Math.ceil(excessAmount / step);
    incrementalFee = stepCount * perStep;
    if (stepCount > 0 && perStep > 0) {
      breakdownText += ` + (${stepCount} tier × ₦${perStep.toLocaleString()} for ₦${excessAmount.toLocaleString()} over ₦${baseCoverage.toLocaleString()})`;
    }
  } else {
    const extraItems = Math.max(0, totalItems - 1);
    const perItem = Number(settings.feePerItem || 0);
    incrementalFee = extraItems * perItem;
    if (extraItems > 0 && perItem > 0) {
      breakdownText += ` + (₦${perItem.toLocaleString()} × ${extraItems} extra ${extraItems === 1 ? 'item' : 'items'})`;
    }
  }

  let total = baseFee + incrementalFee;

  if (settings.maxDeliveryFee > 0 && total > settings.maxDeliveryFee) {
    total = settings.maxDeliveryFee;
    breakdownText += ` (Capped at ₦${settings.maxDeliveryFee.toLocaleString()})`;
  }

  return {
    baseFee,
    incrementalFee,
    totalDeliveryFee: Math.max(0, total),
    isFree: false,
    distanceKm,
    isOutOfRange,
    breakdownText,
  };
}

const ikejaLat = 6.6018, ikejaLng = 3.3515;
const lekkiLat = 6.4698, lekkiLng = 3.5852;
const dist = calculateHaversineDistanceKm(ikejaLat, ikejaLng, lekkiLat, lekkiLng);

console.log(`--- Haversine Distance Ikeja to Lekki: ${dist} km ---`);

const settingsDistance = {
  deliveryPricingMode: 'distance',
  deliveryFee: 1000,
  baseCoverageThreshold: 10000,
  feePerItem: 200,
  deliveryIncrementType: 'amount_step',
  deliveryIncrementRate: 2,
  deliveryIncrementStep: 5000,
  maxDeliveryFee: 5000,
  freeDeliveryThreshold: 0,
  distanceBaseRate: 800,  // 0-3km
  distanceMidRate: 1200,  // 3-7km
  distanceFarRate: 1800,  // 7-12km
  distancePerKmRate: 150, // >12km
  maxDeliveryRadiusKm: 20,
};

console.log('\n--- TEST 1: Distance Mode - 2 km delivery, ₦8,000 subtotal ---');
console.log(calculateDynamicDeliveryFee(2, 8000, settingsDistance, { distanceKm: 2.0 }));

console.log('\n--- TEST 2: Distance Mode - 5 km delivery, ₦14,000 subtotal (₦4k excess) ---');
console.log(calculateDynamicDeliveryFee(4, 14000, settingsDistance, { distanceKm: 5.0 }));

console.log('\n--- TEST 3: Distance Mode - 15 km delivery (3 extra km @ ₦150) ---');
console.log(calculateDynamicDeliveryFee(5, 12000, settingsDistance, { distanceKm: 15.0 }));

const settingsFlat = {
  ...settingsDistance,
  deliveryPricingMode: 'flat',
  deliveryFee: 1500,
};

console.log('\n--- TEST 4: Flat Mode - ₦1,500 base fee, ₦8,000 subtotal ---');
console.log(calculateDynamicDeliveryFee(2, 8000, settingsFlat, { distanceKm: 5.0 }));
