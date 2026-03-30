import { Router } from 'express';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscriptionOrAllowReadonlyGet } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { Document } from '../models/Document.js';

export const reportsRouter = Router();

reportsRouter.use(
  requireAuth,
  requireValidDeviceSession,
  requireActiveSubscriptionOrAllowReadonlyGet(['/reports']),
  requireProfile
);

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = String(dateStr);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

reportsRouter.get('/gst', async (req, res, next) => {
  try {
    const from = req.query?.from ? String(req.query.from) : null;
    const to = req.query?.to ? String(req.query.to) : null;

    const baseFilter = {
      userId: req.userId,
      profileId: req.profileId,
      status: { $ne: 'draft' },
    };

    // ── AUDIT FIX #8: Include both 'invoice' and 'billing' in outward supplies ──
    const outwardDocs = await Document.find({
      ...baseFilter,
      type: { $in: ['invoice', 'billing'] },
    }, 'documentNumber invoiceNo type date customerName subtotal totalCgst totalSgst totalIgst grandTotal items.hsnSac items.total items.cgst items.sgst items.igst items.rate items.quantity items.discount')
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // ── AUDIT FIX #8: Purchase invoices for inward supplies (ITC) ─────────────
    const inwardDocs = await Document.find({
      ...baseFilter,
      type: 'purchase',
    }, 'documentNumber invoiceNo date customerName subtotal totalCgst totalSgst totalIgst grandTotal items.hsnSac items.total items.cgst items.sgst items.igst items.rate items.quantity items.discount')
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const outwardInvoices = outwardDocs.filter(d => inRange(d.date, from, to));
    const inwardInvoices  = inwardDocs.filter(d => inRange(d.date, from, to));

    let taxableValue = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
    let itcCgst = 0, itcSgst = 0, itcIgst = 0, itcTaxable = 0;

    const hsnMap = new Map();

    const outward = outwardInvoices.map(inv => {
      // ── AUDIT FIX #4: Use pre-tax subtotal (taxable value), not grand total ──
      const taxable = Number(inv.subtotal || 0);
      const cgst = Number(inv.totalCgst || 0);
      const sgst = Number(inv.totalSgst || 0);
      const igst = Number(inv.totalIgst || 0);
      taxableValue += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      (inv.items || []).forEach(it => {
        const code = String(it.hsnSac || 'NA');
        if (!hsnMap.has(code)) hsnMap.set(code, { hsnSac: code, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 });
        const row = hsnMap.get(code);
        const qty = Number(it.quantity || 0);
        const rate = Number(it.rate || 0);
        const disc = Number(it.discount || 0);
        const itemTaxable = parseFloat(((qty * rate) - (qty * rate * disc / 100)).toFixed(2));
        row.taxableValue += itemTaxable;
        row.cgst += parseFloat((itemTaxable * Number(it.cgst || 0) / 100).toFixed(2));
        row.sgst += parseFloat((itemTaxable * Number(it.sgst || 0) / 100).toFixed(2));
        row.igst += parseFloat((itemTaxable * Number(it.igst || 0) / 100).toFixed(2));
      });

      return {
        id: String(inv._id),
        documentNumber: inv.invoiceNo || inv.documentNumber,
        type: inv.type,
        date: inv.date,
        customerName: inv.customerName,
        taxableValue: taxable,
        totalCgst: cgst,
        totalSgst: sgst,
        totalIgst: igst,
        grandTotal: Number(inv.grandTotal || 0),
      };
    });

    const inward = inwardInvoices.map(inv => {
      const taxable = Number(inv.subtotal || 0);
      const cgst = Number(inv.totalCgst || 0);
      const sgst = Number(inv.totalSgst || 0);
      const igst = Number(inv.totalIgst || 0);
      itcTaxable += taxable;
      itcCgst += cgst;
      itcSgst += sgst;
      itcIgst += igst;
      return {
        id: String(inv._id),
        documentNumber: inv.invoiceNo || inv.documentNumber,
        type: inv.type,
        date: inv.date,
        supplierName: inv.customerName,
        taxableValue: taxable,
        totalCgst: cgst,
        totalSgst: sgst,
        totalIgst: igst,
        grandTotal: Number(inv.grandTotal || 0),
      };
    });

    const hsnSummary = Array.from(hsnMap.values()).sort((a, b) => (b.taxableValue || 0) - (a.taxableValue || 0));

    res.json({
      range: { from, to },
      // Outward supplies (GSTR-1)
      summary: {
        totalInvoices: outward.length,
        taxableValue: parseFloat(taxableValue.toFixed(2)),
        totalCgst: parseFloat(totalCgst.toFixed(2)),
        totalSgst: parseFloat(totalSgst.toFixed(2)),
        totalIgst: parseFloat(totalIgst.toFixed(2)),
        totalTax: parseFloat((totalCgst + totalSgst + totalIgst).toFixed(2)),
      },
      // Inward supplies / ITC (GSTR-2B)
      inwardSummary: {
        totalPurchases: inward.length,
        taxableValue: parseFloat(itcTaxable.toFixed(2)),
        eligibleItcCgst: parseFloat(itcCgst.toFixed(2)),
        eligibleItcSgst: parseFloat(itcSgst.toFixed(2)),
        eligibleItcIgst: parseFloat(itcIgst.toFixed(2)),
        totalItc: parseFloat((itcCgst + itcSgst + itcIgst).toFixed(2)),
      },
      hsnSummary,
      outward,
      inward,
    });
  } catch (err) {
    next(err);
  }
});


