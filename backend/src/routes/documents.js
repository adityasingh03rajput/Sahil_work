import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceLimit, enforceFeature } from '../middleware/subscriberEnforcement.js';
import { Document } from '../models/Document.js';
import { Payment } from '../models/Payment.js';
import { Counter } from '../models/Counter.js';
import { upsertLedgerForDocument, createLedgerForPayment } from '../lib/ledger.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import twilio from 'twilio';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { getFiscalYearFromDate, getCurrentFiscalYearRange } from '../lib/fiscal.js';

export const documentsRouter = Router();

async function validateInvoiceCancellation({ userId, profileId, docData }) {
  const t = String(docData?.type || '').toLowerCase();
  if (t !== 'invoice_cancellation') return;

  const refId = docData?.referenceDocumentId;
  if (!refId) {
    const err = new Error('Reference invoice is required for Invoice Cancellation');
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  const refDoc = await Document.findOne({ _id: refId, userId, profileId });
  if (!refDoc) {
    const err = new Error('Reference invoice not found');
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  if (String(refDoc.type || '').toLowerCase() !== 'invoice') {
    const err = new Error('Reference document must be an Invoice');
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  if (!docData.referenceDocumentNumber) {
    docData.referenceDocumentNumber = refDoc.documentNumber;
  }
}

async function validateOrderReferenceQuotation({ userId, profileId, docData }) {
  const t = String(docData?.type || '').toLowerCase();
  if (t !== 'order') return;

  const refId = docData?.referenceDocumentId;
  if (!refId) return;

  const refDoc = await Document.findOne({ _id: refId, userId, profileId });
  if (!refDoc) {
    const err = new Error('Reference quotation not found');
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  if (String(refDoc.type || '').toLowerCase() !== 'quotation') {
    const err = new Error('Reference document must be a Quotation');
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  if (!docData.referenceDocumentNumber) {
    docData.referenceDocumentNumber = refDoc.documentNumber;
  }
}

documentsRouter.use(
  requireAuth,
  requireValidDeviceSession,
  requireActiveSubscription,
  requireProfile
);

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

documentsRouter.post('/:id/remind', enforceFeature('allowSmsReminders'), async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId, profileId: req.profileId });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const t = String(doc.type || '').toLowerCase();
    if (t !== 'invoice' && t !== 'billing') {
      return res.status(400).json({ error: 'Reminders are supported only for Invoice/Billing documents' });
    }

    if (String(doc.status || '').toLowerCase() === 'draft') {
      return res.status(400).json({ error: 'Cannot send reminder for draft document' });
    }

    if (String(doc.paymentStatus || '').toLowerCase() === 'paid') {
      return res.status(400).json({ error: 'Document is already paid' });
    }

    const body = req.body || {};
    const channel = String(body.channel || 'sms').toLowerCase();
    if (channel !== 'sms') {
      return res.status(400).json({ error: 'Only SMS reminders are supported via API' });
    }

    const to = String(body.to || doc.customerMobile || '').trim();
    if (!to) {
      return res.status(400).json({ error: 'Customer mobile is required to send SMS' });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !from) {
      return res.status(500).json({ error: 'Twilio is not configured (missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER)' });
    }

    const profile = await BusinessProfile.findOne({ _id: req.profileId, userId: req.userId });
    const template = String(profile?.smsReminderTemplate || '').trim();

    const amount = Number(doc.grandTotal || 0);
    const due = String(doc.dueDate || '').trim();
    const invoiceNo = String(doc.documentNumber || '').trim();
    const party = String(doc.customerName || '').trim();
    const businessName = String(profile?.businessName || '').trim();

    const defaultMsg = `Payment Reminder: ${party ? party + ', ' : ''}${invoiceNo ? invoiceNo + ', ' : ''}Amount ₹${amount.toFixed(2)}${due ? ` due on ${due}` : ''}. Kindly pay at the earliest.`;
    const fromTemplate = template
      ? template
          .replaceAll('{party}', party)
          .replaceAll('{docNo}', invoiceNo)
          .replaceAll('{amount}', amount.toFixed(2))
          .replaceAll('{dueDate}', due)
          .replaceAll('{businessName}', businessName)
      : '';

    const msg = String(body.message || '').trim() || fromTemplate || defaultMsg;

    const client = twilio(accountSid, authToken);

    try {
      await client.messages.create({ from, to, body: msg });
      doc.lastReminderSentAt = new Date();
      doc.reminderLogs = [
        ...(doc.reminderLogs || []),
        { sentAt: new Date(), channel: 'sms', to, message: msg, status: 'sent', error: null },
      ];
      await doc.save();
    } catch (e) {
      const error = e?.message ? String(e.message) : 'Failed to send SMS';
      doc.reminderLogs = [
        ...(doc.reminderLogs || []),
        { sentAt: new Date(), channel: 'sms', to, message: msg, status: 'failed', error },
      ];
      await doc.save();
      return res.status(500).json({ error: error || 'Failed to send SMS' });
    }

    res.json({
      ok: true,
      status: 'sent',
      lastReminderSentAt: doc.lastReminderSentAt?.toISOString?.() ?? doc.lastReminderSentAt,
    });
  } catch (err) {
    next(err);
  }
});

documentsRouter.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId, profileId: req.profileId });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // ── AUDIT FIX #2: Block deletion of finalized documents ──────────────────
    if (String(doc.status || '').toLowerCase() === 'final') {
      return res.status(400).json({
        error: 'Finalized documents cannot be deleted. Create a Credit Note or Invoice Cancellation to reverse this document.',
        code: 'FINAL_DOCUMENT_PROTECTED',
      });
    }

    await Payment.deleteMany({ userId: req.userId, profileId: req.profileId, documentId: doc._id });
    await LedgerEntry.deleteMany({ userId: req.userId, profileId: req.profileId, sourceType: 'document', sourceId: doc._id });

    const payLedger = await LedgerEntry.find({ userId: req.userId, profileId: req.profileId, sourceType: 'payment' }).lean();
    const paymentIds = (payLedger || [])
      .filter((e) => e?.sourceId)
      .map((e) => String(e.sourceId));
    if (paymentIds.length) {
      const stillExisting = await Payment.find({ _id: { $in: paymentIds } }).select('_id').lean();
      const keep = new Set((stillExisting || []).map((p) => String(p._id)));
      const toDelete = paymentIds.filter((id) => !keep.has(id));
      if (toDelete.length) {
        await LedgerEntry.deleteMany({ userId: req.userId, profileId: req.profileId, sourceType: 'payment', sourceId: { $in: toDelete } });
      }
    }

    await Document.deleteOne({ _id: doc._id, userId: req.userId, profileId: req.profileId });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});


