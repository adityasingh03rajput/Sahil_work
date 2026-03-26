import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceLimit } from '../middleware/subscriberEnforcement.js';
import { Payment } from '../models/Payment.js';
import { Document } from '../models/Document.js';
import { createLedgerForPayment } from '../lib/ledger.js';

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

async function computeDocumentPaidAmount({ userId, profileId, documentId }) {
  const result = await Payment.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), profileId: new mongoose.Types.ObjectId(profileId), documentId: new mongoose.Types.ObjectId(documentId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total ?? 0;
}

async function refreshDocumentPaymentStatus({ userId, profileId, documentId }) {
  const [doc, aggResult] = await Promise.all([
    Document.findOne({ _id: documentId, userId, profileId }, 'grandTotal paymentStatus').lean(),
    Payment.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), profileId: new mongoose.Types.ObjectId(profileId), documentId: new mongoose.Types.ObjectId(documentId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  if (!doc) return null;

  const paidAmount = aggResult[0]?.total ?? 0;
  const total = Number(doc.grandTotal || 0);
  const remaining = Math.max(0, total - paidAmount);

  let status = 'unpaid';
  if (paidAmount > 0 && remaining > 0) status = 'partial';
  if (remaining <= 0 && total > 0) status = 'paid';
  if (total <= 0) status = 'paid';

  await Document.updateOne({ _id: documentId, userId, profileId }, { $set: { paymentStatus: status } });
  return { paymentStatus: status, paidAmount, remaining };
}

paymentsRouter.post('/', enforceLimit('maxPaymentsPerMonth', (req) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return Payment.countDocuments({ userId: req.userId, createdAt: { $gte: startOfMonth } });
}), async (req, res, next) => {
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

    const documentId = body.documentId ? String(body.documentId) : null;
    const customerId = body.customerId ? String(body.customerId) : null;
    const supplierId = body.supplierId ? String(body.supplierId) : null;
    const bankAccountId = body.bankAccountId ? String(body.bankAccountId) : null;

    if (documentId && !mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid documentId' });
    }
    if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ error: 'Invalid customerId' });
    }
    if (supplierId && !mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ error: 'Invalid supplierId' });
    }
    if (bankAccountId && !mongoose.Types.ObjectId.isValid(bankAccountId)) {
      return res.status(400).json({ error: 'Invalid bankAccountId' });
    }

    // Validate document belongs to current user/profile when provided
    if (documentId) {
      const doc = await Document.findOne({ _id: documentId, userId: req.userId, profileId: req.profileId });
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
    }

    const payment = await Payment.create({
      userId: req.userId,
      profileId: req.profileId,
      documentId,
      customerId,
      supplierId,
      bankAccountId,
      amount,
      currency: body.currency || 'INR',
      date,
      method: body.method || null,
      reference: body.reference || null,
      notes: body.notes || null,
    });

    await createLedgerForPayment({ userId: req.userId, profileId: req.profileId, payment });

    let docUpdate = null;
    if (documentId) {
      docUpdate = await refreshDocumentPaymentStatus({
        userId: req.userId,
        profileId: req.profileId,
        documentId,
      });
    }

    res.json({
      id: String(payment._id),
      ...payment.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: payment.createdAt?.toISOString?.() ?? payment.createdAt,
      updatedAt: payment.updatedAt?.toISOString?.() ?? payment.updatedAt,
      document: docUpdate,
    });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.get('/', async (req, res, next) => {
  try {
    const { documentId, customerId, bankAccountId } = req.query || {};

    const filter = { userId: req.userId, profileId: req.profileId };

    if (documentId) {
      const id = String(documentId);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid documentId' });
      }
      filter.documentId = id;
    }

    if (customerId) {
      const id = String(customerId);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid customerId' });
      }
      filter.customerId = id;
    }

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

    const payments = await Payment.find(filter).sort({ date: -1, createdAt: -1 }).lean();

    res.json(
      payments.map(p => ({
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

paymentsRouter.get('/outstanding', async (req, res, next) => {
  try {
    const { partyType, partyId } = req.query;
    
    // Build filter based on party type
    let filter = { userId: req.userId, profileId: req.profileId, type: 'invoice' };
    
    if (partyType && partyId) {
      if (partyType === 'customer') {
        filter.customerId = partyId;
      } else if (partyType === 'supplier') {
        filter.supplierId = partyId;
      }
    }

    // Get all invoices with their payment totals in one aggregation
    const outstandingAgg = await Document.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'payments',
          let: { docId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$documentId', '$$docId'] },
                userId: new mongoose.Types.ObjectId(req.userId),
                profileId: new mongoose.Types.ObjectId(req.profileId),
              },
            },
            {
              $group: {
                _id: null,
                totalPaid: { $sum: '$amount' },
              },
            },
          ],
          as: 'payments',
        },
      },
      {
        $addFields: {
          paidAmount: { $ifNull: [{ $arrayElemAt: ['$payments.totalPaid', 0] }, 0] },
        },
      },
      {
        $addFields: {
          remaining: { $max: [0, { $subtract: ['$grandTotal', '$paidAmount'] }] },
        },
      },
      {
        $match: { remaining: { $gt: 0 } }, // Only return invoices with remaining balance
      },
      {
        $sort: { date: -1 },
      },
    ]);

    const results = outstandingAgg.map(d => ({
      id: String(d._id),
      invoiceNo: d.documentNumber,
      date: d.date,
      dueDate: d.dueDate,
      totalAmount: d.grandTotal,
      paidAmount: d.paidAmount,
      remaining: d.remaining,
      party: {
        id: partyId || (d.customerId || d.supplierId || '').toString(),
        name: partyType === 'customer' ? d.customerName : d.supplierName,
      },
    }));

    const totalOutstanding = results.reduce((sum, r) => sum + r.remaining, 0);

    res.json(results);
  } catch (err) {
    next(err);
  }
});
