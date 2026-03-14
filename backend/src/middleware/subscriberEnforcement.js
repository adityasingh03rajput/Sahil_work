import { User } from '../models/User.js';
import { Subscriber } from '../models/Subscriber.js';
import { LicenseKey } from '../models/LicenseKey.js';

const TRIAL_DAYS = 7;

export async function enforceTenantAccess(req, res, next) {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(401).json({ error: 'User not found' });

    const subscriber = await Subscriber.findOne({ ownerUserId: req.userId }).lean();
    if (subscriber?.status === 'suspended') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.',
        code: 'TENANT_SUSPENDED',
      });
    }

    // Attach limits + features to request
    req.tenantLimits = subscriber?.limits || {};
    req.tenantFeatures = subscriber?.features || {};
    req.tenant = subscriber;

    // Check active license key
    const activeLicense = await LicenseKey.findOne({
      activatedByUserId: req.userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    }).lean();

    if (activeLicense) {
      req.licenseKey = activeLicense;
      // Ensure subscriber record is marked active (in case it was previously expired)
      if (subscriber && subscriber.status !== 'active') {
        await Subscriber.updateOne({ ownerUserId: req.userId }, { $set: { status: 'active' } });
      }
      return next();
    }

    // License key exists but has expired — sync subscriber status
    const expiredLicense = await LicenseKey.findOne({
      activatedByUserId: req.userId,
      status: 'active',
    }).lean();
    if (expiredLicense) {
      // Mark the key as expired
      await LicenseKey.updateOne({ _id: expiredLicense._id }, { $set: { status: 'expired' } });
      // Sync subscriber status to expired
      if (subscriber && subscriber.status === 'active') {
        await Subscriber.updateOne({ ownerUserId: req.userId }, { $set: { status: 'expired' } });
      }
    }

    // Trial period = base 7 days + any admin-granted extension
    const extensionDays = Number(subscriber?.trialExtensionDays || 0);
    const totalTrialDays = TRIAL_DAYS + extensionDays;
    const trialEnd = new Date(user.createdAt.getTime() + totalTrialDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now <= trialEnd) {
      req.trialActive = true;
      req.trialEndsAt = trialEnd;
      return next();
    }

    return res.status(402).json({
      error: 'Trial expired',
      message: 'Your 7-day free trial has ended. Please activate a license key to continue.',
      code: 'TRIAL_EXPIRED',
      trialEndedAt: trialEnd.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export function blockCreateInGrace(_req, _res, next) {
  next();
}

/**
 * Enforce a numeric limit.
 * countFn receives (req) and must return a Promise<number>.
 */
export function enforceLimit(limitKey, countFn) {
  return async (req, res, next) => {
    try {
      const limits = req.tenantLimits || {};
      const max = limits[limitKey] ?? -1;
      if (max === -1) return next(); // unlimited

      const current = await countFn(req);
      if (current >= max) {
        return res.status(403).json({
          error: 'Limit reached',
          message: `You have reached the maximum allowed ${limitKey.replace('max', '').toLowerCase()} (${max}). Contact support to increase your limit.`,
          code: 'LIMIT_REACHED',
          limit: max,
          current,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Enforce a feature flag.
 * If the flag is explicitly false, block with 403.
 * Default (undefined / true) = allowed.
 */
export function enforceFeature(featureKey) {
  return (req, res, next) => {
    const features = req.tenantFeatures || {};
    // undefined means not set → default is allowed
    if (features[featureKey] === false) {
      return res.status(403).json({
        error: 'Feature disabled',
        message: `The feature "${featureKey}" is not available on your account. Contact support to enable it.`,
        code: 'FEATURE_DISABLED',
        feature: featureKey,
      });
    }
    next();
  };
}
