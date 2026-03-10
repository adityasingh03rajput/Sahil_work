import { v2 as cloudinary } from 'cloudinary';

let configured = false;

export function ensureCloudinaryConfigured() {
  if (configured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [
      !cloudName ? 'CLOUDINARY_CLOUD_NAME' : null,
      !apiKey ? 'CLOUDINARY_API_KEY' : null,
      !apiSecret ? 'CLOUDINARY_API_SECRET' : null,
    ].filter(Boolean);
    throw new Error(`Cloudinary is not configured (missing ${missing.join(', ')})`);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

export async function uploadLogoDataUrl(params) {
  ensureCloudinaryConfigured();
  const { dataUrl, folder, publicId } = params || {};
  const file = String(dataUrl || '').trim();
  if (!file) {
    const err = new Error('logo is required');
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  const res = await cloudinary.uploader.upload(file, {
    folder: folder || 'hukum/logos',
    public_id: publicId || undefined,
    overwrite: true,
    resource_type: 'image',
  });

  return {
    url: res.secure_url || res.url,
    publicId: res.public_id,
    bytes: res.bytes,
    width: res.width,
    height: res.height,
    format: res.format,
  };
}
