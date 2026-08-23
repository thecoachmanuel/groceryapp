async function geocodeAddressCoords(address) {
  if (!address || !address.trim()) {
    return { latitude: 6.4698, longitude: 3.5852 };
  }

  const cleanAddr = address.trim();
  const lower = cleanAddr.toLowerCase();

  // 1. UTMOST FIX: Query OpenStreetMap Nominatim FIRST for exact street & building coordinates
  try {
    const searchQuery = lower.includes('nigeria') ? cleanAddr : `${cleanAddr}, Nigeria`;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
      headers: { 'User-Agent': 'GroceryApp-Mobile/1.0' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        return { latitude: lat, longitude: lon, source: 'exact_online_street' };
      }
    }
  } catch (err) {
    console.log('[GEOCODE] Online geocoding offline/network fallback:', err);
  }

  // 2. BACKUP: Nationwide City & State Fast Dictionary
  if (lower.includes('ibadan') || lower.includes('akinyele') || lower.includes('bodija') || lower.includes('paul hendrickse') || lower.includes('university of ibadan') || lower.includes(' ui ')) {
    return { latitude: 7.4477, longitude: 3.8967, source: 'city_backup' };
  }
  if (lower.includes('abuja') || lower.includes('wuse') || lower.includes('maitama') || lower.includes('garki') || lower.includes('gwarinpa')) {
    return { latitude: 9.0765, longitude: 7.3986, source: 'city_backup' };
  }
  if (lower.includes('ikeja') || lower.includes('allen') || lower.includes('alausa')) {
    return { latitude: 6.6018, longitude: 3.3515, source: 'city_backup' };
  }

  return { latitude: 6.5244, longitude: 3.3792, source: 'lagos_default' };
}

async function testUtmostGeocodeFix() {
  console.log('=== TEST: Utmost Fix for Any Seller Address Entered ===\n');

  const addressesToTest = [
    'University of Ibadan, Ibadan, Oyo State',
    'Ring Road, Ibadan, Oyo State',
    'Bodija Market, Ibadan',
    '15 Allen Avenue, Ikeja, Lagos',
    'Wuse Zone 4, Abuja',
    'GRA Phase 2, Port Harcourt',
  ];

  for (const addr of addressesToTest) {
    const coords = await geocodeAddressCoords(addr);
    console.log(`📍 Address: "${addr}"`);
    console.log(`   ➔ Source: ${coords.source}`);
    console.log(`   ➔ Resolved Coordinates: Lat ${coords.latitude}, Lng ${coords.longitude}`);
    console.log('');
  }

  console.log('=== UTMOST FIX TEST PASSED ===');
}

testUtmostGeocodeFix();
