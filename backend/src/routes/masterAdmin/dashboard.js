import { Router } from 'express';
import { Subscriber as Tenant } from '../../models/Subscriber.js';
import { LicenseKey } from '../../models/LicenseKey.js';
import { TenantPayment } from '../../models/SubscriberPayment.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminDashboardRouter = Router();

masterAdminDashboardRouter.use(requireMasterAdmin);

masterAdminDashboardRouter.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalTenants,
      activeTenants,
      expiredTenants,
      suspendedTenants,
      expiringIn7Days,
      expiringIn30Days,
      totalRevenue,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Tenant.countDocuments({ status: 'expired' }),
      Tenant.countDocuments({ status: 'suspended' }),
      // Use LicenseKey as source of truth for expiry alerts
      LicenseKey.countDocuments({
        status: 'active',
        expiresAt: { $gte: now, $lte: sevenDaysFromNow },
      }),
      LicenseKey.countDocuments({
        status: 'active',
        expiresAt: { $gte: now, $lte: thirtyDaysFromNow },
      }),
      TenantPayment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      totalTenants,
      activeTenants,
      expiredTenants,
      suspendedTenants,
      expiringIn7Days,
      expiringIn30Days,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    next(err);
  }
});
