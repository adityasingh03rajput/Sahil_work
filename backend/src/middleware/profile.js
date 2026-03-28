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
      '_id'
    ).lean();

    if (!profile) {
      // Profile not found for this ID — fall back to the user's first profile
      // This handles the case where localStorage has a stale profileId from a previous backend
      const fallback = await BusinessProfile.findOne(
        { userId: req.userId },
        '_id'
      ).sort({ createdAt: 1 }).lean();

      if (!fallback) {
        return res.status(404).json({ error: 'Business profile not found' });
      }

      profileCache.set(`${req.userId}:${String(fallback._id)}`, { profileId: fallback._id, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      req.profileId = fallback._id;
      // Signal to client that the profileId was remapped
      res.setHeader('X-Profile-ID-Remapped', String(fallback._id));
      return next();
    }

    profileCache.set(cacheKey, { profileId: profile._id, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
    req.profileId = profile._id;
    next();
  } catch (err) {
    next(err);
  }
}
