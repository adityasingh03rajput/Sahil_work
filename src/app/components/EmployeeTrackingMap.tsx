import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../config/api";
import { useAuth } from "../contexts/AuthContext";
import { animateMarker, predictNext, bearing, encodeDigiPin, type LatLng } from "../utils/markerAnimation";

interface LiveEmployee {
  employeeId: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: string;   // ISO
  online: boolean;
  // for dead reckoning
  prevLat?: number;
  prevLng?: number;
  schedule?: {
    geofenceMeters?: number;
    workLocation?: { lat: number; lng: number; address: string };
  };
}

declare global {
  interface Window {
    google: any;
    _gmapResolvers?: Array<() => void>;
    _gmapLoading?: boolean;
  }
}

const GOOGLE_MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "";
// 45s stale threshold: native service posts every 15s, but Doze/network can add
// 10-20s of delay. 20s was too tight — employees kept flipping to stale between pings.
const STALE_THRESHOLD_MS = 45_000;
const DR_INTERVAL_MS     = 1_000;   // dead-reckoning update cadence

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps) return resolve();
    if (!window._gmapResolvers) window._gmapResolvers = [];
    window._gmapResolvers.push(resolve);
    if (window._gmapLoading) return;
    window._gmapLoading = true;
    (window as any)._gmapCallback = () => {
      window._gmapResolvers?.forEach((r) => r());
      window._gmapResolvers = [];
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=_gmapCallback&loading=async&v=weekly`;
    s.async = true;
    document.head.appendChild(s);
  });
}

/** Seconds since ISO string, capped to 99 */
function secAgo(iso: string): number {
  return Math.min(99, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function fmtAgo(sec: number): string {
  if (sec < 5)  return "just now";
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}

export function EmployeeTrackingMap({ profileId }: { profileId?: string | null }) {
  const { accessToken, user } = useAuth();
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const markersRef      = useRef<Map<string, any>>(new Map());
  const cancelAnimRef   = useRef<Map<string, () => void>>(new Map());  // cancel in-flight animations
  const prevPosRef      = useRef<Map<string, LatLng>>(new Map());      // for animation start
  const geofenceRef     = useRef<Map<string, any>>(new Map());         // google.maps.Circle
  const infoWindowRef   = useRef<any>(null);
  const socketRef       = useRef<Socket | null>(null);
  const drTimerRef      = useRef<number | null>(null);

  const [employees, setEmployees] = useState<Map<string, LiveEmployee>>(new Map());
  const [staleSet,  setStaleSet]  = useState<Set<string>>(new Set());  // IDs considered stale
  const [mapReady,  setMapReady]  = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [mapType, setMapType]     = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [, setTick] = useState(0); // forces re-render every second to update "last seen" timestamps

  // ── Load last-known locations from REST (initial snapshot) ─────────────────
  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const params = profileId ? `?profileId=${profileId}` : "";
      const res  = await fetch(`${API_URL}/attendance/live${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const freshStale = new Set<string>();
        setEmployees((prev) => {
          const next = new Map(prev);
          for (const r of data) {
            if (!r.lastLocation?.lat) continue;
            const id = String(r.employeeId._id ?? r.employeeId);
            const lastUpdatedMs = r.lastLocation?.updatedAt
              ? Date.now() - new Date(r.lastLocation.updatedAt).getTime()
              : Infinity;
            const wasRecentlyActive = lastUpdatedMs < STALE_THRESHOLD_MS;
            if (!wasRecentlyActive) freshStale.add(id);
            next.set(id, {
              employeeId: id,
              name:       r.employeeId?.name ?? "Employee",
              lat:        r.lastLocation.lat,
              lng:        r.lastLocation.lng,
              updatedAt:  r.lastLocation.updatedAt,
              // Only mark online if recently active; socket events will update this
              online:     next.get(id)?.online ?? wasRecentlyActive,
              schedule:   r.employeeId?.schedule,
            });
          }
          return next;
        });
        // Immediately mark stale employees so they show grey, not green
        if (freshStale.size > 0) {
          setStaleSet((prev) => {
            const next = new Set(prev);
            freshStale.forEach((id) => next.add(id));
            return next;
          });
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [accessToken, profileId]);

  // ── Init Google Maps ────────────────────────────────────────────────────────
  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
      setMapReady(true);
    });
  }, []);

  // ── Socket.io ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(API_URL, { path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => { socket.emit("join-owner", user.id); });

    socket.on("employee-location", (data: {
      employeeId: string; name: string;
      lat: number; lng: number; updatedAt: string;
    }) => {
      setEmployees((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.employeeId);
        next.set(data.employeeId, {
          employeeId: data.employeeId,
          name:       data.name || existing?.name || "Employee",
          lat:        data.lat,
          lng:        data.lng,
          updatedAt:  data.updatedAt,
          online:     true,
          prevLat:    existing?.lat,
          prevLng:    existing?.lng,
          schedule:   existing?.schedule,
        });
        return next;
      });
      // Remove from stale set on fresh update
      setStaleSet((prev) => { const n = new Set(prev); n.delete(data.employeeId); return n; });
    });

    socket.on("employee-online", ({ employeeId, online }: { employeeId: string; online: boolean }) => {
      setEmployees((prev) => {
        const next = new Map(prev);
        const existing = next.get(employeeId);
        if (existing) next.set(employeeId, { ...existing, online });
        return next;
      });
    });

    return () => { socket.disconnect(); };
  }, [user?.id]);

  // ── Stale detection — check every 5s ───────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      setStaleSet(() => {
        const next = new Set<string>();
        setEmployees((emps) => {
          emps.forEach((e) => {
            if (Date.now() - new Date(e.updatedAt).getTime() > STALE_THRESHOLD_MS) {
              next.add(e.employeeId);
            }
          });
          return emps; // no mutation
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  // ── Tick every second to keep "last seen X ago" labels live ───────────────
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

    // ── Fit Map to Markers ──────────────────────────────────────────────────
    const fitAllMarkers = useCallback(() => {
      if (!mapInstanceRef.current || employees.size === 0) return;
      const bounds = new window.google.maps.LatLngBounds();
      employees.forEach((e) => bounds.extend({ lat: e.lat, lng: e.lng }));
      mapInstanceRef.current.fitBounds(bounds);
      if (employees.size === 1) mapInstanceRef.current.setZoom(20);
    }, [employees]);

    const hasInitialFitRef = useRef(false);
    useEffect(() => {
      if (mapReady && employees.size > 0 && !hasInitialFitRef.current) {
        fitAllMarkers();
        hasInitialFitRef.current = true;
      }
    }, [mapReady, employees.size, fitAllMarkers]);

    // ── Sync markers + smooth animation ────────────────────────────────────────
    useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map     = mapInstanceRef.current;
    const markers = markersRef.current;

    employees.forEach((emp) => {
      const isStale   = staleSet.has(emp.employeeId);
      const isOut     = emp.schedule?.workLocation?.lat && emp.schedule?.geofenceMeters && 
                        haversineM({ lat: emp.lat, lng: emp.lng }, { lat: emp.schedule.workLocation.lat, lng: emp.schedule.workLocation.lng }) > emp.schedule.geofenceMeters;

      const color     = isStale ? "#94a3b8" : isOut ? "#f43f5e" : emp.online ? "#22c55e" : "#6366f1";
      const targetPos = { lat: emp.lat, lng: emp.lng };

      if (markers.has(emp.employeeId)) {
        const m = markers.get(emp.employeeId)!;
        // Cancel any in-flight animation before starting a new one
        cancelAnimRef.current.get(emp.employeeId)?.();

        const start: LatLng = prevPosRef.current.get(emp.employeeId) ?? targetPos;
        const cancel = animateMarker(m, start, targetPos, 2000);
        cancelAnimRef.current.set(emp.employeeId, cancel);
        prevPosRef.current.set(emp.employeeId, targetPos);

        m.setIcon({
          path: "M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.53 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2.5,
          scale: 1.5,
          anchor: new window.google.maps.Point(12, 24),
          labelOrigin: new window.google.maps.Point(12, 9),
        });

        // ── Geofence Circle Sync ──
        if (geofenceRef.current.has(emp.employeeId)) {
          const c = geofenceRef.current.get(emp.employeeId);
          if (emp.schedule?.workLocation?.lat && emp.schedule?.geofenceMeters) {
            c.setCenter({ lat: emp.schedule.workLocation.lat, lng: emp.schedule.workLocation.lng });
            c.setRadius(emp.schedule.geofenceMeters);
            c.setOptions({ strokeColor: isOut ? "#f43f5e" : "#6366f1", fillOpacity: isOut ? 0.15 : 0.08 });
          } else {
            c.setMap(null);
            geofenceRef.current.delete(emp.employeeId);
          }
        } else if (emp.schedule?.workLocation?.lat && emp.schedule?.geofenceMeters) {
           const circle = new window.google.maps.Circle({
             map,
             center: { lat: emp.schedule.workLocation.lat, lng: emp.schedule.workLocation.lng },
             radius: emp.schedule.geofenceMeters,
             fillColor: "#6366f1",
             fillOpacity: 0.08,
             strokeColor: "#6366f1",
             strokeWeight: 1,
             strokeOpacity: 0.2,
             clickable: false
           });
           geofenceRef.current.set(emp.employeeId, circle);
        }
      } else {
        // First time — place marker immediately, no animation needed
        prevPosRef.current.set(emp.employeeId, targetPos);
        const marker = new window.google.maps.Marker({
          map,
          position: targetPos,
          title: emp.name,
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.53 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
            scale: 1.5,
            anchor: new window.google.maps.Point(12, 24),
            labelOrigin: new window.google.maps.Point(12, 9),
          },
          label: {
            text: emp.name[0].toUpperCase(),
            color: "#fff",
            fontWeight: "bold",
            fontSize: "10px",
          },
        });

        marker.addListener("click", async () => {
          const e = employees.get(emp.employeeId)!;
          const sec = secAgo(e.updatedAt);
          const t = new Date(e.updatedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
          });
          const pin = encodeDigiPin(e.lat, e.lng);
          
          const buildContent = (addressHtml: string) => `
            <div style="font-family:system-ui;padding:4px 2px;min-width:170px;max-width:240px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="width:8px;height:8px;border-radius:50%;background:${isStale ? "#94a3b8" : e.online ? "#22c55e" : "#6366f1"}"></div>
                  <strong style="font-size:14px;color:#000">${e.name}</strong>
                </div>
                <div style="background:#f1f5f9;padding:2px 6px;border-radius:6px;font-family:monospace;font-size:9px;font-weight:700;color:#475569;border:1px solid #e2e8f0">
                  DIGI-${pin}
                </div>
              </div>
              <div style="font-size:12px;color:#475569;margin-bottom:6px">Last update: ${t} (${fmtAgo(sec)})</div>
              <div style="font-size:12px;color:#1e293b;margin-top:6px;line-height:1.4">📍 ${addressHtml}</div>
              <div style="font-size:10px;color:#94a3b8;margin-top:6px;padding-top:6px;border-top:1px solid #f1f5f9">${e.lat.toFixed(6)}, ${e.lng.toFixed(6)}</div>
              ${isStale ? `<div style="font-size:11px;color:#e11d48;margin-top:8px;padding:4px 8px;background:#fff1f2;border-radius:6px;font-weight:600">⚫ Signal Lost ${fmtAgo(sec)}</div>` : ""}
            </div>
          `;

          // Show immediate fallback
          infoWindowRef.current.setContent(buildContent("<span style='color:#888'>Loading address...</span>"));
          infoWindowRef.current.open(map, marker);
          
          // Focus and zoom
          map.panTo(marker.getPosition());
          if (map.getZoom() < 20) map.setZoom(20);

          // Fetch robust reverse geocoding via our backend 100m cache layer
          try {
            const res = await fetch(`${API_URL}/geocode?lat=${e.lat}&lng=${e.lng}`);
            const data = await res.json();
            if (data?.address) {
              infoWindowRef.current.setContent(buildContent(data.address));
            } else {
              infoWindowRef.current.setContent(buildContent("<span style='color:#d97706'>Unknown Location</span>"));
            }
          } catch {
            infoWindowRef.current.setContent(buildContent("<span style='color:#ef4444'>Failed to load address</span>"));
          }
        });

        markers.set(emp.employeeId, marker);
      }
    });

    // Remove stale markers
    markers.forEach((marker, id) => {
      if (!employees.has(id)) {
        cancelAnimRef.current.get(id)?.();
        cancelAnimRef.current.delete(id);
        prevPosRef.current.delete(id);
        marker.setMap(null);
        markers.delete(id);
        geofenceRef.current.get(id)?.setMap(null);
        geofenceRef.current.delete(id);
      }
    });
  }, [employees, staleSet, mapReady]);

  // ── Dead reckoning: if no update for 5-10s, extrapolate position ──────────
  useEffect(() => {
    if (drTimerRef.current) clearInterval(drTimerRef.current);
    drTimerRef.current = window.setInterval(() => {
      const map     = mapInstanceRef.current;
      const markers = markersRef.current;
      if (!map) return;

      employees.forEach((emp) => {
        const sinceMs = Date.now() - new Date(emp.updatedAt).getTime();
        if (sinceMs < 5000 || sinceMs > 10000) return;   // only 5–10s window
        if (!emp.prevLat || !emp.prevLng) return;

        const from: LatLng = { lat: emp.prevLat, lng: emp.prevLng };
        const to:   LatLng = { lat: emp.lat,     lng: emp.lng };
        const b     = bearing(from, to);
        const speed = haversineM(from, to) / Math.max(1, sinceMs); // m/ms

        const predicted = predictNext(to, speed, b, sinceMs - 5000);
        const m = markers.get(emp.employeeId);
        if (m) m.setPosition({ lat: predicted.lat, lng: predicted.lng });
      });
    }, DR_INTERVAL_MS) as unknown as number;

    return () => { if (drTimerRef.current) clearInterval(drTimerRef.current); };
  }, [employees]);

  // ── Apply map type changes ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    mapInstanceRef.current.setMapTypeId(mapType);
  }, [mapType, mapReady]);

  const onlineCount = Array.from(employees.values()).filter((e) => e.online).length;
  const staleCount  = staleSet.size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onlineCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
              <span style={{ color: "#22c55e", fontWeight: 600 }}>{onlineCount} live</span>
            </span>
          )}
          {staleCount > 0 && (
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              ⚫ {staleCount} no signal
            </span>
          )}
          <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            {employees.size} employee{employees.size !== 1 ? "s" : ""} tracked today
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={fitAllMarkers}
            style={{ fontSize: 12, padding: "4px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--primary)", cursor: "pointer", color: "var(--primary-foreground)" }}
          >
            Re-center Map
          </button>
          <button
            type="button"
            onClick={loadSnapshot}
            style={{ fontSize: 12, padding: "4px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--foreground)" }}
          >
            Refresh
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        /* Hide Google Maps "For development purposes only" watermark text */
        .gm-style div[style*="z-index: 1000000"] { display: none !important; }
        .gm-style .dismissButton { display: none !important; }
        .gm-err-container { display: none !important; }
      `}</style>

      {/* Map */}
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", height: 440 }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Map type switcher */}
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, display: "flex", gap: 2, background: "rgba(255,255,255,0.92)", borderRadius: 8, padding: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.18)", backdropFilter: "blur(4px)" }}>
          {(["roadmap", "satellite", "hybrid", "terrain"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMapType(t)}
              style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: mapType === t ? "#6366f1" : "transparent",
                color: mapType === t ? "#fff" : "#444",
                transition: "all 0.15s",
                textTransform: "capitalize",
              }}
            >
              {t === "roadmap" ? "🗺 Map" : t === "satellite" ? "🛰 Satellite" : t === "hybrid" ? "🔀 Hybrid" : "🏔 Terrain"}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)", pointerEvents: "none" }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading…</span>
          </div>
        )}

        {!loading && employees.size === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted-foreground)" }}>No locations yet</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", opacity: 0.6 }}>Employees appear here once they check in</p>
          </div>
        )}
      </div>

      {/* Employee list */}
      {employees.size > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from(employees.values()).map((emp) => {
            const sec   = secAgo(emp.updatedAt);
            const isStale = staleSet.has(emp.employeeId);
            return (
              <div key={emp.employeeId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: isStale ? "#64748b" : emp.online ? "#22c55e" : "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                    {emp.name[0].toUpperCase()}
                  </div>
                  {emp.online && !isStale && (
                    <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--card)", animation: "pulse 1.5s infinite" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{emp.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                    {isStale
                      ? `⚫ No signal · last seen ${fmtAgo(sec)}`
                      : emp.online
                        ? `Live · ${fmtAgo(sec)}`
                        : `Offline · ${fmtAgo(sec)}`}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--muted-foreground)", opacity: 0.8, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 4 }}>DIGI-{encodeDigiPin(emp.lat, emp.lng)}</span>
                    <span>{emp.lat.toFixed(5)}, {emp.lng.toFixed(5)}</span>
                  </p>
                </div>
                <span style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: 600, flexShrink: 0,
                  background: isStale ? "rgba(100,116,139,0.1)" : emp.online ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)",
                  color: isStale ? "#94a3b8" : emp.online ? "#16a34a" : "var(--muted-foreground)",
                }}>
                  {isStale ? "⚫ No signal" : emp.online ? "● Live" : "Offline"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Haversine locally (no import needed) for dead-reckoning
function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
