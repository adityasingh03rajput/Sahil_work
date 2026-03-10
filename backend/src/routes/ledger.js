import { Router } from 'express';
import mongoose from 'mongoose';

import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';

import { LedgerEntry } from '../models/LedgerEntry.js';
import { Customer } from '../models/Customer.js';
import { Supplier } from '../models/Supplier.js';

export const ledgerRouter = Router();

ledgerRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

function parseDateParam(value, fallback, { endOfDay = false, startOfDay = false } = {}) {
  if (!value) return fallback;
  const raw = String(value);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return fallback;

  // If the client passes a pure date (YYYY-MM-DD), treat it as a whole-day boundary.
  // This avoids excluding entries later on the same "To" date due to midnight timestamps.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    if (endOfDay) d.setHours(23, 59, 59, 999);
    if (startOfDay) d.setHours(0, 0, 0, 0);
  }

  return d;
}

function signedFromBalance(amount, type) {
  const a = Number(amount) || 0;
  return String(type || 'dr').toLowerCase() === 'cr' ? -Math.abs(a) : Math.abs(a);
}

function balanceFromSigned(signed) {
  const s = Number(signed) || 0;
  if (s < 0) return { amount: Math.abs(s), type: 'cr' };
  return { amount: Math.abs(s), type: 'dr' };
}

function asObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const s = String(value);
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

ledgerRouter.get('/ranges', async (req, res, next) => {
  try {
    const partyType = String(req.query.partyType || '').trim().toLowerCase();
    const partyId = String(req.query.partyId || '').trim();

    if (partyType !== 'customer' && partyType !== 'supplier') {
      return res.status(400).json({ error: 'partyType must be customer or supplier' });
    }
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({ error: 'Invalid partyId' });
    }

    const partyObjectId = new mongoose.Types.ObjectId(partyId);
    const userObjectId = asObjectId(req.userId);
    const profileObjectId = asObjectId(req.profileId);

    if (!userObjectId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const match = {
      userId: userObjectId,
      profileId: profileObjectId,
      partyType,
      partyId: partyObjectId,
    };

    const monthAgg = await LedgerEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: { y: { $year: '$date' }, m: { $month: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': -1, '_id.m': -1 } },
    ]);

    if (!Array.isArray(monthAgg) || monthAgg.length === 0) {
      return res.json({ ranges: [] });
    }

    const yearAgg = await LedgerEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: { y: { $year: '$date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': -1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthly = (monthAgg || []).slice(0, 12).map((r) => {
      const y = Number(r?._id?.y);
      const m = Number(r?._id?.m);
      const label = `${monthNames[Math.max(1, Math.min(12, m)) - 1]} ${y}`;

      // Full month boundaries for autofill UX
      const from = new Date(y, Math.max(0, m - 1), 1, 0, 0, 0, 0);
      const to = new Date(y, Math.max(0, m - 1) + 1, 0, 23, 59, 59, 999);

      return {
        key: `${y}-${String(m).padStart(2, '0')}`,
        label,
        from,
        to,
        count: Number(r.count || 0),
      };
    });

    const yearly = (yearAgg || []).slice(0, 2).map((r) => {
      const y = Number(r?._id?.y);
      const from = new Date(y, 0, 1, 0, 0, 0, 0);
      const to = new Date(y, 11, 31, 23, 59, 59, 999);
      return {
        key: `year-${y}`,
        label: `Year ${y}`,
        from,
        to,
        count: Number(r.count || 0),
      };
    });

    res.json({
      ranges: [
        ...yearly,
        ...monthly,
      ],
    });
  } catch (err) {
    next(err);
  }
});

ledgerRouter.get('/statement', async (req, res, next) => {
  try {
    const partyType = String(req.query.partyType || '').trim().toLowerCase();
    const partyId = String(req.query.partyId || '').trim();

    if (partyType !== 'customer' && partyType !== 'supplier') {
      return res.status(400).json({ error: 'partyType must be customer or supplier' });
    }
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({ error: 'Invalid partyId' });
    }

    const to = parseDateParam(req.query.to, new Date(), { endOfDay: true });
    const from = parseDateParam(req.query.from, new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000), { startOfDay: true });

    const PartyModel = partyType === 'customer' ? Customer : Supplier;
    const party = await PartyModel.findOne({ _id: partyId, userId: req.userId, profileId: req.profileId }).lean();
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    const openingSignedBase = signedFromBalance(party.openingBalance || 0, party.openingBalanceType || (partyType === 'supplier' ? 'cr' : 'dr'));

    const userObjectId = asObjectId(req.userId);
    const profileObjectId = asObjectId(req.profileId);

    const beforeAgg = await LedgerEntry.aggregate([
      {
        $match: {
          userId: userObjectId,
          profileId: profileObjectId,
          partyType,
          partyId: new mongoose.Types.ObjectId(partyId),
          date: { $lt: from },
        },
      },
      {
        $group: {
          _id: null,
          debit: { $sum: '$debit' },
          credit: { $sum: '$credit' },
        },
      },
    ]);

    const before = beforeAgg?.[0] || { debit: 0, credit: 0 };
    const openingSigned = openingSignedBase + (Number(before.debit || 0) - Number(before.credit || 0));

    const entries = await LedgerEntry.find({
      userId: req.userId,
      profileId: req.profileId,
      partyType,
      partyId,
      date: { $gte: from, $lte: to },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    let running = openingSigned;
    const rows = entries.map((e) => {
      const debit = Number(e.debit || 0);
      const credit = Number(e.credit || 0);
      running += debit - credit;
      return {
        id: String(e._id),
        date: e.date?.toISOString?.() ?? e.date,
        particulars: e.particulars || '',
        voucherType: e.voucherType || '',
        voucherNo: e.voucherNo || '',
        debit,
        credit,
        balanceAfter: balanceFromSigned(running),
        sourceType: e.sourceType,
        sourceId: String(e.sourceId),
      };
    });

    const periodTotals = rows.reduce(
      (acc, r) => ({ debit: acc.debit + (Number(r.debit) || 0), credit: acc.credit + (Number(r.credit) || 0) }),
      { debit: 0, credit: 0 }
    );

    res.json({
      party: {
        id: String(party._id),
        name: String(party.name || ''),
        address: party.billingAddress || party.address || null,
        billingAddress: party.billingAddress || null,
        shippingAddress: party.shippingAddress || null,
        gstin: party.gstin || null,
        phone: party.phone || null,
        email: party.email || null,
        logoUrl: party.logoUrl || null,
        logoDataUrl: party.logoDataUrl || null,
      },
      range: { from: from.toISOString(), to: to.toISOString() },
      openingBalance: balanceFromSigned(openingSigned),
      periodTotals,
      closingBalance: balanceFromSigned(running),
      rows,
    });
  } catch (err) {
    next(err);
  }
});
