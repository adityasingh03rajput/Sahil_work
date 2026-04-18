import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { requireAuth } from '../middleware/auth.js';

export const attendanceRouter = Router();

// ── Shared GPS movement threshold (Flaw #8 fix) ───────────────────────────────
// Unified 20m minimum across both socket and HTTP paths to prevent noise accumulation.
const MIN_GPS_MOVEMENT_KM = 0.020; // 20 metres
const MAX_GPS_JUMP_KM = 1;         // ignore teleports > 1km in a single ping

// ── Rate limiter for /live-location (Flaw #12 fix) ───────────────────────────
// GPS pings every ~15s = 4/min expected. 30/min gives 7× headroom for retries.
const liveLocationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.body?.employeeId || req.ip,
  message: { error: 'Too many location updates' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * In-memory set of employees currently online via the HTTP (native) path.
 * Key: `${employeeId}:${ownerUserId}`, Value: timeout handle that fires
 * employee-online:false after 60s of silence (2× the 15s GPS interval + buffer).
 *
 * This is the bridge that makes HTTP-only (native TrackingService) employees
 * appear as "Live" in the dashboard — previously, only socket-connected
 * employees got employee-online:true, so HTTP-tracking employees always
 * showed as "Offline" even though their location was updating.
 */
const httpOnlineTimers = new Map();

/**
 * POST /attendance/live-location
 * Called directly by the native Android TrackingService (Java HTTP POST).
 * ── Flaw #1 fix: verify employeeId belongs to ownerUserId before trusting data ──
 * Uses a lightweight DB check instead of a full JWT to keep the Android client simple.
 * Rate-limited to 30 req/min per employeeId (Flaw #12 fix).
 */
attendanceRouter.post('/live-location', liveLocationLimiter, async (req, res) => {
  try {
    const { employeeId, ownerUserId, name, lat, lng, accuracy, speed, heading, updatedAt } = req.body;
    if (!employeeId || !ownerUserId || lat == null || lng == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ── Flaw #1 fix: verify the employee actually belongs to this owner ───────
    const employee = await Employee.findOne({
      _id: employeeId,
      ownerUserId,
      isActive: true,
    }).select('_id').lean();
    if (!employee) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const io = req.app.get('io');
    if (io) {
      const timerKey = `${employeeId}:${ownerUserId}`;

      if (httpOnlineTimers.has(timerKey)) {
        clearTimeout(httpOnlineTimers.get(timerKey));
      }

      io.to(`owner:${ownerUserId}`).emit('employee-online', { employeeId, online: true });
      io.to(`owner:${ownerUserId}`).emit('employee-location', {
        employeeId, name, lat, lng,
        speed: speed ?? null,
        heading: heading ?? null,
        accuracy: accuracy ?? null,
        updatedAt: updatedAt || new Date().toISOString(),
      });

      const silenceTimer = setTimeout(() => {
        httpOnlineTimers.delete(timerKey);
        if (io) io.to(`owner:${ownerUserId}`).emit('employee-online', { employeeId, online: false });
      }, 60_000);
      httpOnlineTimers.set(timerKey, silenceTimer);
    }

    // Persist to Attendance DB
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const newPt = {
      lat, lng,
      ts: new Date(updatedAt || Date.now()),
      speed: speed ?? null,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
    };

    const record = await Attendance.findOne({ employeeId, date: today });
    if (record) {
      const hist = record.locationHistory || [];
      let addedKm = 0;
      if (hist.length > 0) {
        const last = hist[hist.length - 1];
        const R = 6371;
        const dLat = ((lat - last.lat) * Math.PI) / 180;
        const dLng = ((lng - last.lng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((last.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
        addedKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (addedKm < MIN_GPS_MOVEMENT_KM || addedKm > MAX_GPS_JUMP_KM) addedKm = 0;
      }
      await Attendance.findByIdAndUpdate(record._id, {
        $set: {
          lastLocation: {
            lat, lng,
            updatedAt: newPt.ts,
            speed: speed ?? null,
            heading: heading ?? null,
            accuracy: accuracy ?? null,
          },
        },
        $push: { locationHistory: { $each: [newPt], $slice: -480 } },
        $inc: { totalKm: addedKm },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[live-location] Error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** Google Places Autocomplete proxy (Legacy) — biased search suggestions */
attendanceRouter.get('/places/autocomplete', async (req, res) => {
  const { q, lat, lng } = req.query;
  if (!q || String(q).trim().length < 2) return res.json([]);

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: 'Maps key not configured' });

  try {
    const params = new URLSearchParams({
      input: String(q),
      key: key,
      language: 'en',
    });

    if (lat && lng) {
      params.set('location', `${lat},${lng}`);
      params.set('radius', '50000'); // 50km bias
    }

    const r = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`, {
      signal: AbortSignal.timeout(6000),
    });

    const data = await r.json();

    if (!r.ok || data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(502).json({ error: data.status, message: data.error_message });
    }

    const results = (data.predictions || []).map((p) => ({
      place_id: p.place_id,
      description: p.description,
      main: p.structured_formatting?.main_text ?? p.description.split(',')[0],
      secondary: p.structured_formatting?.secondary_text ?? '',
      types: p.types ?? [],
    }));

    res.json(results);
  } catch (err) {
    res.status(502).json({ error: 'PROXY_FAILURE', message: err.message });
  }
});

/** Google Places Details proxy (Legacy) — place_id → lat/lng + address */
attendanceRouter.get('/places/details', async (req, res) => {
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: 'place_id required' });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: 'Maps key not configured' });

  try {
    const params = new URLSearchParams({
      place_id: String(place_id),
      key: key,
      fields: 'geometry,name,formatted_address',
    });

    const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`, {
      signal: AbortSignal.timeout(6000),
    });

    const data = await r.json();

    if (!r.ok || data.status !== 'OK') {
      return res.status(502).json({ error: data.status, message: data.error_message });
    }

    const loc = data.result.geometry.location;
    res.json({
      lat: loc.lat,
      lng: loc.lng,
      name: data.result.name,
      address: data.result.formatted_address,
    });
  } catch (err) {
    res.status(502).json({ error: 'PROXY_FAILURE', message: err.message });
  }
});

function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Reverse geocode lat/lng → human address using Nominatim (free, no key) */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BillVyapar-Attendance/1.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Build a short readable address
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.suburb || a.neighbourhood || a.village || a.town,
      a.city || a.county,
      a.state,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(',') ?? null);
  } catch {
    return null;
  }
}

// ── Employee routes ───────────────────────────────────────────────────────────

// POST /attendance/mark
attendanceRouter.post('/mark', requireAuth, async (req, res, next) => {
  try {
    const { note, lat, lng } = req.body || {};
    const tokenUser = req.user;
    if (!tokenUser || tokenUser.userType !== 'employee') {
      return res.status(403).json({ error: 'Only employees can mark attendance' });
    }

    const employee = await Employee.findById(req.userId).lean();
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (!employee.isActive) return res.status(403).json({ error: 'Your account is deactivated' });

    const date = todayIST();
    const now = new Date();

    // ── Time Restriction Check ───────────────────────────────────────────
    // Check if it's too early for check-in or check-out based on schedule
    if (employee.schedule?.checkInTime || employee.schedule?.checkOutTime) {
      const nowHHMM = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
      
      const existing = await Attendance.findOne({ employeeId: req.userId, date });
      
      // If no record exists for today, we are trying to CHECK-IN
      if (!existing && employee.schedule.checkInTime) {
        if (nowHHMM < employee.schedule.checkInTime) {
          return res.status(403).json({
            error: `Your scheduled check-in time is ${employee.schedule.checkInTime}. It is currently ${nowHHMM}. You cannot check in early.`,
            code: 'EARLY_CHECKIN'
          });
        }
      }
      
      // If record exists but no check-out time, we are trying to CHECK-OUT
      if (existing && !existing.checkOutTime && employee.schedule.checkOutTime) {
        if (nowHHMM < employee.schedule.checkOutTime) {
          return res.status(403).json({
            error: `Your scheduled check-out time is ${employee.schedule.checkOutTime}. It is currently ${nowHHMM}. You cannot check out early.`,
            code: 'EARLY_CHECKOUT'
          });
        }
      }
    }

    const existing = await Attendance.findOne({ employeeId: req.userId, date });
    const location = (lat != null && lng != null) ? { lat: Number(lat), lng: Number(lng) } : null;

    // ── Daily Geofence Check ──────────────────────────────────────────────
    // If employee has a schedule with geofence + location, enforce it
    if (
      employee.schedule?.geofenceMeters && employee.schedule.geofenceMeters > 0 &&
      employee.schedule.workLocation?.lat != null && employee.schedule.workLocation?.lng != null
    ) {
      if (!location) {
        return res.status(400).json({ error: 'GPS location is required for attendance at this work site.', code: 'GPS_REQUIRED' });
      }
      const distKm = haversineKm(location.lat, location.lng, employee.schedule.workLocation.lat, employee.schedule.workLocation.lng);
      const distM = distKm * 1000;
      if (distM > employee.schedule.geofenceMeters) {
        return res.status(403).json({
          error: `You must be within ${employee.schedule.geofenceMeters}m of your work location. You are ${Math.round(distM)}m away.`,
          code: 'OUT_OF_RANGE',
        });
      }
    }

    if (existing) {
      if (!existing.checkOutTime) {
        existing.checkOutTime = now;
        if (location) {
          existing.checkOutLocation = location;
          existing.lastLocation = { ...location, updatedAt: now };
          // Reverse geocode checkout address (fire async, don't block response)
          reverseGeocode(location.lat, location.lng).then((addr) => {
            if (addr) Attendance.findByIdAndUpdate(existing._id, { checkOutAddress: addr }).catch(() => {});
          });
        }
        await existing.save();
        return res.json({ ok: true, action: 'checkout', record: existing });
      }
      return res.json({ ok: true, action: 'already_complete', record: existing });
    }

    // Check-in
    let checkInAddress = null;
    if (location) {
      checkInAddress = await reverseGeocode(location.lat, location.lng);
    }

    const record = await Attendance.create({
      employeeId:  employee._id,
      ownerUserId: employee.ownerUserId,
      profileId:   employee.profileId,
      date,
      checkInTime: now,
      status: 'present',
      note: note ? String(note).trim() : null,
      ...(location ? {
        checkInLocation: location,
        checkInAddress,
        lastLocation: { ...location, updatedAt: now },
        locationHistory: [{ lat: location.lat, lng: location.lng, ts: now }],
      } : {}),
    });

    res.status(201).json({ ok: true, action: 'checkin', record });
  } catch (err) { next(err); }
});

// GET /attendance/my
attendanceRouter.get('/my', requireAuth, async (req, res, next) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser || tokenUser.userType !== 'employee') {
      return res.status(403).json({ error: 'Only employees can access this' });
    }
    const { month } = req.query;
    const filter = { employeeId: req.userId };
    if (month && /^\d{4}-\d{2}$/.test(String(month))) {
      filter.date = { $gte: `${month}-01`, $lte: `${month}-31` };
    }
    const records = await Attendance.find(filter)
      .select('-locationHistory') // don't send full trail to employee
      .sort({ date: -1 }).limit(90).lean();
    res.json(records);
  } catch (err) { next(err); }
});

// GET /attendance/my/tasks — today's tasks for the logged-in employee
attendanceRouter.get('/my/tasks', requireAuth, async (req, res, next) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser || tokenUser.userType !== 'employee') {
      return res.status(403).json({ error: 'Only employees can access this' });
    }
    const date = todayIST();
    const record = await Attendance.findOne({ employeeId: req.userId, date }).select('tasks').lean();
    res.json({ tasks: record?.tasks ?? [], recordId: record?._id ?? null });
  } catch (err) { next(err); }
});

