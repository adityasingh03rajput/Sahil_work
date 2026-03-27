import { Router } from 'express';

export const geocodeRouter = Router();

// LRU cache for coordinates to address
const locationCache = new Map();
const CACHE_LIMIT = 5000;

function cleanCache() {
  if (locationCache.size > CACHE_LIMIT) {
    // Evict oldest 1000 items
    const keys = Array.from(locationCache.keys()).slice(0, 1000);
    keys.forEach(k => locationCache.delete(k));
  }
}

/**
 * GET /geocode?lat=XX&lng=YY
 * Reverse geocoding proxy with aggressive caching.
 * Prioritizes Nominatim (OpenStreetMap) to stay 100% free,
 * falling back gracefully if rate-limited.
 */
geocodeRouter.get('/', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    // Round to ~100m precision for caching hit-rate
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const key = `${latNum.toFixed(3)},${lngNum.toFixed(3)}`;

    if (locationCache.has(key)) {
      return res.json({ address: locationCache.get(key), fromCache: true });
    }

    cleanCache();

    // Primary: Nominatim (Free)
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lngNum}&format=json&zoom=16`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BillVyapar-Tracking/1.0' },
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      const a = data.address || {};
      const parts = [
        a.road || a.pedestrian || a.footway,
        a.suburb || a.neighbourhood || a.village || a.town,
        a.city || a.county,
        a.state,
      ].filter(Boolean);
      
      const address = parts.length ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(', ') ?? 'Unknown Area');
      
      locationCache.set(key, address);
      return res.json({ address, fromCache: false, source: 'nominatim' });
    }

    // Fallback if Nominatim fails
    return res.json({ address: 'Unknown Location', fromCache: false, error: 'Rate limited' });
  } catch (err) {
    res.json({ address: 'Unknown Location', fromCache: false, error: err.message });
  }
});
