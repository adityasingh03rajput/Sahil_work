import { Router } from 'express';
import { User } from '../../models/User.js';
import { Subscription } from '../../models/Subscription.js';
import { BusinessProfile } from '../../models/BusinessProfile.js';
import { Document } from '../../models/Document.js';
import { Customer } from '../../models/Customer.js';
import { Tenant } from '../../models/Tenant.js';
import { AuditLog } from '../../models/AuditLog.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminUsersRouter = Router();

masterAdminUsersRouter.use(requireMasterAdmin);

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

// Get all users with stats
masterAdminUsersRouter.get('/', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await User.countDocuments(filter);

    // Get stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [subscription, profileCount, documentCount, customerCount, tenant] = await Promise.all([
          Subscription.findOne({ userId: user._id }).lean(),
          BusinessProfile.countDocuments({ userId: user._id }),
          Document.countDocuments({ userId: user._id }),
          Customer.countDocuments({ userId: user._id }),
          Tenant.findOne({ ownerUserId: user._id }).lean(),
        ]);

        return {
          ...user,
          _id: String(user._id),
          subscription: subscription ? {
            plan: subscription.plan,
            endDate: subscription.endDate,
            active: subscription.active,
          } : null,
          stats: {
            profiles: profileCount,
            documents: documentCount,
            customers: customerCount,
          },
          tenant: tenant ? {
            id: String(tenant._id),
            status: tenant.status,
          } : null,
        };
      })
    );

    res.json({
      users: usersWithStats,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// Get user details
masterAdminUsersRouter.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [subscription, profiles, documents, customers, tenant] = await Promise.all([
      Subscription.findOne({ userId: user._id }).lean(),
      BusinessProfile.find({ userId: user._id }).lean(),
      Document.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Customer.find({ userId: user._id }).limit(10).lean(),
      Tenant.findOne({ ownerUserId: user._id }).lean(),
    ]);

    res.json({
      user: {
        ...user,
        _id: String(user._id),
      },
      subscription,
      profiles: profiles.map(p => ({
        ...p,
        _id: String(p._id),
      })),
      recentDocuments: documents.map(d => ({
        _id: String(d._id),
        documentNumber: d.documentNumber,
        type: d.type,
        customerName: d.customerName,
        grandTotal: d.grandTotal,
        createdAt: d.createdAt,
      })),
      recentCustomers: customers.map(c => ({
        _id: String(c._id),
        name: c.name,
        email: c.email,
        phone: c.phone,
      })),
      tenant: tenant ? {
        ...tenant,
        _id: String(tenant._id),
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

// Delete user (soft delete - mark as inactive)
masterAdminUsersRouter.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const before = user.toObject();
    
    // Mark subscription as inactive
    await Subscription.updateOne(
      { userId: user._id },
      { $set: { active: false } }
    );

    await logAudit(req.masterAdminId, 'user_deactivated', null, before, { active: false }, { userId: String(user._id) });

    res.json({ ok: true, message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
});

// Convert user to tenant
masterAdminUsersRouter.post('/:id/convert-to-tenant', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a tenant
    const existingTenant = await Tenant.findOne({ ownerUserId: user._id });
    if (existingTenant) {
      return res.status(400).json({ error: 'User is already a tenant' });
    }

    // Get first business profile for tenant info
    const profile = await BusinessProfile.findOne({ userId: user._id });

    const tenant = await Tenant.create({
      ownerUserId: user._id,
      name: profile?.businessName || user.name || 'Unnamed Business',
      email: user.email,
      phone: user.phone,
      gstin: profile?.gstin || null,
      status: 'active',
    });

    await logAudit(req.masterAdminId, 'user_converted_to_tenant', tenant._id, null, tenant.toObject(), { userId: String(user._id) });

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