// PATCH /attendance/my/tasks/:taskId — employee updates their own task status
// Accepts optional { lat, lng } for GPS geofence validation when marking done.
attendanceRouter.patch('/my/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser || tokenUser.userType !== 'employee') {
      return res.status(403).json({ error: 'Only employees can access this' });
    }
    const { status, lat, lng } = req.body || {};
    const allowed = ['pending', 'in_progress', 'done'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const date = todayIST();

    // Load current record to check geofence before writing
    const record = await Attendance.findOne({ employeeId: req.userId, date })
      .select('tasks').lean();
    if (!record) return res.status(404).json({ error: 'No attendance record for today' });

    const task = record.tasks.find((t) => String(t._id) === req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // ── GPS geofence check ────────────────────────────────────────────────
    // Flaw #9 fix: enforced server-side for ALL status=done updates on geofenced tasks.
    // The client cannot bypass this by omitting coordinates — the server rejects it.
    if (
      status === 'done' &&
      task.geofenceMeters && task.geofenceMeters > 0 &&
      task.location?.lat != null && task.location?.lng != null
    ) {
      if (lat == null || lng == null) {
        return res.status(400).json({
          error: 'Your GPS coordinates are required to complete this on-site task.',
          code: 'GPS_REQUIRED',
        });
      }
      const distKm = haversineKm(
        Number(lat), Number(lng),
        task.location.lat, task.location.lng
      );
      const distM = distKm * 1000;
      if (distM > task.geofenceMeters) {
        return res.status(403).json({
          error: `You must be within ${task.geofenceMeters}m of the task location. You are ${Math.round(distM)}m away.`,
          code: 'OUT_OF_RANGE',
          requiredMeters: task.geofenceMeters,
          currentMeters: Math.round(distM),
        });
      }
    }

    // Build update — auto-stamp completedAt when done
    const setFields = { 'tasks.$.status': status };
    if (status === 'done')    setFields['tasks.$.completedAt'] = new Date();
    if (status !== 'done')    setFields['tasks.$.completedAt'] = null; // reset if undone

    const updated = await Attendance.findOneAndUpdate(
      { employeeId: req.userId, date, 'tasks._id': req.params.taskId },
      { $set: setFields },
      { new: true }
    ).select('tasks');
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true, tasks: updated.tasks });
  } catch (err) { next(err); }
});

