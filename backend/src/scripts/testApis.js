async function testAllApis() {
  const endpoints = [
    '/api/health',
    '/api/buses',
    '/api/routes',
    '/api/routes/search?from=City%20Center&to=University',
    '/api/stops',
    '/api/trips',
    '/api/alerts',
    '/api/analytics/overview',
    '/api/analytics/delays/trend',
    '/api/analytics/peak-hours',
  ];

  console.log('Testing TransitIQ REST Endpoints...');
  let passCount = 0;

  for (const ep of endpoints) {
    try {
      const res = await fetch('http://localhost:5000' + ep);
      const json = await res.json();
      if (res.status === 200) {
        passCount++;
        console.log(`[PASS] ${ep} - Status: ${res.status} | Data Items: ${Array.isArray(json.data) ? json.data.length : typeof json.data}`);
      } else {
        console.warn(`[WARN] ${ep} - Status: ${res.status}`);
      }
    } catch (err) {
      console.error(`[FAIL] ${ep} - Error: ${err.message}`);
    }
  }

  console.log(`\nSummary: ${passCount}/${endpoints.length} endpoints successfully validated.`);
  process.exit(passCount === endpoints.length ? 0 : 1);
}

testAllApis();
