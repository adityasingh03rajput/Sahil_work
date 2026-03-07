const DEFAULT_API_URL = 'http://localhost:4000';

const raw = import.meta.env.VITE_API_URL;

const getSameOrigin = () => {
  try {
    if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  } catch {
    // ignore
  }
  return DEFAULT_API_URL;
};

const normalizeApiUrl = (value?: string) => {
  if (!value) {
    return import.meta.env.PROD ? getSameOrigin() : DEFAULT_API_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) return import.meta.env.PROD ? getSameOrigin() : DEFAULT_API_URL;

  // Prevent accidental relative values like "/" or "/api" which would hit the Vite origin.
  if (trimmed.startsWith('/')) return import.meta.env.PROD ? getSameOrigin() : DEFAULT_API_URL;

  // Accept only absolute http(s) URLs.
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      // In local dev, protect against stale env vars pointing to another machine on LAN.
      // If you are opening the frontend on localhost, but VITE_API_URL is set to a different host,
      // requests will time out (e.g. 192.168.x.x). In that case, fall back to localhost backend.
      if (!import.meta.env.PROD) {
        const pageHost = (() => {
          try {
            return typeof window !== 'undefined' ? window.location.hostname : '';
          } catch {
            return '';
          }
        })();

        const allowedHosts = new Set(['localhost', '127.0.0.1', pageHost].filter(Boolean));
        if (!allowedHosts.has(u.hostname)) return DEFAULT_API_URL;
      }

      return u.origin;
    }
    return DEFAULT_API_URL;
  } catch {
    return import.meta.env.PROD ? getSameOrigin() : DEFAULT_API_URL;
  }
};

export const API_URL = normalizeApiUrl(raw);
