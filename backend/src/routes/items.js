import { Router } from 'express';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceLimit } from '../middleware/subscriberEnforcement.js';
import { Item } from '../models/Item.js';

export const itemsRouter = Router();

itemsRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

itemsRouter.post('/', enforceLimit('maxItems', (req) => Item.countDocuments({ userId: req.userId, profileId: req.profileId })), async (req, res, next) => {
  try {
    const data = req.body || {};
    const item = await Item.create({ userId: req.userId, profileId: req.profileId, ...data });

    res.json({
      id: String(item._id),
      ...item.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
      updatedAt: item.updatedAt?.toISOString?.() ?? item.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

itemsRouter.get('/', async (req, res, next) => {
  try {
    const items = await Item.find({ userId: req.userId, profileId: req.profileId }).sort({ createdAt: 1 }).lean();
    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    res.json(
      items.map(i => ({
        id: String(i._id),
        ...i,
        _id: undefined,
        userId: undefined,
        createdAt: i.createdAt?.toISOString?.() ?? i.createdAt,
        updatedAt: i.updatedAt?.toISOString?.() ?? i.updatedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

itemsRouter.put('/:id', async (req, res, next) => {
  try {
    const data = req.body || {};
    const item = await Item.findOne({ _id: req.params.id, userId: req.userId, profileId: req.profileId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    Object.assign(item, data);
    await item.save();

    res.json({
      id: String(item._id),
      ...item.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
      updatedAt: item.updatedAt?.toISOString?.() ?? item.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});
