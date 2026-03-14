import jwt from 'jsonwebtoken';
import fs from 'fs';

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function decodeAccessToken(token) {
  // Decode without verifying expiry — used for signout so expired tokens can still clear sessions
  return jwt.decode(token);
}

export function signSubscriptionToken({ userId, profileId, plan, endDate }) {
  const serverNowSec = Math.floor(Date.now() / 1000);
  const endDateSec = Math.floor(new Date(endDate).getTime() / 1000);
  const maxOfflineSeconds = Number(process.env.SUBSCRIPTION_MAX_OFFLINE_SECONDS || 60 * 60 * 24 * 7);

  const payload = {
    sub: String(userId),
    profileId: String(profileId),
    plan: String(plan),
    endDate: endDateSec,
    srv: serverNowSec,
    maxOffline: maxOfflineSeconds,
  };

  const privateKeyFromFile = process.env.SUBSCRIPTION_JWT_PRIVATE_KEY_FILE
    ? fs.readFileSync(process.env.SUBSCRIPTION_JWT_PRIVATE_KEY_FILE, 'utf8')
    : null;
  const privateKey = privateKeyFromFile || process.env.SUBSCRIPTION_JWT_PRIVATE_KEY;
  if (privateKey) {
    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: Math.max(1, Math.min(maxOfflineSeconds, endDateSec - serverNowSec)),
      keyid: process.env.SUBSCRIPTION_JWT_KID || undefined,
    });
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: Math.max(1, Math.min(maxOfflineSeconds, endDateSec - serverNowSec)),
  });
}
