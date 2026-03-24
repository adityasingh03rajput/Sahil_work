import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    passwordHash: { type: String, required: true },
    // Built-in role (kept for backward compat) OR 'custom' when using a custom role
    role: {
      type: String,
      default: 'salesperson',
    },
    // If role === 'custom', this holds the Role._id reference
    customRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ ownerUserId: 1, email: 1 }, { unique: true });

export const Employee = mongoose.model('Employee', employeeSchema);
