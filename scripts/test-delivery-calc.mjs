function calculateDynamicDeliveryFee(totalItems, subtotal, settings) {
  // 1. Free Delivery check
  if (settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold) {
    return {
      baseFee: settings.deliveryFee,
      incrementalFee: 0,
      totalDeliveryFee: 0,
      isFree: true,
      breakdownText: 'FREE Delivery (High-value order offer 🎉)',
    };
  }

  const baseFee = Math.max(0, Number(settings.deliveryFee || 0));
  const baseCoverage = Math.max(0, Number(settings.baseCoverageThreshold !== undefined ? settings.baseCoverageThreshold : 10000));

  // 2. Base Coverage: Covers any order up to baseCoverageThreshold (e.g. ₦10,000)
  if (baseCoverage > 0 && subtotal <= baseCoverage) {
    return {
      baseFee,
      incrementalFee: 0,
      totalDeliveryFee: baseFee,
      isFree: false,
      breakdownText: `Base ₦${baseFee.toLocaleString()} (Covers orders up to ₦${baseCoverage.toLocaleString()})`,
    };
  }

  // 3. Excess Calculation for orders above baseCoverageThreshold
  const excessAmount = Math.max(0, subtotal - baseCoverage);
  let incrementalFee = 0;
  let breakdownText = `Base ₦${baseFee.toLocaleString()} (Up to ₦${baseCoverage.toLocaleString()})`;

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
    // per_item
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
    breakdownText,
  };
}

const defaultAdminSettings = {
  deliveryFee: 1000,
  baseCoverageThreshold: 10000,
  feePerItem: 200,
  deliveryIncrementType: 'amount_step',
  deliveryIncrementRate: 2,
  deliveryIncrementStep: 5000,
  maxDeliveryFee: 5000,
  freeDeliveryThreshold: 0,
};

console.log('--- TEST 1: Order of ₦3,500 (Within ₦10,000 base coverage) ---');
console.log(calculateDynamicDeliveryFee(2, 3500, defaultAdminSettings));

console.log('\n--- TEST 2: Order of exactly ₦10,000 (Within ₦10,000 base coverage) ---');
console.log(calculateDynamicDeliveryFee(4, 10000, defaultAdminSettings));

console.log('\n--- TEST 3: Order of ₦14,000 (₦4,000 excess above ₦10,000) ---');
console.log(calculateDynamicDeliveryFee(6, 14000, defaultAdminSettings));

console.log('\n--- TEST 4: Order of ₦22,000 (₦12,000 excess = 3 tiers of ₦5,000) ---');
console.log(calculateDynamicDeliveryFee(8, 22000, defaultAdminSettings));

const updatedAdminSettings = {
  ...defaultAdminSettings,
  deliveryFee: 1500, // Admin adjusted base price
  baseCoverageThreshold: 15000, // Admin adjusted base coverage
};

console.log('\n--- TEST 5: Admin adjusted base price to ₦1,500 and base coverage to ₦15,000 on ₦14,000 order ---');
console.log(calculateDynamicDeliveryFee(5, 14000, updatedAdminSettings));
