import { Router } from 'express';
import { Role, ALL_PERMISSIONS } from '../models/Role.js';
import { requireAuth } from '../middleware/auth.js';

export const rolesRouter = Router();

// GET /roles — list all custom roles for this owner
rolesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const roles = await Role.find({ ownerUserId: req.userId }).sort({ createdAt: 1 }).lean();
    res.json(roles);
  } catch (err) { next(err); }
});

// GET /roles/permissions — return the full list of available permissions
rolesRouter.get('/permissions', requireAuth, (_req, res) => {
  res.json(ALL_PERMISSIONS);
});

// POST /roles — create a custom role
rolesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, permissions } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Role name is required' });

    const perms = Array.isArray(permissions)
      ? permissions.filter((p) => ALL_PERMISSIONS.includes(p))
      : [];

    const existing = await Role.findOne({ ownerUserId: req.userId, name: String(name).trim() });
    if (existing) return res.status(400).json({ error: 'A role with this name already exists' });

    const role = await Role.create({ ownerUserId: req.userId, name: String(name).trim(), permissions: perms });
    res.status(201).json(role);
  } catch (err) { next(err); }
});

// PATCH /roles/:id — update a custom role
rolesRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, permissions } = req.body || {};
    const role = await Role.findOne({ _id: req.params.id, ownerUserId: req.userId });
    if (!role) return res.status(404).json({ error: 'Role not found' });

    if (name !== undefined) role.name = String(name).trim();
    if (Array.isArray(permissions)) {
      role.permissions = permissions.filter((p) => ALL_PERMISSIONS.includes(p));
    }
    await role.save();
    res.json(role);
  } catch (err) { next(err); }
});

// DELETE /roles/:id
rolesRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await Role.deleteOne({ _id: req.params.id, ownerUserId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Role not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
