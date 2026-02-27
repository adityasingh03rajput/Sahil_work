import { Router } from 'express';
import bcrypt from 'bcryptjs';

import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { Session } from '../models/Session.js';
import { PasswordResetOtp } from '../models/PasswordResetOtp.js';
import { signAccessToken } from '../lib/jwt.js';
import { requireAuth, requireValidDeviceSession } from '../middleware/auth.js';
import { canSendSms, sendSms } from '../lib/twilio.js';

export const authRouter = Router();

function generateOtp4() {
  return String(Math.floor(1000 + Math.random() * 9000));
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
    const user = await User.create({
      email: String(email).toLowerCase(),
      passwordHash,
      passwordHistory: [],
      name: name ? String(name) : null,
      phone: normalizedPhone,
    });

    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          plan: 'trial',
          startDate,
          endDate,
          active: true,
          previousPlan: null,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      user: {
        id: String(user._id),
        email: user.email,
        user_metadata: { name: user.name },
      },
      subscription: {
        userId: String(subscription.userId),
        plan: subscription.plan,
        startDate: subscription.startDate.toISOString(),
        endDate: subscription.endDate.toISOString(),
        active: subscription.active,
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
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const deviceId = req.header('X-Device-ID') || `web-${Date.now()}`;

    const existingSession = await Session.findOne({ userId: user._id });
    if (existingSession && existingSession.deviceId && existingSession.deviceId !== deviceId) {
      const lockMinutes = Number(process.env.SESSION_LOCK_MINUTES || 60 * 24);
      const maxAgeMs = Math.max(1, lockMinutes) * 60 * 1000;
      const lastActiveMs = existingSession.lastActive ? new Date(existingSession.lastActive).getTime() : 0;
      const isActive = Date.now() - lastActiveMs < maxAgeMs;
      if (isActive) {
        return res.status(409).json({
          error: 'Account already opened on another device. Use Forgot Password to continue.',
          code: 'ALREADY_LOGGED_IN_ANOTHER_DEVICE',
        });
      }
    }

    await Session.findOneAndUpdate(
      { userId: user._id },
      { $set: { deviceId, lastActive: new Date() } },
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

authRouter.post('/signout', requireAuth, async (req, res, next) => {
  try {
    await Session.deleteOne({ userId: req.userId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });

    // Always respond success to avoid account enumeration.
    res.json({ ok: true });

    if (!user || !user.phone) return;

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
    if (canSendSms()) {
      await sendSms({ to: user.phone, body: msg });
    } else {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Password reset OTP for ${user.email} (${user.phone}): ${otp}`);
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
