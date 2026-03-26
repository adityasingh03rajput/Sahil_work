const DEFAULT_API_URL = 'https://billvyapar-backend.fly.dev';

const metaEnv = (import.meta as any)?.env as { [k: string]: any } | undefined;
const raw = metaEnv?.VITE_API_URL as string | undefined;

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

// Single source of truth — reads from VITE_API_URL env var, falls back to default
export const API_URL = normalizeApiUrl(raw);

// Admin panel uses the same URL
export const ADMIN_API_URL = API_URL;
