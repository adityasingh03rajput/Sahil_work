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

    // ── Manager-controlled attendance schedule ─────────────────────────────
    // Expected daily check-in / check-out window (24h format, e.g. "09:00")
    // null = no restriction enforced
    schedule: {
      checkInTime:  { type: String, default: null },  // "HH:MM" IST
      checkOutTime: { type: String, default: null },  // "HH:MM" IST
      // GPS geofence radius (metres) around their registered workplace for
      // check-in/check-out. 0 or null = geofencing disabled for this employee.
      geofenceMeters: { type: Number, default: null },
      // Workplace location used for geofenced check-in/out
      workLocation: {
        lat:     { type: Number, default: null },
        lng:     { type: Number, default: null },
        address: { type: String, default: null },
      },
    },
  },
  { timestamps: true }
);

employeeSchema.index({ ownerUserId: 1, email: 1 }, { unique: true });

export const Employee = mongoose.model('Employee', employeeSchema);
