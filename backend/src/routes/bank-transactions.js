import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceLimit, enforceFeature } from '../middleware/subscriberEnforcement.js';
import { BankTransaction } from '../models/BankTransaction.js';

export const bankTransactionsRouter = Router();

bankTransactionsRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

bankTransactionsRouter.get('/', enforceFeature('allowBankAccounts'), async (req, res, next) => {
  try {
    const { bankAccountId } = req.query || {};

    const filter = {
      userId: new mongoose.Types.ObjectId(String(req.userId)),
      profileId: new mongoose.Types.ObjectId(String(req.profileId)),
    };

    if (bankAccountId) {
      const id = String(bankAccountId);
      if (id === '__null__') {
        filter.bankAccountId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid bankAccountId' });
        }
        filter.bankAccountId = id;
      }
    }

    const rows = await BankTransaction.find(filter).sort({ date: -1, createdAt: -1 });

    res.json(
      rows.map(r => ({
        id: String(r._id),
        ...r.toObject(),
        _id: undefined,
        userId: undefined,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

bankTransactionsRouter.post('/', enforceFeature('allowBankAccounts'), enforceLimit('maxBankTransactions', (req) => BankTransaction.countDocuments({ userId: req.userId })), async (req, res, next) => {
  try {
    const body = req.body || {};

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const date = String(body.date || '').trim();
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const bankAccountIdRaw = body.bankAccountId ? String(body.bankAccountId) : null;
    let bankAccountId = null;

    if (bankAccountIdRaw) {
      if (bankAccountIdRaw === '__null__') {
        bankAccountId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(bankAccountIdRaw)) {
          return res.status(400).json({ error: 'Invalid bankAccountId' });
        }
        bankAccountId = bankAccountIdRaw;
      }
    }

    const tx = await BankTransaction.create({
      userId: req.userId,
      profileId: req.profileId,
      bankAccountId,
      type: 'credit',
      amount,
      currency: body.currency || 'INR',
      date,
      description: body.description || null,
    });

    res.json({
      id: String(tx._id),
      ...tx.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: tx.createdAt?.toISOString?.() ?? tx.createdAt,
      updatedAt: tx.updatedAt?.toISOString?.() ?? tx.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});
