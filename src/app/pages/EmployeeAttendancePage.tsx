import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { API_URL } from "../config/api";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  _id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: "present" | "absent" | "half_day";
  tasks?: AttendanceTask[];
}

interface AttendanceTask {
  _id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "done";
  dueDate?: string | null;
  dueTime?: string | null;
  taskCheckIn?: string | null;
  taskCheckOut?: string | null;
  location?: { address?: string | null };
}

interface ProjectTask {
  _id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "done";
  dueDate?: string | null;
  assignedTo: { _id: string; name: string }[];
  location?: { address?: string | null };
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "archived";
  members: { _id: string; name: string }[];
  tasks: ProjectTask[];
  startDate?: string | null;
  dueDate?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
function nowIST() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "---";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
function fmtDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtWeekday(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short" });
}
function calcStreak(records: AttendanceRecord[]): number {
  const today = todayIST();
  const presentSet = new Set(records.filter((r) => r.status === "present").map((r) => r.date));
  let streak = 0;
  const d = new Date();
  if (!presentSet.has(today)) d.setDate(d.getDate() - 1);
  while (streak < 365) {
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (!presentSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
function calcMonthPresent(records: AttendanceRecord[]): number {
  const prefix = todayIST().slice(0, 7);
  return records.filter((r) => r.date.startsWith(prefix) && r.status === "present").length;
}
function elapsedMin(from: string | null | undefined): number {
  if (!from) return 0;
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000);
}
function fmtElapsed(min: number): string {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}
function getSocketUrl(): string {
  return (
    (typeof localStorage !== "undefined" && localStorage.getItem("apiUrlOverride")) ||
    API_URL ||
    window.location.origin
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const IcoLogOut = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcoClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoFire = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2C9 7 6 9 6 13a6 6 0 0 0 12 0c0-4-3-6-6-11zm0 16a3 3 0 0 1-3-3c0-2 1.5-3.5 3-5 1.5 1.5 3 3 3 5a3 3 0 0 1-3 3z"/>
  </svg>
);
const IcoCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcoTask = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <polyline points="9 11 12 14 22 4"/>
  </svg>
);
const IcoHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IcoHistory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
  </svg>
);


// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeeAttendancePage() {
  const { user, accessToken, signOut } = useAuth();
  const [tab, setTab] = useState<"today" | "tasks" | "projects" | "history">("today");

  // Attendance state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(nowIST());
  const [tracking, setTracking] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState<AttendanceTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskUpdating, setTaskUpdating] = useState<string | null>(null);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projLoading, setProjLoading] = useState(false);
  const [expandedProj, setExpandedProj] = useState<Set<string>>(new Set());
  const [projTaskUpdating, setProjTaskUpdating] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const trackingActiveRef = useRef(false);

  const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(nowIST()), 30000);
    return () => clearInterval(id);
  }, []);

  // ── Load attendance records ──────────────────────────────────────────────────

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

  // ── Load today's tasks ───────────────────────────────────────────────────────

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

  // ── Load projects ────────────────────────────────────────────────────────────

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

  // ── Socket tracking ──────────────────────────────────────────────────────────

  const startTracking = useCallback((employeeId: string, ownerUserId: string, employeeName: string) => {
    if (trackingActiveRef.current) return;
    trackingActiveRef.current = true;
    const socket = io(getSocketUrl(), { path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("employee-join", { employeeId, ownerUserId });
      setTracking(true);
    });
    socket.on("disconnect", () => setTracking(false));
    if (!navigator.geolocation) return;
    // Poll every 120s instead of watchPosition — reduces DB writes by 4x vs 30s
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          socket.emit("employee-location", { employeeId, ownerUserId, name: employeeName, lat, lng, updatedAt: new Date().toISOString() });
        },
        (err) => console.warn("[tracking]", err.message),
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
      );
    };
    sendLocation(); // send immediately on connect
    watchIdRef.current = window.setInterval(sendLocation, 120_000) as unknown as number;
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) { clearInterval(watchIdRef.current); watchIdRef.current = null; }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    trackingActiveRef.current = false;
    setTracking(false);
  }, []);

  useEffect(() => {
    if (todayRecord?.checkInTime && !todayRecord?.checkOutTime && user?.id && user?.ownerUserId && !trackingActiveRef.current) {
      startTracking(user.id, user.ownerUserId, user.name || user.email || "Employee");
    }
  }, [todayRecord?.checkInTime, todayRecord?.checkOutTime, user?.id, user?.ownerUserId]);

  useEffect(() => () => stopTracking(), []);

  // ── Attendance mark ──────────────────────────────────────────────────────────

  const handleMark = async () => {
    if (marking) return;
    setMarking(true);
    try {
      // Capture GPS before marking — best-effort, don't block if denied
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* permission denied or unavailable — proceed without GPS */ }

      const res = await fetch(`${API_URL}/attendance/mark`, { method: "POST", headers: hdrs, body: JSON.stringify({ lat, lng }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.action === "checkin") {
        toast.success("Check-in recorded!");
        if (user?.id && user?.ownerUserId) startTracking(user.id, user.ownerUserId, user.name || user.email || "Employee");
      } else if (data.action === "checkout") {
        toast.success("Check-out recorded!");
        stopTracking();
      } else {
        toast.info("Attendance already complete for today");
      }
      await load();
    } catch (err: any) { toast.error(err.message || "Failed to mark attendance"); }
    finally { setMarking(false); }
  };

  // ── Task actions ─────────────────────────────────────────────────────────────

  const cycleTaskStatus = async (taskId: string, current: string) => {
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "done" : "pending";
    setTaskUpdating(taskId);
    try {
      const res = await fetch(`${API_URL}/attendance/my/tasks/${taskId}`, { method: "PATCH", headers: hdrs, body: JSON.stringify({ status: next }) });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch { toast.error("Failed to update task"); }
    finally { setTaskUpdating(null); }
  };

  const taskCheckin = async (taskId: string) => {
    setTaskUpdating(taskId);
    try {
      const res = await fetch(`${API_URL}/attendance/my/tasks/${taskId}/checkin`, { method: "POST", headers: hdrs });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
      toast.success("Task started");
    } catch { toast.error("Failed"); }
    finally { setTaskUpdating(null); }
  };

  const taskCheckout = async (taskId: string) => {
    setTaskUpdating(taskId);
    try {
      const res = await fetch(`${API_URL}/attendance/my/tasks/${taskId}/checkout`, { method: "POST", headers: hdrs });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
      toast.success("Task completed");
    } catch { toast.error("Failed"); }
    finally { setTaskUpdating(null); }
  };

  // ── Project task status update ───────────────────────────────────────────────

  const updateProjTaskStatus = async (projId: string, taskId: string, current: string) => {
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "done" : "pending";
    setProjTaskUpdating(taskId);
    try {
      const res = await fetch(`${API_URL}/projects/${projId}/tasks/${taskId}`, { method: "PATCH", headers: hdrs, body: JSON.stringify({ status: next }) });
      const data = await res.json();
      if (data._id) setProjects(ps => ps.map(p => p._id === projId ? data : p));
    } catch { toast.error("Failed to update"); }
    finally { setProjTaskUpdating(null); }
  };

  // ── Derived values ───────────────────────────────────────────────────────────

  const today = todayIST();
  const checkedIn = !!todayRecord?.checkInTime;
  const checkedOut = !!todayRecord?.checkOutTime;
  const isComplete = checkedIn && checkedOut;
  const streak = calcStreak(records);
  const monthCount = calcMonthPresent(records);
  const nameInitials = String(user?.name || user?.email || "E").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const activeTask = tasks.find(t => t.status === "in_progress");

  const btn = isComplete
    ? { label: "Attendance Complete", bg: "linear-gradient(135deg,#16a34a,#15803d)", shadow: "rgba(22,163,74,0.4)", icon: <IcoCheck /> }
    : checkedIn
    ? { label: "Mark Check-Out", bg: "linear-gradient(135deg,#ea580c,#c2410c)", shadow: "rgba(234,88,12,0.4)", icon: null }
    : { label: "Mark Present", bg: "linear-gradient(135deg,#6366f1,#818cf8)", shadow: "rgba(99,102,241,0.5)", icon: null };

  const last7: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    last7.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  }
  const recordMap = new Map(records.map((r) => [r.date, r]));

  // ── Styles ───────────────────────────────────────────────────────────────────

  const S = {
    card: { borderRadius: 20, padding: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 12 } as React.CSSProperties,
    label: { margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.1em" },
    taskCard: (active: boolean) => ({ borderRadius: 16, padding: "14px 16px", background: active ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`, marginBottom: 10 }) as React.CSSProperties,
    pill: (color: string) => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color === "green" ? "rgba(22,163,74,0.2)" : color === "yellow" ? "rgba(234,179,8,0.2)" : "rgba(99,102,241,0.2)", color: color === "green" ? "#4ade80" : color === "yellow" ? "#facc15" : "#818cf8" }) as React.CSSProperties,
    btn: (color: string, sm?: boolean) => ({ padding: sm ? "5px 12px" : "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: sm ? 12 : 13, fontWeight: 700, background: color === "indigo" ? "rgba(99,102,241,0.25)" : color === "orange" ? "rgba(234,88,12,0.25)" : color === "green" ? "rgba(22,163,74,0.25)" : "rgba(255,255,255,0.1)", color: color === "indigo" ? "#818cf8" : color === "orange" ? "#fb923c" : color === "green" ? "#4ade80" : "rgba(255,255,255,0.6)" }) as React.CSSProperties,
  };


  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg,#0f172a 0%,#1e1b4b 60%,#0f172a 100%)", display: "flex", flexDirection: "column", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(env(safe-area-inset-top,20px) + 10px) 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,0.4)", flexShrink: 0 }}>{nameInitials}</div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{user?.name || user?.email}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>
              Employee{tracking && <span style={{ marginLeft: 6, color: "#22c55e" }}>&#9679; Live</span>}
            </p>
          </div>
        </div>
        <button type="button" onClick={signOut} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <IcoLogOut /> Sign Out
        </button>
      </header>

      {/* Active task sticky bar */}
      {activeTask && tab !== "tasks" && (
        <div style={{ background: "linear-gradient(90deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))", borderBottom: "1px solid rgba(99,102,241,0.3)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8", animation: "pulse 2s infinite", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#c7d2fe", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Active: {activeTask.title}</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(199,210,254,0.6)" }}>{fmtElapsed(elapsedMin(activeTask.taskCheckIn))} elapsed</p>
          </div>
          <button type="button" onClick={() => setTab("tasks")} style={{ padding: "4px 10px", borderRadius: 8, border: "none", background: "rgba(99,102,241,0.4)", color: "#c7d2fe", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>View</button>
        </div>
      )}

      {/* Scrollable content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>

        {/* ── TODAY TAB ── */}
        {tab === "today" && (
          <div style={{ paddingTop: 16 }}>
            <div style={{ padding: "0 4px 12px" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{currentTime}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, borderRadius: 18, padding: "14px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#fb923c", marginBottom: 4 }}><IcoFire /><span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Streak</span></div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{streak}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>days in a row</p>
              </div>
              <div style={{ flex: 1, borderRadius: 18, padding: "14px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#818cf8", marginBottom: 4 }}><IcoCalendar /><span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>This Month</span></div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{monthCount}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>days present</p>
              </div>
            </div>

            {/* Check-in/out card */}
            <div style={{ borderRadius: 24, padding: "20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.25)", marginBottom: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
              <p style={S.label}>Today</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                <div style={{ flex: 1, borderRadius: 14, padding: "12px 14px", background: checkedIn ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${checkedIn ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: checkedIn ? "#818cf8" : "rgba(255,255,255,0.3)", marginBottom: 4 }}><IcoClock /><span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Check-in</span></div>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: checkedIn ? "#fff" : "rgba(255,255,255,0.2)" }}>{fmtTime(todayRecord?.checkInTime)}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.2)", fontSize: 18 }}>to</div>
                <div style={{ flex: 1, borderRadius: 14, padding: "12px 14px", background: checkedOut ? "rgba(234,88,12,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${checkedOut ? "rgba(234,88,12,0.35)" : "rgba(255,255,255,0.07)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: checkedOut ? "#fb923c" : "rgba(255,255,255,0.3)", marginBottom: 4 }}><IcoClock /><span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Check-out</span></div>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: checkedOut ? "#fff" : "rgba(255,255,255,0.2)" }}>{fmtTime(todayRecord?.checkOutTime)}</p>
                </div>
              </div>
              <button type="button" onClick={isComplete ? undefined : handleMark} disabled={marking || isComplete}
                style={{ width: "100%", height: 58, borderRadius: 16, border: "none", cursor: isComplete ? "default" : "pointer", background: btn.bg, boxShadow: `0 8px 24px ${btn.shadow}`, color: "#fff", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: marking ? 0.7 : 1 }}
                onMouseDown={e => { if (!isComplete && !marking) e.currentTarget.style.transform = "scale(0.97)"; }}
                onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}>
                {btn.icon}{marking ? "Please wait..." : btn.label}
              </button>
            </div>

            {/* Last 7 days */}
            <div style={{ marginBottom: 16 }}>
              <p style={S.label}>Last 7 Days</p>
              <div style={{ display: "flex", gap: 6 }}>
                {last7.map((d) => {
                  const rec = recordMap.get(d);
                  const isToday = d === today;
                  const dot = rec?.status === "present" ? "#4ade80" : rec?.status === "half_day" ? "#facc15" : rec?.status === "absent" ? "#f87171" : "rgba(255,255,255,0.1)";
                  return (
                    <div key={d} style={{ flex: 1, borderRadius: 12, padding: "8px 4px", background: isToday ? "rgba(99,102,241,0.25)" : rec ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${isToday ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.06)"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? "#818cf8" : "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{fmtWeekday(d)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? "#fff" : "rgba(255,255,255,0.6)" }}>{d.split("-")[2]}</span>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* ── TASKS TAB ── */}
        {tab === "tasks" && (
          <div style={{ paddingTop: 16 }}>
            <p style={S.label}>Today's Tasks</p>
            {tasksLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 16, background: "rgba(255,255,255,0.05)", animation: "pulse 1.5s infinite" }} />)}
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.25)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No tasks assigned today</p>
                <p style={{ margin: "6px 0 0", fontSize: 13 }}>Your manager will assign tasks here</p>
              </div>
            ) : (
              <div>
                {tasks.map((task) => {
                  const isActive = task.status === "in_progress";
                  const isDone = task.status === "done";
                  const elapsed = isActive ? elapsedMin(task.taskCheckIn) : null;
                  return (
                    <div key={task._id} style={S.taskCard(isActive)}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isDone ? "rgba(255,255,255,0.4)" : "#fff", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                          {task.description && <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</p>}
                        </div>
                        <span style={S.pill(isDone ? "green" : isActive ? "yellow" : "indigo")}>
                          {isDone ? "Done" : isActive ? "In Progress" : "Pending"}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        {task.dueDate && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4 }}><IcoCalendar />Due {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ""}</span>}
                        {task.location?.address && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>📍 {task.location.address}</span>}
                        {isActive && elapsed !== null && <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>⏱ {fmtElapsed(elapsed)}</span>}
                        {task.taskCheckIn && !isActive && task.taskCheckOut && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            {fmtTime(task.taskCheckIn)} → {fmtTime(task.taskCheckOut)}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isDone && (
                        <div style={{ display: "flex", gap: 8 }}>
                          {!isActive ? (
                            <button type="button" disabled={!!taskUpdating} onClick={() => taskCheckin(task._id)} style={S.btn("indigo", true)}>
                              ▶ Start Task
                            </button>
                          ) : (
                            <button type="button" disabled={!!taskUpdating} onClick={() => taskCheckout(task._id)} style={S.btn("green", true)}>
                              ✓ Mark Done
                            </button>
                          )}
                          <button type="button" disabled={!!taskUpdating} onClick={() => cycleTaskStatus(task._id, task.status)} style={S.btn("ghost", true)}>
                            Skip →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* ── PROJECTS TAB ── */}
        {tab === "projects" && (
          <div style={{ paddingTop: 16 }}>
            <p style={S.label}>My Projects</p>
            {projLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2].map(i => <div key={i} style={{ height: 100, borderRadius: 18, background: "rgba(255,255,255,0.05)", animation: "pulse 1.5s infinite" }} />)}
              </div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.25)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No projects assigned</p>
                <p style={{ margin: "6px 0 0", fontSize: 13 }}>You'll see projects here when your manager adds you</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {projects.map((proj) => {
                  const isOpen = expandedProj.has(proj._id);
                  const total = proj.tasks.length;
                  const done = proj.tasks.filter(t => t.status === "done").length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  const myTasks = proj.tasks.filter(t => t.assignedTo.some(a => a._id === user?.id));

                  return (
                    <div key={proj._id} style={{ borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
                      {/* Project header */}
                      <button type="button" onClick={() => setExpandedProj(s => { const n = new Set(s); n.has(proj._id) ? n.delete(proj._id) : n.add(proj._id); return n; })}
                        style={{ width: "100%", padding: "16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{proj.name}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: proj.status === "active" ? "rgba(99,102,241,0.25)" : "rgba(22,163,74,0.2)", color: proj.status === "active" ? "#818cf8" : "#4ade80" }}>{proj.status}</span>
                            </div>
                            {proj.description && <p style={{ margin: "0 0 8px", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.description}</p>}
                            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,0.4)", flexWrap: "wrap" }}>
                              <span>{proj.members.length} member{proj.members.length !== 1 ? "s" : ""}</span>
                              <span>{done}/{total} tasks done</span>
                              {myTasks.length > 0 && <span style={{ color: "#818cf8", fontWeight: 700 }}>{myTasks.length} assigned to you</span>}
                              {proj.dueDate && <span>Due {proj.dueDate}</span>}
                            </div>
                            {total > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                                <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                                  <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#6366f1,#818cf8)", width: `${pct}%`, transition: "width 0.4s" }} />
                                </div>
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 30, textAlign: "right" }}>{pct}%</span>
                              </div>
                            )}
                          </div>
                          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18, flexShrink: 0, marginTop: 2 }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {/* Tasks list */}
                      {isOpen && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                          {proj.tasks.length === 0 ? (
                            <p style={{ margin: 0, padding: "16px", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>No tasks in this project</p>
                          ) : proj.tasks.map((task) => {
                            const isAssigned = task.assignedTo.some(a => a._id === user?.id);
                            const isDone = task.status === "done";
                            const isActive = task.status === "in_progress";
                            return (
                              <div key={task._id} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-start", gap: 12 }}>
                                {/* Status dot / toggle */}
                                <button type="button" disabled={!isAssigned || !!projTaskUpdating} onClick={() => isAssigned && updateProjTaskStatus(proj._id, task._id, task.status)}
                                  style={{ marginTop: 2, width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isDone ? "#4ade80" : isActive ? "#facc15" : "rgba(255,255,255,0.3)"}`, background: isDone ? "#4ade80" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: isAssigned ? "pointer" : "default", flexShrink: 0, padding: 0 }}>
                                  {isDone && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                  {isActive && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#facc15" }} />}
                                </button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isDone ? "rgba(255,255,255,0.35)" : "#fff", textDecoration: isDone ? "line-through" : "none" }}>{task.title}</p>
                                    {isAssigned && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "rgba(99,102,241,0.25)", color: "#818cf8" }}>You</span>}
                                  </div>
                                  {task.description && <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{task.description}</p>}
                                  <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                                    {task.assignedTo.length > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>👤 {task.assignedTo.map(a => a.name).join(", ")}</span>}
                                    {task.dueDate && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>📅 {task.dueDate}</span>}
                                    {task.location?.address && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>📍 {task.location.address}</span>}
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


        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div style={{ paddingTop: 16 }}>
            <p style={S.label}>Attendance History</p>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 64, borderRadius: 16, background: "rgba(255,255,255,0.05)" }} />)}
              </div>
            ) : records.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.25)" }}>
                <p style={{ margin: 0, fontSize: 14 }}>No records yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {records.slice(0, 60).map((r) => {
                  const isToday = r.date === today;
                  const ss = r.status === "present"
                    ? { bg: "rgba(22,163,74,0.15)", color: "#4ade80", border: "rgba(22,163,74,0.25)" }
                    : r.status === "half_day"
                    ? { bg: "rgba(234,179,8,0.15)", color: "#facc15", border: "rgba(234,179,8,0.25)" }
                    : { bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.25)" };
                  const hasTasks = r.tasks && r.tasks.length > 0;
                  return (
                    <div key={r._id} style={{ borderRadius: 16, padding: "12px 16px", background: isToday ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${isToday ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: isToday ? "#a5b4fc" : "#fff" }}>
                            {isToday ? "Today" : fmtDateShort(r.date)}
                            {!isToday && <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>{fmtWeekday(r.date)}</span>}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{fmtTime(r.checkInTime)} → {fmtTime(r.checkOutTime)}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                          {r.status === "half_day" ? "Half Day" : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </div>
                      {hasTasks && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tasks ({r.tasks!.length})</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {r.tasks!.map(t => (
                              <div key={t._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.status === "done" ? "#4ade80" : t.status === "in_progress" ? "#facc15" : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: t.status === "done" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.7)", textDecoration: t.status === "done" ? "line-through" : "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                                {t.taskCheckIn && t.taskCheckOut && (
                                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{fmtElapsed(Math.floor((new Date(t.taskCheckOut).getTime() - new Date(t.taskCheckIn).getTime()) / 60000))}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Bottom tab bar */}
      <nav style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(15,23,42,0.95)", backdropFilter: "blur(12px)", paddingBottom: "env(safe-area-inset-bottom,8px)", flexShrink: 0 }}>
        {([
          { key: "today",    label: "Today",    icon: <IcoHome /> },
          { key: "tasks",    label: "Tasks",    icon: <IcoTask />, badge: tasks.filter(t => t.status !== "done").length },
          { key: "projects", label: "Projects", icon: <IcoFolder />, badge: projects.filter(p => p.status === "active").length },
          { key: "history",  label: "History",  icon: <IcoHistory /> },
        ] as { key: typeof tab; label: string; icon: React.ReactNode; badge?: number }[]).map(({ key, label, icon, badge }) => {
          const active = tab === key;
          return (
            <button key={key} type="button" onClick={() => setTab(key)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px 6px", background: "none", border: "none", cursor: "pointer", position: "relative" }}>
              <div style={{ color: active ? "#818cf8" : "rgba(255,255,255,0.35)", transition: "color 0.15s", position: "relative" }}>
                {icon}
                {badge != null && badge > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, background: "#6366f1", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{badge}</span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? "#818cf8" : "rgba(255,255,255,0.35)", transition: "color 0.15s" }}>{label}</span>
              {active && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 24, height: 2, borderRadius: 2, background: "#6366f1" }} />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
