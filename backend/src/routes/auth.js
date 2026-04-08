import { Router } from 'express';
import bcrypt from 'bcryptjs';

import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Subscriber } from '../models/Subscriber.js';
import { PasswordResetOtp } from '../models/PasswordResetOtp.js';
import { LicenseKey } from '../models/LicenseKey.js';
import { signAccessToken, decodeAccessToken } from '../lib/jwt.js';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { invalidateSubscriptionCache } from '../middleware/subscription.js';
import { canSendSms, sendSms } from '../lib/twilio.js';
import { canSendEmail, sendEmail } from '../lib/email.js';

export const authRouter = Router();

function generateOtp4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateReferralCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body || {};
    if (!email || !password || !phone) {
      return res.status(400).json({ error: 'Email, password and phone are required' });
    }

    const normalizedPhone = String(phone).trim();
    if (!/^\+\d{8,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Phone must be in E.164 format e.g. +919999999999' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    // Ensure every user has a shareable referral code
    let referralCode = null;
    for (let i = 0; i < 5; i += 1) {
      const candidate = generateReferralCode();
      // eslint-disable-next-line no-await-in-loop
      const exists = await User.findOne({ referralCode: candidate }).lean();
      if (!exists) {
        referralCode = candidate;
        break;
      }
    }

    const user = await User.create({
      email: String(email).toLowerCase(),
      passwordHash,
      passwordHistory: [],
      name: name ? String(name) : null,
      phone: normalizedPhone,
      referralCode,
    });

    // Create Subscriber record immediately so trial users appear in admin panel
    // and admin-set limits/trial extensions work from day 1
    await Subscriber.create({
      ownerUserId: user._id,
      name: name || String(email).split('@')[0],
      email: String(email).toLowerCase(),
      phone: normalizedPhone,
      status: 'active',
    }).catch(() => {}); // ignore duplicate key if somehow already exists

    const trialEndsAt = new Date(user.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    res.json({
      user: {
        id: String(user._id),
        email: user.email,
        user_metadata: { name: user.name },
      },
      trial: {
        active: true,
        trialEndsAt: trialEndsAt.toISOString(),
        daysRemaining: 7,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: 'Wrong password' });
    }

    const deviceId = req.header('X-Device-ID') || `web-${Date.now()}`;

    // Enforce maxSessions limit if set for this tenant
    const subscriber = await Subscriber.findOne({ ownerUserId: user._id }).lean();
    const maxSessions = subscriber?.limits?.maxSessions ?? -1;
    if (maxSessions !== -1) {
      const existingSessionCount = await Session.countDocuments({ userId: user._id });
      const alreadyHasDevice = await Session.exists({ userId: user._id, deviceId });
      if (!alreadyHasDevice && existingSessionCount >= maxSessions) {
        return res.status(403).json({
          error: 'Session limit reached',
          message: `Maximum ${maxSessions} simultaneous login(s) allowed. Please sign out from another device first.`,
          code: 'SESSION_LIMIT_REACHED',
        });
      }
    }

    await Session.findOneAndUpdate(
      { userId: user._id, deviceId },
      { $set: { lastActive: new Date() } },
      { upsert: true, new: true }
    );

    const token = signAccessToken({
      sub: String(user._id),
      user: { id: String(user._id), email: user.email, user_metadata: { name: user.name } },
    });

    res.json({
      session: { access_token: token },
      user: { id: String(user._id), email: user.email, user_metadata: { name: user.name } },
      deviceId,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/verify-session', requireAuth, requireValidDeviceSession, async (req, res) => {
  res.json({ valid: true, userId: req.userId });
});

authRouter.post('/signout', async (req, res, next) => {
  try {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (token) {
      const payload = decodeAccessToken(token);
      if (payload?.sub) {
        const deviceId = req.header('X-Device-ID');
        if (deviceId) {
          await Session.deleteOne({ userId: payload.sub, deviceId });
        } else {
          await Session.deleteMany({ userId: payload.sub });
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email, channel } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const mode = String(channel || 'sms').toLowerCase();
    const wantSms = mode === 'sms' || mode === 'both';
    const wantEmail = mode === 'email' || mode === 'both';
    if (!wantSms && !wantEmail) {
      return res.status(400).json({ error: 'Invalid channel. Use sms, email, or both.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });

    // Always respond success to avoid account enumeration.
    res.json({ ok: true });

    if (!user) return;

    const otp = generateOtp4();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordResetOtp.updateMany({ userId: user._id, usedAt: null }, { $set: { usedAt: new Date() } });
    await PasswordResetOtp.create({
      userId: user._id,
      email: user.email,
      otpHash,
      expiresAt,
      attempts: 0,
      usedAt: null,
    });

    const msg = `Hukum: Your password reset OTP is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;

    let sentAny = false;

    if (wantSms && user.phone) {
      if (canSendSms()) {
        try {
          await sendSms({ to: user.phone, body: msg });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`[OTP] SMS send failed for ${user.email} (${user.phone})`, e);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`[DEV] Password reset OTP (SMS) for ${user.email} (${user.phone}): ${otp}`);
      }
      sentAny = true;
    }

    if (wantEmail && user.email) {
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#3b6ef5,#5585ff);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;margin-bottom:12px;">
              <span style="font-size:28px;">🔐</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Password Reset OTP</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">BillVyapar · Secure Verification</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
              Hi there,<br>We received a request to reset your BillVyapar password.
              Use the OTP below to proceed.
            </p>
            <!-- OTP Box -->
            <div style="background:#f0f4ff;border:2px dashed #3b6ef5;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;">Your OTP</p>
              <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#1e3a8a;font-family:monospace;">${otp}</span>
            </div>
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-align:center;">
              ⏱ Valid for <strong>10 minutes</strong>
            </p>
            <p style="margin:0;color:#ef4444;font-size:12px;text-align:center;font-weight:600;">
              🔒 Never share this OTP with anyone, including BillVyapar support.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              If you didn't request this, you can safely ignore this email.<br>
              © 2025 BillVyapar
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
      if (canSendEmail()) {
        try {
          await sendEmail({
            to: user.email,
            subject: 'BillVyapar — Your Password Reset OTP',
            html,
          });
          // eslint-disable-next-line no-console
          console.log(`[OTP] Email sent successfully to ${user.email}`);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`[OTP] Email send FAIL for ${user.email}:`, e);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`[DEV] Password reset OTP (Email) for ${user.email}: ${otp}`);
      }
      sentAny = true;
    }

    if (!sentAny) {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Password reset requested but no deliverable channel for ${user.email}. OTP: ${otp}`);
    }
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP and newPassword are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const record = await PasswordResetOtp.findOne({
      userId: user._id,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    if ((record.attempts || 0) >= 5) {
      return res.status(400).json({ error: 'Too many attempts. Request a new OTP.' });
    }

    const ok = await bcrypt.compare(String(otp), record.otpHash);
    if (!ok) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const nextPassword = String(newPassword);
    const history = Array.isArray(user.passwordHistory) ? user.passwordHistory : [];
    const candidates = [user.passwordHash, ...history].filter(Boolean);
    for (const h of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const same = await bcrypt.compare(nextPassword, String(h));
      if (same) {
        return res.status(400).json({ error: 'You cannot reuse a previous password. Choose a new password.' });
      }
    }

    const prevHash = user.passwordHash;
    const nextHash = await bcrypt.hash(nextPassword, 10);

    const nextHistory = [prevHash, ...history].filter(Boolean);
    const max = Number(process.env.PASSWORD_HISTORY_LIMIT || 5);
    user.passwordHistory = nextHistory.slice(0, Math.max(1, max));
    user.passwordHash = nextHash;
    await user.save();

    record.usedAt = new Date();
    await record.save();

    await Session.deleteOne({ userId: user._id });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /auth/license-status — returns trial info or active license info
authRouter.get('/license-status', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const TRIAL_DAYS = 7;
    const subscriber = await Subscriber.findOne({ ownerUserId: req.userId }).lean();
    const extensionDays = Number(subscriber?.trialExtensionDays || 0);
    const trialEndsAt = new Date(user.createdAt.getTime() + (TRIAL_DAYS + extensionDays) * 24 * 60 * 60 * 1000);
    const now = new Date();
    const trialActive = now <= trialEndsAt;
    const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));

    const activeLicense = await LicenseKey.findOne({
      activatedByUserId: req.userId,
      status: 'active',
      expiresAt: { $gt: now },
    }).lean();

    if (activeLicense) {
      const daysRemaining = Math.max(0, Math.ceil((activeLicense.expiresAt - now) / (1000 * 60 * 60 * 24)));
      return res.json({
        status: 'licensed',
        license: {
          key: activeLicense.key,
          expiresAt: activeLicense.expiresAt,
          daysRemaining,
          durationDays: activeLicense.durationDays,
        },
        trial: { active: false, trialEndsAt, daysRemaining: 0 },
      });
    }

    return res.json({
      status: trialActive ? 'trial' : 'expired',
      trial: { active: trialActive, trialEndsAt, daysRemaining: trialDaysRemaining },
      license: null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/activate-license — user activates a license key
authRouter.post('/activate-license', requireAuth, async (req, res, next) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: 'License key is required' });

    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const license = await LicenseKey.findOne({ key: String(key).trim().toUpperCase() });
    if (!license) return res.status(404).json({ error: 'Invalid license key' });

    if (license.status === 'revoked') return res.status(400).json({ error: 'This license key has been revoked' });
    if (license.status === 'expired') return res.status(400).json({ error: 'This license key has expired' });
    if (license.status === 'active') {
      // Allow re-activation by the same user (e.g. re-install)
      if (String(license.activatedByUserId) !== String(req.userId)) {
        return res.status(400).json({ error: 'This license key is already in use' });
      }
      
      // License is already active and belongs to this user.
      // Return the current expiry date without extending it.
      const daysRemaining = Math.max(0, Math.ceil((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24)));
      return res.json({
        ok: true,
        license: {
          key: license.key,
          expiresAt: license.expiresAt,
          daysRemaining,
          durationDays: license.durationDays,
        },
      });
    }

    // Check email matches
    if (license.assignedEmail.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ error: 'This license key is not assigned to your email address' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + license.durationDays * 24 * 60 * 60 * 1000);

    license.status = 'active';
    license.activatedByUserId = req.userId;
    license.activatedAt = now;
    license.expiresAt = expiresAt;
    await license.save();
    invalidateSubscriptionCache(req.userId); // bust cache so next request re-checks DB

    // ── Upsert Subscriber record ──────────────────────────────────────────────
    // A user with an active license key IS a subscriber. Create or update the
    // Subscriber record so the admin panel can see them.
    await Subscriber.findOneAndUpdate(
      { ownerUserId: req.userId },
      {
        $set: {
          name: user.name || user.email.split('@')[0],
          email: user.email,
          phone: user.phone || '',
          status: 'active',
        },
        $setOnInsert: {
          ownerUserId: req.userId,
          gstin: null,
          notes: null,
        },
      },
      { upsert: true, new: true }
    );
    // ─────────────────────────────────────────────────────────────────────────

    const daysRemaining = license.durationDays;
    res.json({
      ok: true,
      license: {
        key: license.key,
        expiresAt,
        daysRemaining,
        durationDays: license.durationDays,
      },
    });
  } catch (err) {
    next(err);
  }
});
