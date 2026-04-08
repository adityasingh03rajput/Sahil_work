/**
 * animateMarker — smooth interpolation between two lat/lng points
 * for Google Maps markers, Zomato-style.
 *
 * Usage:
 *   animateMarker(marker, { lat: 0, lng: 0 }, { lat: 0.001, lng: 0.001 }, 2000)
 *
 * Dead reckoning:
 *   predictNext(last, speedMs, headingRad, deltaMs) → { lat, lng }
 *
 * DigiPin:
 *   encodeDigiPin(lat, lng) → "IN-XXXXX-XXXXX"
 */

const DIGIPIN_CHARS = "23456789CJKLMPFT";

export interface LatLng { lat: number; lng: number }

/**
 * Smoothly moves a Google Maps marker from `start` → `end` over `durationMs`.
 * Returns a cancel function — call it to abort mid-animation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function animateMarker(
  marker: any,
  start: LatLng,
  end: LatLng,
  durationMs = 2000,
): () => void {
  let rafId: number | null = null;
  const startTime = performance.now();

  function frame(now: number) {
    const progress = Math.min((now - startTime) / durationMs, 1);
    // Ease-in-out for natural feel
    const ease = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    const lat = start.lat + (end.lat - start.lat) * ease;
    const lng = start.lng + (end.lng - start.lng) * ease;
    marker.setPosition({ lat, lng });

    if (progress < 1) rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
  return () => { if (rafId) cancelAnimationFrame(rafId); };
}

/**
 * Dead reckoning — extrapolate position when no update arrives (< 10s)
 * speedMs   : metres per millisecond
 * headingRad: direction of travel in radians (0 = North, clockwise)
 * deltaMs   : time since last known point
 */
export function predictNext(
  last: LatLng,
  speedMs: number,
  headingRad: number,
  deltaMs: number,
): LatLng {
  const dist = speedMs * deltaMs;        // metres travelled
  const R    = 6371000;                  // Earth radius m
  const dLat = (dist * Math.cos(headingRad)) / R;
  const dLng = (dist * Math.sin(headingRad)) / (R * Math.cos((last.lat * Math.PI) / 180));
  return {
    lat: last.lat + (dLat * 180) / Math.PI,
    lng: last.lng + (dLng * 180) / Math.PI,
  };
}

/**
 * Compute bearing in radians between two lat/lng points.
 * Used to feed `headingRad` into predictNext().
 */
export function bearing(from: LatLng, to: LatLng): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat  * Math.PI) / 180;
  const dλ = ((to.lng - from.lng) * Math.PI) / 180;
  return Math.atan2(
    Math.sin(dλ) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ),
  );
}

/**
 * encodeDigiPin — Indian national digital address system (10 chars, 4x4m grid)
 */
export function encodeDigiPin(lat: number, lng: number): string {
  // India's bounding box for DigiPin
  const MIN_LAT = 2.5; 
  const MAX_LAT = 38.5;
  const MIN_LNG = 63.5;
  const MAX_LNG = 99.5;

  if (lat < MIN_LAT || lat > MAX_LAT || lng < MIN_LNG || lng > MAX_LNG) {
    return "GLOBAL";
  }

  let code = "";
  let curMinLat = MIN_LAT, curMaxLat = MAX_LAT;
  let curMinLng = MIN_LNG, curMaxLng = MAX_LNG;

  for (let i = 0; i < 10; i++) {
    const latStep = (curMaxLat - curMinLat) / 4;
    const lngStep = (curMaxLng - curMinLng) / 4;

    // Row 0 is Top (North), Row 3 is Bottom (South)
    let row = Math.floor((curMaxLat - lat) / latStep);
    if (row < 0) row = 0; if (row > 3) row = 3;

    // Col 0 is Left (West), Col 3 is Right (East)
    let col = Math.floor((lng - curMinLng) / lngStep);
    if (col < 0) col = 0; if (col > 3) col = 3;

    const index = row * 4 + col;
    code += DIGIPIN_CHARS[index];

    // Narrow bounds for next level
    curMaxLat = curMaxLat - row * latStep;
    curMinLat = curMaxLat - latStep;
    curMinLng = curMinLng + col * lngStep;
    curMaxLng = curMinLng + lngStep;

    if (i === 4) code += "-"; // Formatting break
  }

  return code;
}
