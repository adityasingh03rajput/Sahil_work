import { useState, useEffect } from 'react';

function readFromStorage() {
  try {
    const raw = localStorage.getItem('currentProfile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

export function useCurrentProfile() {
  const [profile, setProfile] = useState<any>(readFromStorage);

  useEffect(() => {
    // Re-read from localStorage on any profile-related event
    const refresh = () => setProfile(readFromStorage());

    // AppLayout resolved/refreshed the profile
    const onProfileRefreshed = (e: Event) => {
      const fresh = (e as CustomEvent)?.detail;
      if (fresh?.id) setProfile(fresh);
      else refresh();
    };

    // User explicitly switched profiles
    const onProfileChanged = () => refresh();

    // New user signed in — clear old profile, re-read
    const onSignIn = () => {
      setProfile(null); // clear immediately to prevent stale flash
      // Small delay to let AuthContext write the new profile
      setTimeout(refresh, 50);
    };

    window.addEventListener('profileRefreshed', onProfileRefreshed);
    window.addEventListener('profileChanged', onProfileChanged);
    window.addEventListener('appSignIn', onSignIn);

    return () => {
      window.removeEventListener('profileRefreshed', onProfileRefreshed);
      window.removeEventListener('profileChanged', onProfileChanged);
      window.removeEventListener('appSignIn', onSignIn);
    };
  }, []);

  const profileId = profile?.id ?? '';

  return { profile, profileId };
}
