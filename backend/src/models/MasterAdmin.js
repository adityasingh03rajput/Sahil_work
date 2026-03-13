import mongoose from 'mongoose';

const masterAdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: null },
    role: { type: String, enum: ['super_admin', 'admin', 'support'], default: 'admin' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const MasterAdmin = mongoose.model('MasterAdmin', masterAdminSchema);
