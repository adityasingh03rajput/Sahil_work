import { Router } from 'express';
import { TenantLicense } from '../../models/TenantLicense.js';
import { Tenant } from '../../models/Tenant.js';
import { Plan } from '../../models/Plan.js';
import { AuditLog } from '../../models/AuditLog.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminLicensesRouter = Router();

masterAdminLicensesRouter.use(requireMasterAdmin);

async function logAudit(actorId, action, tenantId, before, after, metadata) {
  await AuditLog.create({
    actorMasterAdminId: actorId,
    tenantId,
    action,
    before,
    after,
    metadata,
  });
}

// Assign/update license
masterAdminLicensesRouter.post('/:tenantId', async (req, res, next) => {
  try {
    const { planId, durationDays, maxSeats, customEntitlements } = req.body;

    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const existing = await TenantLicense.findOne({ tenantId: tenant._id });
    const before = existing ? existing.toObject() : null;

    const license = await TenantLicense.findOneAndUpdate(
      { tenantId: tenant._id },
      {
        $set: {
          planId,
          licenseStartAt: now,
          licenseEndAt: endDate,
          paymentState: 'paid',
          maxSeats: maxSeats || plan.limits.maxSeats,
          customEntitlements,
        },
      },
      { upsert: true, new: true }
    );

    await logAudit(req.masterAdminId, 'license_assigned', tenant._id, before, license.toObject(), { durationDays });

    res.json({ license: { ...license.toObject(), _id: String(license._id) } });
  } catch (err) {
    next(err);
  }
});

// Extend license
masterAdminLicensesRouter.post('/:tenantId/extend', async (req, res, next) => {
  try {
    const { days } = req.body;
    if (!days || days <= 0) {
      return res.status(400).json({ error: 'Invalid days value' });
    }

    const license = await TenantLicense.findOne({ tenantId: req.params.tenantId });
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    const before = license.toObject();
    const currentEnd = new Date(license.licenseEndAt);
    license.licenseEndAt = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);
    await license.save();

    await logAudit(req.masterAdminId, 'license_extended', req.params.tenantId, before, license.toObject(), { days });

    res.json({ license: { ...license.toObject(), _id: String(license._id) } });
  } catch (err) {
    next(err);
  }
});