// POST /attendance/my/tasks/:taskId/checkin — employee starts a task (task-level check-in)
attendanceRouter.post('/my/tasks/:taskId/checkin', requireAuth, async (req, res, next) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser || tokenUser.userType !== 'employee') return res.status(403).json({ error: 'Forbidden' });

    const date = todayIST();
    const now = new Date();
    const record = await Attendance.findOneAndUpdate(
      { employeeId: req.userId, date, 'tasks._id': req.params.taskId },
      { $set: { 'tasks.$.taskCheckIn': now, 'tasks.$.taskCheckOut': null, 'tasks.$.status': 'in_progress' } },
      { new: true }
    ).select('tasks');
    if (!record) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true, tasks: record.tasks });
  } catch (err) { next(err); }
});

// POST /attendance/my/tasks/:taskId/checkout — employee finishes a task (task-level check-out)
attendanceRouter.post('/my/tasks/:taskId/checkout', requireAuth, async (req, res, next) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser || tokenUser.userType !== 'employee') return res.status(403).json({ error: 'Forbidden' });

    const { lat, lng } = req.body || {};
    const date = todayIST();
    const now = new Date();

    // Load record to check task-specific geofence
    const record = await Attendance.findOne({ employeeId: req.userId, date }).select('tasks');
    if (!record) return res.status(404).json({ error: 'No attendance record' });

    const task = record.tasks.find(t => String(t._id) === req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // ── Task Geofence Check ───────────────────────────────────────────────
    if (task.geofenceMeters && task.geofenceMeters > 0 && task.location?.lat != null && task.location?.lng != null) {
      if (lat == null || lng == null) {
        return res.status(400).json({ error: 'GPS coordinates required for this on-site task.', code: 'GPS_REQUIRED' });
      }
      const distKm = haversineKm(Number(lat), Number(lng), task.location.lat, task.location.lng);
      const distM = distKm * 1000;
      if (distM > task.geofenceMeters) {
        return res.status(403).json({
          error: `Out of geofence range for this task. (${Math.round(distM)}m away)`,
          code: 'OUT_OF_RANGE'
        });
      }
    }

    const updated = await Attendance.findOneAndUpdate(
      { employeeId: req.userId, date, 'tasks._id': req.params.taskId },
      { $set: { 'tasks.$.taskCheckOut': now, 'tasks.$.status': 'done' } },
      { new: true }
    ).select('tasks');
    if (!record) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true, tasks: record.tasks });
  } catch (err) { next(err); }
});

