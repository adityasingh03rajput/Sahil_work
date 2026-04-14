import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { API_URL } from "../config/api";
import { toast } from "sonner";
import { useLocationTracker } from "../hooks/useLocationTracker";
import { encodeDigiPin } from "../utils/markerAnimation";


// ── Types ─────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  _id: string; date: string;
  checkInTime: string | null; checkOutTime: string | null;
  status: "present" | "absent" | "half_day";
  tasks?: AttendanceTask[];
}
interface AttendanceTask {
  _id: string; title: string; description?: string;
  status: "pending" | "in_progress" | "done";
  dueDate?: string | null; dueTime?: string | null;
  taskCheckIn?: string | null; taskCheckOut?: string | null;
  geofenceMeters?: number;
  location?: { lat?: number; lng?: number; address?: string | null };
}
interface ProjectTask {
  _id: string; title: string; description?: string;
  status: "pending" | "in_progress" | "done";
  dueDate?: string | null;
  assignedTo: { _id: string; name: string }[];
  geofenceMeters?: number;
  location?: { lat?: number; lng?: number; address?: string | null };
}
interface Project {
  _id: string; name: string; description?: string;
  status: "active" | "completed" | "archived";
  members: { _id: string; name: string }[];
  tasks: ProjectTask[];
  startDate?: string | null; dueDate?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIST() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); }
function nowIST() { return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }); }
function fmtTime(iso: string | null | undefined) {
  if (!iso) return "---";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
function fmtDateShort(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtWeekday(d: string) {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { weekday: "short" });
}
function calcStreak(records: AttendanceRecord[]) {
  const today = todayIST();
  const set = new Set(records.filter(r => r.status === "present").map(r => r.date));
  let streak = 0; const d = new Date();
  if (!set.has(today)) d.setDate(d.getDate() - 1);
  while (streak < 365) {
    const k = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (!set.has(k)) break; streak++; d.setDate(d.getDate() - 1);
  }
  return streak;
}
function calcMonthPresent(records: AttendanceRecord[]) {
  const prefix = todayIST().slice(0, 7);
  return records.filter(r => r.date.startsWith(prefix) && r.status === "present").length;
}
function elapsedMin(from: string | null | undefined) {
  if (!from) return 0;
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000);
}
function fmtElapsed(min: number) {
  if (min < 60) return `${min}m`; return `${Math.floor(min / 60)}h ${min % 60}m`;
}
function getSocketUrl() {
  return API_URL;
}


// ── SVG Icons ─────────────────────────────────────────────────────────────────

const IcoHome = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoTask = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 22 4"/></svg>;
const IcoFolder = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const IcoHistory = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const IcoLogOut = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IcoPin = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoCal = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// ── Shared tiny components ────────────────────────────────────────────────────

function Pill({ color, children }: { color: "green"|"yellow"|"indigo"|"red"|"gray"; children: React.ReactNode }) {
  const map = {
    green:  { bg: "rgba(34,197,94,0.15)",  color: "#4ade80",  border: "rgba(34,197,94,0.3)" },
    yellow: { bg: "rgba(234,179,8,0.15)",  color: "#facc15",  border: "rgba(234,179,8,0.3)" },
    indigo: { bg: "rgba(99,102,241,0.15)", color: "#a5b4fc",  border: "rgba(99,102,241,0.3)" },
    red:    { bg: "rgba(239,68,68,0.15)",  color: "#f87171",  border: "rgba(239,68,68,0.3)" },
    gray:   { bg: "rgba(255,255,255,0.07)",color: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.1)" },
  }[color];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px",
      borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: map.bg, color: map.color, border: `1px solid ${map.border}` }}>
      {children}
    </span>
  );
}

function Skeleton({ h = 72, r = 16, w = "100%", margin = "0 0 12px" }: { h?: number | string; r?: number; w?: string | number; margin?: string }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: "rgba(255,255,255,0.05)",
    margin, animation: "pulse 1.5s ease-in-out infinite" }} />;
}

function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: 48, marginBottom: 14, lineHeight: 1 }}>{emoji}</div>
      <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{sub}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * usePullToRefresh — native-feel pull-down gesture on a scroll container.
 * Returns a ref to attach to the scrollable element + refreshing state.
 * onRefresh: async fn to call on a confirmed pull (returns when done).
 */
