import mongoose from 'mongoose';
import { BusinessProfile } from '../models/BusinessProfile.js';

// Cache profile lookups for 60s — profile data rarely changes mid-session
const profileCache = new Map(); // key: `${userId}:${profileId}` → { profileId, expiresAt }
const PROFILE_CACHE_TTL_MS = 60 * 1000;

export function invalidateProfileCache(userId, profileId) {
  profileCache.delete(`${userId}:${profileId}`);
}

export async function requireProfile(req, res, next) {
  try {
    const profileIdHeader = req.header('X-Profile-ID');
    if (!profileIdHeader) {
      return res.status(400).json({ error: 'X-Profile-ID header is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(profileIdHeader)) {
      return res.status(400).json({ error: 'Invalid X-Profile-ID' });
    }

    const cacheKey = `${req.userId}:${profileIdHeader}`;
    const cached = profileCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      req.profileId = cached.profileId;
      return next();
    }

    const profile = await BusinessProfile.findOne(
      { _id: profileIdHeader, userId: req.userId },
      '_id' // only need the ID
    ).lean();

    if (!profile) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    profileCache.set(cacheKey, { profileId: profile._id, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
    req.profileId = profile._id;
    next();
  } catch (err) {
    next(err);
  }
}
