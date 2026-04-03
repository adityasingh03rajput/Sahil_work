import { Router } from 'express';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceFeature } from '../middleware/subscriberEnforcement.js';
import { Document } from '../models/Document.js';
import mongoose from 'mongoose';
import { getCurrentFiscalYearRange } from '../lib/fiscal.js';

export const analyticsRouter = Router();



analyticsRouter.use(
  requireAuth,
  requireValidDeviceSession,
  requireActiveSubscription,
  requireProfile,
  enforceFeature('allowAnalytics')
);

analyticsRouter.get('/', async (req, res, next) => {
  try {
    const { startDate: qSd, endDate: qEd, from, to } = req.query || {};
    let startDate = null;
    let endDate = null;

    // Validate date format
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const rawFrom = (from || qSd || '').trim();
    const rawTo = (to || qEd || '').trim();
    if (rawFrom && !dateRe.test(rawFrom)) return res.status(400).json({ error: 'Invalid from date. Use YYYY-MM-DD.' });
    if (rawTo && !dateRe.test(rawTo)) return res.status(400).json({ error: 'Invalid to date. Use YYYY-MM-DD.' });
    if (rawFrom && rawTo && rawFrom > rawTo) return res.status(400).json({ error: 'from date must be before to date.' });

    if (!rawFrom && !rawTo) {
      // No date filter — return all time analytics
      startDate = null;
      endDate = null;
    } else {
      startDate = rawFrom || null;
      endDate = rawTo || null;
    }

    const userId    = new mongoose.Types.ObjectId(req.userId);
    const profileId = new mongoose.Types.ObjectId(req.profileId);

    // Count all documents regardless of draft/final status for dashboard metrics
    // Users want to see their invoices even if saved as draft
    const baseMatch = { userId, profileId };

    // ── Date range filter on the `date` string field ──────────────────────────
    if (startDate || endDate) {
      baseMatch.date = {};
      if (startDate) baseMatch.date.$gte = startDate;
      if (endDate)   baseMatch.date.$lte = endDate;
    }

    // ── Run all aggregations in parallel ──────────────────────────────────────
    const [summaryResult, topItemsResult, monthlyResult] = await Promise.all([

      // 1. Summary stats (totals, counts)
      Document.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalSales:      { $sum: { $cond: [{ $eq: ['$type', 'invoice'] }, '$grandTotal', 0] } },
            outstanding:     { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'invoice'] }, { $ne: ['$paymentStatus', 'paid'] }] }, '$grandTotal', 0] } },
            totalInvoices:   { $sum: { $cond: [{ $eq: ['$type', 'invoice'] }, 1, 0] } },
            totalQuotations: { $sum: { $cond: [{ $eq: ['$type', 'quotation'] }, 1, 0] } },
            paidInvoices:    { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'invoice'] }, { $eq: ['$paymentStatus', 'paid'] }] }, 1, 0] } },
            unpaidInvoices:  { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'invoice'] }, { $ne: ['$paymentStatus', 'paid'] }] }, 1, 0] } },
          },
        },
      ]),

      // 2. Top items by revenue (from invoice line items)
      Document.aggregate([
        { $match: { ...baseMatch, type: 'invoice' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            quantity: { $sum: '$items.quantity' },
            revenue:  { $sum: '$items.total' },
            cost:     { $sum: { $multiply: ['$items.purchaseCost', '$items.quantity'] } },
          },
        },
        { $addFields: { profit: { $subtract: ['$revenue', '$cost'] } } },
        { $sort: { revenue: -1 } },
        { $limit: 200 },
        { $project: { _id: 0, name: '$_id', quantity: 1, revenue: 1, cost: 1, profit: 1 } },
      ]),

      // 3. Monthly revenue
      Document.aggregate([
        { $match: { ...baseMatch, type: 'invoice' } },
        { $match: { date: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: { $substr: ['$date', 0, 7] }, // "YYYY-MM"
            revenue: { $sum: '$grandTotal' },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: '$_id', revenue: 1 } },
      ]),
    ]);

    const s = summaryResult[0] || {};
    const monthlyRevenue = Object.fromEntries(monthlyResult.map(r => [r.month, r.revenue]));

    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    res.json({
      dateRange: { startDate, endDate },
      totalSales:      s.totalSales      ?? 0,
      outstanding:     s.outstanding     ?? 0,
      totalInvoices:   s.totalInvoices   ?? 0,
      totalQuotations: s.totalQuotations ?? 0,
      paidInvoices:    s.paidInvoices    ?? 0,
      unpaidInvoices:  s.unpaidInvoices  ?? 0,
      topItems:        topItemsResult,
      monthlyRevenue,
      conversionRate: s.totalQuotations > 0
        ? ((s.totalInvoices / s.totalQuotations) * 100).toFixed(1)
        : 0,
    });
  } catch (err) {
    next(err);
  }
});