function usePullToRefresh(onRefresh: () => Promise<void>) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDist, setPullDist] = useState(0); // px pulled down
  const startY = useRef(0);
  const pulling = useRef(false);

  const THRESHOLD = 72; // px needed to trigger
  const MAX_PULL   = 100;

  const onTouchStart = useCallback((e: TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) { pulling.current = false; setPullDist(0); return; }
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPullDist(0); return; }
    e.preventDefault();
    setPullDist(Math.min(dy * 0.55, MAX_PULL));
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDist >= THRESHOLD) {
      setRefreshing(true);
      setPullDist(0);
      try { await onRefresh(); } finally { setRefreshing(false); }
    } else {
      setPullDist(0);
    }
  }, [pullDist, onRefresh]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return { scrollRef, refreshing, pullDist, threshold: THRESHOLD };
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeeAttendancePage() {
  const { user, accessToken, signOut } = useAuth();
  const [tab, setTab] = useState<"today" | "tasks" | "projects" | "history">("today");

  // ── Theme isolation: force the employee app's own dark context regardless
  // of what theme the web app is using. Restores original class on unmount.
  // This prevents warm/ocean/emerald/rosewood themes from making text invisible.
  useEffect(() => {
    const root = document.documentElement;
    // Save all current theme-related classes
    const saved = Array.from(root.classList);
    // Strip every color-theme class, force dark
    root.classList.remove(
      'theme-warm', 'theme-ocean', 'theme-emerald', 'theme-rosewood',
      'theme-indigo-fusion', 'dark', 'light'
    );
    root.classList.add('dark');
    return () => {
      // Restore original classes when leaving employee view
      root.classList.remove('dark');
      for (const cls of saved) root.classList.add(cls);
    };
  }, []);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(nowIST());
  const [tracking, setTracking] = useState(false);

  const [tasks, setTasks] = useState<AttendanceTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskUpdating, setTaskUpdating] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projLoading, setProjLoading] = useState(false);
  const [expandedProj, setExpandedProj] = useState<Set<string>>(new Set());
  const [projTaskUpdating, setProjTaskUpdating] = useState<string | null>(null);

  const [lastPos, setLastPos] = useState<{ lat: number, lng: number } | null>(null);
  const [showPermissionTip, setShowPermissionTip] = useState(false);
  const locationTracker = useLocationTracker();

  const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(nowIST()), 30000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/my`, { headers: hdrs });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecords(data);
        setTodayRecord(data.find((r: AttendanceRecord) => r.date === todayIST()) ?? null);
      }
    } catch { toast.error("Failed to load attendance"); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const loadTasks = useCallback(async () => {
    if (!accessToken) return;
    setTasksLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/my/tasks`, { headers: hdrs });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch { toast.error("Failed to load tasks"); }
    finally { setTasksLoading(false); }
  }, [accessToken]);

  const loadProjects = useCallback(async () => {
    if (!accessToken) return;
    setProjLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects/my`, { headers: hdrs });
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data);
    } catch { toast.error("Failed to load projects"); }
    finally { setProjLoading(false); }
  }, [accessToken]);

  useEffect(() => {
    if (tab === "tasks") loadTasks();
    if (tab === "projects") loadProjects();
  }, [tab]);

  const startTracking = useCallback(async (employeeId: string, ownerUserId: string, name: string) => {
    if (locationTracker.isActive()) return;
    // FIX: start() is async — await it to get the socket before attaching listeners
    const sock = await locationTracker.start(employeeId, ownerUserId, name, getSocketUrl());
    if (sock) {
      sock.on("connect",    () => setTracking(true));
      sock.on("disconnect", () => setTracking(false));
    }
    setTracking(true);
  }, [locationTracker]);

  const stopTracking = useCallback(() => {
    locationTracker.stop();
    setTracking(false);
  }, [locationTracker]);

  // ── Pull-to-refresh: reload data + restart GPS if it stopped ──────────────
  const handlePullRefresh = useCallback(async () => {
    // Reload attendance data
    await load();
    if (tab === "tasks") await loadTasks();
    if (tab === "projects") await loadProjects();

    // Restart GPS tracking if it was supposed to be active but isn't
    const shouldTrack = !!todayRecord?.checkInTime && !todayRecord?.checkOutTime;
    if (shouldTrack && !locationTracker.isActive() && user?.id && user?.ownerUserId) {
      toast.info("Restarting location tracking…");
      await startTracking(user.id, user.ownerUserId, user.name || user.email || "Employee");
    }
  }, [load, loadTasks, loadProjects, tab, todayRecord, locationTracker, user, startTracking]);

  const { scrollRef, refreshing, pullDist, threshold } = usePullToRefresh(handlePullRefresh);

  useEffect(() => {
    if (todayRecord?.checkInTime && !todayRecord?.checkOutTime && user?.id && user?.ownerUserId && !locationTracker.isActive())
      startTracking(user.id, user.ownerUserId, user.name || user.email || "Employee");
  }, [todayRecord?.checkInTime, todayRecord?.checkOutTime, user?.id, user?.ownerUserId]);

  useEffect(() => () => locationTracker.stop(), []);

  const handleMark = async () => {
    if (marking) return;
    setMarking(true);
    try {
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 }));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch { /* GPS unavailable */ }
      const res = await fetch(`${API_URL}/attendance/mark`, { method: "POST", headers: hdrs, body: JSON.stringify({ lat, lng }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.action === "checkin") {
        toast.success("Checked in!"); 
        if (user?.id && user?.ownerUserId) {
          startTracking(user.id, user.ownerUserId, user.name || user.email || "Employee");
          setShowPermissionTip(true); // Show BG permission tip on checkin
        }
      } else if (data.action === "checkout") { toast.success("Checked out!"); stopTracking(); setShowPermissionTip(false); }
      else toast.info("Attendance already complete for today");
      await load();
    } catch (err: any) { toast.error(err.message || "Failed to mark attendance"); }
    finally { setMarking(false); }
  };

  const cycleTaskStatus = async (taskId: string, current: string) => {
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "done" : "pending";
    setTaskUpdating(taskId);
    try {
      const res = await fetch(`${API_URL}/attendance/my/tasks/${taskId}`, { method: "PATCH", headers: hdrs, body: JSON.stringify({ status: next }) });
      const data = await res.json(); if (data.tasks) setTasks(data.tasks);
    } catch { toast.error("Failed to update task"); } finally { setTaskUpdating(null); }
  };

  const taskCheckin = async (taskId: string) => {
    setTaskUpdating(taskId);
    try {
      const res = await fetch(`${API_URL}/attendance/my/tasks/${taskId}/checkin`, { method: "POST", headers: hdrs });
      const data = await res.json(); if (data.tasks) setTasks(data.tasks); toast.success("Task started");
    } catch { toast.error("Failed"); } finally { setTaskUpdating(null); }
  };

  const taskCheckout = async (taskId: string) => {
    setTaskUpdating(taskId);
    try {
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 }));
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch { /* GPS unavailable */ }
      const res = await fetch(`${API_URL}/attendance/my/tasks/${taskId}/checkout`, { method: "POST", headers: hdrs, body: JSON.stringify({ lat, lng }) });
      const data = await res.json(); 
      if (data.error) throw new Error(data.error);
      if (data.tasks) setTasks(data.tasks); 
      toast.success("Task completed");
    } catch (err: any) { toast.error(err.message || "Failed"); } 
    finally { setTaskUpdating(null); }
  };

  const updateProjTaskStatus = async (projId: string, taskId: string, current: string) => {
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "done" : "pending";
    setProjTaskUpdating(taskId);
    try {
      let lat: number | undefined, lng: number | undefined;
      if (next === "done") {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 }));
          lat = pos.coords.latitude; lng = pos.coords.longitude;
        } catch { /* GPS unavailable */ }
      }
      const res = await fetch(`${API_URL}/projects/${projId}/tasks/${taskId}`, { method: "PATCH", headers: hdrs, body: JSON.stringify({ status: next, lat, lng }) });
      const data = await res.json(); 
      if (data.error) throw new Error(data.error);
      if (data._id) setProjects(ps => ps.map(p => p._id === projId ? data : p));
    } catch (err: any) { toast.error(err.message || "Failed to update"); } 
    finally { setProjTaskUpdating(null); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const today = todayIST();
  const checkedIn = !!todayRecord?.checkInTime;
  const checkedOut = !!todayRecord?.checkOutTime;
  const isComplete = checkedIn && checkedOut;
  const streak = calcStreak(records);
  const monthCount = calcMonthPresent(records);
  const nameInitials = String(user?.name || user?.email || "E").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  const activeTask = tasks.find(t => t.status === "in_progress");
  const pendingTaskCount = tasks.filter(t => t.status !== "done").length;
  const activeProjectCount = projects.filter(p => p.status === "active").length;

  const last7: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })); }
  const recordMap = new Map(records.map(r => [r.date, r]));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0,
      background: "#0d1117",
      display: "flex", flexDirection: "column",
      fontFamily: "system-ui,-apple-system,sans-serif",
      WebkitTapHighlightColor: "transparent" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{
        paddingTop: "calc(env(safe-area-inset-top,20px) + 8px)",
        paddingBottom: 12, paddingLeft: 16, paddingRight: 16,
        background: "linear-gradient(180deg,#161b27 0%,#0d1117 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 16, color: "#fff",
              boxShadow: "0 4px 14px rgba(79,70,229,0.45)",
            }}>{nameInitials}</div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>
                {user?.name || user?.email}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Employee</span>
                {tracking && (
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "livePulse 2s infinite" }} />
                    Live
                    {lastPos && (
                      <span style={{ marginLeft: 4, padding: "1px 6px", background: "rgba(34,197,94,0.12)", borderRadius: 6, fontSize: 10, fontFamily: "monospace", border: "1px solid rgba(34,197,94,0.3)" }}>
                        DIGI-{encodeDigiPin(lastPos.lat, lastPos.lng)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Sign out */}
          <button type="button" onClick={signOut}
            style={{ width: 44, height: 44, borderRadius: 14, border: "none", cursor: "pointer",
              background: "rgba(239,68,68,0.1)", color: "#f87171",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IcoLogOut />
          </button>
        </div>

        {/* Active task sticky banner */}
        {activeTask && tab !== "tasks" && (
          <div style={{ marginTop: 10, borderRadius: 12, padding: "10px 14px",
            background: "linear-gradient(90deg,rgba(79,70,229,0.25),rgba(124,58,237,0.2))",
            border: "1px solid rgba(99,102,241,0.3)",
            display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8",
              animation: "livePulse 2s infinite", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#c7d2fe",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                ▶ {activeTask.title}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(199,210,254,0.55)" }}>
                {fmtElapsed(elapsedMin(activeTask.taskCheckIn))} elapsed
              </p>
            </div>
            <button type="button" onClick={() => setTab("tasks")}
              style={{ padding: "5px 12px", borderRadius: 8, border: "none",
                background: "rgba(99,102,241,0.4)", color: "#c7d2fe",
                fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
              View
            </button>
          </div>
        )}
      </header>

      {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────────── */}
      <main
        ref={(el) => { (scrollRef as any).current = el; }}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          // Allow pull-to-refresh gesture to work by ensuring native scroll
          // overscroll is managed by our own gesture handler
          overscrollBehaviorY: "contain" as any,
        }}
      >

        {/* ── Pull-to-refresh indicator ─────────────────────────────────────── */}
        <div style={{
          height: refreshing ? 56 : pullDist > 0 ? pullDist * 0.8 : 0,
          overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: refreshing ? "none" : "height 0.2s ease",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            opacity: refreshing ? 1 : Math.min(1, pullDist / threshold),
            transform: `scale(${refreshing ? 1 : 0.75 + (pullDist / threshold) * 0.25})`,
            transition: "opacity 0.15s, transform 0.15s",
          }}>
            {/* Spinner when refreshing, arrow icon when pulling */}
            {refreshing ? (
              <div style={{ width: 20, height: 20, borderRadius: "50%",
                border: "2.5px solid rgba(99,102,241,0.3)", borderTopColor: "#818cf8",
                animation: "spin 0.7s linear infinite" }}
              />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"
                style={{ transform: pullDist >= threshold ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s" }}>
                <polyline points="7 13 12 18 17 13"/>
                <line x1="12" y1="6" x2="12" y2="18"/>
              </svg>
            )}
            <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
              {refreshing ? "Refreshing…" : pullDist >= threshold ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        </div>

        {/* BG Permission Tip */}
        {showPermissionTip && checkedIn && !checkedOut && (
          <div style={{ margin: "16px 16px 0", padding: "14px", borderRadius: 16, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", position: "relative" }}>
            <button onClick={() => setShowPermissionTip(false)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#fff", opacity: 0.4, padding: 4 }}>✕</button>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>📡 Background Tracking Active</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
              To track when screen is OFF, please ensure Location is set to <strong>"Allow all the time"</strong> in App Info {">"} Permissions.
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TODAY TAB — card-based layout with large check-in button
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "today" && (
          <div style={{ padding: "20px 16px 16px" }}>

            {/* Date / time hero */}
            <div style={{ marginBottom: 20, padding: "20px", borderRadius: 20,
              background: "linear-gradient(135deg,#1e1b4b 0%,#1a1035 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
              position: "relative", overflow: "hidden" }}>
              {/* Decorative circle */}
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120,
                borderRadius: "50%", background: "rgba(99,102,241,0.1)", pointerEvents: "none" }} />
              <p style={{ margin: "0 0 2px", fontSize: 36, fontWeight: 900, color: "#fff",
                letterSpacing: "-1px", lineHeight: 1 }}>{currentTime}</p>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>

            {/* Stats row — 2 cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {loading ? (
                <>
                  <Skeleton h={110} r={18} margin="0" />
                  <Skeleton h={110} r={18} margin="0" />
                </>
              ) : (
                <>
                  {/* Streak */}
                  <div style={{ borderRadius: 18, padding: "16px", overflow: "hidden", position: "relative",
                    background: "linear-gradient(135deg,#431407,#1c0a03)",
                    border: "1px solid rgba(251,146,60,0.2)" }}>
                    <div style={{ position: "absolute", top: -16, right: -16, width: 72, height: 72,
                      borderRadius: "50%", background: "rgba(251,146,60,0.12)", pointerEvents: "none" }} />
                    <p style={{ margin: "0 0 8px", fontSize: 24 }}>🔥</p>
                    <p style={{ margin: "0 0 2px", fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{streak}</p>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(251,146,60,0.7)",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>Day Streak</p>
                  </div>
                  {/* Month */}
                  <div style={{ borderRadius: 18, padding: "16px", overflow: "hidden", position: "relative",
                    background: "linear-gradient(135deg,#0c1a3a,#071228)",
                    border: "1px solid rgba(99,102,241,0.2)" }}>
                    <div style={{ position: "absolute", top: -16, right: -16, width: 72, height: 72,
                      borderRadius: "50%", background: "rgba(99,102,241,0.12)", pointerEvents: "none" }} />
                    <p style={{ margin: "0 0 8px", fontSize: 24 }}>📅</p>
                    <p style={{ margin: "0 0 2px", fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{monthCount}</p>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(99,102,241,0.7)",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>This Month</p>
                  </div>
                </>
              )}
            </div>

            {/* Check-in / Check-out card */}
            {loading ? (
              <Skeleton h={180} r={22} margin="0 0 16px" />
            ) : (
              <div style={{ borderRadius: 22, padding: "20px", marginBottom: 16,
                background: "#161b27", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700,
                  color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Today's Attendance
                </p>

                {/* Time slots */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 18 }}>
                  {/* Check-in */}
                  <div style={{ borderRadius: 14, padding: "14px",
                    background: checkedIn ? "rgba(79,70,229,0.15)" : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${checkedIn ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                    <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700,
                      color: checkedIn ? "#818cf8" : "rgba(255,255,255,0.25)",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>In</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800,
                      color: checkedIn ? "#fff" : "rgba(255,255,255,0.15)" }}>
                      {fmtTime(todayRecord?.checkInTime)}
                    </p>
                  </div>
                  <div style={{ fontSize: 16, color: "rgba(255,255,255,0.15)", textAlign: "center" }}>→</div>
                  {/* Check-out */}
                  <div style={{ borderRadius: 14, padding: "14px",
                    background: checkedOut ? "rgba(234,88,12,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${checkedOut ? "rgba(234,88,12,0.35)" : "rgba(255,255,255,0.06)"}` }}>
                    <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700,
                      color: checkedOut ? "#fb923c" : "rgba(255,255,255,0.25)",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>Out</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800,
                      color: checkedOut ? "#fff" : "rgba(255,255,255,0.15)" }}>
                      {fmtTime(todayRecord?.checkOutTime)}
                    </p>
                  </div>
                </div>

                {/* Big action button */}
                <button type="button" onClick={isComplete ? undefined : handleMark}
                  disabled={marking || isComplete}
                  style={{
                    width: "100%", height: 62, borderRadius: 18, border: "none",
                    cursor: isComplete ? "default" : "pointer",
                    background: isComplete
                      ? "linear-gradient(135deg,#15803d,#166534)"
                      : checkedIn
                      ? "linear-gradient(135deg,#c2410c,#9a3412)"
                      : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                    boxShadow: isComplete
                      ? "0 8px 24px rgba(21,128,61,0.4)"
                      : checkedIn
                      ? "0 8px 24px rgba(194,65,12,0.4)"
                      : "0 8px 24px rgba(79,70,229,0.5)",
                    color: "#fff", fontSize: 18, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    opacity: marking ? 0.7 : 1,
                    transition: "transform 0.1s",
                  }}
                  onTouchStart={e => { if (!isComplete && !marking) e.currentTarget.style.transform = "scale(0.97)"; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}>
                  {marking ? (
                    <><div style={{ width: 20, height: 20, borderRadius: "50%",
                      border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite" }} />Please wait…</>
                  ) : isComplete ? (
                    <><IcoCheck />Attendance Complete</>
                  ) : checkedIn ? "Mark Check-Out" : "Mark Present"}
                </button>
              </div>
            )}

            {/* Last 7 days strip */}
            {loading ? (
              <Skeleton h={80} r={18} margin="0" />
            ) : (
              <div style={{ borderRadius: 18, padding: "16px",
                background: "#161b27", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700,
                  color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Last 7 Days
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  {last7.map(d => {
                    const rec = recordMap.get(d);
                    const isToday = d === today;
                    const dotColor = rec?.status === "present" ? "#4ade80"
                      : rec?.status === "half_day" ? "#facc15"
                      : rec?.status === "absent" ? "#f87171"
                      : "rgba(255,255,255,0.1)";
                    return (
                      <div key={d} style={{ flex: 1, borderRadius: 12, padding: "10px 4px",
                        background: isToday ? "rgba(79,70,229,0.2)" : rec ? "rgba(255,255,255,0.04)" : "transparent",
                        border: `1px solid ${isToday ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.05)"}`,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                          color: isToday ? "#818cf8" : "rgba(255,255,255,0.3)" }}>{fmtWeekday(d)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700,
                          color: isToday ? "#fff" : "rgba(255,255,255,0.55)" }}>{d.split("-")[2]}</span>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TASKS TAB — swipeable card stack with start/done actions
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "tasks" && (
          <div style={{ padding: "20px 16px 16px" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>Today's Tasks</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  {tasks.filter(t => t.status === "done").length}/{tasks.length} completed
                </p>
              </div>
              <button type="button" onClick={loadTasks}
                style={{ width: 40, height: 40, borderRadius: 12, border: "none", cursor: "pointer",
                  background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                ↻
              </button>
            </div>

            {/* Progress bar */}
            {tasks.length > 0 && (
              <div style={{ marginBottom: 20, borderRadius: 12, padding: "12px 14px",
                background: "#161b27", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>
                    {Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100)}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 6,
                    background: "linear-gradient(90deg,#4f46e5,#7c3aed)",
                    width: `${Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100)}%`,
                    transition: "width 0.4s ease" }} />
                </div>
              </div>
            )}

            {tasksLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ borderRadius: 18, padding: "16px", background: "#161b27", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <Skeleton h={20} w="70%" margin="0 0 8px" />
                        <Skeleton h={14} w="40%" margin="0" />
                      </div>
                      <Skeleton h={22} w={60} r={10} margin="0" />
                    </div>
                    <Skeleton h={44} r={12} margin="0" />
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState emoji="📋" title="No tasks today" sub="Your manager will assign tasks here" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tasks.map(task => {
                  const isActive = task.status === "in_progress";
                  const isDone = task.status === "done";
                  const elapsed = isActive ? elapsedMin(task.taskCheckIn) : null;
                  return (
                    <div key={task._id} style={{ borderRadius: 18, overflow: "hidden",
                      background: isDone ? "rgba(255,255,255,0.03)"
                        : isActive ? "linear-gradient(135deg,rgba(79,70,229,0.18),rgba(124,58,237,0.12))"
                        : "#161b27",
                      border: `1.5px solid ${isDone ? "rgba(255,255,255,0.05)" : isActive ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}` }}>

                      {/* Active indicator bar */}
                      {isActive && <div style={{ height: 3, background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }} />}

                      <div style={{ padding: "14px 16px" }}>
                        {/* Title row */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: 700,
                                color: isDone ? "rgba(255,255,255,0.35)" : "#fff",
                                textDecoration: isDone ? "line-through" : "none",
                                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                                overflow: "hidden", lineHeight: 1.3 }}>
                                {task.title}
                              </p>
                              {((task.geofenceMeters ?? 0) > 0) && (
                                <div style={{ padding: "2px 8px", borderRadius: 6, 
                                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                                  fontSize: 10, fontWeight: 800, color: "#818cf8", textTransform: "uppercase" }}>
                                  📍 {task.geofenceMeters}m
                                </div>
                              )}
                            </div>
                            {task.description && (
                              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.35)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {task.description}
                              </p>
                            )}
                            {task.location?.address && <p style={{ margin: "4px 0 0", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>🏫 {task.location.address}</p>}
                          </div>
                          <Pill color={isDone ? "green" : isActive ? "yellow" : "indigo"}>
                            {isDone ? "Done" : isActive ? "Active" : "Pending"}
                          </Pill>
                        </div>

                        {/* Meta chips */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: isDone ? 0 : 12 }}>
                          {task.dueDate && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4,
                              fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                              <IcoCal />Due {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ""}
                            </span>
                          )}
                          {task.location?.address && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4,
                              fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                              <IcoPin />{task.location.address}
                            </span>
                          )}
                          {isActive && elapsed !== null && (
                            <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>
                              ⏱ {fmtElapsed(elapsed)}
                            </span>
                          )}
                          {task.taskCheckIn && !isActive && task.taskCheckOut && (
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                              {fmtTime(task.taskCheckIn)} → {fmtTime(task.taskCheckOut)}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        {!isDone && (
                          <div style={{ display: "flex", gap: 8 }}>
                            {!isActive ? (
                              <button type="button" disabled={!!taskUpdating}
                                onClick={() => taskCheckin(task._id)}
                                style={{ flex: 1, height: 44, borderRadius: 12, border: "none",
                                  cursor: "pointer", background: "rgba(79,70,229,0.25)",
                                  color: "#a5b4fc", fontSize: 13, fontWeight: 700,
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                ▶ Start Task
                              </button>
                            ) : (
                              <button type="button" disabled={!!taskUpdating}
                                onClick={() => taskCheckout(task._id)}
                                style={{ flex: 1, height: 44, borderRadius: 12, border: "none",
                                  cursor: "pointer", background: "rgba(22,163,74,0.25)",
                                  color: "#4ade80", fontSize: 13, fontWeight: 700,
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <IcoCheck />Mark Done
                              </button>
                            )}
                            <button type="button" disabled={!!taskUpdating}
                              onClick={() => cycleTaskStatus(task._id, task.status)}
                              style={{ height: 44, padding: "0 16px", borderRadius: 12, border: "none",
                                cursor: "pointer", background: "rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600 }}>
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            PROJECTS TAB — accordion cards with progress rings
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "projects" && (
          <div style={{ padding: "20px 16px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>My Projects</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  {activeProjectCount} active
                </p>
              </div>
              <button type="button" onClick={loadProjects}
                style={{ width: 40, height: 40, borderRadius: 12, border: "none", cursor: "pointer",
                  background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                ↻
              </button>
            </div>

            {projLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2].map(i => (
                  <div key={i} style={{ borderRadius: 20, padding: "16px", background: "#161b27", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 14 }}>
                    <Skeleton h={52} w={52} r={26} margin="0" />
                    <div style={{ flex: 1 }}>
                      <Skeleton h={18} w="60%" margin="0 0 8px" />
                      <Skeleton h={14} w="40%" margin="0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState emoji="📁" title="No projects assigned" sub="You'll see projects here when your manager adds you" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {projects.map(proj => {
                  const isOpen = expandedProj.has(proj._id);
                  const total = proj.tasks.length;
                  const done = proj.tasks.filter(t => t.status === "done").length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const myTasks = proj.tasks.filter(t => t.assignedTo.some(a => a._id === user?.id));
                  const isActive = proj.status === "active";

                  return (
                    <div key={proj._id} style={{ borderRadius: 20, overflow: "hidden",
                      background: "#161b27", border: "1px solid rgba(255,255,255,0.07)" }}>

                      {/* Project header — tap to expand */}
                      <button type="button"
                        onClick={() => setExpandedProj(s => { const n = new Set(s); n.has(proj._id) ? n.delete(proj._id) : n.add(proj._id); return n; })}
                        style={{ width: "100%", padding: "16px", background: "none", border: "none",
                          cursor: "pointer", textAlign: "left", minHeight: 72 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          {/* Progress ring */}
                          <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                            <svg width="52" height="52" viewBox="0 0 52 52">
                              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
                              <circle cx="26" cy="26" r="22" fill="none"
                                stroke={isActive ? "#6366f1" : "#22c55e"} strokeWidth="4"
                                strokeDasharray={`${2 * Math.PI * 22}`}
                                strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                                strokeLinecap="round"
                                transform="rotate(-90 26 26)"
                                style={{ transition: "stroke-dashoffset 0.5s ease" }}/>
                            </svg>
                            <span style={{ position: "absolute", inset: 0, display: "flex",
                              alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 800, color: "#fff" }}>{pct}%</span>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: "#fff",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                flex: 1, minWidth: 0 }}>{proj.name}</span>
                              <Pill color={isActive ? "indigo" : "green"}>{proj.status}</Pill>
                            </div>
                            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "rgba(255,255,255,0.35)", flexWrap: "wrap" }}>
                              <span>{done}/{total} tasks</span>
                              <span>{proj.members.length} members</span>
                              {myTasks.length > 0 && <span style={{ color: "#818cf8", fontWeight: 700 }}>{myTasks.length} yours</span>}
                              {proj.dueDate && <span>Due {proj.dueDate}</span>}
                            </div>
                          </div>

                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 18, flexShrink: 0 }}>
                            {isOpen ? "▲" : "▼"}
                          </span>
                        </div>
                      </button>

                      {/* Tasks list */}
                      {isOpen && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          {proj.tasks.length === 0 ? (
                            <p style={{ margin: 0, padding: "16px", fontSize: 13,
                              color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                              No tasks in this project
                            </p>
                          ) : proj.tasks.map((task, idx) => {
                            const isAssigned = task.assignedTo.some(a => a._id === user?.id);
                            const isDone = task.status === "done";
                            const isTaskActive = task.status === "in_progress";
                            return (
                              <div key={task._id} style={{ padding: "12px 16px",
                                borderBottom: idx < proj.tasks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                display: "flex", alignItems: "flex-start", gap: 12 }}>
                                {/* Tap-to-cycle status circle */}
                                <button type="button"
                                  disabled={!isAssigned || !!projTaskUpdating}
                                  onClick={() => isAssigned && updateProjTaskStatus(proj._id, task._id, task.status)}
                                  style={{ marginTop: 2, width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                    border: `2px solid ${isDone ? "#4ade80" : isTaskActive ? "#facc15" : "rgba(255,255,255,0.25)"}`,
                                    background: isDone ? "#4ade80" : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: isAssigned ? "pointer" : "default", padding: 0, minWidth: 24 }}>
                                  {isDone && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                  {isTaskActive && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#facc15" }} />}
                                </button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600,
                                      color: isDone ? "rgba(255,255,255,0.3)" : "#f1f5f9",
                                      textDecoration: isDone ? "line-through" : "none" }}>{task.title}</p>
                                    {isAssigned && <Pill color="indigo">You</Pill>}
                                  </div>
                                  {task.description && (
                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{task.description}</p>
                                  )}
                                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                                    {task.assignedTo.length > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>👤 {task.assignedTo.map(a => a.name).join(", ")}</span>}
                                    {task.dueDate && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>📅 {task.dueDate}</span>}
                                    {task.location?.address && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>📍 {task.location.address}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            HISTORY TAB — timeline-style list
        ════════════════════════════════════════════════════════════════════ */}
        {tab === "history" && (
          <div style={{ padding: "20px 16px 16px" }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>Attendance History</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                {records.length} records
              </p>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ display: "flex", gap: 14 }}>
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <Skeleton h={14} w={14} r={7} margin="14px 0 0" />
                    </div>
                    <Skeleton h={72} r={14} margin="0" />
                  </div>
                ))}
              </div>
            ) : records.length === 0 ? (
              <EmptyState emoji="📆" title="No records yet" sub="Your attendance history will appear here" />
            ) : (
              <div style={{ position: "relative" }}>
                {/* Timeline line */}
                <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2,
                  background: "rgba(255,255,255,0.06)", borderRadius: 2 }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {records.slice(0, 60).map((r, idx) => {
                    const isToday = r.date === today;
                    const dotColor = r.status === "present" ? "#4ade80"
                      : r.status === "half_day" ? "#facc15" : "#f87171";
                    const hasTasks = r.tasks && r.tasks.length > 0;
                    return (
                      <div key={r._id} style={{ display: "flex", gap: 14, paddingBottom: 12 }}>
                        {/* Timeline dot */}
                        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", marginTop: 14,
                            background: dotColor, border: `2px solid #0d1117`,
                            boxShadow: `0 0 8px ${dotColor}60`, zIndex: 1 }} />
                        </div>

                        {/* Card */}
                        <div style={{ flex: 1, borderRadius: 14, padding: "12px 14px",
                          background: isToday ? "rgba(79,70,229,0.12)" : "#161b27",
                          border: `1px solid ${isToday ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
                          marginBottom: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasTasks ? 8 : 0 }}>
                            <div>
                              <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700,
                                color: isToday ? "#a5b4fc" : "#f1f5f9" }}>
                                {isToday ? "Today" : fmtDateShort(r.date)}
                                {!isToday && <span style={{ marginLeft: 6, fontSize: 11,
                                  color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>{fmtWeekday(r.date)}</span>}
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.35)",
                                fontVariantNumeric: "tabular-nums" }}>
                                {fmtTime(r.checkInTime)} → {fmtTime(r.checkOutTime)}
                              </p>
                            </div>
                            <Pill color={r.status === "present" ? "green" : r.status === "half_day" ? "yellow" : "red"}>
                              {r.status === "half_day" ? "Half Day" : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                            </Pill>
                          </div>

                          {/* Tasks summary */}
                          {hasTasks && (
                            <div style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700,
                                color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Tasks ({r.tasks!.length})
                              </p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {r.tasks!.map(t => (
                                  <div key={t._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                                      background: t.status === "done" ? "#4ade80"
                                        : t.status === "in_progress" ? "#facc15"
                                        : "rgba(255,255,255,0.15)" }} />
                                    <span style={{ fontSize: 12, flex: 1, minWidth: 0,
                                      color: t.status === "done" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.65)",
                                      textDecoration: t.status === "done" ? "line-through" : "none",
                                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {t.title}
                                    </span>
                                    {t.taskCheckIn && t.taskCheckOut && (
                                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                                        {fmtElapsed(Math.floor((new Date(t.taskCheckOut).getTime() - new Date(t.taskCheckIn).getTime()) / 60000))}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── BOTTOM TAB BAR ─────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex", flexShrink: 0,
        background: "rgba(13,17,23,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}>
        {([
          { key: "today",    label: "Today",    icon: <IcoHome />,    badge: 0 },
          { key: "tasks",    label: "Tasks",    icon: <IcoTask />,    badge: pendingTaskCount },
          { key: "projects", label: "Projects", icon: <IcoFolder />,  badge: activeProjectCount },
          { key: "history",  label: "History",  icon: <IcoHistory />, badge: 0 },
        ] as { key: typeof tab; label: string; icon: React.ReactNode; badge: number }[]).map(({ key, label, icon, badge }) => {
          const active = tab === key;
          return (
            <button key={key} type="button" onClick={() => setTab(key)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 4, padding: "10px 4px 8px", background: "none", border: "none",
                cursor: "pointer", position: "relative", minHeight: 60 }}>
              {/* Active pill background */}
              {active && (
                <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                  width: 44, height: 32, borderRadius: 10,
                  background: "rgba(79,70,229,0.2)" }} />
              )}
              <div style={{ color: active ? "#818cf8" : "rgba(255,255,255,0.3)",
                transition: "color 0.15s", position: "relative", zIndex: 1 }}>
                {icon}
                {badge > 0 && (
                  <span style={{ position: "absolute", top: -5, right: -7,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: "#4f46e5", color: "#fff",
                    fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                    {badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? "#818cf8" : "rgba(255,255,255,0.3)",
                transition: "color 0.15s", position: "relative", zIndex: 1 }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes livePulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.3); } }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
