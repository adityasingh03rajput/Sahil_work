import mongoose from 'mongoose';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { Document } from '../models/Document.js';
import { getFiscalYearFromDate } from './fiscal.js';

function parseBestDate(value, fallback) {
  const d = value ? new Date(String(value)) : null;
  if (d && !Number.isNaN(d.getTime())) return d;
  const f = fallback ? new Date(fallback) : new Date();
  return Number.isNaN(f.getTime()) ? new Date() : f;
}

function normalizeDocType(t) {
  return String(t || '').trim().toLowerCase();
}

function computeDocVoucher({ docType, amount, partyType }) {
  const t = normalizeDocType(docType);
  const amt = parseFloat(Number(amount || 0).toFixed(2));

  if (partyType === 'customer') {
    if (t === 'invoice' || t === 'billing') return { voucherType: 'GST Sales', debit: amt, credit: 0 };
    // AUDIT FIX #5: invoice_cancellation reverses the original invoice debit with a credit
    if (t === 'invoice_cancellation') return { voucherType: 'Invoice Cancellation', debit: 0, credit: amt };
    if (t === 'credit_note') return { voucherType: 'Credit Note', debit: 0, credit: amt };
    if (t === 'debit_note') return { voucherType: 'Debit Note', debit: amt, credit: 0 };
  }

  if (partyType === 'supplier') {
    if (t === 'purchase') return { voucherType: 'GST Purchase', debit: 0, credit: amt };
    if (t === 'credit_note') return { voucherType: 'Credit Note', debit: amt, credit: 0 };
    if (t === 'debit_note') return { voucherType: 'Debit Note', debit: 0, credit: amt };
  }

  if (t === 'journal') return { voucherType: 'Journal', debit: 0, credit: 0 };

  return null;
}


export async function upsertLedgerForDocument({ userId, profileId, documentId }) {
  if (!mongoose.Types.ObjectId.isValid(String(documentId))) return null;

  const doc = await Document.findOne({ _id: documentId, userId, profileId }).lean();
  if (!doc) return null;

  if (String(doc.status || '').toLowerCase() === 'draft') {
    await LedgerEntry.deleteOne({ userId, profileId, sourceType: 'document', sourceId: doc._id });
    return null;
  }

  const partyType = doc.customerId ? 'customer' : doc.supplierId ? 'supplier' : null;
  const partyId = doc.customerId || doc.supplierId;
  if (!partyType || !partyId) return null;

  const amount = Number(doc.grandTotal || 0);
  const voucher = computeDocVoucher({ docType: doc.type, amount, partyType });
  if (!voucher) {
    await LedgerEntry.deleteOne({ userId, profileId, sourceType: 'document', sourceId: doc._id });
    return null;
  }

  const date = parseBestDate(doc.date, doc.createdAt);
  const fy = getFiscalYearFromDate(date.toISOString());
  const particulars = String(doc.customerName || '').trim() || null;

  const entry = await LedgerEntry.findOneAndUpdate(
    { userId, profileId, sourceType: 'document', sourceId: doc._id },
    {
      $set: {
        userId,
        profileId,
        partyType,
        partyId,
        date,
        fiscalYear: fy,
        voucherType: voucher.voucherType,
        voucherNo: String(doc.invoiceNo || doc.challanNo || doc.documentNumber || '').trim() || null,
        particulars,
        debit: Number(voucher.debit || 0),
        credit: Number(voucher.credit || 0),
        sourceType: 'document',
        sourceId: doc._id,
        isReversal: false,
        reversalOf: null,
      },
    },
    { upsert: true, new: true }
  );

  return entry;
}

// AUDIT FIX R2: Use upsert keyed on payment._id to prevent duplicate ledger entries
// when a document or payment is edited. Exported as both names for compatibility.
export async function upsertLedgerForPayment({ userId, profileId, payment }) {
  const partyType = payment.customerId ? 'customer' : payment.supplierId ? 'supplier' : null;
  const partyId = payment.customerId || payment.supplierId;
  if (!partyType || !partyId) return null;

  if (!payment._id) return null;

  const date = parseBestDate(payment.date, payment.createdAt);
  const fy = getFiscalYearFromDate(date.toISOString());
  const amount = parseFloat(Number(payment.amount || 0).toFixed(2));

  const voucherType = partyType === 'customer' ? 'Receipt' : 'Payment';
  // Receipt: reduces customer receivable (credit on customer side)
  // Payment: reduces supplier payable (debit on supplier side)
  const debit  = parseFloat((partyType === 'supplier' ? amount : 0).toFixed(2));
  const credit = parseFloat((partyType === 'customer' ? amount : 0).toFixed(2));

  const entry = await LedgerEntry.findOneAndUpdate(
    { sourceType: 'payment', sourceId: payment._id },
    {
      $set: {
        userId,
        profileId,
        partyType,
        partyId,
        date,
        fiscalYear: fy,
        voucherType,
        voucherNo: String(payment.reference || '').trim() || null,
        particulars: String(payment.method || '').trim() || null,
        debit,
        credit,
        sourceType: 'payment',
        sourceId: payment._id,
        isReversal: false,
        reversalOf: null,
      },
    },
    { upsert: true, new: true }
  );

  return entry;
}

// Backward-compatible alias
export const createLedgerForPayment = upsertLedgerForPayment;

