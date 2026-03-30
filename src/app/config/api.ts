const DEFAULT_API_URL = 'http://localhost:4000';

const metaEnv = (import.meta as any)?.env as { [k: string]: any } | undefined;
const raw = metaEnv?.VITE_API_URL as string | undefined;

const API_URL_OVERRIDE_KEY = 'apiUrlOverride';

const normalizeApiUrl = (value?: string): string => {
  if (!value?.trim()) return DEFAULT_API_URL;
  const trimmed = value.trim();
  if (trimmed.startsWith('/')) return DEFAULT_API_URL;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin;
  } catch { /* ignore */ }
  return DEFAULT_API_URL;
};

const staticApiUrl = normalizeApiUrl(raw);

export const getApiUrlOverride = (): string => {
  try {
    return String(window.localStorage.getItem(API_URL_OVERRIDE_KEY) || '').trim();
  } catch { return ''; }
};

export const setApiUrlOverride = (value: string): string => {
  const normalized = normalizeApiUrl(value);
  try { window.localStorage.setItem(API_URL_OVERRIDE_KEY, normalized); } catch { /* ignore */ }
  return normalized;
};

export const clearApiUrlOverride = (): void => {
  try { window.localStorage.removeItem(API_URL_OVERRIDE_KEY); } catch { /* ignore */ }
};

// Get the effective API URL factoring in an optional local override
export const getApiUrl = (): string => {
  const override = getApiUrlOverride();
  return override && override.trim() ? override : staticApiUrl;
};

export const API_URL = getApiUrl();

export const ADMIN_API_URL = API_URL;
