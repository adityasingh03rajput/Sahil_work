import { Router } from 'express';
import { Tenant } from '../../models/Tenant.js';
import { TenantLicense } from '../../models/TenantLicense.js';
import { User } from '../../models/User.js';
import { AuditLog } from '../../models/AuditLog.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminTenantsRouter = Router();

masterAdminTenantsRouter.use(requireMasterAdmin);

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

// Get all tenants
masterAdminTenantsRouter.get('/', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const tenants = await Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Tenant.countDocuments(filter);

    res.json({
      tenants: tenants.map(t => ({
        ...t,
        _id: String(t._id),
        ownerUserId: String(t.ownerUserId),
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// Get tenant details
masterAdminTenantsRouter.get('/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).lean();
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const license = await TenantLicense.findOne({ tenantId: tenant._id }).populate('planId').lean();
    const user = await User.findById(tenant.ownerUserId).lean();

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
      } : null,
      ownerUser: user ? {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

// Create tenant
masterAdminTenantsRouter.post('/', async (req, res, next) => {
  try {
    const { ownerUserId, name, email, phone, gstin, notes } = req.body;

    const user = await User.findById(ownerUserId);
    if (!user) {
      return res.status(400).json({ error: 'Owner user not found' });
    }

    const existingTenant = await Tenant.findOne({ ownerUserId });
    if (existingTenant) {
      return res.status(400).json({ error: 'Tenant already exists for this user' });
    }

    const tenant = await Tenant.create({
      ownerUserId,
      name,
      email,
      phone,
      gstin,
      notes,
      status: 'active',
    });

    await logAudit(req.masterAdminId, 'tenant_created', tenant._id, null, tenant.toObject(), null);

    res.json({
      tenant: {
        ...tenant.toObject(),
        _id: String(tenant._id),
        ownerUserId: String(tenant.ownerUserId),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update tenant
masterAdminTenantsRouter.put('/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const before = tenant.toObject();
    Object.assign(tenant, req.body);
    await tenant.save();

    await logAudit(req.masterAdminId, 'tenant_updated', tenant._id, before, tenant.toObject(), null);

    res.json({
      tenant: {
        ...tenant.toObject(),
        _id: String(tenant._id),
        ownerUserId: String(tenant.ownerUserId),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Suspend tenant
masterAdminTenantsRouter.post('/:id/suspend', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const before = tenant.toObject();
    tenant.status = 'suspended';
    await tenant.save();

    await logAudit(req.masterAdminId, 'tenant_suspended', tenant._id, before, tenant.toObject(), req.body);

    res.json({ ok: true, tenant: { ...tenant.toObject(), _id: String(tenant._id) } });
  } catch (err) {
    next(err);
  }
});

// Reactivate tenant
masterAdminTenantsRouter.post('/:id/reactivate', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const before = tenant.toObject();
    tenant.status = 'active';
    await tenant.save();

    await logAudit(req.masterAdminId, 'tenant_reactivated', tenant._id, before, tenant.toObject(), req.body);

    res.json({ ok: true, tenant: { ...tenant.toObject(), _id: String(tenant._id) } });
  } catch (err) {
    next(err);
  }
});
