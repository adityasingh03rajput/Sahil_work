import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { LicenseKey } from '../models/LicenseKey.js';
import { Subscriber } from '../models/Subscriber.js';
import { ReferralRedemption } from '../models/ReferralRedemption.js';
import { requireProfile } from '../middleware/profile.js';
import { signSubscriptionToken } from '../lib/jwt.js';

export const subscriptionRouter = Router();

subscriptionRouter.use(requireAuth, requireValidDeviceSession);

function generateReferralCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function ensureUserReferralCode(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;
  if (user.referralCode) return user.referralCode;

  for (let i = 0; i < 5; i += 1) {
    const candidate = generateReferralCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ referralCode: candidate }).lean();
    if (!exists) {
      // eslint-disable-next-line no-await-in-loop
      const updated = await User.findOneAndUpdate(
        { _id: userId, referralCode: null },
        { $set: { referralCode: candidate } },
        { new: true }
      ).lean();
      return updated?.referralCode || candidate;
    }
  }
  return null;
}

function addDays(baseDate, days) {
  return new Date(new Date(baseDate).getTime() + Number(days) * 24 * 60 * 60 * 1000);
}

function planPrice(plan) {
  if (plan === 'yearly') return 4999;
  return 499;
}

function normalizeReferralCode(code) {
  const raw = String(code || '').trim().toUpperCase();
  return raw || null;
}

subscriptionRouter.get('/validate', requireProfile, async (req, res, next) => {
  try {
    const now = new Date();
    const TRIAL_DAYS = 7;

    const checkId = req.user?.ownerUserId || req.userId;

    // ── 1. Active license key ──────────────────────────────────────────────
    const activeLicense = await LicenseKey.findOne({
      activatedByUserId: checkId,
      status: 'active',
      expiresAt: { $gt: now },
    }).lean();

    if (activeLicense) {
      const token = signSubscriptionToken({
        userId: req.userId,
        profileId: req.profileId,
        plan: 'license',
        endDate: activeLicense.expiresAt,
      });
      return res.json({
        ok: true,
        serverNow: now.toISOString(),
        token,
        subscription: {
          userId: String(req.userId),
          plan: 'license',
          startDate: activeLicense.activatedAt?.toISOString() ?? now.toISOString(),
          endDate: activeLicense.expiresAt.toISOString(),
          active: true,
        },
      });
    }

    // ── 2. Trial window ────────────────────────────────────────────────────
    const [user, subscriber] = await Promise.all([
      User.findById(checkId).lean(),
      Subscriber.findOne({ ownerUserId: checkId }).lean(),
    ]);

    if (!user) return res.status(401).json({ error: 'User not found' });

    const extensionDays = Number(subscriber?.trialExtensionDays || 0);
    const trialEnd = new Date(user.createdAt.getTime() + (TRIAL_DAYS + extensionDays) * 24 * 60 * 60 * 1000);

    if (now <= trialEnd) {
      const token = signSubscriptionToken({
        userId: req.userId,
        profileId: req.profileId,
        plan: 'trial',
        endDate: trialEnd,
      });
      return res.json({
        ok: true,
        serverNow: now.toISOString(),
        token,
        subscription: {
          userId: String(req.userId),
          plan: 'trial',
          startDate: user.createdAt.toISOString(),
          endDate: trialEnd.toISOString(),
          active: true,
        },
      });
    }

    // ── No valid access ────────────────────────────────────────────────────
    return res.status(402).json({ error: 'Subscription expired. Please activate a license key to continue.' });
  } catch (err) {
    next(err);
  }
});

subscriptionRouter.get('/referral-code', async (req, res, next) => {
  try {
    const code = await ensureUserReferralCode(req.userId);
    res.json({ referralCode: code });
  } catch (err) {
    next(err);
  }
});

subscriptionRouter.post('/referral/validate', async (req, res, next) => {
  try {
    const referralCode = normalizeReferralCode(req.body?.referralCode);
    if (!referralCode) {
      return res.status(400).json({ error: 'referralCode is required' });
    }

    const me = await User.findById(req.userId).lean();
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    if (me.referralCode && me.referralCode === referralCode) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    const referrer = await User.findOne({ referralCode }).lean();
    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const already = await ReferralRedemption.findOne({ referredUserId: new mongoose.Types.ObjectId(String(req.userId)) }).lean();
    if (already) {
      return res.status(409).json({ error: 'Referral already used for this account' });
    }

    res.json({ ok: true, discountPercent: 10 });
  } catch (err) {
    next(err);
  }
});

