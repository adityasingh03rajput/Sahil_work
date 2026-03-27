const CACHE = 'bv-v4';
const API_CACHE = 'bv-api-v4';
const TILE_CACHE = 'bv-tiles-v1';
const TILE_MAX = 500; // max tiles to store (~10MB)

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== API_CACHE && k !== TILE_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.hostname.includes('mongodb')) return;
  if (url.hostname.includes('nominatim')) return;
  if (url.hostname.includes('googleapis')) return;
  if (url.hostname.includes('gstatic.com')) return;
  if (url.hostname.includes('google.com')) return;

  // ── Map tiles — cache first, long TTL (tiles rarely change) ──────────────
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('tiles.stadiamaps.com') ||
      url.hostname.includes('tile.thunderforest.com') ||
      (url.hostname.includes('basemaps.cartocdn.com'))) {
    e.respondWith(
      caches.open(TILE_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) {
            // Evict oldest tiles if over limit
            const keys = await cache.keys();
            if (keys.length >= TILE_MAX) {
              await cache.delete(keys[0]);
            }
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // ── Hashed assets — cache first forever ──────────────────────────────────
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            // Clone BEFORE consuming — fixes "body already used" error
            caches.open(CACHE).then(c => c.put(request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── API calls — stale-while-revalidate, serve stale on offline ──────────
  const isApiCall = url.pathname.startsWith('/customers') ||
    url.pathname.startsWith('/suppliers') ||
    url.pathname.startsWith('/items') ||
    url.pathname.startsWith('/documents') ||
    url.pathname.startsWith('/analytics') ||
    url.pathname.startsWith('/employees') ||
    url.pathname.startsWith('/attendance') ||
    url.pathname.startsWith('/profiles') ||
    url.pathname.startsWith('/extra-expenses') ||
    url.pathname.startsWith('/bank-transactions') ||
    url.pathname.startsWith('/payments') ||
    url.pathname.startsWith('/reports') ||
    url.pathname.startsWith('/ledger') ||
    url.pathname.startsWith('/projects') ||
    url.pathname.startsWith('/subscription') ||
    url.pathname.startsWith('/auth/license');

  if (isApiCall) {
    e.respondWith(
      caches.open(API_CACHE).then(async cache => {
        const cached = await cache.match(request);

        // Try network — update cache on success
        const networkPromise = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => null); // null = offline

        // If we have a cached response, serve it immediately and revalidate in background
        if (cached) {
          networkPromise.catch(() => {}); // fire-and-forget background update
          return cached;
        }

        // No cache — wait for network, fall back to 503 if offline
        const netRes = await networkPromise;
        if (netRes) return netRes;
        return new Response(JSON.stringify({ error: 'offline', cached: false }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // ── HTML navigation — network first ──────────────────────────────────────
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            // Clone BEFORE consuming
            caches.open(CACHE).then(c => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request).then(c => c || caches.match('/')))
    );
    return;
  }
});
