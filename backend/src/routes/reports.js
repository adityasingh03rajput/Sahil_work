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

    const docs = await Document.find({
      userId: req.userId,
      profileId: req.profileId,
      type: 'invoice',
      status: { $ne: 'draft' },
    }, 'documentNumber date customerName subtotal totalCgst totalSgst totalIgst grandTotal items.hsnSac items.total items.cgst items.sgst items.igst')
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const invoices = docs.filter(d => inRange(d.date, from, to));

    let taxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalInvoices = invoices.length;

    const hsnMap = new Map();

    const outward = invoices.map(inv => {
      taxableValue += Number(inv.subtotal || 0);
      totalCgst += Number(inv.totalCgst || 0);
      totalSgst += Number(inv.totalSgst || 0);
      totalIgst += Number(inv.totalIgst || 0);

      (inv.items || []).forEach(it => {
        const code = String(it.hsnSac || 'NA');
        if (!hsnMap.has(code)) {
          hsnMap.set(code, { hsnSac: code, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 });
        }
        const row = hsnMap.get(code);
        const itemTaxable = Number(it.total || 0);
        row.taxableValue += itemTaxable;
        row.cgst += (itemTaxable * Number(it.cgst || 0)) / 100;
        row.sgst += (itemTaxable * Number(it.sgst || 0)) / 100;
        row.igst += (itemTaxable * Number(it.igst || 0)) / 100;
      });

      return {
        id: String(inv._id),
        documentNumber: inv.documentNumber,
        date: inv.date,
        customerName: inv.customerName,
        subtotal: Number(inv.subtotal || 0),
        totalCgst: Number(inv.totalCgst || 0),
        totalSgst: Number(inv.totalSgst || 0),
        totalIgst: Number(inv.totalIgst || 0),
        grandTotal: Number(inv.grandTotal || 0),
      };
    });

    const hsnSummary = Array.from(hsnMap.values()).sort((a, b) => (b.taxableValue || 0) - (a.taxableValue || 0));

    res.json({
      range: { from, to },
      summary: {
        totalInvoices,
        taxableValue,
        totalCgst,
        totalSgst,
        totalIgst,
        totalTax: totalCgst + totalSgst + totalIgst,
      },
      hsnSummary,
      outward,
    });
  } catch (err) {
    next(err);
  }
});
