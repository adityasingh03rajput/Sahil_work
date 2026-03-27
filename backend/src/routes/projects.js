import { Router } from 'express';
import { Project } from '../models/Project.js';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { requireAuth } from '../middleware/auth.js';

export const projectsRouter = Router();

/**
 * Sync a single project task to each assigned employee's attendance record
 * for the task's startDate (or today if no startDate). Creates the attendance
 * record if one doesn't exist yet.
 */
async function syncTaskToAttendance(task, projectId, ownerUserId) {
  if (!task.assignedTo?.length) return;

  // Which date to push the task to (default to today IST if no startDate)
  const date = task.startDate ||
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const attendanceTask = {
    title:          task.title,
    description:    task.description ?? '',
    location:       task.location    ?? { lat: null, lng: null, address: null },
    startDate:      task.startDate   ?? null,
    dueDate:        task.dueDate     ?? null,
    dueAt:          task.dueDate ? new Date(`${task.dueDate}T00:00:00+05:30`) : null,
    checkInTime:    task.checkInTime    ?? null,
    checkOutTime:   task.checkOutTime   ?? null,
    geofenceMeters: task.geofenceMeters ?? null,
    projectId,
    projectTaskId:  task._id,
    status:         'pending',
  };

  await Promise.all(task.assignedTo.map(async (empId) => {
    const employee = await Employee.findById(empId).select('ownerUserId profileId').lean();
    if (!employee) return;

    // Upsert attendance record for that employee+date, then push the task
    await Attendance.findOneAndUpdate(
      { employeeId: empId, date },
      {
        $setOnInsert: {
          employeeId:  empId,
          ownerUserId: employee.ownerUserId,
          profileId:   employee.profileId,
          date,
          status:      'present',
        },
        $push: { tasks: attendanceTask },
      },
      { upsert: true, new: true }
    );
  }));
}

// GET /projects
projectsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { profileId, status } = req.query;
    const filter = { ownerUserId: req.userId };
    if (profileId) filter.profileId = profileId;
    if (status) filter.status = status;
    const projects = await Project.find(filter)
      .populate('members', 'name email role schedule')
      .populate('tasks.assignedTo', 'name email')
      .sort({ createdAt: -1 }).lean();
    res.json(projects);
  } catch (err) { next(err); }
});

// POST /projects
projectsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, description, profileId, members, tasks, startDate, dueDate } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!profileId) return res.status(400).json({ error: 'profileId is required' });

    const project = await Project.create({
      ownerUserId: req.userId,
      profileId,
      name: name.trim(),
      description: description?.trim() ?? '',
      members: members ?? [],
      tasks: (tasks ?? []).map((t) => ({
        title:          t.title?.trim(),
        description:    t.description?.trim() ?? '',
        assignedTo:     t.assignedTo ?? [],
        startDate:      t.startDate ?? null,
        dueDate:        t.dueDate ?? null,
        dueAt:          t.dueDate ? new Date(`${t.dueDate}T00:00:00+05:30`) : null,
        location:       t.location ?? { lat: null, lng: null, address: null },
        checkInTime:    t.checkInTime    ?? null,
        checkOutTime:   t.checkOutTime   ?? null,
        geofenceMeters: t.geofenceMeters ?? null,
        status:         'pending',
      })),
      startDate: startDate ?? null,
      dueDate: dueDate ?? null,
    });

    // Sync initial tasks to attendance records
    for (const task of project.tasks) {
      await syncTaskToAttendance(task, project._id, req.userId);
    }

    const populated = await Project.findById(project._id)
      .populate('members', 'name email role schedule')
      .populate('tasks.assignedTo', 'name email').lean();
    res.status(201).json(populated);
  } catch (err) { next(err); }
});

// GET /projects/my — employee: projects they are a member of
// MUST be before /:id to avoid Express treating "my" as an id param
projectsRouter.get('/my', requireAuth, async (req, res, next) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser || tokenUser.userType !== 'employee') return res.status(403).json({ error: 'Forbidden' });
    const projects = await Project.find({ members: req.userId, status: { $ne: 'archived' } })
      .populate('members', 'name email')
      .populate('tasks.assignedTo', 'name email')
      .sort({ createdAt: -1 }).lean();
    res.json(projects);
  } catch (err) { next(err); }
});

