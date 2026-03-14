import { Router } from 'express';
import mongoose from 'mongoose';

import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceLimit } from '../middleware/subscriberEnforcement.js';

import { ExtraExpense } from '../models/ExtraExpense.js';

export const extraExpensesRouter = Router();

extraExpensesRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

function parseDateParam(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

extraExpensesRouter.get('/', async (req, res, next) => {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);

    const filter = { userId: req.userId, profileId: req.profileId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const rows = await ExtraExpense.find(filter).sort({ date: -1, createdAt: -1 });

    res.json(
      rows.map((x) => ({
        id: String(x._id),
        ...x.toObject(),
        _id: undefined,
        userId: undefined,
        createdAt: x.createdAt?.toISOString?.() ?? x.createdAt,
        updatedAt: x.updatedAt?.toISOString?.() ?? x.updatedAt,
        date: x.date?.toISOString?.() ?? x.date,
      }))
    );
  } catch (err) {
    next(err);
  }
});

extraExpensesRouter.post('/', enforceLimit('maxExtraExpenses', (req) => ExtraExpense.countDocuments({ userId: req.userId })), async (req, res, next) => {
  try {
    const body = req.body || {};

    const date = parseDateParam(body.date);
    if (!date) return res.status(400).json({ error: 'Valid date is required' });

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const category = body.category ? String(body.category).trim() : null;
    const method = body.method ? String(body.method).trim() : null;
    const reference = body.reference ? String(body.reference).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    const created = await ExtraExpense.create({
      userId: req.userId,
      profileId: req.profileId,
      date,
      category,
      amount,
      method,
      reference,
      notes,
    });

    res.json({
      id: String(created._id),
      ...created.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: created.createdAt?.toISOString?.() ?? created.createdAt,
      updatedAt: created.updatedAt?.toISOString?.() ?? created.updatedAt,
      date: created.date?.toISOString?.() ?? created.date,
    });
  } catch (err) {
    next(err);
  }
});

extraExpensesRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const deleted = await ExtraExpense.findOneAndDelete({ _id: id, userId: req.userId, profileId: req.profileId });
    if (!deleted) return res.status(404).json({ error: 'Not found' });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
