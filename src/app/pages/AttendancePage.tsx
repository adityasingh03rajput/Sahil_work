import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { CalendarDays, Users, CheckCircle2, Clock, RefreshCw, MapPin, Navigation, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { TraceLoader } from '../components/TraceLoader';
import { EmployeeTrackingMap } from '../components/EmployeeTrackingMap';

interface TaskLocation { lat: number | null; lng: number | null; address: string | null; }
interface Task {
  _id: string;
  title: string;
  description: string;
  location: TaskLocation;
  startDate: string | null;
  dueDate: string | null;
  startAt: string | null;
  dueAt: string | null;
  status: 'pending' | 'in_progress' | 'done';
}
interface AttendanceRecord {
  _id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'absent' | 'half_day';
  employeeId: { _id: string; name: string; email: string; role: string } | null;
  checkInAddress: string | null;
  checkOutAddress: string | null;
  totalKm: number;
  tasks: Task[];
}
interface TodaySummary {
  date: string; totalEmployees: number; present: number; records: AttendanceRecord[];
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}
function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
function calcTimeSpent(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '—';
  const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
  if (mins < 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatusBadge({ status }: { status: 'present' | 'absent' | 'half_day' }) {
  const map = {
    present:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    half_day: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    absent:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  const label = status === 'half_day' ? 'Half Day' : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status]}`}>{label}</span>;
}

function TaskStatusBadge({ status }: { status: Task['status'] }) {
  const map = {
    pending:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    done:        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  };
  const label = { pending: 'Pending', in_progress: 'In Progress', done: 'Done' }[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[status]}`}>{label}</span>;
}

// ── Task Add Modal ────────────────────────────────────────────────────────────
function AddTaskModal({ recordId, onClose, onSaved, headers }: {
  recordId: string; onClose: () => void;
  onSaved: (tasks: Task[]) => void;
  headers: Record<string, string>;
}) {
  const [form, setForm] = useState({
    title: '', description: '',
    startDate: '', startTime: '', dueDate: '', dueTime: '',
    locAddress: '', locLat: '', locLng: '',
  });
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ place_id: string; description: string; main: string; secondary: string; types: string[] }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const locInputRef = useRef<HTMLInputElement>(null);
  // Silently grab user position on mount so search results are ranked nearby
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { userPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => { /* permission denied — search still works globally */ }
      );
    }
  }, []);

  const doSearch = async (query: string) => {
    try {
      const pos = userPosRef.current;
      const params = new URLSearchParams({ q: query });
      if (pos) { params.set('lat', String(pos.lat)); params.set('lng', String(pos.lng)); }
      const r = await fetch(`${API_URL}/attendance/places/autocomplete?${params}`, { headers });
      const data: typeof suggestions = await r.json();
      setSuggestions(Array.isArray(data) ? data : []);
      setShowSuggestions(Array.isArray(data) && data.length > 0);
    } catch { /* ignore */ }
  };

  const searchPlaces = (query: string) => {
    if (searchTimer) clearTimeout(searchTimer);
    if (!query.trim() || query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    if (!userPosRef.current && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { userPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {}
      );
    }
    const t = setTimeout(() => doSearch(query), 300);
    setSearchTimer(t);
  };

  const selectSuggestion = async (s: typeof suggestions[0]) => {
    setForm((f) => ({ ...f, locAddress: s.description, locLat: '', locLng: '' }));
    setSuggestions([]);
    setShowSuggestions(false);
    // Resolve lat/lng via place details
    try {
      const r = await fetch(`${API_URL}/attendance/places/details?place_id=${s.place_id}`, { headers });
      const d = await r.json();
      if (d.lat) setForm((f) => ({ ...f, locLat: String(d.lat), locLng: String(d.lng), locAddress: d.name || s.main || s.description }));
    } catch { /* ignore */ }
  };

  const getPlaceIcon = (types: string[]) => {
    const t = types.join(' ');
    if (/university|school|college/.test(t)) return '🎓';
    if (/hospital|clinic|pharmacy|health/.test(t)) return '🏥';
    if (/store|shop|supermarket|mall|grocery/.test(t)) return '🛒';
    if (/restaurant|cafe|food|bakery/.test(t)) return '🍽️';
    if (/bank|atm|finance/.test(t)) return '🏦';
    if (/hotel|lodging/.test(t)) return '🏨';
    if (/place_of_worship|temple|mosque|church/.test(t)) return '🛕';
    if (/gas_station|fuel/.test(t)) return '⛽';
    if (/park|garden/.test(t)) return '🌳';
    if (/transit|bus|train|subway/.test(t)) return '🚉';
    if (/airport/.test(t)) return '✈️';
    if (/establishment|point_of_interest/.test(t)) return '🏢';
    return '📍';
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not available');
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setForm((f) => ({ ...f, locLat: String(lat), locLng: String(lng) }));
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`, {
            headers: { 'User-Agent': 'BillVyapar/1.0' },
          });
          const d = await r.json();
          const a = d.address || {};
          const addr = [a.road || a.pedestrian, a.suburb || a.neighbourhood || a.village, a.city || a.county, a.state].filter(Boolean).join(', ');
          setForm((f) => ({ ...f, locAddress: addr || d.display_name?.split(',').slice(0, 3).join(',') || '' }));
        } catch { /* ignore */ }
        setGeoLoading(false);
      },
      () => { toast.error('Could not get location'); setGeoLoading(false); }
    );
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const body: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        startDate: form.startDate || null,
        startTime: form.startTime || null,
        dueDate: form.dueDate || null,
        dueTime: form.dueTime || null,
        location: {
          lat: form.locLat ? Number(form.locLat) : null,
          lng: form.locLng ? Number(form.locLng) : null,
          address: form.locAddress || null,
        },
      };
      const res = await fetch(`${API_URL}/attendance/${recordId}/tasks`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSaved(data.tasks);
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--card)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Add Task</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Title *</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Task title" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional details" rows={2}
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 14, background: 'var(--background)', color: 'var(--foreground)', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Start Date</label>
              <Input type="date" value={form.startDate} min="2020-01-01" max="2099-12-31" onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Start Time <span style={{ fontWeight: 400 }}>(default 00:00)</span></label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Due Date</label>
              <Input type="date" value={form.dueDate} min="2020-01-01" max="2099-12-31" onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Due Time <span style={{ fontWeight: 400 }}>(default 00:00)</span></label>
              <Input type="time" value={form.dueTime} onChange={(e) => setForm((f) => ({ ...f, dueTime: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Task Location</label>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={locInputRef}
                  value={form.locAddress}
                  onChange={(e) => { setForm((f) => ({ ...f, locAddress: e.target.value, locLat: '', locLng: '' })); searchPlaces(e.target.value); }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  placeholder="Search college, store, company, address…"
                  style={{ flex: 1, borderRadius: 8, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 14, background: 'var(--background)', color: 'var(--foreground)', outline: 'none' }}
                />
                <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={geoLoading} className="gap-1.5 shrink-0">
                  <Navigation className="h-3.5 w-3.5" />{geoLoading ? '…' : 'Detect'}
                </Button>
              </div>

              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 44, zIndex: 100, marginTop: 4, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8, borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>{getPlaceIcon(s.types)}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.main}
                        </p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.secondary}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.locLat && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{Number(form.locLat).toFixed(5)}, {Number(form.locLng).toFixed(5)}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add Task'}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Expanded row with tasks ───────────────────────────────────────────────────
function AttendanceRow({ r, headers, onTasksUpdated }: {
  r: AttendanceRecord;
  headers: Record<string, string>;
  onTasksUpdated: (id: string, tasks: Task[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_URL}/attendance/${r._id}/tasks/${taskId}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onTasksUpdated(r._id, data.tasks);
    } catch (e: any) { toast.error(e.message); }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const res = await fetch(`${API_URL}/attendance/${r._id}/tasks/${taskId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onTasksUpdated(r._id, data.tasks);
    } catch (e: any) { toast.error(e.message); }
  };

  const timeSpent = calcTimeSpent(r.checkInTime, r.checkOutTime);

  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <td className="px-4 py-3 font-medium text-foreground">{r.date}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{r.employeeId?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{r.employeeId?.email}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-foreground">{fmtTime(r.checkInTime)}</p>
          {r.checkInAddress && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3 shrink-0" />{r.checkInAddress}</p>}
        </td>
        <td className="px-4 py-3">
          <p className="text-foreground">{fmtTime(r.checkOutTime)}</p>
          {r.checkOutAddress && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3 shrink-0" />{r.checkOutAddress}</p>}
        </td>
        <td className="px-4 py-3">
          <p className="text-foreground font-medium">{timeSpent}</p>
          {r.totalKm > 0 && <p className="text-xs text-muted-foreground mt-0.5">{r.totalKm.toFixed(2)} km</p>}
        </td>
        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
        <td className="px-4 py-3 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{r.tasks?.length ?? 0} task{r.tasks?.length !== 1 ? 's' : ''}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 pb-4 bg-muted/20">
            <div style={{ padding: '12px 0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tasks</p>
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={(e) => { e.stopPropagation(); setShowAddTask(true); }}>
                  <Plus className="h-3 w-3" /> Add Task
                </Button>
              </div>

              {(!r.tasks || r.tasks.length === 0) ? (
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>No tasks assigned for this day.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {r.tasks.map((t) => (
                    <div key={t._id} style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '10px 14px', background: 'var(--card)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t.title}</p>
                          <TaskStatusBadge status={t.status} />
                        </div>
                        {t.description && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>{t.description}</p>}
                        <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                          {(t.startDate || t.startAt) && (
                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock className="h-3 w-3" /> Start: {t.startAt ? fmtDateTime(t.startAt) : `${t.startDate} 00:00`}
                            </span>
                          )}
                          {(t.dueDate || t.dueAt) && (
                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock className="h-3 w-3" /> Due: {t.dueAt ? fmtDateTime(t.dueAt) : `${t.dueDate} 00:00`}
                            </span>
                          )}
                          {t.location?.address && (
                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin className="h-3 w-3" /> {t.location.address}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                        <select
                          value={t.status}
                          onChange={(e) => updateTaskStatus(t._id, e.target.value as Task['status'])}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', padding: '3px 6px', background: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                        <button type="button" onClick={(e) => { e.stopPropagation(); deleteTask(t._id); }}
                          style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      {showAddTask && (
        <AddTaskModal
          recordId={r._id}
          headers={headers}
          onClose={() => setShowAddTask(false)}
          onSaved={(tasks) => { onTasksUpdated(r._id, tasks); setShowAddTask(false); }}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AttendancePage() {
  const { accessToken, deviceId } = useAuth();
  const [tab, setTab] = useState<'today' | 'history' | 'tracking'>('today');
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(todayIST().slice(0, 7));

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

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const params = profileId ? `?profileId=${profileId}` : '';
      const res = await fetch(`${API_URL}/attendance/today${params}`, { headers });
      const data = await res.json();
      if (data.date) setTodaySummary(data);
    } catch { toast.error("Failed to load today's attendance"); }
    finally { setLoading(false); }
  }, [accessToken, profileId]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (profileId) params.set('profileId', profileId);
      params.set('month', filterMonth);
      const res = await fetch(`${API_URL}/attendance?${params}`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setRecords(data);
    } catch { toast.error('Failed to load attendance history'); }
    finally { setLoading(false); }
  }, [accessToken, profileId, filterMonth]);

  useEffect(() => {
    if (tab === 'today') loadToday();
    else if (tab === 'history') loadHistory();
  }, [tab, filterMonth, loadToday, loadHistory]);

  // Auto-refresh today's data every 30 seconds
  useEffect(() => {
    if (tab !== 'today') return;
    const timer = setInterval(() => loadToday(), 30000);
    return () => clearInterval(timer);
  }, [tab, loadToday]);

  const handleTasksUpdated = (recordId: string, tasks: Task[]) => {
    setRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, tasks } : r));
    setTodaySummary((prev) => prev ? {
      ...prev,
      records: prev.records.map((r) => r._id === recordId ? { ...r, tasks } : r),
    } : prev);
  };

  const absent = todaySummary ? todaySummary.totalEmployees - todaySummary.present : 0;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground">Track employee attendance records</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
        {(['today', 'history', 'tracking'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'today' ? "Today's Summary" : t === 'history' ? 'Monthly History' : (
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Live Tracking</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TODAY TAB ── */}
      {tab === 'today' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16"><TraceLoader label="Loading attendance…" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-border"><CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2"><Users className="h-4 w-4" /><span>Total Employees</span></div>
                  <p className="text-3xl font-bold text-foreground">{todaySummary?.totalEmployees ?? 0}</p>
                </CardContent></Card>
                <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"><CardContent className="p-5">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm mb-2"><CheckCircle2 className="h-4 w-4" /><span>Present</span></div>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">{todaySummary?.present ?? 0}</p>
                </CardContent></Card>
                <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"><CardContent className="p-5">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm mb-2"><Clock className="h-4 w-4" /><span>Absent</span></div>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-300">{absent}</p>
                </CardContent></Card>
              </div>

              {!todaySummary || todaySummary.records.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No check-ins yet today</p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="flex flex-col gap-3 sm:hidden">
                    {todaySummary.records.map((r) => (
                      <div key={r._id} className="rounded-xl border border-border p-4 bg-card space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground">{r.employeeId?.name ?? '—'}</p>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{r.employeeId?.email}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-xs text-muted-foreground block">Check-in</span>{fmtTime(r.checkInTime)}</div>
                          <div><span className="text-xs text-muted-foreground block">Check-out</span>{fmtTime(r.checkOutTime)}</div>
                        </div>
                        {(r.totalKm > 0 || calcTimeSpent(r.checkInTime, r.checkOutTime) !== '—') && (
                          <p className="text-xs text-muted-foreground">{calcTimeSpent(r.checkInTime, r.checkOutTime)}{r.totalKm > 0 ? ` · ${r.totalKm.toFixed(2)} km` : ''}</p>
                        )}
                        {r.tasks?.length > 0 && <p className="text-xs text-muted-foreground">{r.tasks.length} task{r.tasks.length !== 1 ? 's' : ''}</p>}
                      </div>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden sm:block rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Employee</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Check-in</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Check-out</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Time Spent / KM</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tasks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {todaySummary.records.map((r) => (
                          <AttendanceRow key={r._id} r={r} headers={headers} onTasksUpdated={handleTasksUpdated} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Month</label>
              <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={loadHistory} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><TraceLoader label="Loading history…" /></div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No records for this month</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="flex flex-col gap-3 sm:hidden">
                {records.map((r) => (
                  <div key={r._id} className="rounded-xl border border-border p-4 bg-card space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{r.employeeId?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-xs text-muted-foreground block">Check-in</span>{fmtTime(r.checkInTime)}</div>
                      <div><span className="text-xs text-muted-foreground block">Check-out</span>{fmtTime(r.checkOutTime)}</div>
                    </div>
                    {(r.totalKm > 0 || calcTimeSpent(r.checkInTime, r.checkOutTime) !== '—') && (
                      <p className="text-xs text-muted-foreground">{calcTimeSpent(r.checkInTime, r.checkOutTime)}{r.totalKm > 0 ? ` · ${r.totalKm.toFixed(2)} km` : ''}</p>
                    )}
                    {r.tasks?.length > 0 && <p className="text-xs text-muted-foreground">{r.tasks.length} task{r.tasks.length !== 1 ? 's' : ''}</p>}
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Check-in</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Check-out</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Time Spent / KM</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tasks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.map((r) => (
                      <AttendanceRow key={r._id} r={r} headers={headers} onTasksUpdated={handleTasksUpdated} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── LIVE TRACKING TAB ── */}
      {tab === 'tracking' && <EmployeeTrackingMap profileId={profileId} />}
    </div>
  );
}
