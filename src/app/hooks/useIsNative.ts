/**
 * Returns true when running inside a Capacitor native shell (Android/iOS).
 * Falls back to false on web.
 */
export function useIsNative(): boolean {
  if (typeof window === 'undefined') return false;

  // Only check for Capacitor native platform - don't include mobile browsers
  try {
    const cap = (window as any)?.Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  } catch { }

  return false;
}
