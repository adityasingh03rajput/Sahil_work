import mongoose from 'mongoose';

export const ALL_PERMISSIONS = [
  'view_dashboard',
  'create_documents',
  'edit_documents',
  'delete_documents',
  'view_customers',
  'manage_customers',
  'view_items',
  'manage_items',
  'view_analytics',
  'view_reports',
  'manage_expenses',
];

const roleSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    permissions: { type: [String], default: [] },
    isBuiltIn: { type: Boolean, default: false }, // reserved for future built-in roles
  },
  { timestamps: true }
);

roleSchema.index({ ownerUserId: 1, name: 1 }, { unique: true });

export const Role = mongoose.model('Role', roleSchema);
