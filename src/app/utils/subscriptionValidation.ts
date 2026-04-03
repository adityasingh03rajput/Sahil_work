import { jwtVerify, importSPKI } from 'jose';

export type SubscriptionValidationStatus =
  | 'ok'
  | 'no_cache_allow'
  | 'expired'
  | 'offline_too_long'
  | 'time_tamper'
  | 'token_invalid'
  | 'profile_mismatch';

export interface SubscriptionValidationResult {
  status: SubscriptionValidationStatus;
  endDateSec: number | null;
  daysRemaining: number | null;
  message?: string;
}

type SubscriptionTokenPayload = {
  sub: string;
  profileId: string;
  plan: string;
  endDate: number; // seconds
  srv: number; // server now seconds at issuance
  maxOffline: number; // seconds
  iat: number;
  exp?: number;
};

type CachedSubscriptionToken = {
  token: string;
  profileId: string;
  cachedAtLocalSec: number;
  lastLocalSec: number;
};

const storageKey = (profileId: string) => `subscriptionToken:${profileId}`;
const lastLocalKey = (profileId: string) => `subscriptionLastLocalSec:${profileId}`;

const nowSec = () => Math.floor(Date.now() / 1000);

const parseJwtPayloadUnverified = (token: string): any => {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
};

const parseJwtHeaderUnverified = (token: string): any => {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const json = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
};

export async function verifySubscriptionToken(token: string): Promise<SubscriptionTokenPayload | null> {
  const publicKeyPemRaw = import.meta.env.VITE_SUBSCRIPTION_JWT_PUBLIC_KEY;

  const publicKeyPem = typeof publicKeyPemRaw === 'string'
    ? publicKeyPemRaw.replace(/\\n/g, '\n')
    : undefined;

  const header = parseJwtHeaderUnverified(token);
  const alg = header?.alg;

  // Preferred: verify RS256 tokens using the configured public key.
  if (alg === 'RS256' && publicKeyPem) {
    const key = await importSPKI(publicKeyPem, 'RS256');
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['RS256'],
    });
    return payload as unknown as SubscriptionTokenPayload;
  }

  // Fallback: allow unverified parsing when key isn't configured or alg isn't RS256.
  // This keeps the app functional (expiry/offline window checks still apply) but
  // does not provide signature tamper guarantees.
  const unsafe = getSubscriptionTokenPayloadUnsafe(token);
  if (!unsafe) return null;
  if (typeof unsafe.endDate !== 'number' || typeof unsafe.srv !== 'number') return null;
  if (typeof unsafe.maxOffline !== 'number') return null;
  if (typeof unsafe.profileId !== 'string') return null;
  return unsafe;
}

export function cacheSubscriptionToken(profileId: string, token: string) {
  const localSec = nowSec();
  const cached: CachedSubscriptionToken = {
    token,
    profileId,
    cachedAtLocalSec: localSec,
    lastLocalSec: localSec,
  };
  localStorage.setItem(storageKey(profileId), JSON.stringify(cached));
  localStorage.setItem(lastLocalKey(profileId), String(localSec));
}

export function getCachedSubscriptionToken(profileId: string): CachedSubscriptionToken | null {
  const raw = localStorage.getItem(storageKey(profileId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedSubscriptionToken;
  } catch {
    return null;
  }
}

export function recordLocalTime(profileId: string) {
  const localSec = nowSec();
  localStorage.setItem(lastLocalKey(profileId), String(localSec));
}

export function detectTimeRollback(profileId: string) {
  const current = nowSec();
  const lastRaw = localStorage.getItem(lastLocalKey(profileId));
  if (!lastRaw) {
    localStorage.setItem(lastLocalKey(profileId), String(current));
    return false;
  }

  const last = Number(lastRaw);
  // allow small clock jitter (2 minutes)
  if (current + 120 < last) return true;

  localStorage.setItem(lastLocalKey(profileId), String(current));
  return false;
}

export async function validateSubscriptionOffline(profileId: string): Promise<SubscriptionValidationResult> {
  const cached = getCachedSubscriptionToken(profileId);
  if (!cached?.token) {
    return { status: 'no_cache_allow', endDateSec: null, daysRemaining: null };
  }

  if (cached.profileId !== profileId) {
    // Stale token from different profile — clear it and allow access while online revalidation runs
    localStorage.removeItem(storageKey(profileId));
    return { status: 'no_cache_allow', endDateSec: null, daysRemaining: null };
  }

  if (detectTimeRollback(profileId)) {
    // Clock issue — allow access, let online revalidation sort it out
    return { status: 'no_cache_allow', endDateSec: null, daysRemaining: null };
  }

  let payload: SubscriptionTokenPayload | null = null;
  try {
    payload = await verifySubscriptionToken(cached.token);
  } catch {
    payload = null;
  }

  if (!payload) {
    // Invalid token — clear it and allow access while online revalidation runs
    localStorage.removeItem(storageKey(profileId));
    return { status: 'no_cache_allow', endDateSec: null, daysRemaining: null };
  }

  if (payload.profileId !== profileId) {
    // Token belongs to different profile — clear and allow
    localStorage.removeItem(storageKey(profileId));
    return { status: 'no_cache_allow', endDateSec: null, daysRemaining: null };
  }

  const localElapsed = nowSec() - cached.cachedAtLocalSec;
  const estimatedServerNow = payload.srv + Math.max(0, localElapsed);

  if (estimatedServerNow > payload.endDate) {
    return {
      status: 'expired',
      endDateSec: payload.endDate,
      daysRemaining: -1,
      message: 'Subscription expired. Please renew to continue service.',
    };
  }

  const maxOffline = Number(payload.maxOffline || 0);
  if (maxOffline > 0 && localElapsed > maxOffline) {
    return {
      status: 'offline_too_long',
      endDateSec: payload.endDate,
      daysRemaining: Math.ceil((payload.endDate - estimatedServerNow) / 86400),
      message: 'Offline use limit reached. Please connect to internet to revalidate subscription.',
    };
  }

  const daysRemaining = Math.ceil((payload.endDate - estimatedServerNow) / 86400);

  return {
    status: 'ok',
    endDateSec: payload.endDate,
    daysRemaining,
  };
}

export async function validateSubscriptionTokenOnline(params: {
  apiUrl: string;
  accessToken: string;
  deviceId: string;
  profileId: string;
}): Promise<{ ok: boolean; token?: string; serverNow?: string; error?: string }> {
  const { apiUrl, accessToken, deviceId, profileId } = params;
  const res = await fetch(`${apiUrl}/subscription/validate`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Device-ID': deviceId,
      'X-Profile-ID': profileId,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.error || 'Subscription validation failed' };
  }

  const token = data?.token;
  if (!token) return { ok: false, error: 'Subscription token missing' };

  return { ok: true, token, serverNow: data?.serverNow };
}

export function getSubscriptionTokenPayloadUnsafe(token: string): SubscriptionTokenPayload | null {
  try {
    return parseJwtPayloadUnverified(token) as SubscriptionTokenPayload;
  } catch {
    return null;
  }
}
