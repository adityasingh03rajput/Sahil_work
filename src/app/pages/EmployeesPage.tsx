import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { UserPlus, Pencil, Trash2, Users, ShieldCheck, Plus, CalendarDays, FolderKanban, ShieldPlus, CheckCircle2, MapPin, Loader2, Search } from 'lucide-react';
import { AttendancePage } from './AttendancePage';
import { ProjectsPage } from './ProjectsPage';
import { TraceLoader } from '../components/TraceLoader';

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
  schedule?: {
    checkInTime?: string | null;
    checkOutTime?: string | null;
    geofenceMeters?: number | null;
    workLocation?: {
      lat?: number | null;
      lng?: number | null;
      address?: string | null;
    };
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BUILT_IN_ROLES = [
  { value: 'manager',     label: 'Manager',     color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  { value: 'salesperson', label: 'Salesperson',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'accountant',  label: 'Accountant',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'viewer',      label: 'Viewer',       color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
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

const emptyEmpForm = { 
  name: '', email: '', phone: '', password: '', role: 'salesperson', customRoleId: '',
  checkInTime: '', checkOutTime: '', geofenceMeters: 0, lat: 0, lng: 0, address: '', isActive: true
};
const emptyRoleForm = { name: '', permissions: [] as string[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleDisplayName(emp: Employee, customRoles: CustomRole[]) {
  if (emp.customRoleId) {
    return customRoles.find((r) => r._id === emp.customRoleId)?.name ?? emp.role;
  }
  return BUILT_IN_ROLES.find((r) => r.value === emp.role)?.label ?? emp.role;
}

function roleBadgeColor(emp: Employee, customRoles: CustomRole[]) {
  if (emp.customRoleId) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200/50';
  const role = BUILT_IN_ROLES.find((r) => r.value === emp.role);
  return role ? `${role.color} border-current/10` : 'bg-slate-100 text-slate-700 border-slate-200';
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeesPage() {
  const { accessToken, deviceId } = useAuth();
  const [tab, setTab] = useState<'employees' | 'roles' | 'attendance' | 'projects'>('employees');

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({ ...emptyEmpForm });
  const [empSaving, setEmpSaving] = useState(false);
  const [deleteEmp, setDeleteEmp] = useState<Employee | null>(null);

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<CustomRole | null>(null);
  const [roleForm, setRoleForm] = useState({ ...emptyRoleForm });
  const [roleSaving, setRoleSaving] = useState(false);
  const [deleteRole, setDeleteRole] = useState<CustomRole | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [dialogTab, setDialogTab] = useState<'identity' | 'advanced'>('identity');

  // ── Smart Location States (Gemini Integration) ──
  const GEMINI_KEY = (import.meta as any).env?.VITE_GEMINI_KEY || "";
  const [addrSuggestions, setAddrSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const lastQueriedAddr = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const suggestLocations = async (val: string) => {
    if (!val || val.length < 3) {
      setAddrSuggestions([]);
      return;
    }
    if (!GEMINI_KEY) {
      toast.error('AI Access Key Missing');
      setIsSuggesting(false);
      return;
    }
    setIsSuggesting(true);
    try {
      const prompt = `You are a geocoding suggest engine. Given this address fragment: "${val}", suggest exactly 5 real-world, complete addresses. Output ONLY a raw JSON array of strings. No markdown backticks, no text.`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!res.ok) throw new Error('API Rejected');
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) setAddrSuggestions(parsed);
      setShowSuggestions(true);
    } catch (e: any) { 
      toast.error(`AI Sync: ${e.message}`);
    }
    finally { setIsSuggesting(false); }
  };

  const smartGeocode = async (address: string) => {
    if (!address) return;
    if (!GEMINI_KEY) return toast.error('AI Access Key Missing');
    
    setIsGeocoding(true);
    setEmpForm(prev => ({ ...prev, address }));
    setShowSuggestions(false);
    try {
      const prompt = `You are as geocoding expert. For this address: "${address}", find real latitude and longitude. Output ONLY a raw JSON like: {"lat": 12.345, "lng": 67.890}. No markdown.`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!res.ok) throw new Error('API Sync Delayed');
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.lat && parsed.lng) {
        setEmpForm(prev => ({ ...prev, lat: parsed.lat, lng: parsed.lng }));
        toast.success("Coordinates Synchronized");
      }
    } catch (e: any) {
      toast.error("AI Resolution Failed");
    } finally { setIsGeocoding(false); }
  };

  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'x-device-id': deviceId || '' };

  const loadEmployees = async (search = '') => {
    try {
      const res = await fetch(`${API_URL}/employees?search=${search}`, { headers });
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch { toast.error('Network delay'); }
    finally { setEmpLoading(false); }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/roles`, { headers });
      const data = await res.json();
      setCustomRoles(Array.isArray(data) ? data : []);
    } catch { toast.error('Policy delay'); }
    finally { setRolesLoading(false); }
  };

  useEffect(() => { loadEmployees(debouncedSearch); loadRoles(); }, [debouncedSearch]);

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.isActive).length,
    inactive: employees.filter(e => !e.isActive).length
  };

  const openCreateEmp = () => {
    setEditEmp(null);
    setEmpForm({ ...emptyEmpForm });
    setDialogTab('identity');
    setEmpDialogOpen(true);
  };

  const openEditEmp = (emp: Employee) => {
    setEditEmp(emp);
    setEmpForm({
      name: emp.name, email: emp.email, phone: emp.phone || '', password: '', 
      role: emp.role, customRoleId: emp.customRoleId || '',
      checkInTime: emp.schedule?.checkInTime || '',
      checkOutTime: emp.schedule?.checkOutTime || '',
      geofenceMeters: emp.schedule?.geofenceMeters || 0,
      lat: emp.schedule?.workLocation?.lat || 0,
      lng: emp.schedule?.workLocation?.lng || 0,
      address: emp.schedule?.workLocation?.address || '',
      isActive: emp.isActive
    });
    setDialogTab('identity');
    setEmpDialogOpen(true);
  };

  const saveEmp = async () => {
    if (!empForm.name || !empForm.email) return toast.error('Name & Email required');
    setEmpSaving(true);
    try {
      const profileId = localStorage.getItem('selectedProfileId');
      const finalRole = empForm.role === 'custom' ? 'viewer' : empForm.role;
      const finalCustomRoleId = empForm.role === 'custom' ? empForm.customRoleId : null;

      const body: any = {
        name: empForm.name, email: empForm.email, phone: empForm.phone,
        role: finalRole, customRoleId: finalCustomRoleId,
        isActive: empForm.isActive,
        profileId,
        schedule: {
          checkInTime: empForm.checkInTime || null,
          checkOutTime: empForm.checkOutTime || null,
          geofenceMeters: Number(empForm.geofenceMeters) || 0,
          workLocation: {
            lat: Number(empForm.lat) || 0,
            lng: Number(empForm.lng) || 0,
            address: empForm.address || ''
          }
        }
      };
      if (empForm.password) body.password = empForm.password;

      const res = await fetch(`${API_URL}/employees${editEmp ? `/${editEmp._id}` : ''}`, {
        method: editEmp ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(editEmp ? 'Updated Identity' : 'Created Identity');
      setEmpDialogOpen(false);
      loadEmployees(debouncedSearch);
    } catch (e: any) { toast.error(e.message); }
    finally { setEmpSaving(false); }
  };

  const confirmDeleteEmp = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success('Removed');
        setDeleteEmp(null);
        loadEmployees();
      }
    } catch { toast.error('Delete failed'); }
  };

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

  const saveRole = async () => {
    if (!roleForm.name.trim()) return toast.error('Name required');
    setRoleSaving(true);
    try {
      const res = await fetch(`${API_URL}/roles${editRole ? `/${editRole._id}` : ''}`, {
        method: editRole ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(roleForm)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Policy saved');
      setRoleDialogOpen(false);
      loadRoles();
    } catch (e: any) { toast.error(e.message); }
    finally { setRoleSaving(false); }
  };

  const confirmDeleteRole = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/roles/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success('Policy removed');
        setDeleteRole(null);
        loadRoles();
      }
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/20">
      {/* DESKTOP HEADER */}
      <header className="hidden md:block sticky top-0 z-40 w-full bg-background/60 backdrop-blur-2xl border-b border-border/40 px-6 py-6 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tightest text-foreground leading-none">Organization Hub</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">System Version V1</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(tab === 'employees' || tab === 'roles') && (
                <div className="relative group">
                  <Input
                    placeholder={`Search ${tab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 w-40 md:w-72 pl-10 rounded-2xl bg-muted/20 border-border/40 focus:bg-background transition-all text-xs font-bold"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary" />
                </div>
              )}
              {tab === 'employees' && (
                <Button onClick={openCreateEmp} size="sm" className="h-11 px-6 rounded-2xl gap-2 font-black bg-primary text-white shadow-xl shadow-primary/20 transition-all active:scale-95">
                  <UserPlus className="h-4 w-4" /> Add Staff
                </Button>
              )}
              {tab === 'roles' && (
                <Button onClick={openCreateRole} size="sm" className="h-11 px-6 rounded-2xl gap-2 font-black bg-orange-600 text-white shadow-xl shadow-orange-500/20 transition-all active:scale-95">
                  <ShieldPlus className="h-4 w-4" /> New Policy
                </Button>
              )}
                {tab === 'projects' && (
                <Button id="new-project-header-btn" onClick={() => document.getElementById('new-project-hidden-trigger')?.click()} size="sm" className="h-11 px-6 rounded-2xl gap-2 font-black bg-primary text-white shadow-xl shadow-primary/20 active:scale-95">
                  <Plus className="h-4 w-4" /> New Project
                </Button>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {(['employees', 'roles', 'attendance', 'projects'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`relative px-5 py-2.5 text-xs font-black transition-all rounded-xl uppercase tracking-widest ${tab === t ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}>
                {t}
                {tab === t && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary rounded-full blur-[1px]" />}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <div className="md:hidden pt-10 pb-6 px-6 space-y-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-foreground">Force Hub</h1>
              <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Operational Center V1</p>
            </div>
            <Button 
                onClick={tab === 'employees' ? openCreateEmp : tab === 'roles' ? openCreateRole : undefined}
                className="w-12 h-12 rounded-2xl p-0 bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-xl shadow-primary/10 border border-primary/20 transition-all active:scale-90"
                title={tab === 'employees' ? 'Add Staff' : 'Add Role'}
              >
                <Plus className="h-6 w-6" />
            </Button>
        </div>

        <div className="relative">
          <Input placeholder={`Search ${tab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-12 w-full pl-11 rounded-full bg-card border-border/40 focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/40" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
          {(['employees', 'roles', 'attendance', 'projects'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-6 py-2 rounded-full text-xs font-bold capitalize transition-all border ${tab === t ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-muted/30 border-transparent text-muted-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT CANVAS */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10 space-y-8 pb-40 md:pb-10">
        {(tab === 'employees' || tab === 'roles') && (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 md:grid md:grid-cols-3 no-scrollbar">
            <div className="flex-shrink-0 w-[200px] md:w-auto p-6 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Total Force</span>
              <p className="text-4xl font-black text-foreground tracking-tighter">{stats.total}</p>
            </div>
            <div className="flex-shrink-0 w-[200px] md:w-auto p-6 rounded-3xl border border-primary/20 bg-primary/5 backdrop-blur-md">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-60">Active Nodes</span>
              <p className="text-4xl font-black text-primary tracking-tighter">{stats.active}</p>
            </div>
            <div className="flex-shrink-0 w-[200px] md:w-auto p-6 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Standby</span>
              <p className="text-4xl font-black text-foreground tracking-tighter">{stats.inactive}</p>
            </div>
          </div>
        )}

        <div className="relative">
          {tab === 'employees' && (
            <div className="space-y-6">
              {/* DESKTOP GRID */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
                {empLoading ? (
                  [1,2,3,4,5,6].map(i => <div key={i} className="h-40 rounded-3xl bg-muted/20 animate-pulse border border-border/40" />)
                ) : filteredEmployees.length === 0 ? (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5 opacity-50">No personnel found</div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div key={emp._id} className="group relative bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/40 transition-all hover:shadow-xl hover:shadow-primary/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold ${emp.isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                          {emp.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-sm truncate">{emp.name}</h3>
                          <p className="text-[11px] text-muted-foreground truncate">{emp.email}</p>
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full ${emp.isActive ? 'bg-secondary animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-muted'}`} />
                      </div>
                      
                      <div className="flex items-center justify-between mt-6 pt-5 border-t border-border/40">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleBadgeColor(emp, customRoles)}`}>
                          {roleDisplayName(emp, customRoles)}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary" onClick={() => openEditEmp(emp)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => setDeleteEmp(emp)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* MOBILE LIST */}
              <div className="md:hidden flex flex-col gap-4">
                {empLoading ? (
                  [1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/20 animate-pulse border border-border/40" />)
                ) : filteredEmployees.length === 0 ? (
                  <div className="py-20 text-center bg-card/20 rounded-3xl border border-dashed border-border/40 opacity-40 text-xs">Empty Hub</div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div key={emp._id} className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm active:scale-[0.98] transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold ${emp.isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                          {emp.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-bold text-foreground truncate">{emp.name}</h3>
                            <div className={`w-2 h-2 rounded-full ${emp.isActive ? 'bg-secondary' : 'bg-muted'}`} />
                          </div>
                          <div className="flex items-center gap-2">
                             <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${roleBadgeColor(emp, customRoles)}`}>
                               {roleDisplayName(emp, customRoles)}
                             </span>
                             <span className="text-[10px] text-muted-foreground font-medium">{emp.phone}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={() => openEditEmp(emp)}><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/10">
                        <Button variant="ghost" size="sm" className="h-10 rounded-2xl bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest gap-2" onClick={() => setTab('attendance')}>
                          <MapPin className="w-3.5 h-3.5" /> Trace
                        </Button>
                        <Button variant="ghost" size="sm" className="h-10 rounded-2xl bg-secondary/5 text-secondary text-[10px] font-bold uppercase tracking-widest gap-2" onClick={() => emp.phone && window.open(`tel:${emp.phone}`)}>
                           <CalendarDays className="w-3.5 h-3.5" /> Log
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'roles' && (
            <div className="space-y-8">
               <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-8">
                 {customRoles.map((role) => (
                    <div key={role._id} className="group bg-card border border-border/40 rounded-3xl p-7 hover:border-orange-500/40 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600"><ShieldCheck className="h-5 w-5" /></div>
                          <h3 className="font-black text-foreground text-sm uppercase tracking-widest">{role.name}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-orange-500/10" onClick={() => openEditRole(role)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10" onClick={() => setDeleteRole(role)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.slice(0, 4).map(p => (
                          <span key={p} className="px-2.5 py-1 bg-muted/40 rounded-lg text-[9px] font-bold text-muted-foreground uppercase border border-border/20">{p.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    </div>
                  ))}
               </div>

               <div className="md:hidden flex flex-col gap-4">
                  {customRoles.map((role) => (
                    <div key={role._id} className="bg-card border border-border/40 rounded-[28px] p-5 active:scale-[0.98] transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600"><ShieldCheck className="h-6 w-6" /></div>
                          <div>
                            <h3 className="font-bold text-foreground text-xs uppercase tracking-widest">{role.name}</h3>
                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase mt-1">{role.permissions.length} PERMS</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-muted/20" onClick={() => openEditRole(role)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-muted/20 text-rose-500" onClick={() => setDeleteRole(role)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {tab === 'attendance' && <AttendancePage />}
          {tab === 'projects' && <ProjectsPage />}
        </div>
      </main>

      {/* DIALOGS */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-8 border-none shadow-2xl bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">{editEmp ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-60">Identity & Access Hub</DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 bg-muted/40 p-1 rounded-xl mt-6">
            {(['identity', 'advanced'] as const).map(tab => (
              <button key={tab} onClick={() => setDialogTab(tab)} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all uppercase tracking-widest ${dialogTab === tab ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted/60'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="grid gap-6 py-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {dialogTab === 'identity' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Name</Label>
                    <Input value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} className="rounded-xl h-12 bg-muted/30 border-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Email</Label>
                    <Input value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} className="rounded-xl h-12 bg-muted/30 border-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Password</Label>
                    <Input type="password" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} placeholder={editEmp ? '(Unchanged)' : 'Min 6 chars'} className="rounded-xl h-12 bg-muted/30 border-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Phone</Label>
                    <Input value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} className="rounded-xl h-12 bg-muted/30 border-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Clearance (Role)</Label>
                  <Select value={empForm.role === 'custom' ? `custom:${empForm.customRoleId}` : empForm.role} onValueChange={v => {
                    if (v.startsWith('custom:')) setEmpForm({...empForm, role: 'custom', customRoleId: v.replace('custom:', '')});
                    else setEmpForm({...empForm, role: v, customRoleId: ''});
                  }}>
                    <SelectTrigger className="rounded-xl h-12 bg-muted/40 border-none">
                      <SelectValue placeholder="Assign Clearance" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {BUILT_IN_ROLES.map(r => <SelectItem key={r.value} value={r.value} className="font-bold">{r.label}</SelectItem>)}
                      <div className="h-px bg-muted my-2" />
                      {customRoles.map(cr => <SelectItem key={cr._id} value={`custom:${cr._id}`} className="font-bold text-orange-600">{cr.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 bg-muted/40 p-4 rounded-2xl border border-border/10">
                  <Switch checked={empForm.isActive} onCheckedChange={v => setEmpForm({...empForm, isActive: v})} />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">Operational Status</p>
                    <p className="text-[10px] text-muted-foreground">Enable interaction with secure assets.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Check-In</Label>
                    <Input type="time" value={empForm.checkInTime} onChange={e => setEmpForm({...empForm, checkInTime: e.target.value})} className="rounded-xl h-12 bg-muted/30 border-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Check-Out</Label>
                    <Input type="time" value={empForm.checkOutTime} onChange={e => setEmpForm({...empForm, checkOutTime: e.target.value})} className="rounded-xl h-12 bg-muted/30 border-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Geofence (Meters)</Label>
                  <Input type="number" value={empForm.geofenceMeters} onChange={e => setEmpForm({...empForm, geofenceMeters: Number(e.target.value)})} className="rounded-xl h-12 bg-muted/30 border-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Latitude</Label>
                    <Input type="number" step="any" value={empForm.lat} onChange={e => setEmpForm({...empForm, lat: Number(e.target.value)})} className="rounded-xl h-12 bg-muted/30 border-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Longitude</Label>
                    <Input type="number" step="any" value={empForm.lng} onChange={e => setEmpForm({...empForm, lng: Number(e.target.value)})} className="rounded-xl h-12 bg-muted/30 border-none" />
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Work Address</Label>
                  <Input value={empForm.address} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onChange={e => setEmpForm({...empForm, address: e.target.value})} className="rounded-xl h-12 bg-muted/30 border-none" placeholder="Resolve with AI..." />
                  {showSuggestions && addrSuggestions.length > 0 && (
                    <div className="absolute z-[200] left-0 right-0 top-full mt-2 bg-card border border-border/40 rounded-2xl shadow-2xl p-2">
                      {addrSuggestions.map((s, i) => (
                        <button key={i} onClick={() => smartGeocode(s)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-primary/10 text-xs font-bold transition-all border-b border-border/10 last:border-0">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={saveEmp} disabled={empSaving} className="rounded-xl h-14 flex-1 bg-primary font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
              {empSaving ? <Loader2 className="animate-spin" /> : (editEmp ? 'Commit' : 'Initialize')}
            </Button>
            <Button variant="ghost" onClick={() => setEmpDialogOpen(false)} className="rounded-xl h-14">Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">{editRole ? 'Modify Policy' : 'New Policy'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Policy Name</Label>
              <Input value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} className="rounded-xl h-11 bg-muted/40 border-none font-bold" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-50">Permissions</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {PERMISSION_GROUPS.map(group => (
                  <div key={group.group} className="col-span-2 space-y-2 mt-2 first:mt-0">
                    <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{group.group}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map(p => (
                        <label key={p.key} className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border ${roleForm.permissions.includes(p.key) ? 'bg-primary/5 border-primary/20' : 'bg-muted/20 border-transparent'}`}>
                          <Checkbox checked={roleForm.permissions.includes(p.key)} onCheckedChange={() => {
                            const nu = roleForm.permissions.includes(p.key) ? roleForm.permissions.filter(x => x !== p.key) : [...roleForm.permissions, p.key];
                            setRoleForm({...roleForm, permissions: nu});
                          }} />
                          <span className="text-[10px] font-bold text-foreground/80">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={saveRole} disabled={roleSaving} className="rounded-xl h-11 flex-1 bg-orange-600 font-bold shadow-lg shadow-orange-500/20">{roleSaving ? <Loader2 className="animate-spin" /> : 'Save Matrix'}</Button>
            <Button variant="ghost" onClick={() => setRoleDialogOpen(false)} className="rounded-xl h-11">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!deleteEmp} onOpenChange={() => setDeleteEmp(null)}>
        <DialogContent className="rounded-[32px] max-w-sm p-10 text-center flex flex-col items-center border-none shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-6"><Trash2 className="h-8 w-8" /></div>
          <DialogTitle className="text-xl font-bold mb-2">Revoke Identity?</DialogTitle>
          <div className="flex flex-col gap-2 w-full mt-6">
            <Button variant="destructive" className="rounded-xl h-12 font-bold shadow-xl shadow-rose-500/20" onClick={() => deleteEmp && confirmDeleteEmp(deleteEmp._id)}>Confirm Purge</Button>
            <Button variant="ghost" className="rounded-xl h-12 font-medium" onClick={() => setDeleteEmp(null)}>Abort</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <DialogContent className="rounded-[32px] max-w-sm p-10 text-center flex flex-col items-center border-none shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-6"><Trash2 className="h-8 w-8" /></div>
          <DialogTitle className="text-xl font-bold mb-2">Purge Policy?</DialogTitle>
          <div className="flex flex-col gap-2 w-full mt-6">
            <Button variant="destructive" className="rounded-xl h-12 font-bold shadow-xl shadow-rose-500/20" onClick={() => deleteRole && confirmDeleteRole(deleteRole._id)}>Confirm Purge</Button>
            <Button variant="ghost" className="rounded-xl h-12 font-medium" onClick={() => setDeleteRole(null)}>Abort</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
