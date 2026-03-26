const CACHE = 'bv-v3';
const API_CACHE = 'bv-api-v3';

// Install — cache shell immediately
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== API_CACHE).map(k => caches.delete(k)))
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

  // ── Hashed assets — cache first forever (content-addressed) ──────────────
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // ── API calls — stale-while-revalidate (show cached, refresh in background) ─
  const isApiCall = url.pathname.startsWith('/customers') ||
    url.pathname.startsWith('/suppliers') ||
    url.pathname.startsWith('/items') ||
    url.pathname.startsWith('/documents') ||
    url.pathname.startsWith('/analytics') ||
    url.pathname.startsWith('/employees') ||
    url.pathname.startsWith('/attendance');

  if (isApiCall) {
    e.respondWith(
      caches.open(API_CACHE).then(async cache => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached); // fallback to cache on network error

        // Return cached immediately, revalidate in background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── HTML navigation — network first, fallback to cached shell ────────────
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then(c => c || caches.match('/')))
    );
    return;
  }
});
