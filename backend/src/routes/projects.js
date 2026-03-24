import { Router } from 'express';
import { Project } from '../models/Project.js';
import { requireAuth } from '../middleware/auth.js';

export const projectsRouter = Router();

// GET /projects
projectsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { profileId, status } = req.query;
    const filter = { ownerUserId: req.userId };
    if (profileId) filter.profileId = profileId;
    if (status) filter.status = status;
    const projects = await Project.find(filter)
      .populate('members', 'name email role')
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
        title: t.title?.trim(),
        description: t.description?.trim() ?? '',
        assignedTo: t.assignedTo ?? [],
        dueDate: t.dueDate ?? null,
        dueAt: t.dueDate ? new Date(`${t.dueDate}T00:00:00+05:30`) : null,
        location: t.location ?? { lat: null, lng: null, address: null },
        status: 'pending',
      })),
      startDate: startDate ?? null,
      dueDate: dueDate ?? null,
    });

    const populated = await Project.findById(project._id)
      .populate('members', 'name email role')
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
    ).populate('members', 'name email role').populate('tasks.assignedTo', 'name email').lean();
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
projectsRouter.post('/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const { title, description, assignedTo, dueDate, location } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
    const task = {
      title: title.trim(),
      description: description?.trim() ?? '',
      assignedTo: assignedTo ?? [],
      dueDate: dueDate ?? null,
      dueAt: dueDate ? new Date(`${dueDate}T00:00:00+05:30`) : null,
      location: location ?? { lat: null, lng: null, address: null },
      status: 'pending',
    };
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId },
      { $push: { tasks: task } }, { new: true }
    ).populate('members', 'name email role').populate('tasks.assignedTo', 'name email').lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// PATCH /projects/:id/tasks/:taskId
projectsRouter.patch('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const { status, assignedTo, title, description, dueDate } = req.body || {};
    const set = {};
    if (status) set['tasks.$.status'] = status;
    if (assignedTo) set['tasks.$.assignedTo'] = assignedTo;
    if (title) set['tasks.$.title'] = title.trim();
    if (description !== undefined) set['tasks.$.description'] = description.trim();
    if (dueDate !== undefined) { set['tasks.$.dueDate'] = dueDate; set['tasks.$.dueAt'] = dueDate ? new Date(`${dueDate}T00:00:00+05:30`) : null; }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerUserId: req.userId, 'tasks._id': req.params.taskId },
      { $set: set }, { new: true }
    ).populate('members', 'name email role').populate('tasks.assignedTo', 'name email').lean();
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
    ).populate('members', 'name email role').populate('tasks.assignedTo', 'name email').lean();
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) { next(err); }
});