// ── Owner routes ──────────────────────────────────────────────────────────────

// GET /attendance
attendanceRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { profileId, date, month, employeeId, from, to } = req.query;
    const filter = { ownerUserId: req.userId };
    if (profileId) filter.profileId = profileId;
    if (employeeId) filter.employeeId = employeeId;
    if (date) {
      filter.date = String(date);
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = String(from);
      if (to)   filter.date.$lte = String(to);
    } else if (month && /^\d{4}-\d{2}$/.test(String(month))) {
      filter.date = { $gte: `${month}-01`, $lte: `${month}-31` };
    }

    const records = await Attendance.find(filter)
      .select('-locationHistory')
      .sort({ date: -1, createdAt: -1 })
      .limit(500).lean();

    // Manual lookup instead of populate
    const empIds = [...new Set(records.map(r => String(r.employeeId)))];
    const employees = empIds.length
      ? await Employee.find({ _id: { $in: empIds } }, 'name email role schedule').lean()
      : [];
    const empMap = Object.fromEntries(employees.map(e => [String(e._id), e]));

    res.json(records.map(r => ({ ...r, employeeId: empMap[String(r.employeeId)] ?? null })));
  } catch (err) { next(err); }
});

// GET /attendance/today
attendanceRouter.get('/today', requireAuth, async (req, res, next) => {
  try {
    const { profileId } = req.query;
    const date = todayIST();
    const filter = { ownerUserId: req.userId, date };
    if (profileId) filter.profileId = profileId;

    const empFilter = { ownerUserId: req.userId, isActive: true };
    if (profileId) empFilter.profileId = profileId;

    const [records, totalEmployees] = await Promise.all([
      Attendance.find(filter).select('-locationHistory').lean(),
      Employee.countDocuments(empFilter),
    ]);

    // Manual lookup instead of populate — faster, no Mongoose overhead
    const empIds = [...new Set(records.map(r => String(r.employeeId)))];
    const employees = empIds.length
      ? await Employee.find({ _id: { $in: empIds } }, 'name email role schedule').lean()
      : [];
    const empMap = Object.fromEntries(employees.map(e => [String(e._id), e]));

    const enriched = records.map(r => ({ ...r, employeeId: empMap[String(r.employeeId)] ?? null }));
    res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=20');
    res.json({ date, totalEmployees, present: records.length, records: enriched });
  } catch (err) { next(err); }
});

