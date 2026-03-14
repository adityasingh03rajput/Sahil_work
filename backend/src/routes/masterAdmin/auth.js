import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { MasterAdmin } from '../../models/MasterAdmin.js';
import { signAccessToken } from '../../lib/jwt.js';
import { requireMasterAdmin } from '../../middleware/masterAdmin.js';

export const masterAdminAuthRouter = Router();

masterAdminAuthRouter.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await MasterAdmin.findOne({ email: String(email).toLowerCase() });
    if (!admin || admin.status !== 'active') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(String(password), admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = signAccessToken({
      sub: String(admin._id),
      type: 'master_admin',
      role: admin.role,
    });

    res.json({
      admin: {
        id: String(admin._id),
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
});

// --- Admin account management (super_admin only) ---

function requireSuperAdmin(req, res, next) {
  if (req.masterAdmin?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admins can manage admin accounts' });
  }
  next();
}

// List all admins
masterAdminAuthRouter.get('/admins', requireMasterAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const admins = await MasterAdmin.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    res.json({ admins: admins.map(a => ({ ...a, _id: String(a._id) })) });
  } catch (err) { next(err); }
});

// Create a new admin
masterAdminAuthRouter.post('/admins', requireMasterAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const { email, password, name, role = 'admin' } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!['admin', 'support'].includes(role)) return res.status(400).json({ error: 'Role must be admin or support' });

    const existing = await MasterAdmin.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ error: 'An admin with this email already exists' });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const admin = await MasterAdmin.create({
      email: String(email).toLowerCase(),
      passwordHash,
      name: name ? String(name) : null,
      role,
      status: 'active',
    });

    res.json({
      admin: { id: String(admin._id), email: admin.email, name: admin.name, role: admin.role, status: admin.status },
    });
  } catch (err) { next(err); }
});

// Disable / re-enable an admin
masterAdminAuthRouter.post('/admins/:id/toggle', requireMasterAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const admin = await MasterAdmin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (admin.role === 'super_admin') return res.status(400).json({ error: 'Cannot disable a super admin' });

    admin.status = admin.status === 'active' ? 'disabled' : 'active';
    await admin.save();

    res.json({ ok: true, status: admin.status });
  } catch (err) { next(err); }
});

// Reset an admin's password
masterAdminAuthRouter.post('/admins/:id/reset-password', requireMasterAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const admin = await MasterAdmin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (admin.role === 'super_admin' && String(req.masterAdmin._id) !== String(admin._id)) {
      return res.status(400).json({ error: 'Cannot reset another super admin\'s password' });
    }

    admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await admin.save();

    res.json({ ok: true });
  } catch (err) { next(err); }
});
