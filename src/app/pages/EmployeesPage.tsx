import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { idbGet, idbSet } from '../lib/idbCache';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { UserPlus, Pencil, Trash2, Users, ShieldCheck, Plus, CalendarDays, FolderKanban } from 'lucide-react';
import { AttendancePage } from './AttendancePage';
import { ProjectsPage } from './ProjectsPage';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomRole {
  _id: string;
  name: string;
  permissions: string[];
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  customRoleId?: string;
  isActive: boolean;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BUILT_IN_ROLES = [
  { value: 'manager',     label: 'Manager',     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'salesperson', label: 'Salesperson',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'accountant',  label: 'Accountant',   color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'viewer',      label: 'Viewer',       color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
];

const PERMISSION_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: 'Dashboard & Analytics',
    items: [
      { key: 'view_dashboard', label: 'View Dashboard' },
      { key: 'view_analytics', label: 'View Analytics' },
      { key: 'view_reports',   label: 'View GST Reports' },
    ],
  },
  {
    group: 'Documents',
    items: [
      { key: 'create_documents', label: 'Create Documents' },
      { key: 'edit_documents',   label: 'Edit Documents' },
      { key: 'delete_documents', label: 'Delete Documents' },
    ],
  },
  {
    group: 'Parties & Items',
    items: [
      { key: 'view_customers',    label: 'View Customers / Suppliers' },
      { key: 'manage_customers',  label: 'Add / Edit Customers & Suppliers' },
      { key: 'view_items',        label: 'View Items' },
      { key: 'manage_items',      label: 'Add / Edit Items' },
    ],
  },
  {
    group: 'Expenses',
    items: [
      { key: 'manage_expenses', label: 'Manage Extra Expenses' },
    ],
  },
];

