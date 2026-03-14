import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceLimit, enforceFeature } from '../middleware/subscriberEnforcement.js';
import { Supplier } from '../models/Supplier.js';
import { fetchGstinDetails } from '../lib/gstin.js';

export const suppliersRouter = Router();

suppliersRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

suppliersRouter.post('/', enforceLimit('maxSuppliers', (req) => Supplier.countDocuments({ userId: req.userId })), async (req, res, next) => {
  try {
    const data = req.body || {};
    const supplier = await Supplier.create({ userId: req.userId, profileId: req.profileId, ...data });

    res.json({
      id: String(supplier._id),
      ...supplier.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: supplier.createdAt?.toISOString?.() ?? supplier.createdAt,
      updatedAt: supplier.updatedAt?.toISOString?.() ?? supplier.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.get('/', async (req, res, next) => {
  try {
    const suppliers = await Supplier.find({ userId: req.userId, profileId: req.profileId }).sort({ createdAt: 1 });
    res.json(
      suppliers.map(s => ({
        id: String(s._id),
        ...s.toObject(),
        _id: undefined,
        userId: undefined,
        createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
        updatedAt: s.updatedAt?.toISOString?.() ?? s.updatedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

suppliersRouter.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid supplier id' });
    }

    const supplier = await Supplier.findOne({ _id: id, userId: req.userId, profileId: req.profileId });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({
      id: String(supplier._id),
      ...supplier.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: supplier.createdAt?.toISOString?.() ?? supplier.createdAt,
      updatedAt: supplier.updatedAt?.toISOString?.() ?? supplier.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.put('/:id', async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      userId: req.userId,
      profileId: req.profileId,
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    Object.assign(supplier, req.body || {});
    await supplier.save();

    res.json({
      id: String(supplier._id),
      ...supplier.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: supplier.createdAt?.toISOString?.() ?? supplier.createdAt,
      updatedAt: supplier.updatedAt?.toISOString?.() ?? supplier.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid supplier id' });
    }

    const result = await Supplier.deleteOne({ _id: id, userId: req.userId, profileId: req.profileId });
    if (!result?.deletedCount) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.post('/gstin/lookup', enforceFeature('allowGstinLookup'), async (req, res, next) => {
  try {
    const { gstin } = req.body || {};
    if (!gstin) {
      return res.status(400).json({ error: 'GSTIN is required' });
    }

    const cleaned = String(gstin || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(cleaned)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    let gstData;
    try {
      gstData = await fetchGstinDetails(cleaned);
    } catch (e) {
      const message = e?.message ? String(e.message) : 'GSTIN lookup failed';
      return res.status(400).json({ error: message });
    }

    const panFromGstin = cleaned.length >= 12 ? cleaned.slice(2, 12) : '';
    const billingAddress = String(gstData.address || '').trim() || '';
    const billingCity = String(gstData.addressParts?.loc || gstData.addressParts?.dst || '').trim() || '';
    const billingState = String(gstData.addressParts?.stcd || '').trim() || '';
    const billingPostalCode = String(gstData.addressParts?.pncd || '').trim() || '';

    res.json({
      gstin: String(gstData.gstin || cleaned),
      name: String(gstData.tradeNam || gstData.legalName || '').trim(),
      legalName: String(gstData.legalName || '').trim(),
      tradeName: String(gstData.tradeNam || '').trim(),
      pan: panFromGstin,
      billingAddress,
      billingCity,
      billingState,
      billingPostalCode,
      shippingAddress: billingAddress,
      shippingCity: billingCity,
      shippingState: billingState,
      shippingPostalCode: billingPostalCode,
    });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.post('/gstin', enforceFeature('allowGstinLookup'), async (req, res, next) => {
  try {
    const { gstin } = req.body || {};
    if (!gstin) {
      return res.status(400).json({ error: 'GSTIN is required' });
    }

    const cleaned = String(gstin || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(cleaned)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    let gstData;
    try {
      gstData = await fetchGstinDetails(cleaned);
    } catch (e) {
      const message = e?.message ? String(e.message) : 'GSTIN lookup failed';
      return res.status(400).json({ error: message });
    }

    const existing = await Supplier.findOne({ userId: req.userId, profileId: req.profileId, gstin: gstData.gstin });
    if (existing) {
      return res.status(409).json({ error: 'Supplier with this GSTIN already exists' });
    }

    const panFromGstin = cleaned.length >= 12 ? cleaned.slice(2, 12) : '';
    const billingAddress = String(gstData.address || '').trim() || null;
    const billingCity = String(gstData.addressParts?.loc || gstData.addressParts?.dst || '').trim() || null;
    const billingState = String(gstData.addressParts?.stcd || '').trim() || null;
    const billingPostalCode = String(gstData.addressParts?.pncd || '').trim() || null;

    const supplier = await Supplier.create({
      userId: req.userId,
      profileId: req.profileId,
      name: gstData.tradeNam || gstData.legalName,
      email: '',
      phone: '',
      gstin: gstData.gstin,
      pan: panFromGstin,
      billingAddress,
      shippingAddress: billingAddress,
      city: billingCity,
      state: billingState,
      postalCode: billingPostalCode,
      notes: `Created via GSTIN lookup. Legal: ${gstData.legalName} | Status: ${gstData.status} | Reg Date: ${gstData.registrationDate}`,
    });

    res.json({
      id: String(supplier._id),
      ...supplier.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: supplier.createdAt?.toISOString?.() ?? supplier.createdAt,
      updatedAt: supplier.updatedAt?.toISOString?.() ?? supplier.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

