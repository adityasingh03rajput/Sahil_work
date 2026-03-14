import { Router } from 'express';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscriptionOrAllowReadonlyGet } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceFeature } from '../middleware/subscriberEnforcement.js';
import { Document } from '../models/Document.js';

export const analyticsRouter = Router();

analyticsRouter.use(
  requireAuth,
  requireValidDeviceSession,
  requireActiveSubscriptionOrAllowReadonlyGet(['/analytics']),
  requireProfile,
  enforceFeature('allowAnalytics')
);

analyticsRouter.get('/', async (req, res, next) => {
  try {
    const { startDate: startDateRaw, endDate: endDateRaw } = req.query || {};
    const startDate = typeof startDateRaw === 'string' && startDateRaw.trim() ? startDateRaw.trim() : null;
    const endDate = typeof endDateRaw === 'string' && endDateRaw.trim() ? endDateRaw.trim() : null;

    const documents = await Document.find({ userId: req.userId, profileId: req.profileId }).sort({ createdAt: -1 });

    const withinRange = (doc) => {
      const docDateStr = typeof doc?.date === 'string' && doc.date.trim() ? doc.date.trim() : null;
      const docDate = docDateStr ? new Date(docDateStr) : (doc?.createdAt ? new Date(doc.createdAt) : null);
      if (!docDate || Number.isNaN(docDate.getTime())) return false;

      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start && !Number.isNaN(start.getTime()) && docDate < start) return false;
      if (end && !Number.isNaN(end.getTime())) {
        const endInclusive = new Date(end);
        endInclusive.setHours(23, 59, 59, 999);
        if (docDate > endInclusive) return false;
      }
      return true;
    };

    const filteredDocuments = (startDate || endDate)
      ? documents.filter(withinRange)
      : documents;

    const invoices = filteredDocuments.filter(d => d.type === 'invoice');
    const quotations = filteredDocuments.filter(d => d.type === 'quotation');

    const totalSales = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'paid');
    const unpaidInvoices = invoices.filter(inv => inv.paymentStatus !== 'paid');
    const outstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const itemSales = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        if (!itemSales[item.name]) {
          itemSales[item.name] = { name: item.name, quantity: 0, revenue: 0, cost: 0, profit: 0 };
        }
        const qty = Number(item.quantity || 0);
        const revenue = Number(item.total || 0);
        const unitCost = Number(item.purchaseCost || 0);

        itemSales[item.name].quantity += qty;
        itemSales[item.name].revenue += revenue;
        itemSales[item.name].cost += unitCost * qty;
      });
    });

    Object.values(itemSales).forEach((row) => {
      row.profit = (row.revenue || 0) - (row.cost || 0);
    });

    const topItems = Object.values(itemSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 200);

    const monthlyRevenue = {};
    invoices.forEach(inv => {
      if (inv.date) {
        const month = inv.date.substring(0, 7);
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (inv.grandTotal || 0);
      }
    });

    res.json({
      dateRange: {
        startDate,
        endDate,
      },
      totalSales,
      outstanding,
      totalInvoices: invoices.length,
      totalQuotations: quotations.length,
      paidInvoices: paidInvoices.length,
      unpaidInvoices: unpaidInvoices.length,
      topItems,
      monthlyRevenue,
      conversionRate: quotations.length > 0 ? ((invoices.length / quotations.length) * 100).toFixed(1) : 0,
    });
  } catch (err) {
    next(err);
  }
});
