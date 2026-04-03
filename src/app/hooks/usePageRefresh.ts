/**
 * usePageRefresh — refreshes data when:
 * 1. User returns to the tab (visibilitychange)
 * 2. Profile changes (profileChanged event)
 * 3. Sign-in happens (appSignIn event)
 *
 * Only re-fetches if data is stale (older than staleTtlMs).
 * This replaces polling and prevents rate limit hits.
 */
import { useEffect, useRef, useCallback } from 'react';

interface UsePageRefreshOptions {
  onRefresh: () => void;
  staleTtlMs?: number; // how old data must be before re-fetching on tab focus (default 30s)
  enabled?: boolean;
}

export function usePageRefresh({ onRefresh, staleTtlMs = 30_000, enabled = true }: UsePageRefreshOptions) {
  const lastFetchRef = useRef<number>(Date.now());
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Update last fetch time whenever onRefresh is called
  const refresh = useCallback(() => {
    lastFetchRef.current = Date.now();
    onRefreshRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Re-fetch when user returns to tab if data is stale
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const age = Date.now() - lastFetchRef.current;
        if (age > staleTtlMs) {
          refresh();
        }
      }
    };

    // Re-fetch when profile changes
    const onProfileChanged = () => {
      lastFetchRef.current = 0; // force stale
      refresh();
    };

    // Re-fetch on sign-in
    const onSignIn = () => {
      lastFetchRef.current = 0;
      refresh();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('profileChanged', onProfileChanged);
    window.addEventListener('appSignIn', onSignIn);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('profileChanged', onProfileChanged);
      window.removeEventListener('appSignIn', onSignIn);
    };
  }, [enabled, staleTtlMs, refresh]);

  return { markFresh: () => { lastFetchRef.current = Date.now(); } };
}
