import { Router } from 'express';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription, requireActiveSubscriptionOrAllowReadonlyGet } from '../middleware/subscription.js';
import { enforceLimit } from '../middleware/subscriberEnforcement.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import { Customer } from '../models/Customer.js';
import { Item } from '../models/Item.js';
import { Document } from '../models/Document.js';
import { Counter } from '../models/Counter.js';

export const profilesRouter = Router();

profilesRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscriptionOrAllowReadonlyGet(['/profiles']));

profilesRouter.post('/', enforceLimit('maxProfiles', (req) => BusinessProfile.countDocuments({ userId: req.userId })), async (req, res, next) => {
  try {
    const data = req.body || {};
    const profile = await BusinessProfile.create({
      userId: req.userId,
      ...data,
    });

    res.json({
      id: String(profile._id),
      ...profile.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: profile.createdAt?.toISOString?.() ?? profile.createdAt,
      updatedAt: profile.updatedAt?.toISOString?.() ?? profile.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

profilesRouter.post('/:id/migrate-data', async (req, res, next) => {
  try {
    const profile = await BusinessProfile.findOne({ _id: req.params.id, userId: req.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const filter = { userId: req.userId, profileId: null };
    const update = { $set: { profileId: profile._id } };

    const [customersRes, itemsRes, documentsRes, countersRes] = await Promise.all([
      Customer.updateMany(filter, update),
      Item.updateMany(filter, update),
      Document.updateMany(filter, update),
      Counter.updateMany(filter, update),
    ]);

    res.json({
      ok: true,
      profileId: String(profile._id),
      customersModified: customersRes.modifiedCount,
      itemsModified: itemsRes.modifiedCount,
      documentsModified: documentsRes.modifiedCount,
      countersModified: countersRes.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
});

profilesRouter.get('/', async (req, res, next) => {
  try {
    const profiles = await BusinessProfile.find({ userId: req.userId }).sort({ createdAt: 1 });
    res.json(
      profiles.map(p => ({
        id: String(p._id),
        ...p.toObject(),
        _id: undefined,
        userId: undefined,
        createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
        updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

profilesRouter.put('/:id', async (req, res, next) => {
  try {
    const profile = await BusinessProfile.findOne({ _id: req.params.id, userId: req.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    Object.assign(profile, req.body || {});
    await profile.save();

    res.json({
      id: String(profile._id),
      ...profile.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: profile.createdAt?.toISOString?.() ?? profile.createdAt,
      updatedAt: profile.updatedAt?.toISOString?.() ?? profile.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});
