/**
 * offlineFetch — wraps fetch with automatic localStorage cache fallback.
 *
 * On network failure (offline / timeout / server error):
 *   → returns the last cached response for that URL, ignoring TTL
 *   → shows a subtle "Offline — showing cached data" toast once per session
 *
 * On success:
 *   → stores the response body in localStorage under key `ofcache:{url}`
 *   → returns the fresh response normally
 *
 * Usage: drop-in replacement for fetch() on GET API calls.
 *   const data = await offlineFetch(url, { headers })
 */

import { toast } from 'sonner';

const PREFIX = 'ofcache:';
let _offlineToastShown = false;

function cacheKey(url: string) {
  // Strip query params that change per request (like pagination offsets)
  // but keep profile-scoped params so different profiles don't share cache
  return PREFIX + url;
}

function readCache(url: string): any | null {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writeCache(url: string, data: any) {
  try {
    localStorage.setItem(cacheKey(url), JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

function showOfflineToast() {
  if (_offlineToastShown) return;
  _offlineToastShown = true;
  toast('📶 Offline — showing cached data', {
    duration: 3000,
    style: { fontSize: 13 },
  });
  // Reset after 30s so it can show again if they go offline again
  setTimeout(() => { _offlineToastShown = false; }, 30000);
}

export async function offlineFetch(
  url: string,
  options?: RequestInit,
): Promise<any> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);

    const res = await fetch(url, {
      ...options,
      signal: options?.signal ?? ctrl.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Server error — try cache
      const cached = readCache(url);
      if (cached !== null) { showOfflineToast(); return cached; }
      // No cache — return the error response so callers can handle it
      return res.json();
    }

    const data = await res.json();
    // Only cache successful array/object responses
    if (data && !data.error) writeCache(url, data);
    return data;

  } catch {
    // Network error (offline, DNS failure, timeout)
    const cached = readCache(url);
    if (cached !== null) {
      showOfflineToast();
      return cached;
    }
    // Nothing cached — re-throw so the page can show an error state
    throw new Error('No internet connection and no cached data available.');
  }
}

/** Clear all offline cache entries (call on sign-out) */
export function clearOfflineCache() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
