import { Router } from 'express';
import { Subscriber } from '../../models/Subscriber.js';
import { LicenseKey } from '../../models/LicenseKey.js';
import { User } from '../../models/User.js';
import { BusinessProfile } from '../../models/BusinessProfile.js';
import { Document } from '../../models/Document.js';
import { Customer } from '../../models/Customer.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminSubscriberDetailsRouter = Router();

masterAdminSubscriberDetailsRouter.use(requireMasterAdmin);

// Get comprehensive subscriber details
masterAdminSubscriberDetailsRouter.get('/:id/details', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id).lean();
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const [licenseKey, user, profiles, documentCount, customerCount] = await Promise.all([
      // Use LicenseKey as the source of truth — it's what activate-license writes to
      LicenseKey.findOne({ activatedByUserId: subscriber.ownerUserId })
        .sort({ expiresAt: -1 })
        .lean(),
      User.findById(subscriber.ownerUserId).lean(),
      BusinessProfile.find({ userId: subscriber.ownerUserId }).lean(),
      Document.countDocuments({ userId: subscriber.ownerUserId }),
      Customer.countDocuments({ userId: subscriber.ownerUserId }),
    ]);

    const now = new Date();
    let daysRemaining = null;
    if (licenseKey?.expiresAt) {
      daysRemaining = Math.ceil((new Date(licenseKey.expiresAt) - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      subscriber: {
        ...subscriber,
        _id: String(subscriber._id),
        ownerUserId: String(subscriber.ownerUserId),
      },
      license: licenseKey ? {
        _id: String(licenseKey._id),
        key: licenseKey.key,
        status: licenseKey.status,
        durationDays: licenseKey.durationDays,
        activatedAt: licenseKey.activatedAt,
        licenseStartAt: licenseKey.activatedAt,
        licenseEndAt: licenseKey.expiresAt,
        daysRemaining,
        plan: null, // LicenseKey doesn't have a plan reference — show key info only
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