subscriptionRouter.get('/', async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ userId: req.userId });
    if (!sub) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    res.json({
      userId: String(sub.userId),
      plan: sub.plan,
      startDate: sub.startDate.toISOString(),
      endDate: sub.endDate.toISOString(),
      active: sub.active,
      previousPlan: sub.previousPlan ?? null,
    });
  } catch (err) {
    next(err);
  }
});

subscriptionRouter.post('/update', async (req, res, next) => {
  try {
    const { plan, referralCode: referralCodeRaw } = req.body || {};
    if (plan !== 'monthly' && plan !== 'yearly') {
      return res.status(400).json({ error: 'plan must be monthly or yearly' });
    }

    const now = new Date();
    const durationDays = plan === 'yearly' ? 365 : 30;

    let referral = null;
    const referralCode = normalizeReferralCode(referralCodeRaw);
    if (referralCode) {
      const me = await User.findById(req.userId).lean();
      if (me?.referralCode && me.referralCode === referralCode) {
        return res.status(400).json({ error: 'You cannot use your own referral code' });
      }

      const referrer = await User.findOne({ referralCode }).lean();
      if (!referrer) {
        return res.status(404).json({ error: 'Invalid referral code' });
      }

      const already = await ReferralRedemption.findOne({ referredUserId: new mongoose.Types.ObjectId(String(req.userId)) }).lean();
      if (already) {
        return res.status(409).json({ error: 'Referral already used for this account' });
      }

      const bonusDays = plan === 'yearly' ? 30 : 10;
      const refSubExisting = await Subscription.findOne({ userId: referrer._id });
      const refBase = refSubExisting?.endDate && new Date(refSubExisting.endDate) > now ? new Date(refSubExisting.endDate) : now;
      const refEndDate = addDays(refBase, bonusDays);
      const refStartDate = refSubExisting?.startDate && refSubExisting?.endDate && new Date(refSubExisting.endDate) > now
        ? new Date(refSubExisting.startDate)
        : now;

      await Subscription.findOneAndUpdate(
        { userId: referrer._id },
        {
          $set: {
            userId: referrer._id,
            plan: refSubExisting?.plan || 'monthly',
            startDate: refStartDate,
            endDate: refEndDate,
            active: true,
            previousPlan: refSubExisting?.plan || null,
          },
        },
        { upsert: true, new: true }
      );

      await ReferralRedemption.create({
        referrerUserId: referrer._id,
        referredUserId: new mongoose.Types.ObjectId(String(req.userId)),
        referralCode,
        purchasedPlan: plan,
        discountPercent: 10,
      });

      referral = {
        referralCode,
        discountPercent: 10,
        referrerBonusDays: bonusDays,
      };
    }

    const existing = await Subscription.findOne({ userId: req.userId });
    const base = existing?.endDate && new Date(existing.endDate) > now ? new Date(existing.endDate) : now;
    const endDate = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const startDate = existing?.startDate && existing?.endDate && new Date(existing.endDate) > now
      ? new Date(existing.startDate)
      : now;

    const sub = await Subscription.findOneAndUpdate(
      { userId: req.userId },
      {
        $set: {
          userId: req.userId,
          plan,
          startDate,
          endDate,
          active: true,
          previousPlan: existing?.plan || null,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      userId: String(sub.userId),
      plan: sub.plan,
      startDate: sub.startDate.toISOString(),
      endDate: sub.endDate.toISOString(),
      active: sub.active,
      previousPlan: sub.previousPlan ?? null,
      pricing: {
        currency: 'INR',
        basePrice: planPrice(plan),
        discountPercent: referral?.discountPercent || 0,
        discountedPrice: Math.round(planPrice(plan) * (1 - (referral?.discountPercent || 0) / 100)),
      },
      referralApplied: referral,
    });
  } catch (err) {
    next(err);
  }
});
