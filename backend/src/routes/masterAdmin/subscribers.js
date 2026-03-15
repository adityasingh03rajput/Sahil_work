import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Subscriber } from '../../models/Subscriber.js';
import { SubscriberLicense } from '../../models/SubscriberLicense.js';
import { User } from '../../models/User.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Session } from '../../models/Session.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminSubscribersRouter = Router();

masterAdminSubscribersRouter.use(requireMasterAdmin);

async function logAudit(actorId, action, subscriberId, before, after, metadata) {
  await AuditLog.create({
    actorMasterAdminId: actorId,
    tenantId: subscriberId,
    action,
    before,
    after,
    metadata,
  });
}

// Get all subscribers
masterAdminSubscribersRouter.get('/', async (req, res, next) => {
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
    const subscribers = await Subscriber.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Subscriber.countDocuments(filter);

    res.json({
      subscribers: subscribers.map(s => ({
        ...s,
        _id: String(s._id),
        ownerUserId: String(s.ownerUserId),
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// Get subscriber details
masterAdminSubscribersRouter.get('/:id', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id).lean();
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const license = await SubscriberLicense.findOne({ tenantId: subscriber._id }).populate('planId').lean();
    const user = await User.findById(subscriber.ownerUserId).lean();

    res.json({
      subscriber: {
        ...subscriber,
        _id: String(subscriber._id),
        ownerUserId: String(subscriber.ownerUserId),
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

// Create subscriber
masterAdminSubscribersRouter.post('/', async (req, res, next) => {
  try {
    const { ownerUserId, name, email, phone, gstin, notes } = req.body;

    const user = await User.findById(ownerUserId);
    if (!user) {
      return res.status(400).json({ error: 'Owner user not found' });
    }

    const existing = await Subscriber.findOne({ ownerUserId });
    if (existing) {
      return res.status(400).json({ error: 'Subscriber already exists for this user' });
    }

    const subscriber = await Subscriber.create({
      ownerUserId,
      name,
      email,
      phone,
      gstin,
      notes,
      status: 'active',
    });

    await logAudit(req.masterAdminId, 'subscriber_created', subscriber._id, null, subscriber.toObject(), null);

    res.json({
      subscriber: {
        ...subscriber.toObject(),
        _id: String(subscriber._id),
        ownerUserId: String(subscriber.ownerUserId),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update subscriber
masterAdminSubscribersRouter.put('/:id', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const before = subscriber.toObject();
    Object.assign(subscriber, req.body);
    await subscriber.save();

    await logAudit(req.masterAdminId, 'subscriber_updated', subscriber._id, before, subscriber.toObject(), null);

    res.json({
      subscriber: {
        ...subscriber.toObject(),
        _id: String(subscriber._id),
        ownerUserId: String(subscriber.ownerUserId),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Suspend subscriber
masterAdminSubscribersRouter.post('/:id/suspend', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const before = subscriber.toObject();
    subscriber.status = 'suspended';
    await subscriber.save();

    await logAudit(req.masterAdminId, 'subscriber_suspended', subscriber._id, before, subscriber.toObject(), req.body);

    res.json({ ok: true, subscriber: { ...subscriber.toObject(), _id: String(subscriber._id) } });
  } catch (err) {
    next(err);
  }
});

// Reactivate subscriber
masterAdminSubscribersRouter.post('/:id/reactivate', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const before = subscriber.toObject();
    subscriber.status = 'active';
    await subscriber.save();

    await logAudit(req.masterAdminId, 'subscriber_reactivated', subscriber._id, before, subscriber.toObject(), req.body);

    res.json({ ok: true, subscriber: { ...subscriber.toObject(), _id: String(subscriber._id) } });
  } catch (err) {
    next(err);
  }
});

// Update subscriber limits & features
masterAdminSubscribersRouter.put('/:id/limits', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });

    const before = subscriber.toObject();
    const allowedLimits = [
      'maxDocumentsPerMonth','maxCustomers','maxSuppliers','maxItems','maxProfiles',
      'maxSessions','maxPdfExportsPerMonth','maxPaymentsPerMonth','maxBankTransactions',
      'maxExtraExpenses','maxKhataEntries','maxDocumentLineItems',
    ];
    const incomingLimits = req.body.limits || {};
    const limits = {};
    for (const key of allowedLimits) {
      if (key in incomingLimits) limits[key] = Number(incomingLimits[key]);
    }

    const allowedFeatures = [
      'allowGstinLookup','allowSmsReminders','allowLogoUpload',
      'allowAnalytics','allowKhata','allowBankAccounts',
    ];
    const incomingFeatures = req.body.features || {};
    const features = {};
    for (const key of allowedFeatures) {
      if (key in incomingFeatures) features[key] = Boolean(incomingFeatures[key]);
    }

    subscriber.limits = { ...(subscriber.limits?.toObject?.() || subscriber.limits || {}), ...limits };
    subscriber.features = { ...(subscriber.features?.toObject?.() || subscriber.features || {}), ...features };
    await subscriber.save();

    await logAudit(req.masterAdminId, 'subscriber_limits_updated', subscriber._id, before, subscriber.toObject(), { limits, features });

    res.json({ ok: true, limits: subscriber.limits, features: subscriber.features });
  } catch (err) {
    next(err);
  }
});

// Extend subscriber trial
masterAdminSubscribersRouter.post('/:id/extend-trial', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });

    const days = Number(req.body.days || 0);
    if (!Number.isFinite(days) || days <= 0) {
      return res.status(400).json({ error: 'days must be a positive number' });
    }

    const before = subscriber.toObject();
    subscriber.trialExtensionDays = (subscriber.trialExtensionDays || 0) + days;
    await subscriber.save();

    await logAudit(req.masterAdminId, 'subscriber_trial_extended', subscriber._id, before, subscriber.toObject(), { days });

    res.json({ ok: true, trialExtensionDays: subscriber.trialExtensionDays });
  } catch (err) {
    next(err);
  }
});

// Reset subscriber owner password
masterAdminSubscribersRouter.post('/:id/reset-password', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id).lean();
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(subscriber.ownerUserId);
    if (!user) return res.status(404).json({ error: 'Owner user not found' });

    const bcryptLib = await import('bcryptjs');
    user.passwordHash = await bcryptLib.default.hash(newPassword, 10);
    user.passwordHistory = [];  // clear history so the new password isn't blocked
    await user.save();

    await logAudit(req.masterAdminId, 'subscriber_password_reset', subscriber._id, null, null, { userId: String(user._id) });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// List active sessions for subscriber's owner user
masterAdminSubscribersRouter.get('/:id/sessions', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id).lean();
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });

    const sessions = await Session.find({ userId: subscriber.ownerUserId })
      .sort({ lastActive: -1 })
      .lean();

    res.json({
      sessions: sessions.map(s => ({
        id: String(s._id),
        deviceId: s.deviceId,
        lastActive: s.lastActive,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Delete (logout) a specific session
masterAdminSubscribersRouter.delete('/:id/sessions/:sessionId', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id).lean();
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });

    const session = await Session.findOneAndDelete({
      _id: req.params.sessionId,
      userId: subscriber.ownerUserId,
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    await logAudit(req.masterAdminId, 'subscriber_session_deleted', subscriber._id, null, null, {
      sessionId: req.params.sessionId,
      deviceId: session.deviceId,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
