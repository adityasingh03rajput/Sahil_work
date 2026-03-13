import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MasterAdmin } from '../models/MasterAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function createMasterAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'adityarajsir162@gmail.com';
    const password = 'adi*tya';
    const name = 'Super Admin';

    const existing = await MasterAdmin.findOne({ email });
    if (existing) {
      console.log('Master admin already exists:', email);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await MasterAdmin.create({
      email,
      passwordHash,
      name,
      role: 'super_admin',
      status: 'active',
      permissions: ['*'],
    });

    console.log('Master admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('ID:', String(admin._id));

    process.exit(0);
  } catch (error) {
    console.error('Error creating master admin:', error);
    process.exit(1);
  }
}

createMasterAdmin();
