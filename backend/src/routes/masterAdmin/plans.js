import { Router } from 'express';
import { Plan } from '../../models/Plan.js';
import { AuditLog } from '../../models/AuditLog.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminPlansRouter = Router();

masterAdminPlansRouter.use(requireMasterAdmin);

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

// Get all plans
masterAdminPlansRouter.get('/', async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 }).lean();
    res.json({
      plans: plans.map(p => ({ ...p, _id: String(p._id) })),
    });
  } catch (err) {
    next(err);
  }
});

// Create plan
masterAdminPlansRouter.post('/', async (req, res, next) => {
  try {
    const plan = await Plan.create(req.body);
    await logAudit(req.masterAdminId, 'plan_created', null, null, plan.toObject(), null);

    res.json({ plan: { ...plan.toObject(), _id: String(plan._id) } });
  } catch (err) {
    next(err);
  }
});

// Update plan
masterAdminPlansRouter.put('/:id', async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const before = plan.toObject();
    Object.assign(plan, req.body);
    await plan.save();

    await logAudit(req.masterAdminId, 'plan_updated', null, before, plan.toObject(), null);

    res.json({ plan: { ...plan.toObject(), _id: String(plan._id) } });
  } catch (err) {
    next(err);
  }
});
