import { Router } from 'express';
import { AuditLog } from '../../models/AuditLog.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminAuditRouter = Router();

masterAdminAuditRouter.use(requireMasterAdmin);

masterAdminAuditRouter.get('/', async (req, res, next) => {
  try {
    const { tenantId, action, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (tenantId) filter.tenantId = tenantId;
    if (action) filter.action = action;

    const skip = (Number(page) - 1) * Number(limit);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('actorMasterAdminId', 'email name')
      .populate('tenantId', 'name email')
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({
      logs: logs.map(l => ({
        ...l,
        _id: String(l._id),
        actorMasterAdminId: String(l.actorMasterAdminId._id),
        actorEmail: l.actorMasterAdminId.email,
        actorName: l.actorMasterAdminId.name,
        tenantId: l.tenantId ? String(l.tenantId._id) : null,
        tenantName: l.tenantId?.name,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
});
