import { Router } from 'express';
import { Document } from '../../models/Document.js';
import { Customer } from '../../models/Customer.js';
import { Supplier } from '../../models/Supplier.js';
import { Item } from '../../models/Item.js';
import { BusinessProfile } from '../../models/BusinessProfile.js';
import { Payment } from '../../models/Payment.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminDataRouter = Router();

masterAdminDataRouter.use(requireMasterAdmin);

// Get all documents
masterAdminDataRouter.get('/documents', async (req, res, next) => {
  try {
    const { search, type, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { documentNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'email name')
      .lean();

    const total = await Document.countDocuments(filter);

    res.json({
      documents: documents.map(d => ({
        ...d,
        _id: String(d._id),
        userId: d.userId ? String(d.userId._id) : null,
        userEmail: d.userId?.email,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// Get all customers
masterAdminDataRouter.get('/customers', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'email name')
      .lean();

    const total = await Customer.countDocuments(filter);

    res.json({
      customers: customers.map(c => ({
        ...c,
        _id: String(c._id),
        userId: c.userId ? String(c.userId._id) : null,
        userEmail: c.userId?.email,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// Get all suppliers
masterAdminDataRouter.get('/suppliers', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const suppliers = await Supplier.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'email name')
      .lean();

    const total = await Supplier.countDocuments(filter);

    res.json({
      suppliers: suppliers.map(s => ({
        ...s,
        _id: String(s._id),
        userId: s.userId ? String(s.userId._id) : null,
        userEmail: s.userId?.email,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// Get all items
masterAdminDataRouter.get('/items', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'email name')
      .lean();

    const total = await Item.countDocuments(filter);

    res.json({
      items: items.map(i => ({
        ...i,
        _id: String(i._id),
        userId: i.userId ? String(i.userId._id) : null,
        userEmail: i.userId?.email,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// Get all business profiles
masterAdminDataRouter.get('/profiles', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const profiles = await BusinessProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('userId', 'email name')
      .lean();

    const total = await BusinessProfile.countDocuments(filter);

    res.json({
      profiles: profiles.map(p => ({
        ...p,
        _id: String(p._id),
        userId: p.userId ? String(p.userId._id) : null,
        userEmail: p.userId?.email,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});

// Get platform statistics
masterAdminDataRouter.get('/statistics', async (req, res, next) => {
  try {
    const [
      totalDocuments,
      totalCustomers,
      totalSuppliers,
      totalItems,
      totalProfiles,
      totalPayments,
      documentsByType,
      recentDocuments,
    ] = await Promise.all([
      Document.countDocuments(),
      Customer.countDocuments(),
      Supplier.countDocuments(),
      Item.countDocuments(),
      BusinessProfile.countDocuments(),
      Payment.countDocuments(),
      Document.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Document.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'email name')
        .lean(),
    ]);

    // Calculate total revenue
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      totals: {
        documents: totalDocuments,
        customers: totalCustomers,
        suppliers: totalSuppliers,
        items: totalItems,
        profiles: totalProfiles,
        payments: totalPayments,
        revenue: revenueResult[0]?.total || 0,
      },
      documentsByType: documentsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentDocuments: recentDocuments.map(d => ({
        _id: String(d._id),
        documentNumber: d.documentNumber,
        type: d.type,
        customerName: d.customerName,
        grandTotal: d.grandTotal,
        userEmail: d.userId?.email,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});