// PATCH /projects/:id
projectsRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, description, status, members, startDate, dueDate } = req.body || {};
    const update = {};
    if (name) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (status) update.status = status;
    if (members) update.members = members;
    if (startDate !== undefined) update.startDate = startDate;
    if (dueDate !== undefined) update.dueDate = dueDate;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId },
      update, { new: true }
    ).populate('members', 'name email role schedule').populate('tasks.assignedTo', 'name email').lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// DELETE /projects/:id
projectsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await Project.findOneAndDelete({ _id: req.params.id, ownerUserId: req.userId });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /projects/:id/tasks
// Accepts: title, description, assignedTo, dueDate, startDate, location,
//          checkInTime, checkOutTime, geofenceMeters
// Auto-syncs the task to each assigned employee's Attendance record.
projectsRouter.post('/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const {
      title, description, assignedTo, dueDate, startDate, location,
      checkInTime, checkOutTime, geofenceMeters,
    } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

    // Validate time format, if provided
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (checkInTime  && !timeRe.test(checkInTime))  return res.status(400).json({ error: 'checkInTime must be HH:MM' });
    if (checkOutTime && !timeRe.test(checkOutTime)) return res.status(400).json({ error: 'checkOutTime must be HH:MM' });

    const task = {
      title:          title.trim(),
      description:    description?.trim() ?? '',
      assignedTo:     assignedTo ?? [],
      startDate:      startDate ?? null,
      dueDate:        dueDate ?? null,
      dueAt:          dueDate ? new Date(`${dueDate}T00:00:00+05:30`) : null,
      location:       location ?? { lat: null, lng: null, address: null },
      checkInTime:    checkInTime    ?? null,
      checkOutTime:   checkOutTime   ?? null,
      geofenceMeters: geofenceMeters != null ? Math.max(0, Number(geofenceMeters)) : null,
      status:         'pending',
    };

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId },
      { $push: { tasks: task } }, { new: true }
    ).populate('members', 'name email role schedule').populate('tasks.assignedTo', 'name email').lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Sync the newly created task to attendance records
    const newTask = project.tasks[project.tasks.length - 1];
    await syncTaskToAttendance(newTask, project._id, req.userId);

    res.json(project);
  } catch (err) { next(err); }
});

// PATCH /projects/:id/tasks/:taskId
// Also accepts checkInTime, checkOutTime, geofenceMeters
projectsRouter.patch('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const { status, assignedTo, title, description, dueDate, startDate, checkInTime, checkOutTime, geofenceMeters } = req.body || {};
    const set = {};
    if (status)                         set['tasks.$.status']      = status;
    if (assignedTo)                     set['tasks.$.assignedTo']  = assignedTo;
    if (title)                          set['tasks.$.title']       = title.trim();
    if (description !== undefined)      set['tasks.$.description'] = description.trim();
    if (dueDate !== undefined)        { set['tasks.$.dueDate'] = dueDate; set['tasks.$.dueAt'] = dueDate ? new Date(`${dueDate}T00:00:00+05:30`) : null; }
    if (startDate !== undefined)        set['tasks.$.startDate']       = startDate;
    if (checkInTime !== undefined)      set['tasks.$.checkInTime']     = checkInTime || null;
    if (checkOutTime !== undefined)     set['tasks.$.checkOutTime']    = checkOutTime || null;
    if (geofenceMeters !== undefined)   set['tasks.$.geofenceMeters']  = geofenceMeters != null ? Math.max(0, Number(geofenceMeters)) : null;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId, 'tasks._id': req.params.taskId },
      { $set: set }, { new: true }
    ).populate('members', 'name email role schedule').populate('tasks.assignedTo', 'name email').lean();
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// DELETE /projects/:id/tasks/:taskId
projectsRouter.delete('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId },
      { $pull: { tasks: { _id: req.params.taskId } } }, { new: true }
    ).populate('members', 'name email role schedule').populate('tasks.assignedTo', 'name email').lean();
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) { next(err); }
});
