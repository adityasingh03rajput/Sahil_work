import mongoose from 'mongoose';

const locationPointSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  ts:  { type: Date, default: Date.now },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  // Location where the task should be performed
  location: {
    lat:     { type: Number, default: null },
    lng:     { type: Number, default: null },
    address: { type: String, default: null },
  },
  startAt:  { type: Date, default: null }, // null = 00:00 of startDate
  dueAt:    { type: Date, default: null }, // null = 00:00 of dueDate
  startDate:{ type: String, default: null }, // YYYY-MM-DD
  dueDate:  { type: String, default: null }, // YYYY-MM-DD
  status:   { type: String, enum: ['pending','in_progress','done'], default: 'pending' },
  createdAt:{ type: Date, default: Date.now },
  // Task-level time tracking — employee taps Start/Stop on the task itself
  taskCheckIn:  { type: Date, default: null },
  taskCheckOut: { type: Date, default: null },
  // When the task was marked done (auto-stamped)
  completedAt:  { type: Date, default: null },

  // ── Project link ─────────────────────────────────────────────────────────
  // Set when the task was auto-synced from a Project
  projectId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  projectTaskId: { type: mongoose.Schema.Types.ObjectId, default: null },

  // ── Per-task manager controls ─────────────────────────────────────────────
  // Expected time window for this specific task (24h HH:MM IST)
  checkInTime:  { type: String, default: null }, // must start by this time
  checkOutTime: { type: String, default: null }, // must finish by this time
  // GPS geofence for this task — 0/null = disabled
  geofenceMeters: { type: Number, default: null },
}, { _id: true });


const attendanceSchema = new mongoose.Schema(
  {
    employeeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
    profileId:   { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: true, index: true },
    date:        { type: String, required: true },
    checkInTime: { type: Date, default: null },
    checkOutTime:{ type: Date, default: null },
    status:      { type: String, enum: ['present', 'absent', 'half_day'], default: 'present' },
    note:        { type: String, default: null },

    // GPS + address at check-in / check-out
    checkInLocation: {
      lat:     { type: Number, default: null },
      lng:     { type: Number, default: null },
    },
    checkInAddress:  { type: String, default: null },

    checkOutLocation: {
      lat:     { type: Number, default: null },
      lng:     { type: Number, default: null },
    },
    checkOutAddress: { type: String, default: null },

    // Last known live location
    lastLocation: {
      lat:       { type: Number, default: null },
      lng:       { type: Number, default: null },
      updatedAt: { type: Date,   default: null },
    },

    // Full GPS trail for km calculation (sampled every ~30s via socket)
    locationHistory: { type: [locationPointSchema], default: [] },

    // Total km travelled during the shift (computed incrementally)
    totalKm: { type: Number, default: 0 },

    // Tasks assigned to this employee for this day
    tasks: { type: [taskSchema], default: [] },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
// Owner queries — filter by ownerUserId + date/month range (most common queries)
attendanceSchema.index({ ownerUserId: 1, date: 1 });
attendanceSchema.index({ ownerUserId: 1, profileId: 1, date: 1 });
// Live tracking query — filters on lastLocation.lat != null
attendanceSchema.index({ ownerUserId: 1, date: 1, 'lastLocation.lat': 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