async function nextDocumentNumber(userId, profileId, type, dateStr) {
  const docType = String(type || '').trim() || 'invoice';
  const fy = getFiscalYearFromDate(dateStr || new Date().toISOString());

  const run = async () => {
    const counter = await Counter.findOneAndUpdate(
      { userId, profileId, docType, fiscalYear: fy },
      { $inc: { value: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const num = String(counter.value).padStart(5, '0');
    // Format: TYPE/2024-25/00001
    return `${String(docType).toUpperCase()}/${fy}-${num}`;
  };

  try {
    return await run();
  } catch (err) {
    const code = err?.code;
    if (code !== 11000) throw err;

    // Auto-heal duplicates for (userId, docType) then retry.
    const duplicates = await Counter.find({ userId, profileId, docType, fiscalYear: fy }).sort({ value: -1, updatedAt: -1, createdAt: -1 });
    if (duplicates.length > 1) {
      const keep = duplicates[0];
      const keepId = keep?._id;
      await Counter.deleteMany({ userId, profileId, docType, fiscalYear: fy, _id: { $ne: keepId } });
    }

    return await run();
  }
}

documentsRouter.post('/', enforceLimit('maxDocumentsPerMonth', (req) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return Document.countDocuments({ userId: req.userId, profileId: req.profileId, createdAt: { $gte: startOfMonth } });
}), async (req, res, next) => {
  try {
    const docData = req.body || {};

    // Enforce max line items per document
    const maxLineItems = (req.tenantLimits || {}).maxDocumentLineItems ?? -1;
    if (maxLineItems !== -1 && Array.isArray(docData.items) && docData.items.length > maxLineItems) {
      return res.status(403).json({
        error: 'Limit reached',
        message: `Maximum ${maxLineItems} line items allowed per document. Contact support to increase your limit.`,
        code: 'LIMIT_REACHED',
        limit: maxLineItems,
        current: docData.items.length,
      });
    }

    await validateInvoiceCancellation({ userId: req.userId, profileId: req.profileId, docData });
    await validateOrderReferenceQuotation({ userId: req.userId, profileId: req.profileId, docData });
    
    const fy = getFiscalYearFromDate(docData.date || new Date().toISOString());
    const documentNumber = await nextDocumentNumber(req.userId, req.profileId, docData.type, docData.date);

    const doc = await Document.create({
      userId: req.userId,
      profileId: req.profileId,
      documentNumber,
      fiscalYear: fy,
      ...docData,
      version: 1,
    });

    await upsertLedgerForDocument({ userId: req.userId, profileId: req.profileId, documentId: doc._id });

    const receivedAmountRaw = Number(docData.receivedAmount);
    if (Number.isFinite(receivedAmountRaw) && receivedAmountRaw > 0) {
      const total = Number(doc.grandTotal || 0);
      const receivedAmount = total > 0 ? Math.min(receivedAmountRaw, total) : receivedAmountRaw;

      const payment = await Payment.create({
        userId: req.userId,
        profileId: req.profileId,
        documentId: doc._id,
        customerId: doc.customerId || null,
        supplierId: doc.supplierId || null,
        bankAccountId: doc.bankAccountId || (docData.bankAccountId || null),
        amount: receivedAmount,
        currency: doc.currency || 'INR',
        date: String(doc.date || new Date().toISOString().slice(0, 10)),
        method: docData.paymentMode || null,
        reference: null,
        notes: 'Payment recorded during document creation',
      });

      await createLedgerForPayment({ userId: req.userId, profileId: req.profileId, payment });
      const refreshed = await refreshDocumentPaymentStatus({ userId: req.userId, profileId: req.profileId, documentId: doc._id });
      if (refreshed?.paymentStatus) {
        doc.paymentStatus = refreshed.paymentStatus;
      }
    }

    res.json({
      id: String(doc._id),
      ...doc.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
      updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

documentsRouter.get('/', async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(String(req.query.limit  || '50'),  10) || 50,  200);
    const skip   = Math.max(parseInt(String(req.query.skip   || '0'),   10) || 0,   0);
    const from   = req.query.from   ? String(req.query.from)   : null;
    const to     = req.query.to     ? String(req.query.to)     : null;
    const type   = req.query.type   ? String(req.query.type)   : null;
    const status = req.query.status ? String(req.query.status) : null;

    const filter = { userId: req.userId, profileId: req.profileId };
    
    // Default to current fiscal year if no explicit date range provided
    const { startDate: fyStart, endDate: fyEnd } = getCurrentFiscalYearRange();
    const activeFrom = from || fyStart;
    const activeTo = to || fyEnd;
    
    filter.date = { $gte: activeFrom, $lte: activeTo };

    if (type)   filter.type = type;
    if (status === 'paid')   filter.paymentStatus = 'paid';
    if (status === 'unpaid') filter.paymentStatus = { $in: ['unpaid', 'pending', 'partial'] };
    if (status === 'draft')  filter.status = 'draft';

    // Exclude heavy per-document fields not needed in list view
    const [docs, total] = await Promise.all([
      Document.find(filter, '-reminderLogs -internalNotes -items')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Document.countDocuments(filter),
    ]);

    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    res.json({
      data: docs.map(d => ({
        id: String(d._id),
        ...d,
        _id: undefined,
        userId: undefined,
        createdAt: d.createdAt?.toISOString?.() ?? d.createdAt,
        updatedAt: d.updatedAt?.toISOString?.() ?? d.updatedAt,
      })),
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
    });
  } catch (err) {
    next(err);
  }
});

documentsRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId, profileId: req.profileId });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: String(doc._id),
      ...doc.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
      updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// Fields that are financially material — cannot be changed on a finalized document.
const FINAL_LOCKED_FIELDS = [
  'items', 'grandTotal', 'subtotal', 'itemsTotal',
  'totalCgst', 'totalSgst', 'totalIgst',
  'transportCharges', 'additionalCharges', 'packingHandlingCharges',
  'tcs', 'roundOff', 'customerId', 'supplierId',
];

documentsRouter.put('/:id', async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.userId, profileId: req.profileId });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const nextData = req.body || {};

    // ── AUDIT FIX #1: Lock financial fields on finalized documents ─────────────
    if (String(doc.status || '').toLowerCase() === 'final') {
      const lockedChanges = FINAL_LOCKED_FIELDS.filter(f => {
        if (!(f in nextData)) return false;
        return JSON.stringify(nextData[f]) !== JSON.stringify(doc.toObject()[f]);
      });
      if (lockedChanges.length > 0) {
        return res.status(400).json({
          error: `Finalized documents cannot be edited. The following financial fields are locked: ${lockedChanges.join(', ')}. Revert to Draft first to make changes.`,
          code: 'FINAL_DOCUMENT_LOCKED',
          lockedFields: lockedChanges,
        });
      }
    }

    await validateInvoiceCancellation({ userId: req.userId, profileId: req.profileId, docData: nextData });
    await validateOrderReferenceQuotation({ userId: req.userId, profileId: req.profileId, docData: nextData });

    // AUDIT FIX R3: Cap receivedAmount to grandTotal on edit — cannot over-pay an invoice
    if (typeof nextData.receivedAmount !== 'undefined') {
      const grandTotal = Number(nextData.grandTotal ?? doc.grandTotal ?? 0);
      const raw = Number(nextData.receivedAmount);
      if (Number.isFinite(raw) && grandTotal > 0) {
        nextData.receivedAmount = Math.min(raw, grandTotal);
      }
    }

    // Use .set() instead of Object.assign for reliable mongoose state tracking
    doc.set(nextData);

    // Explicitly guarantee status is tracked if passed
    if (nextData.status) {
      doc.status = nextData.status;
      doc.markModified('status');
    }

    doc.version = (doc.version || 1) + 1;

    await doc.save();

    // Ensure ledger updates whenever a document status changes
    await upsertLedgerForDocument({ userId: req.userId, profileId: req.profileId, documentId: doc._id });

    // AUDIT FIX R5: Always recompute paymentStatus from actual payment records (not client-sent)
    await refreshDocumentPaymentStatus({ userId: req.userId, profileId: req.profileId, documentId: doc._id });

    // Re-fetch to return consistent, server-computed state
    const saved = await Document.findOne({ _id: doc._id, userId: req.userId, profileId: req.profileId }).lean();

    res.json({
      id: String(saved._id),
      ...saved,
      _id: undefined,
      userId: undefined,
      createdAt: saved.createdAt?.toISOString?.() ?? saved.createdAt,
      updatedAt: saved.updatedAt?.toISOString?.() ?? saved.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});




documentsRouter.post('/:id/duplicate', async (req, res, next) => {
  try {
    const existing = await Document.findOne({ _id: req.params.id, userId: req.userId, profileId: req.profileId });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fy = getFiscalYearFromDate(existing.date || new Date().toISOString());
    const documentNumber = await nextDocumentNumber(req.userId, req.profileId, existing.type, existing.date);

    const newDoc = await Document.create({
      ...existing.toObject(),
      _id: undefined,
      userId: req.userId,
      profileId: req.profileId,
      documentNumber,
      fiscalYear: fy,
      status: 'draft',
      version: 1,
      createdAt: undefined,
      updatedAt: undefined,
    });

    res.json({
      id: String(newDoc._id),
      ...newDoc.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: newDoc.createdAt?.toISOString?.() ?? newDoc.createdAt,
      updatedAt: newDoc.updatedAt?.toISOString?.() ?? newDoc.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

documentsRouter.post('/:id/convert', async (req, res, next) => {
  try {
    const { targetType } = req.body || {};

    const existing = await Document.findOne({ _id: req.params.id, userId: req.userId, profileId: req.profileId });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fy = getFiscalYearFromDate(existing.date || new Date().toISOString());
    const documentNumber = await nextDocumentNumber(req.userId, req.profileId, targetType, existing.date);

    const newDoc = await Document.create({
      ...existing.toObject(),
      _id: undefined,
      userId: req.userId,
      profileId: req.profileId,
      type: targetType,
      documentNumber,
      fiscalYear: fy,
      convertedFrom: String(existing._id),
      status: 'draft',
      version: 1,
      createdAt: undefined,
      updatedAt: undefined,
    });

    res.json({
      id: String(newDoc._id),
      ...newDoc.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: newDoc.createdAt?.toISOString?.() ?? newDoc.createdAt,
      updatedAt: newDoc.updatedAt?.toISOString?.() ?? newDoc.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});
