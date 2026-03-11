import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';

import { User } from '../models/User.js';
import { Session } from '../models/Session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function arg(name) {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return null;
  return v;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function main() {
  const email = String(arg('--email') || '').trim().toLowerCase();
  const confirm = hasFlag('--confirm');

  if (!email) {
    throw new Error('Usage: node backend/src/scripts/force_logout_user.js --email <email> [--confirm]');
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(mongoUri);

  const user = await User.findOne({ email }).select({ _id: 1, email: 1, name: 1 }).lean();
  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  const userId = user._id;

  const sessions = await Session.find({ userId }).select({ _id: 1, deviceId: 1, lastActive: 1 }).lean();

  if (!confirm) {
    // eslint-disable-next-line no-console
    console.log('Dry run. No changes applied.');
    // eslint-disable-next-line no-console
    console.log({ email: user.email, userId: String(userId), sessions: sessions.map((s) => ({ id: String(s._id), deviceId: s.deviceId, lastActive: s.lastActive })) });
    // eslint-disable-next-line no-console
    console.log('Re-run with --confirm to delete sessions and force logout.');
    await mongoose.disconnect();
    return;
  }

  const result = await Session.deleteMany({ userId });

  // eslint-disable-next-line no-console
  console.log('Force logout complete.');
  // eslint-disable-next-line no-console
  console.log({ email: user.email, userId: String(userId), deletedSessions: Number(result?.deletedCount || 0) });

  await mongoose.disconnect();
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error(e?.message || e);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