// POST /attendance/location — socket-based live ping (also accumulates km)
attendanceRouter.post('/location', requireAuth, async (req, res, next) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser || tokenUser.userType !== 'employee') {
      return res.status(403).json({ error: 'Only employees can update location' });
    }
    const { lat, lng } = req.body || {};
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

    const date = todayIST();
    const now = new Date();
    const newPt = { lat: Number(lat), lng: Number(lng), ts: now };

    const record = await Attendance.findOne({ employeeId: req.userId, date });
    if (!record) return res.status(404).json({ error: 'No attendance record for today' });

    // Compute incremental km from last point
    const hist = record.locationHistory || [];
    let addedKm = 0;
    if (hist.length > 0) {
      const last = hist[hist.length - 1];
      addedKm = haversineKm(last.lat, last.lng, newPt.lat, newPt.lng);
      // Unified threshold: ignore GPS noise < 20m and teleports > 1km
      if (addedKm < MIN_GPS_MOVEMENT_KM || addedKm > MAX_GPS_JUMP_KM) addedKm = 0;
    }

    await Attendance.findByIdAndUpdate(record._id, {
      $set: { lastLocation: newPt },
      $push: { locationHistory: { $each: [newPt], $slice: -240 } },
      $inc: { totalKm: addedKm },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`owner:${record.ownerUserId}`).emit('employee-location', {
        employeeId: String(record.employeeId),
        lat: Number(lat), lng: Number(lng), updatedAt: now,
      });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /attendance/live
attendanceRouter.get('/live', requireAuth, async (req, res, next) => {
  try {
    const { profileId } = req.query;
    const date = todayIST();
    const filter = { ownerUserId: req.userId, date, 'lastLocation.lat': { $ne: null } };
    if (profileId) filter.profileId = profileId;

    const records = await Attendance.find(filter).select('-locationHistory').lean();

    const empIds = [...new Set(records.map(r => String(r.employeeId)))];
    const employees = empIds.length
      ? await Employee.find({ _id: { $in: empIds } }, 'name email role schedule').lean()
      : [];
    const empMap = Object.fromEntries(employees.map(e => [String(e._id), e]));

    res.json(records.map(r => ({ ...r, employeeId: empMap[String(r.employeeId)] ?? null })));
  } catch (err) { next(err); }
});

// ── Task routes ───────────────────────────────────────────────────────────────

// POST /attendance/:id/tasks — owner adds a task to an attendance record
attendanceRouter.post('/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const { title, description, location, startDate, dueDate, startTime, dueTime, checkInTime, checkOutTime, geofenceMeters } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });

    // ── Flaw #10 fix: verify the record belongs to the owner's active profile ─
    // Prevents an owner from adding tasks to attendance records of a different profile.
    const existingRecord = await Attendance.findOne({ _id: req.params.id, ownerUserId: req.userId }).select('profileId').lean();
    if (!existingRecord) return res.status(404).json({ error: 'Record not found' });

    // Build startAt / dueAt — default time 00:00 if not provided
    const buildDate = (date, time) => {
      if (!date) return null;
      const t = time || '00:00';
      return new Date(`${date}T${t}:00+05:30`); // IST
    };

    const task = {
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      location: location || { lat: null, lng: null, address: null },
      startDate: startDate || null,
      dueDate: dueDate || null,
      startAt: buildDate(startDate, startTime),
      dueAt:   buildDate(dueDate, dueTime),
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      geofenceMeters: geofenceMeters != null ? Math.max(0, Number(geofenceMeters)) : null,
      status: 'pending',
    };

    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId },
      { $push: { tasks: task } },
      { new: true }
    ).select('tasks');

    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ ok: true, tasks: record.tasks });
  } catch (err) { next(err); }
});

