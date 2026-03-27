import mongoose from 'mongoose';

const projectTaskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  assignedTo:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  status:      { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending' },
  startDate:   { type: String, default: null }, // YYYY-MM-DD — when to push to attendance
  dueDate:     { type: String, default: null }, // YYYY-MM-DD
  dueAt:       { type: Date,   default: null },
  location: {
    lat:     { type: Number, default: null },
    lng:     { type: Number, default: null },
    address: { type: String, default: null },
  },
  // ── Per-task manager controls ───────────────────────────────────────────
  checkInTime:    { type: String, default: null }, // "HH:MM" IST — expected start
  checkOutTime:   { type: String, default: null }, // "HH:MM" IST — expected end
  // Geofence radius in metres (0/null = disabled)
  geofenceMeters: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const projectSchema = new mongoose.Schema({
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',            required: true, index: true },
  profileId:   { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: true, index: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  tasks:       { type: [projectTaskSchema], default: [] },
  startDate:   { type: String, default: null },
  dueDate:     { type: String, default: null },
}, { timestamps: true });

export const Project = mongoose.model('Project', projectSchema);

