import { Router } from 'express';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireProfile } from '../middleware/profile.js';
import { enforceFeature } from '../middleware/subscriberEnforcement.js';
import { uploadLogoDataUrl } from '../lib/cloudinary.js';

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth, requireValidDeviceSession, requireActiveSubscription, requireProfile);

uploadsRouter.post('/logo', enforceFeature('allowLogoUpload'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const dataUrl = String(body.dataUrl || body.logoDataUrl || '').trim();
    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required' });
    }

    const folder = String(body.folder || '').trim() || 'hukum/logos';
    const publicId = String(body.publicId || '').trim() || undefined;

    const uploaded = await uploadLogoDataUrl({ dataUrl, folder, publicId });
    res.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
    });
  } catch (err) {
    next(err);
  }
});
