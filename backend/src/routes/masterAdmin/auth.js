import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { MasterAdmin } from '../../models/MasterAdmin.js';
import { signAccessToken } from '../../lib/jwt.js';

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