// PATCH /attendance/:id/tasks/:taskId — update task status
attendanceRouter.patch('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const { status, title, description, location, startDate, dueDate, startTime, dueTime, checkInTime, checkOutTime, geofenceMeters } = req.body || {};
    
    // Build startAt / dueAt
    const buildDate = (date, time) => {
      if (!date) return null;
      const t = time || '00:00';
      return new Date(`${date}T${t}:00+05:30`); // IST
    };

    const setFields = {};
    if (status) {
      setFields['tasks.$.status'] = status;
      if (status === 'done') setFields['tasks.$.completedAt'] = new Date();
      if (status !== 'done') setFields['tasks.$.completedAt'] = null;
    }
    if (title) setFields['tasks.$.title'] = String(title).trim();
    if (description !== undefined) setFields['tasks.$.description'] = String(description).trim();
    if (location) setFields['tasks.$.location'] = location;
    if (startDate !== undefined) {
      setFields['tasks.$.startDate'] = startDate || null;
      setFields['tasks.$.startAt'] = buildDate(startDate, startTime);
    }
    if (dueDate !== undefined) {
      setFields['tasks.$.dueDate'] = dueDate || null;
      setFields['tasks.$.dueAt'] = buildDate(dueDate, dueTime);
    }
    if (checkInTime !== undefined) setFields['tasks.$.checkInTime'] = checkInTime || null;
    if (checkOutTime !== undefined) setFields['tasks.$.checkOutTime'] = checkOutTime || null;
    if (geofenceMeters !== undefined) setFields['tasks.$.geofenceMeters'] = geofenceMeters != null ? Math.max(0, Number(geofenceMeters)) : null;

    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId, 'tasks._id': req.params.taskId },
      { $set: setFields },
      { new: true }
    ).select('tasks');
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, tasks: record.tasks });
  } catch (err) { next(err); }
});

// DELETE /attendance/:id/tasks/:taskId
attendanceRouter.delete('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId },
      { $pull: { tasks: { _id: req.params.taskId } } },
      { new: true }
    ).select('tasks');
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, tasks: record.tasks });
  } catch (err) { next(err); }
});
