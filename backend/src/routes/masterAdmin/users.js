import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { Subscription } from '../../models/Subscription.js';
import { BusinessProfile } from '../../models/BusinessProfile.js';
import { Document } from '../../models/Document.js';
import { Customer } from '../../models/Customer.js';
import { Subscriber } from '../../models/Subscriber.js';
import { Session } from '../../models/Session.js';
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
          Subscriber.findOne({ ownerUserId: user._id }).lean(),
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
      Subscriber.findOne({ ownerUserId: user._id }).lean(),
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

// Auto-create subscriber (tenant) record on license activation — called from auth.js
// No manual "convert to tenant" needed anymore.

// Reset user password (admin override — no old password needed)
masterAdminUsersRouter.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newHash = await bcrypt.hash(String(newPassword), 10);

    // Push old hash into history (cap at 5)
    const history = Array.isArray(user.passwordHistory) ? user.passwordHistory : [];
    user.passwordHistory = [user.passwordHash, ...history].filter(Boolean).slice(0, 5);
    user.passwordHash = newHash;
    await user.save();

    // Invalidate all existing sessions so user must re-login
    await Session.deleteMany({ userId: user._id });

    await logAudit(req.masterAdminId, 'user_password_reset', null, null, null, { userId: String(user._id) });

    res.json({ ok: true, message: 'Password updated and all sessions invalidated' });
  } catch (err) {
    next(err);
  }
});