const emptyEmpForm = { name: '', email: '', phone: '', password: '', role: 'salesperson', customRoleId: '' };
const emptyRoleForm = { name: '', permissions: [] as string[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleDisplayName(emp: Employee, customRoles: CustomRole[]) {
  if (emp.customRoleId) {
    return customRoles.find((r) => r._id === emp.customRoleId)?.name ?? emp.role;
  }
  return BUILT_IN_ROLES.find((r) => r.value === emp.role)?.label ?? emp.role;
}

function roleBadgeColor(emp: Employee, customRoles: CustomRole[]) {
  if (emp.customRoleId) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
  return BUILT_IN_ROLES.find((r) => r.value === emp.role)?.color ?? 'bg-gray-100 text-gray-700';
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeesPage() {
  const { accessToken, deviceId } = useAuth();
  const [tab, setTab] = useState<'employees' | 'roles' | 'attendance' | 'projects'>('employees');

  // Employees state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({ ...emptyEmpForm });
  const [empSaving, setEmpSaving] = useState(false);
  const [deleteEmp, setDeleteEmp] = useState<Employee | null>(null);

  // Roles state
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<CustomRole | null>(null);
  const [roleForm, setRoleForm] = useState({ ...emptyRoleForm });
  const [roleSaving, setRoleSaving] = useState(false);
  const [deleteRole, setDeleteRole] = useState<CustomRole | null>(null);

  const profileId = (() => {
    try {
      const raw = localStorage.getItem('currentProfile');
      if (!raw) return null;
      const p = JSON.parse(raw);
      return (typeof p === 'string' ? JSON.parse(p) : p)?.id ?? null;
    } catch { return null; }
  })();

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-Device-ID': deviceId,
  };

  // ── Data loaders ────────────────────────────────────────────────────────────

  const loadEmployees = async () => {
    if (!profileId) return;
    const cacheKey = `apicache:${profileId}:employees`;
    const TTL = 5 * 60 * 1000;
    // Show cached immediately
    const cached = await idbGet<{ data: Employee[]; cachedAt: number }>(cacheKey);
    if (cached?.data) { setEmployees(cached.data); setEmpLoading(false); }
    else setEmpLoading(true);
    // Skip network if fresh
    if (cached && Date.now() - cached.cachedAt < TTL) return;
    try {
      const res = await fetch(`${API_URL}/employees?profileId=${profileId}`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
        await idbSet(cacheKey, { data, cachedAt: Date.now() });
      }
    } catch { toast.error('Failed to load employees'); }
    finally { setEmpLoading(false); }
  };

  const loadRoles = async () => {
    const cacheKey = `apicache:roles`;
    const TTL = 10 * 60 * 1000;
    const cached = await idbGet<{ data: CustomRole[]; cachedAt: number }>(cacheKey);
    if (cached?.data) { setCustomRoles(cached.data); setRolesLoading(false); }
    else setRolesLoading(true);
    if (cached && Date.now() - cached.cachedAt < TTL) return;
    try {
      const res = await fetch(`${API_URL}/roles`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomRoles(data);
        await idbSet(cacheKey, { data, cachedAt: Date.now() });
      }
    } catch { toast.error('Failed to load roles'); }
    finally { setRolesLoading(false); }
  };

  useEffect(() => { loadEmployees(); loadRoles(); }, [profileId]);

  // ── Employee handlers ───────────────────────────────────────────────────────

  const openCreateEmp = () => {
    setEditEmp(null);
    setEmpForm({ ...emptyEmpForm });
    setEmpDialogOpen(true);
  };

  const openEditEmp = (emp: Employee) => {
    setEditEmp(emp);
    setEmpForm({
      name: emp.name, email: emp.email, phone: emp.phone ?? '',
      password: '', role: emp.customRoleId ? 'custom' : emp.role,
      customRoleId: emp.customRoleId ?? '',
    });
    setEmpDialogOpen(true);
  };

  const handleSaveEmp = async () => {
    if (!empForm.name.trim() || !empForm.email.trim()) { toast.error('Name and email are required'); return; }
    if (!editEmp && empForm.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (empForm.role === 'custom' && !empForm.customRoleId) { toast.error('Please select a custom role'); return; }
    setEmpSaving(true);
    try {
      // Parse custom role selection (value is "custom:roleId")
      let finalRole = empForm.role;
      let finalCustomRoleId: string | null = null;
      if (empForm.role.startsWith('custom:')) {
        finalCustomRoleId = empForm.role.replace('custom:', '');
        finalRole = 'custom';
      }

      const rolePayload = finalCustomRoleId
        ? { role: 'custom', customRoleId: finalCustomRoleId }
        : { role: finalRole, customRoleId: null };

      if (editEmp) {
        const body: any = { name: empForm.name, phone: empForm.phone, ...rolePayload };
        if (empForm.password) body.password = empForm.password;
        const res = await fetch(`${API_URL}/employees/${editEmp._id}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast.success('Employee updated');
      } else {
        const res = await fetch(`${API_URL}/employees`, {
          method: 'POST', headers,
          body: JSON.stringify({ name: empForm.name, email: empForm.email, phone: empForm.phone, password: empForm.password, profileId, ...rolePayload }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast.success('Employee added');
      }
      setEmpDialogOpen(false);
      await idbSet(`apicache:${profileId}:employees`, { data: [], cachedAt: 0 }); // bust cache
      loadEmployees();
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    finally { setEmpSaving(false); }
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      const res = await fetch(`${API_URL}/employees/${emp._id}`, { method: 'PATCH', headers, body: JSON.stringify({ isActive: !emp.isActive }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(emp.isActive ? 'Employee deactivated' : 'Employee activated');
      loadEmployees();
    } catch (err: any) { toast.error(err.message || 'Failed to update'); }
  };

  const handleDeleteEmp = async () => {
    if (!deleteEmp) return;
    try {
      const res = await fetch(`${API_URL}/employees/${deleteEmp._id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Employee removed');
      setDeleteEmp(null);
      await idbSet(`apicache:${profileId}:employees`, { data: [], cachedAt: 0 });
      loadEmployees();
    } catch (err: any) { toast.error(err.message || 'Failed to delete'); }
  };

  // ── Role handlers ───────────────────────────────────────────────────────────

  const openCreateRole = () => {
    setEditRole(null);
    setRoleForm({ ...emptyRoleForm });
    setRoleDialogOpen(true);
  };

  const openEditRole = (r: CustomRole) => {
    setEditRole(r);
    setRoleForm({ name: r.name, permissions: [...r.permissions] });
    setRoleDialogOpen(true);
  };

  const togglePerm = (key: string) => {
    setRoleForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) { toast.error('Role name is required'); return; }
    setRoleSaving(true);
    try {
      if (editRole) {
        const res = await fetch(`${API_URL}/roles/${editRole._id}`, { method: 'PATCH', headers, body: JSON.stringify(roleForm) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast.success('Role updated');
      } else {
        const res = await fetch(`${API_URL}/roles`, { method: 'POST', headers, body: JSON.stringify(roleForm) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        toast.success('Role created');
      }
      setRoleDialogOpen(false);
      loadRoles();
    } catch (err: any) { toast.error(err.message || 'Failed to save role'); }
    finally { setRoleSaving(false); }
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    try {
      const res = await fetch(`${API_URL}/roles/${deleteRole._id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Role deleted');
      setDeleteRole(null);
      loadRoles();
    } catch (err: any) { toast.error(err.message || 'Failed to delete role'); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage staff and their access roles</p>
          </div>
        </div>
        {tab === 'employees' ? (
          <Button onClick={openCreateEmp} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Employee
          </Button>
        ) : tab === 'roles' ? (
          <Button onClick={openCreateRole} className="gap-2">
            <Plus className="h-4 w-4" /> New Role
          </Button>
        ) : null}      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
        {(['employees', 'roles', 'attendance', 'projects'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap shrink-0 capitalize ${
              tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'employees' ? <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />Employees</span>
              : t === 'roles' ? <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" />Roles</span>
              : t === 'projects' ? <span className="flex items-center gap-1.5"><FolderKanban className="h-4 w-4" />Projects</span>
              : <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Attendance</span>}
          </button>
        ))}
      </div>

      {/* ── EMPLOYEES TAB ── */}
      {tab === 'employees' && (
        <>
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-300">
            Employees log in to the <strong>BillVyapar mobile app</strong> with their email and password. Their access is controlled by their assigned role.
          </div>

          {empLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No employees yet</p>
              <p className="text-sm mt-1">Add your first employee to get started</p>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="flex flex-col gap-3 sm:hidden">
                {employees.map((emp) => (
                  <div key={emp._id} className="rounded-xl border border-border p-4 flex items-start justify-between gap-3 bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadgeColor(emp, customRoles)}`}>
                          {roleDisplayName(emp, customRoles)}
                        </span>
                        <button type="button" onClick={() => handleToggleActive(emp)}>
                          <Badge variant={emp.isActive ? 'default' : 'secondary'}>{emp.isActive ? 'Active' : 'Inactive'}</Badge>
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditEmp(emp)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteEmp(emp)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{emp.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{emp.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadgeColor(emp, customRoles)}`}>
                            {roleDisplayName(emp, customRoles)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => handleToggleActive(emp)} title={emp.isActive ? 'Click to deactivate' : 'Click to activate'}>
                            <Badge variant={emp.isActive ? 'default' : 'secondary'}>
                              {emp.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditEmp(emp)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteEmp(emp)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── ROLES TAB ── */}
      {tab === 'roles' && (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
            Create custom roles with specific permissions. Assign them to employees to control what they can see and do in the app.
          </div>

          {rolesLoading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : customRoles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No custom roles yet</p>
              <p className="text-sm mt-1">Create a role like "Delivery Boy" or "Cashier" with specific permissions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customRoles.map((r) => (
                <div key={r._id} className="rounded-xl border border-border p-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-orange-500 shrink-0" />
                      <span className="font-semibold text-foreground">{r.name}</span>
                      <span className="text-xs text-muted-foreground">({r.permissions.length} permission{r.permissions.length !== 1 ? 's' : ''})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.permissions.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No permissions assigned</span>
                      ) : r.permissions.map((p) => (
                        <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border">
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEditRole(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteRole(r)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {tab === 'attendance' && <AttendancePage />}

      {/* ── PROJECTS TAB ── */}
      {tab === 'projects' && <ProjectsPage />}

      {/* ── Employee Add/Edit Dialog ── */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editEmp ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="Employee name" value={empForm.name} onChange={(e) => setEmpForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="employee@example.com" value={empForm.email} disabled={!!editEmp} onChange={(e) => setEmpForm(f => ({ ...f, email: e.target.value }))} />
              {editEmp && <p className="text-xs text-muted-foreground">Email cannot be changed after creation</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input placeholder="+91XXXXXXXXXX" value={empForm.phone} onChange={(e) => setEmpForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={empForm.role} onValueChange={(v) => setEmpForm(f => ({ ...f, role: v, customRoleId: v !== 'custom' ? '' : f.customRoleId }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Built-in Roles</div>
                  {BUILT_IN_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  {customRoles.length > 0 && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Custom Roles</div>
                      {customRoles.map(r => <SelectItem key={r._id} value={`custom:${r._id}`}>{r.name}</SelectItem>)}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editEmp ? 'New Password (leave blank to keep)' : 'Password'}</Label>
              <Input type="password" placeholder={editEmp ? 'Leave blank to keep current' : 'Min 6 characters'} value={empForm.password} onChange={(e) => setEmpForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEmp} disabled={empSaving}>{empSaving ? 'Saving…' : editEmp ? 'Save Changes' : 'Add Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role Add/Edit Dialog ── */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRole ? 'Edit Role' : 'Create Role'}</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input placeholder="e.g. Delivery Boy, Cashier, Store Manager" value={roleForm.name} onChange={(e) => setRoleForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.group} className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.group}</p>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.key} className="flex items-center gap-2.5">
                        <Checkbox
                          id={item.key}
                          checked={roleForm.permissions.includes(item.key)}
                          onCheckedChange={() => togglePerm(item.key)}
                        />
                        <label htmlFor={item.key} className="text-sm text-foreground cursor-pointer select-none">{item.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={roleSaving}>{roleSaving ? 'Saving…' : editRole ? 'Save Changes' : 'Create Role'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Employee Confirm ── */}
      <Dialog open={!!deleteEmp} onOpenChange={(o) => !o && setDeleteEmp(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Employee</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Remove <strong>{deleteEmp?.name}</strong>? They will no longer be able to log in.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEmp(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEmp}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Role Confirm ── */}
      <Dialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Role</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Delete the role <strong>{deleteRole?.name}</strong>? Employees assigned this role will keep it until reassigned.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRole(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRole}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
