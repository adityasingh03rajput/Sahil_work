import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { Customer } from '../models/Customer.js';
import { fetchGstinDetails } from '../lib/gstin.js';

export const customersRouter = Router();

customersRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

customersRouter.post('/', async (req, res, next) => {
  try {
    const data = req.body || {};
    const customer = await Customer.create({ userId: req.userId, profileId: req.profileId, ...data });

    res.json({
      id: String(customer._id),
      ...customer.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: customer.createdAt?.toISOString?.() ?? customer.createdAt,
      updatedAt: customer.updatedAt?.toISOString?.() ?? customer.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

customersRouter.get('/', async (req, res, next) => {
  try {
    const customers = await Customer.find({ userId: req.userId, profileId: req.profileId }).sort({ createdAt: 1 });
    res.json(
      customers.map(c => ({
        id: String(c._id),
        ...c.toObject(),
        _id: undefined,
        userId: undefined,
        createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
        updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

customersRouter.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid customer id' });
    }

    const customer = await Customer.findOne({ _id: id, userId: req.userId, profileId: req.profileId });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      id: String(customer._id),
      ...customer.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: customer.createdAt?.toISOString?.() ?? customer.createdAt,
      updatedAt: customer.updatedAt?.toISOString?.() ?? customer.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

customersRouter.put('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.userId,
      profileId: req.profileId,
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    Object.assign(customer, req.body || {});
    await customer.save();

    res.json({
      id: String(customer._id),
      ...customer.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: customer.createdAt?.toISOString?.() ?? customer.createdAt,
      updatedAt: customer.updatedAt?.toISOString?.() ?? customer.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

customersRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid customer id' });
    }

    const result = await Customer.deleteOne({ _id: id, userId: req.userId, profileId: req.profileId });
    if (!result?.deletedCount) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

customersRouter.post('/gstin', async (req, res, next) => {
  try {
    const { gstin } = req.body || {};
    if (!gstin) {
      return res.status(400).json({ error: 'GSTIN is required' });
    }

    const cleaned = String(gstin || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(cleaned)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' });
    }

    const gstData = await fetchGstinDetails(cleaned);

    const existing = await Customer.findOne({ userId: req.userId, profileId: req.profileId, gstin: gstData.gstin });
    if (existing) {
      return res.status(409).json({ error: 'Customer with this GSTIN already exists' });
    }

    const panFromGstin = cleaned.length >= 12 ? cleaned.slice(2, 12) : '';
    const billingAddress = String(gstData.address || '').trim() || null;
    const billingCity = String(gstData.addressParts?.loc || gstData.addressParts?.dst || '').trim() || null;
    const billingState = String(gstData.addressParts?.stcd || '').trim() || null;
    const billingPostalCode = String(gstData.addressParts?.pncd || '').trim() || null;

    const customer = await Customer.create({
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
      billingCity,
      billingState,
      billingPostalCode,
      shippingCity: billingCity,
      shippingState: billingState,
      shippingPostalCode: billingPostalCode,
      notes: `Created via GSTIN lookup. Legal: ${gstData.legalName} | Status: ${gstData.status} | Reg Date: ${gstData.registrationDate}`,
    });

    res.json({
      id: String(customer._id),
      ...customer.toObject(),
      _id: undefined,
      userId: undefined,
      createdAt: customer.createdAt?.toISOString?.() ?? customer.createdAt,
      updatedAt: customer.updatedAt?.toISOString?.() ?? customer.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

