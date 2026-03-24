import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { FolderKanban, Plus, Trash2, Pencil, Users, CheckSquare, ChevronDown, ChevronUp, X } from 'lucide-react';

interface Employee { _id: string; name: string; email: string; role: string; }
interface ProjectTask {
  _id: string; title: string; description: string;
  assignedTo: Employee[]; status: 'pending' | 'in_progress' | 'done';
  dueDate: string | null; location?: { address?: string | null };
}
interface Project {
  _id: string; name: string; description: string;
  status: 'active' | 'completed' | 'archived';
  members: Employee[]; tasks: ProjectTask[];
  startDate: string | null; dueDate: string | null;
  createdAt: string;
}

const STATUS_COLORS = {
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  archived:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
const TASK_STATUS_COLORS = {
  pending:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  done:        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const emptyTaskForm = { title: '', description: '', dueDate: '', assignedTo: [] as string[] };

export function ProjectsPage() {
  const { accessToken, deviceId } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Create/edit project dialog
  const [projDialog, setProjDialog] = useState(false);
  const [editProj, setEditProj] = useState<Project | null>(null);
  const [projForm, setProjForm] = useState({ name: '', description: '', startDate: '', dueDate: '', members: [] as string[] });
  const [projTasks, setProjTasks] = useState<typeof emptyTaskForm[]>([]);
  const [projSaving, setProjSaving] = useState(false);

  // Add task to existing project
  const [taskDialog, setTaskDialog] = useState<string | null>(null); // projectId
  const [taskForm, setTaskForm] = useState({ ...emptyTaskForm });
  const [taskSaving, setTaskSaving] = useState(false);

  const profileId = (() => {
    try {
      const raw = localStorage.getItem('currentProfile');
      if (!raw) return null;
      const p = JSON.parse(raw);
      return (typeof p === 'string' ? JSON.parse(p) : p)?.id ?? null;
    } catch { return null; }
  })();

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId };

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`${API_URL}/projects${profileId ? `?profileId=${profileId}` : ''}`, { headers }),
        fetch(`${API_URL}/employees${profileId ? `?profileId=${profileId}` : ''}`, { headers }),
      ]);
      const [pData, eData] = await Promise.all([pRes.json(), eRes.json()]);
      if (Array.isArray(pData)) setProjects(pData);
      if (Array.isArray(eData)) setEmployees(eData);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [profileId]);

  const openCreate = () => {
    setEditProj(null);
    setProjForm({ name: '', description: '', startDate: '', dueDate: '', members: [] });
    setProjTasks([{ ...emptyTaskForm }]);
    setProjDialog(true);
  };

  const openEdit = (p: Project) => {
    setEditProj(p);
    setProjForm({ name: p.name, description: p.description, startDate: p.startDate ?? '', dueDate: p.dueDate ?? '', members: p.members.map(m => m._id) });
    setProjTasks([]);
    setProjDialog(true);
  };

  const saveProject = async () => {
    if (!projForm.name.trim()) return toast.error('Project name is required');
    setProjSaving(true);
    try {
      if (editProj) {
        const res = await fetch(`${API_URL}/projects/${editProj._id}`, { method: 'PATCH', headers, body: JSON.stringify({ name: projForm.name, description: projForm.description, members: projForm.members, startDate: projForm.startDate || null, dueDate: projForm.dueDate || null }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast.success('Project updated');
      } else {
        const validTasks = projTasks.filter(t => t.title.trim());
        const res = await fetch(`${API_URL}/projects`, { method: 'POST', headers, body: JSON.stringify({ name: projForm.name, description: projForm.description, profileId, members: projForm.members, tasks: validTasks, startDate: projForm.startDate || null, dueDate: projForm.dueDate || null }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast.success('Project created');
      }
      setProjDialog(false);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setProjSaving(false); }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE', headers });
    toast.success('Deleted');
    load();
  };

  const updateTaskStatus = async (projId: string, taskId: string, status: string) => {
    const res = await fetch(`${API_URL}/projects/${projId}/tasks/${taskId}`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (data._id) setProjects(ps => ps.map(p => p._id === projId ? data : p));
  };

  const deleteTask = async (projId: string, taskId: string) => {
    const res = await fetch(`${API_URL}/projects/${projId}/tasks/${taskId}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data._id) setProjects(ps => ps.map(p => p._id === projId ? data : p));
  };

  const addTask = async () => {
    if (!taskForm.title.trim() || !taskDialog) return toast.error('Title required');
    setTaskSaving(true);
    try {
      const res = await fetch(`${API_URL}/projects/${taskDialog}/tasks`, { method: 'POST', headers, body: JSON.stringify(taskForm) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProjects(ps => ps.map(p => p._id === taskDialog ? data : p));
      setTaskDialog(null);
      setTaskForm({ ...emptyTaskForm });
      toast.success('Task added');
    } catch (e: any) { toast.error(e.message); }
    finally { setTaskSaving(false); }
  };

  const toggleMember = (id: string, arr: string[], set: (v: string[]) => void) =>
    set(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const toggleExpand = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const progress = (p: Project) => {
    if (!p.tasks.length) return 0;
    return Math.round((p.tasks.filter(t => t.status === 'done').length / p.tasks.length) * 100);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">Group tasks and assign teams to projects</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Project</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FolderKanban className="h-14 w-14 mx-auto mb-3 opacity-25" />
          <p className="font-semibold text-base">No projects yet</p>
          <p className="text-sm mt-1">Create a project to group tasks and assign employees</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj) => {
            const pct = progress(proj);
            const isOpen = expanded.has(proj._id);
            return (
              <div key={proj._id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Project header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-foreground text-base">{proj.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[proj.status]}`}>{proj.status}</span>
                      </div>
                      {proj.description && <p className="text-sm text-muted-foreground mb-2">{proj.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{proj.members.length} member{proj.members.length !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{proj.tasks.filter(t => t.status === 'done').length}/{proj.tasks.length} tasks</span>
                        {proj.dueDate && <span>Due {proj.dueDate}</span>}
                      </div>
                      {/* Progress bar */}
                      {proj.tasks.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      )}
                      {/* Member avatars */}
                      {proj.members.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {proj.members.slice(0, 6).map(m => (
                            <div key={m._id} title={m.name} className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold border-2 border-background -ml-1 first:ml-0">
                              {m.name[0].toUpperCase()}
                            </div>
                          ))}
                          {proj.members.length > 6 && <span className="text-xs text-muted-foreground ml-1">+{proj.members.length - 6}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setTaskDialog(proj._id)} title="Add task"><Plus className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(proj)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => deleteProject(proj._id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleExpand(proj._id)}>{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
                    </div>
                  </div>
                </div>

                {/* Tasks list */}
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {proj.tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No tasks yet — click + to add one</p>
                    ) : proj.tasks.map((task) => (
                      <div key={task._id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                        {/* Status cycle button */}
                        <button type="button" onClick={() => updateTaskStatus(proj._id, task._id, task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending')}
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-green-500 border-green-500' : task.status === 'in_progress' ? 'border-yellow-500' : 'border-muted-foreground'}`}>
                          {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          {task.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-yellow-500" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                          {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {task.assignedTo.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />{task.assignedTo.map(e => e.name).join(', ')}
                              </span>
                            )}
                            {task.dueDate && <span className="text-xs text-muted-foreground">Due {task.dueDate}</span>}
                            {task.location?.address && <span className="text-xs text-muted-foreground">📍 {task.location.address}</span>}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${TASK_STATUS_COLORS[task.status]}`}>{task.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-500" onClick={() => deleteTask(proj._id, task._id)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Project Dialog ── */}
      <Dialog open={projDialog} onOpenChange={setProjDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editProj ? 'Edit Project' : 'New Project'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Project Name *</Label>
              <Input placeholder="e.g. Q1 Sales Drive" value={projForm.name} onChange={e => setProjForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea value={projForm.description} onChange={e => setProjForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={projForm.startDate} min="2020-01-01" max="2099-12-31" onChange={e => setProjForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={projForm.dueDate} min="2020-01-01" max="2099-12-31" onChange={e => setProjForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>

            {/* Member selection */}
            <div className="space-y-2">
              <Label>Team Members</Label>
              <div className="rounded-lg border border-border max-h-40 overflow-y-auto divide-y divide-border">
                {employees.length === 0 ? <p className="text-xs text-muted-foreground p-3">No employees found</p> : employees.map(emp => (
                  <label key={emp._id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30">
                    <input type="checkbox" checked={projForm.members.includes(emp._id)} onChange={() => toggleMember(emp._id, projForm.members, v => setProjForm(f => ({ ...f, members: v })))} className="rounded" />
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{emp.name[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Tasks (only on create) */}
            {!editProj && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tasks</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setProjTasks(t => [...t, { ...emptyTaskForm }])}><Plus className="h-3 w-3" /> Add Task</Button>
                </div>
                <div className="space-y-2">
                  {projTasks.map((task, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Task title" value={task.title} onChange={e => setProjTasks(ts => ts.map((t, j) => j === i ? { ...t, title: e.target.value } : t))} className="flex-1" />
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-500" onClick={() => setProjTasks(ts => ts.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                      <Input placeholder="Description (optional)" value={task.description} onChange={e => setProjTasks(ts => ts.map((t, j) => j === i ? { ...t, description: e.target.value } : t))} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={task.dueDate} min="2020-01-01" max="2099-12-31" onChange={e => setProjTasks(ts => ts.map((t, j) => j === i ? { ...t, dueDate: e.target.value } : t))} />
                        <select value="" onChange={e => { if (e.target.value) setProjTasks(ts => ts.map((t, j) => j === i ? { ...t, assignedTo: t.assignedTo.includes(e.target.value) ? t.assignedTo : [...t.assignedTo, e.target.value] } : t)); }}
                          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                          <option value="">Assign to…</option>
                          {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                        </select>
                      </div>
                      {task.assignedTo.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.assignedTo.map(id => { const emp = employees.find(e => e._id === id); return emp ? (
                            <span key={id} className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                              {emp.name}<button type="button" onClick={() => setProjTasks(ts => ts.map((t, j) => j === i ? { ...t, assignedTo: t.assignedTo.filter(x => x !== id) } : t))}><X className="h-2.5 w-2.5" /></button>
                            </span>
                          ) : null; })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjDialog(false)}>Cancel</Button>
            <Button onClick={saveProject} disabled={projSaving}>{projSaving ? 'Saving…' : editProj ? 'Save Changes' : 'Create Project'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Task to Existing Project Dialog ── */}
      <Dialog open={!!taskDialog} onOpenChange={o => !o && setTaskDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={taskForm.dueDate} min="2020-01-01" max="2099-12-31" onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <div className="rounded-lg border border-border max-h-36 overflow-y-auto divide-y divide-border">
                {employees.map(emp => (
                  <label key={emp._id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30">
                    <input type="checkbox" checked={taskForm.assignedTo.includes(emp._id)} onChange={() => toggleMember(emp._id, taskForm.assignedTo, v => setTaskForm(f => ({ ...f, assignedTo: v })))} className="rounded" />
                    <span className="text-sm text-foreground">{emp.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{emp.role}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialog(null)}>Cancel</Button>
            <Button onClick={addTask} disabled={taskSaving}>{taskSaving ? 'Adding…' : 'Add Task'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
