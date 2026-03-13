import { Router } from 'express';
import { Tenant } from '../../models/Tenant.js';
import { TenantLicense } from '../../models/TenantLicense.js';
import { User } from '../../models/User.js';
import { BusinessProfile } from '../../models/BusinessProfile.js';
import { Document } from '../../models/Document.js';
import { Customer } from '../../models/Customer.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminTenantDetailsRouter = Router();

masterAdminTenantDetailsRouter.use(requireMasterAdmin);

// Get comprehensive tenant details
masterAdminTenantDetailsRouter.get('/:id/details', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).lean();
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const [license, user, profiles, documentCount, customerCount] = await Promise.all([
      TenantLicense.findOne({ tenantId: tenant._id }).populate('planId').lean(),
      User.findById(tenant.ownerUserId).lean(),
      BusinessProfile.find({ userId: tenant.ownerUserId }).lean(),
      Document.countDocuments({ userId: tenant.ownerUserId }),
      Customer.countDocuments({ userId: tenant.ownerUserId }),
    ]);

    // Calculate days remaining
    let daysRemaining = null;
    if (license?.licenseEndAt) {
      const now = new Date();
      const end = new Date(license.licenseEndAt);
      const diff = end.getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    res.json({
      tenant: {
        ...tenant,
        _id: String(tenant._id),
        ownerUserId: String(tenant.ownerUserId),
      },
      license: license ? {
        ...license,
        _id: String(license._id),
        tenantId: String(license.tenantId),
        planId: String(license.planId._id),
        plan: license.planId,
        daysRemaining,
      } : null,
      ownerUser: user ? {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        createdAt: user.createdAt,
      } : null,
      profiles: profiles.map(p => ({
        id: String(p._id),
        businessName: p.businessName,
        gstin: p.gstin,
        email: p.email,
        phone: p.phone,
      })),
      usage: {
        documentCount,
        customerCount,
        profileCount: profiles.length,
      },
    });
  } catch (err) {
    next(err);
  }
});
