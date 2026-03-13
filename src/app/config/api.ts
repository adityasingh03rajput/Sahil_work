const DEFAULT_API_URL = 'https://accounts-8rx9.onrender.com';

const metaEnv = (import.meta as any)?.env as { [k: string]: any } | undefined;
const raw = metaEnv?.VITE_API_URL as string | undefined;

const API_URL_OVERRIDE_KEY = 'apiUrlOverride';

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
    return DEFAULT_API_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_API_URL;

  // Prevent accidental relative values like "/" or "/api" which would hit the Vite origin.
  if (trimmed.startsWith('/')) return DEFAULT_API_URL;

  // Accept only absolute http(s) URLs.
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return u.origin;
    }
    return DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
};

export const getApiUrlOverride = () => {
  try {
    if (typeof window === 'undefined') return '';
    return String(window.localStorage.getItem(API_URL_OVERRIDE_KEY) || '').trim();
  } catch {
    return '';
  }
};

export const setApiUrlOverride = (value: string) => {
  const normalized = normalizeApiUrl(value);
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(API_URL_OVERRIDE_KEY, normalized);
  } catch {
    // ignore
  }
  return normalized;
};

export const clearApiUrlOverride = () => {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(API_URL_OVERRIDE_KEY);
  } catch {
    // ignore
  }
};

export const resolveApiUrl = () => {
  const override = getApiUrlOverride();
  if (override) return normalizeApiUrl(override);
  return normalizeApiUrl(raw);
};

export const API_URL = resolveApiUrl();
