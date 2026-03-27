import { Router } from 'express';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { requireAuth } from '../middleware/auth.js';

export const attendanceRouter = Router();

/** Google Places Autocomplete proxy (New API) — keeps API key server-side */
attendanceRouter.get('/places/autocomplete', async (req, res) => {
  const { q, lat, lng } = req.query;
  if (!q || String(q).trim().length < 2) return res.json([]);

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: 'Maps key not configured' });

  try {
    const body = {
      input: String(q),
      languageCode: 'en',
      regionCode: 'IN',
      includedRegionCodes: ['IN'],
    };
    // Bias toward user location if provided
    if (lat && lng) {
      body.locationBias = {
        circle: {
          center: { latitude: Number(lat), longitude: Number(lng) },
          radius: 50000, // 50km
        },
      };
    }

    const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(502).json({ error: data.error?.status, message: data.error?.message });
    }

    const results = (data.suggestions || [])
      .filter((s) => s.placePrediction)
      .map((s) => {
        const p = s.placePrediction;
        return {
          place_id: p.placeId,
          description: p.text?.text ?? '',
          main: p.structuredFormat?.mainText?.text ?? p.text?.text?.split(',')[0] ?? '',
          secondary: p.structuredFormat?.secondaryText?.text ?? '',
          types: p.types ?? [],
        };
      });

    res.json(results);
  } catch (e) {
    res.status(502).json({ error: 'Places API error', message: e.message });
  }
});

/** Google Place Details (New API) — resolve place_id → lat/lng + address */
attendanceRouter.get('/places/details', async (req, res) => {
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: 'place_id required' });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: 'Maps key not configured' });

  try {
    const r = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(String(place_id))}?fields=location,formattedAddress,displayName`,
      {
        headers: { 'X-Goog-Api-Key': key },
        signal: AbortSignal.timeout(5000),
      }
    );
    const data = await r.json();

    if (!r.ok) return res.status(502).json({ error: data.error?.status, message: data.error?.message });

    res.json({
      lat: data.location?.latitude,
      lng: data.location?.longitude,
      address: data.formattedAddress ?? data.displayName?.text ?? '',
      name: data.displayName?.text ?? '',
    });
  } catch (e) {
    res.status(502).json({ error: 'Place details error', message: e.message });
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
    const existing = await Attendance.findOne({ employeeId: req.userId, date });

    const location = (lat != null && lng != null) ? { lat: Number(lat), lng: Number(lng) } : null;

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
    // Only enforced when: marking done + task has a location + geofenceMeters set
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

    const date = todayIST();
    const now = new Date();
    const record = await Attendance.findOneAndUpdate(
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
    const { profileId, date, month, employeeId } = req.query;
    const filter = { ownerUserId: req.userId };
    if (profileId) filter.profileId = profileId;
    if (employeeId) filter.employeeId = employeeId;
    if (date) {
      filter.date = String(date);
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
      ? await Employee.find({ _id: { $in: empIds } }, 'name email role').lean()
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
      ? await Employee.find({ _id: { $in: empIds } }, 'name email role').lean()
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
      // Ignore GPS noise (< 5m) and teleports (> 1km jump in one ping)
      if (addedKm < 0.005 || addedKm > 1) addedKm = 0;
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
      ? await Employee.find({ _id: { $in: empIds } }, 'name email role').lean()
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
