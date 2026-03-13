import { verifyAccessToken } from '../lib/jwt.js';
import { MasterAdmin } from '../models/MasterAdmin.js';

export async function requireMasterAdmin(req, res, next) {
  try {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const masterAdmin = await MasterAdmin.findById(payload.sub);
    if (!masterAdmin || masterAdmin.status !== 'active') {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.masterAdminId = masterAdmin._id;
    req.masterAdmin = masterAdmin;

    next();
  } catch (err) {
    next(err);
  }
}
