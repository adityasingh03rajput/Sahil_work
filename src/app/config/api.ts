const DEFAULT_API_URL = 'https://accounts-8rx9.onrender.com';

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
      return u.origin;
    }
    return DEFAULT_API_URL;
  } catch {
    return import.meta.env.PROD ? getSameOrigin() : DEFAULT_API_URL;
  }
};

export const API_URL = normalizeApiUrl(raw);
