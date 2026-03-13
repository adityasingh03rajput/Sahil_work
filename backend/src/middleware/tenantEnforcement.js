import { Tenant } from '../models/Tenant.js';
import { TenantLicense } from '../models/TenantLicense.js';

export async function enforceTenantAccess(req, res, next) {
  try {
    // Find tenant by user ID
    const tenant = await Tenant.findOne({ ownerUserId: req.userId });
    
    if (!tenant) {
      // User is not a tenant yet - allow access (backward compatibility)
      return next();
    }

    // Check if tenant is suspended
    if (tenant.status === 'suspended') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.',
        code: 'TENANT_SUSPENDED',
      });
    }

    // Check license
    const license = await TenantLicense.findOne({ tenantId: tenant._id });
    
    if (!license) {
      // No license assigned yet - allow access (backward compatibility)
      return next();
    }

    const now = new Date();
    const licenseEnd = new Date(license.licenseEndAt);
    const graceEnd = license.graceEndAt ? new Date(license.graceEndAt) : null;

    // Check if license is expired
    if (now > licenseEnd) {
      // Check grace period
      if (graceEnd && now <= graceEnd) {
        // In grace period - allow limited access
        req.tenantInGrace = true;
        return next();
      }

      // Expired and no grace
      return res.status(402).json({
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue.',
        code: 'LICENSE_EXPIRED',
        licenseEndAt: license.licenseEndAt,
      });
    }

    // License is valid
    req.tenant = tenant;
    req.tenantLicense = license;
    next();
  } catch (err) {
    next(err);
  }
}

export function blockCreateInGrace(req, res, next) {
  if (req.tenantInGrace && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(402).json({
      error: 'Grace period - limited access',
      message: 'Your subscription is in grace period. Renew to create or modify data.',
      code: 'GRACE_PERIOD_LIMIT',
    });
  }
  next();
}
