// Test script: GSTIN lookup via gst.jamku.app (free, no API key needed)
// Usage: node src/scripts/testGstLookup.js

const GSTIN = '23BXNPJ1682A1ZR';

async function lookupGstin(gstin) {
  // Attempt 1: jamku.app public API
  console.log(`\n🔍 Looking up GSTIN: ${gstin}\n`);

  try {
    const url = `https://gst.jamku.app/api/gstin/${gstin}`;
    console.log(`Trying: ${url}`);
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('\n✅ jamku.app response:');
      console.log(JSON.stringify(json, null, 2));
      return;
    } catch {
      console.log('Raw response:', text.slice(0, 500));
    }
  } catch (e) {
    console.log('jamku.app failed:', e.message);
  }

  // Attempt 2: taxpayerapi.com (another free public endpoint)
  try {
    const url = `https://taxpayerapi.com/api/gstin/${gstin}`;
    console.log(`\nTrying: ${url}`);
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('\n✅ taxpayerapi response:');
      console.log(JSON.stringify(json, null, 2));
      return;
    } catch {
      console.log('Raw response:', text.slice(0, 500));
    }
  } catch (e) {
    console.log('taxpayerapi failed:', e.message);
  }

  // Attempt 3: gstincheck.co.in
  try {
    const url = `https://gstincheck.co.in/check/${gstin}`;
    console.log(`\nTrying: ${url}`);
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('\n✅ gstincheck response:');
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log('Raw response:', text.slice(0, 500));
    }
  } catch (e) {
    console.log('gstincheck failed:', e.message);
  }
}

lookupGstin(GSTIN);
