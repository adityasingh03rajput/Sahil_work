import { Router } from 'express';
import mongoose from 'mongoose';

import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';

import { VyaparKhataTransaction } from '../models/VyaparKhataTransaction.js';
import { Customer } from '../models/Customer.js';
import { Supplier } from '../models/Supplier.js';

export const vyaparKhataRouter = Router();

vyaparKhataRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

function computePartyNet({ openingBalance, openingBalanceType, gave, got }) {
  const ob = Number(openingBalance || 0);
  const signedOb = String(openingBalanceType || 'dr').toLowerCase() === 'cr' ? -Math.abs(ob) : Math.abs(ob);
  const net = signedOb + Number(gave || 0) - Number(got || 0);
  return net;
}

function asObjectId(value) {
  const s = String(value || '').trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

vyaparKhataRouter.get('/summary', async (req, res, next) => {
  try {
    const partyType = String(req.query.partyType || 'customer').trim().toLowerCase();
    if (partyType !== 'customer' && partyType !== 'supplier') {
      return res.status(400).json({ error: 'partyType must be customer or supplier' });
    }

    const userObjectId = asObjectId(req.userId);
    const profileObjectId = asObjectId(req.profileId);
    if (!userObjectId || !profileObjectId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const PartyModel = partyType === 'customer' ? Customer : Supplier;

    const parties = await PartyModel.find({ userId: req.userId, profileId: req.profileId })
      .select({ _id: 1, openingBalance: 1, openingBalanceType: 1 })
      .lean();

    const partyIds = parties.map((p) => p._id);
    if (!partyIds.length) {
      return res.json({ youWillGive: 0, youWillGet: 0 });
    }

    const agg = await VyaparKhataTransaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          profileId: profileObjectId,
          partyType,
          partyId: { $in: partyIds },
        },
      },
      {
        $group: {
          _id: { partyId: '$partyId', direction: '$direction' },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const map = new Map();
    for (const row of agg) {
      const pid = String(row?._id?.partyId);
      const dir = String(row?._id?.direction);
      if (!map.has(pid)) map.set(pid, { gave: 0, got: 0 });
      if (dir === 'gave') map.get(pid).gave = Number(row.total || 0);
      if (dir === 'got') map.get(pid).got = Number(row.total || 0);
    }

    let youWillGive = 0;
    let youWillGet = 0;

    for (const p of parties) {
      const pid = String(p._id);
      const totals = map.get(pid) || { gave: 0, got: 0 };
      const net = computePartyNet({
        openingBalance: p.openingBalance,
        openingBalanceType: p.openingBalanceType,
        gave: totals.gave,
        got: totals.got,
      });

      if (net > 0) youWillGet += net;
      if (net < 0) youWillGive += Math.abs(net);
    }

    res.json({ youWillGive, youWillGet });
  } catch (err) {
    next(err);
  }
});

vyaparKhataRouter.get('/parties', async (req, res, next) => {
  try {
    const partyType = String(req.query.partyType || 'customer').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    if (partyType !== 'customer' && partyType !== 'supplier') {
      return res.status(400).json({ error: 'partyType must be customer or supplier' });
    }

    const userObjectId = asObjectId(req.userId);
    const profileObjectId = asObjectId(req.profileId);
    if (!userObjectId || !profileObjectId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const PartyModel = partyType === 'customer' ? Customer : Supplier;

    const parties = await PartyModel.find({ userId: req.userId, profileId: req.profileId })
      .sort({ createdAt: -1 })
      .lean();

    const filtered = q
      ? parties.filter((p) => {
          const name = String(p?.name || '').toLowerCase();
          const phone = String(p?.phone || '').toLowerCase();
          return name.includes(q) || phone.includes(q);
        })
      : parties;

    const ids = filtered.map((p) => p._id);
    const agg = ids.length
      ? await VyaparKhataTransaction.aggregate([
          {
            $match: {
              userId: userObjectId,
              profileId: profileObjectId,
              partyType,
              partyId: { $in: ids },
            },
          },
          {
            $group: {
              _id: { partyId: '$partyId', direction: '$direction' },
              total: { $sum: '$amount' },
              lastAt: { $max: '$date' },
            },
          },
        ])
      : [];

    const totalsByParty = new Map();
    for (const row of agg) {
      const pid = String(row?._id?.partyId);
      const dir = String(row?._id?.direction);
      if (!totalsByParty.has(pid)) totalsByParty.set(pid, { gave: 0, got: 0, lastAt: null });
      if (dir === 'gave') totalsByParty.get(pid).gave = Number(row.total || 0);
      if (dir === 'got') totalsByParty.get(pid).got = Number(row.total || 0);
      if (row.lastAt) {
        const cur = totalsByParty.get(pid).lastAt;
        const d = new Date(row.lastAt);
        if (!cur || d > cur) totalsByParty.get(pid).lastAt = d;
      }
    }

    const out = filtered.map((p) => {
      const pid = String(p._id);
      const totals = totalsByParty.get(pid) || { gave: 0, got: 0, lastAt: null };
      const net = computePartyNet({
        openingBalance: p.openingBalance,
        openingBalanceType: p.openingBalanceType,
        gave: totals.gave,
        got: totals.got,
      });
      return {
        id: pid,
        name: String(p.name || ''),
        phone: p.phone || null,
        net,
        lastAt: totals.lastAt ? totals.lastAt.toISOString() : null,
      };
    });

    out.sort((a, b) => (Math.abs(b.net) - Math.abs(a.net)) || String(a.name).localeCompare(String(b.name)));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

vyaparKhataRouter.get('/party/:partyId', async (req, res, next) => {
  try {
    const partyType = String(req.query.partyType || 'customer').trim().toLowerCase();
    const partyId = String(req.params.partyId || '').trim();
    if (partyType !== 'customer' && partyType !== 'supplier') {
      return res.status(400).json({ error: 'partyType must be customer or supplier' });
    }
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({ error: 'Invalid partyId' });
    }

    const userObjectId = asObjectId(req.userId);
    const profileObjectId = asObjectId(req.profileId);
    if (!userObjectId || !profileObjectId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const PartyModel = partyType === 'customer' ? Customer : Supplier;
    const party = await PartyModel.findOne({ _id: partyId, userId: req.userId, profileId: req.profileId }).lean();
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const agg = await VyaparKhataTransaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          profileId: profileObjectId,
          partyType,
          partyId: new mongoose.Types.ObjectId(partyId),
        },
      },
      { $group: { _id: '$direction', total: { $sum: '$amount' } } },
    ]);

    const gave = Number(agg.find((r) => r._id === 'gave')?.total || 0);
    const got = Number(agg.find((r) => r._id === 'got')?.total || 0);
    const net = computePartyNet({ openingBalance: party.openingBalance, openingBalanceType: party.openingBalanceType, gave, got });

    res.json({
      id: String(party._id),
      name: String(party.name || ''),
      phone: party.phone || null,
      net,
    });
  } catch (err) {
    next(err);
  }
});

vyaparKhataRouter.get('/party/:partyId/entries', async (req, res, next) => {
  try {
    const partyType = String(req.query.partyType || 'customer').trim().toLowerCase();
    const partyId = String(req.params.partyId || '').trim();
    if (partyType !== 'customer' && partyType !== 'supplier') {
      return res.status(400).json({ error: 'partyType must be customer or supplier' });
    }
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({ error: 'Invalid partyId' });
    }

    const rows = await VyaparKhataTransaction.find({
      userId: req.userId,
      profileId: req.profileId,
      partyType,
      partyId: new mongoose.Types.ObjectId(partyId),
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(
      rows.map((t) => ({
        id: String(t._id),
        date: t.date?.toISOString?.() ?? t.date,
        direction: t.direction,
        amount: Number(t.amount || 0),
        method: t.method || null,
        reference: t.reference || null,
        notes: t.notes || null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

vyaparKhataRouter.post('/entries', async (req, res, next) => {
  try {
    const body = req.body || {};
    const partyType = String(body.partyType || '').trim().toLowerCase();
    const partyId = String(body.partyId || '').trim();
    const direction = String(body.direction || '').trim().toLowerCase();
    const amount = Number(body.amount);
    const date = String(body.date || '').trim();

    if (partyType !== 'customer' && partyType !== 'supplier') {
      return res.status(400).json({ error: 'partyType must be customer or supplier' });
    }
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return res.status(400).json({ error: 'Invalid partyId' });
    }
    if (direction !== 'gave' && direction !== 'got') {
      return res.status(400).json({ error: 'direction must be gave or got' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const PartyModel = partyType === 'customer' ? Customer : Supplier;
    const party = await PartyModel.findOne({ _id: partyId, userId: req.userId, profileId: req.profileId }).lean();
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const entry = await VyaparKhataTransaction.create({
      userId: req.userId,
      profileId: req.profileId,
      partyType,
      partyId: new mongoose.Types.ObjectId(partyId),
      date: d,
      direction,
      amount,
      method: body.method || null,
      reference: body.reference || null,
      notes: body.notes || null,
    });

    res.json({
      id: String(entry._id),
      date: entry.date.toISOString(),
      direction: entry.direction,
      amount: entry.amount,
      method: entry.method,
      reference: entry.reference,
      notes: entry.notes,
    });
  } catch (err) {
    next(err);
  }
});
