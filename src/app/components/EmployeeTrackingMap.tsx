import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../config/api";
import { useAuth } from "../contexts/AuthContext";
import { animateMarker, bearing, haversineM, encodeDigiPin, type LatLng } from "../utils/markerAnimation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveEmployee {
  employeeId: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: string;
  online: boolean;
  speed: number | null;    // m/s from GPS
  heading: number | null;  // degrees 0-360
  accuracy: number | null; // metres
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

// ── Constants ─────────────────────────────────────────────────────────────────

const GOOGLE_MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "";

// 60s stale: native posts every 15s, web every 20-30s. 60s = 4x buffer.
const STALE_THRESHOLD_MS = 60_000;

// Auto-refresh snapshot every 60s to catch employees who joined while map was open
const SNAPSHOT_REFRESH_MS = 60_000;

// ── Google Maps loader (singleton) ────────────────────────────────────────────

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps?.Map) return resolve();
    if (!window._gmapResolvers) window._gmapResolvers = [];
    window._gmapResolvers.push(resolve);
    if (window._gmapLoading) return;
    window._gmapLoading = true;
    (window as any)._gmapCallback = () => {
      window._gmapResolvers?.forEach((r) => r());
      window._gmapResolvers = [];
      window._gmapLoading = false;
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=_gmapCallback&libraries=geometry,marker&loading=async&v=weekly`;
    s.async = true;
    s.onerror = () => console.error("[map] Google Maps failed to load");
    document.head.appendChild(s);
  });
}

// ── Marker content builder (Advanced Markers) ───────────────────────────────

function buildMarkerContent(emp: LiveEmployee, color: string, isMoving: boolean, isStale: boolean) {
  const div = document.createElement("div");
  div.style.position = "relative";
  
  if (isMoving && emp.heading != null) {
    // Arrow for moving employees
    div.innerHTML = `
      <div style="transform: rotate(${emp.heading}deg); transition: transform 0.3s">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="${color}" stroke="#fff" stroke-width="2"/>
        </svg>
      </div>
    `;
  } else {
    // Pulse pin for stationary/offline employees
    div.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          width: 32px; height: 32px; 
          background: ${color}; 
          border-radius: 12px 12px 12px 0; 
          transform: rotate(-45deg); 
          border: 2px solid white; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        ">
          <div style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 14px;">
            ${emp.name[0].toUpperCase()}
          </div>
        </div>
        ${emp.online && !isStale ? `
          <div style="
            position: absolute; top: -4px; right: -4px; 
            width: 12px; height: 12px; 
            background: #22c55e; 
            border: 2px solid white; 
            border-radius: 50%; 
            animation: livePulse 2s infinite;
          "></div>
        ` : ''}
      </div>
    `;
  }
  return div;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function secAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
}

function fmtAgo(sec: number): string {
  if (sec < 5)   return "just now";
  if (sec < 60)  return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function fmtSpeed(mps: number | null): string {
  if (mps == null || mps < 0.5) return "Stationary";
  const kmh = mps * 3.6;
  if (kmh < 5)  return `Walking ${kmh.toFixed(1)} km/h`;
  if (kmh < 25) return `Cycling ${kmh.toFixed(1)} km/h`;
  return `Driving ${kmh.toFixed(1)} km/h`;
}

function headingArrow(deg: number | null): string {
  if (deg == null) return "";
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeeTrackingMap({ profileId }: { profileId?: string | null }) {
  const { accessToken, user } = useAuth();

  // Map refs
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef     = useRef<Map<string, any>>(new Map());
  const cancelAnimRef  = useRef<Map<string, () => void>>(new Map());
  const prevPosRef     = useRef<Map<string, LatLng>>(new Map());
  const geofenceRef    = useRef<Map<string, any>>(new Map());
  const trailRef       = useRef<Map<string, any>>(new Map());   // Polyline per employee
  const infoWindowRef  = useRef<any>(null);
  const socketRef      = useRef<Socket | null>(null);

  // State
  const [employees, setEmployees] = useState<Map<string, LiveEmployee>>(new Map());
  const [staleSet,  setStaleSet]  = useState<Set<string>>(new Set());
  const [mapReady,  setMapReady]  = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [mapType,   setMapType]   = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Trail points per employee — kept in ref so marker effect can read without re-running
  const trailPointsRef = useRef<Map<string, LatLng[]>>(new Map());

  // ── Snapshot loader ─────────────────────────────────────────────────────────
  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const params = profileId ? `?profileId=${profileId}` : "";
      const res = await fetch(`${API_URL}/attendance/live${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const freshStale = new Set<string>();
      setEmployees((prev) => {
        const next = new Map(prev);
        for (const r of data) {
          if (!r.lastLocation?.lat) continue;
          const id = String(r.employeeId?._id ?? r.employeeId);
          const ageMs = r.lastLocation?.updatedAt
            ? Date.now() - new Date(r.lastLocation.updatedAt).getTime()
            : Infinity;
          if (ageMs >= STALE_THRESHOLD_MS) freshStale.add(id);
          next.set(id, {
            employeeId: id,
            name:       r.employeeId?.name ?? "Employee",
            lat:        r.lastLocation.lat,
            lng:        r.lastLocation.lng,
            updatedAt:  r.lastLocation.updatedAt ?? new Date().toISOString(),
            online:     next.get(id)?.online ?? ageMs < STALE_THRESHOLD_MS,
            speed:      r.lastLocation.speed   ?? null,
            heading:    r.lastLocation.heading  ?? null,
            accuracy:   r.lastLocation.accuracy ?? null,
            schedule:   r.employeeId?.schedule,
          });
        }
        return next;
      });
      if (freshStale.size > 0) {
        setStaleSet((prev) => { const n = new Set(prev); freshStale.forEach(id => n.add(id)); return n; });
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
        mapId: "EMPLOYEE_TRACKING_MAP",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "simplified" }] },
        ],
      });
      infoWindowRef.current = new window.google.maps.InfoWindow({ maxWidth: 280 });
      setMapReady(true);
    });
  }, []);

  // ── Socket.io ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(API_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token: accessToken || "" },
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join-owner"));

    socket.on("employee-location", (data: {
      employeeId: string; name: string;
      lat: number; lng: number; updatedAt: string;
      speed: number | null; heading: number | null; accuracy: number | null;
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
          speed:      data.speed,
          heading:    data.heading,
          accuracy:   data.accuracy,
          schedule:   existing?.schedule,
        });
        return next;
      });
      // Append to trail
      trailPointsRef.current.set(
        data.employeeId,
        [...(trailPointsRef.current.get(data.employeeId) ?? []).slice(-120),
          { lat: data.lat, lng: data.lng }]
      );
      setStaleSet((prev) => { const n = new Set(prev); n.delete(data.employeeId); return n; });
    });

    socket.on("employee-online", ({ employeeId, online }: { employeeId: string; online: boolean }) => {
      setEmployees((prev) => {
        const next = new Map(prev);
        const e = next.get(employeeId);
        if (e) next.set(employeeId, { ...e, online });
        return next;
      });
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user?.id, accessToken]);

  // ── Stale detection every 10s ───────────────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setStaleSet(() => {
        const next = new Set<string>();
        setEmployees((emps) => {
          emps.forEach((e) => {
            if (now - new Date(e.updatedAt).getTime() > STALE_THRESHOLD_MS) next.add(e.employeeId);
          });
          return emps;
        });
        return next;
      });
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  // ── Auto-refresh snapshot ───────────────────────────────────────────────────
  useEffect(() => {
    loadSnapshot();
    const id = window.setInterval(loadSnapshot, SNAPSHOT_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadSnapshot]);

  // ── Tick every second for live timestamps ───────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fit map to all markers ──────────────────────────────────────────────────
  const fitAllMarkers = useCallback(() => {
    if (!mapInstanceRef.current || employees.size === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    employees.forEach((e) => bounds.extend({ lat: e.lat, lng: e.lng }));
    mapInstanceRef.current.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
    if (employees.size === 1) mapInstanceRef.current.setZoom(18);
  }, [employees]);

  const hasInitialFit = useRef(false);
  useEffect(() => {
    if (mapReady && employees.size > 0 && !hasInitialFit.current) {
      fitAllMarkers();
      hasInitialFit.current = true;
    }
  }, [mapReady, employees.size, fitAllMarkers]);

  // ── Focus on selected employee ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current) return;
    const emp = employees.get(selectedId);
    if (!emp) return;
    mapInstanceRef.current.panTo({ lat: emp.lat, lng: emp.lng });
    if (mapInstanceRef.current.getZoom() < 17) mapInstanceRef.current.setZoom(17);
  }, [selectedId]);

  // ── Sync markers, trails, geofences ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map     = mapInstanceRef.current;
    const markers = markersRef.current;

    employees.forEach((emp) => {
      const isStale   = staleSet.has(emp.employeeId);
      const isMoving  = emp.speed != null && emp.speed > 0.8; // > ~3 km/h
      const isOut     = !!(
        emp.schedule?.workLocation?.lat &&
        emp.schedule?.geofenceMeters &&
        haversineM({ lat: emp.lat, lng: emp.lng }, {
          lat: emp.schedule.workLocation.lat,
          lng: emp.schedule.workLocation.lng,
        }) > emp.schedule.geofenceMeters
      );

      // Color: grey=stale, red=out-of-geofence, green=live+online, indigo=online-not-moving
      const color = isStale ? "#94a3b8" : isOut ? "#f43f5e" : emp.online ? "#22c55e" : "#6366f1";
      const targetPos: LatLng = { lat: emp.lat, lng: emp.lng };

      if (markers.has(emp.employeeId)) {
        // ── Update existing marker ──────────────────────────────────────────
        const m = markers.get(emp.employeeId)!;

        // Cancel in-flight animation, start new one from last known position
        cancelAnimRef.current.get(emp.employeeId)?.();
        const startPos = prevPosRef.current.get(emp.employeeId) ?? targetPos;
        const cancel = animateMarker(m, startPos, targetPos, 1200);
        cancelAnimRef.current.set(emp.employeeId, cancel);
        prevPosRef.current.set(emp.employeeId, targetPos);

        m.content = buildMarkerContent(emp, color, isMoving, isStale);

        // ── Update trail polyline ───────────────────────────────────────────
        const pts = trailPointsRef.current.get(emp.employeeId) ?? [];
        if (trailRef.current.has(emp.employeeId)) {
          trailRef.current.get(emp.employeeId).setPath(pts);
        } else if (pts.length > 1) {
          const poly = new window.google.maps.Polyline({
            map,
            path: pts,
            strokeColor: color,
            strokeOpacity: 0.55,
            strokeWeight: 3,
            icons: [{
              icon: { path: window.google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 2.5, strokeColor: color },
              offset: "100%",
              repeat: "80px",
            }],
          });
          trailRef.current.set(emp.employeeId, poly);
        }

        // ── Update geofence circle ──────────────────────────────────────────
        if (geofenceRef.current.has(emp.employeeId)) {
          const c = geofenceRef.current.get(emp.employeeId);
          if (emp.schedule?.workLocation?.lat && emp.schedule?.geofenceMeters) {
            c.setCenter({ lat: emp.schedule.workLocation.lat, lng: emp.schedule.workLocation.lng });
            c.setRadius(emp.schedule.geofenceMeters);
            c.setOptions({
              strokeColor: isOut ? "#f43f5e" : "#6366f1",
              fillColor:   isOut ? "#f43f5e" : "#6366f1",
              fillOpacity: isOut ? 0.25 : 0.15,
              strokeWeight: 3,
              strokeOpacity: 0.8,
            });
          } else {
            geofenceRef.current.get(emp.employeeId).setMap(null);
            geofenceRef.current.delete(emp.employeeId);
          }
        } else if (emp.schedule?.workLocation?.lat && emp.schedule?.geofenceMeters) {
          const circle = new window.google.maps.Circle({
            map,
            center: { lat: emp.schedule.workLocation.lat, lng: emp.schedule.workLocation.lng },
            radius: emp.schedule.geofenceMeters,
            fillColor: "#6366f1", fillOpacity: 0.15,
            strokeColor: "#6366f1", strokeWeight: 3, strokeOpacity: 0.7,
            clickable: false,
          });
          geofenceRef.current.set(emp.employeeId, circle);
        }

      } else {
        // ── Create new marker (AdvancedMarkerElement) ───────────────────────
        prevPosRef.current.set(emp.employeeId, targetPos);
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position: targetPos,
          title: emp.name,
          content: buildMarkerContent(emp, color, isMoving, isStale),
          zIndex: emp.online ? 10 : 5,
        });

        marker.addListener("click", async () => {
          setSelectedId(emp.employeeId);
          const e = employees.get(emp.employeeId) ?? emp;
          const sec = secAgo(e.updatedAt);
          const pin = encodeDigiPin(e.lat, e.lng);
          const speedStr = fmtSpeed(e.speed);
          const hdg = headingArrow(e.heading);
          const isStaleNow = staleSet.has(e.employeeId);

          const buildContent = (addrHtml: string) => `
            <div style="font-family:system-ui,-apple-system,sans-serif;padding:2px;min-width:200px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <div style="width:36px;height:36px;border-radius:50%;background:${isStaleNow ? "#94a3b8" : e.online ? "#22c55e" : "#6366f1"};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0">
                  ${e.name[0].toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700;font-size:14px;color:#0f172a">${e.name}</div>
                  <div style="font-size:11px;color:${isStaleNow ? "#94a3b8" : e.online ? "#16a34a" : "#6366f1"};font-weight:600">
                    ${isStaleNow ? "⚫ No signal" : e.online ? "● Live" : "○ Offline"} · ${fmtAgo(sec)}
                  </div>
                </div>
                <div style="margin-left:auto;background:#f1f5f9;padding:2px 7px;border-radius:6px;font-family:monospace;font-size:9px;font-weight:700;color:#475569;border:1px solid #e2e8f0;white-space:nowrap">
                  DIGI-${pin}
                </div>
              </div>
              <div style="background:#f8fafc;border-radius:8px;padding:8px 10px;margin-bottom:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
                <div>
                  <div style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Speed</div>
                  <div style="font-size:12px;font-weight:600;color:#0f172a">${speedStr}</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Heading</div>
                  <div style="font-size:12px;font-weight:600;color:#0f172a">${hdg ? hdg + " " + (e.heading?.toFixed(0) ?? "") + "°" : "—"}</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Accuracy</div>
                  <div style="font-size:12px;font-weight:600;color:#0f172a">${e.accuracy != null ? "±" + Math.round(e.accuracy) + "m" : "—"}</div>
                </div>
                <div>
                  <div style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Coords</div>
                  <div style="font-size:10px;font-weight:500;color:#475569;font-family:monospace">${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}</div>
                </div>
              </div>
              <div style="font-size:12px;color:#334155;line-height:1.5">📍 ${addrHtml}</div>
              ${isStaleNow ? `<div style="margin-top:8px;padding:5px 8px;background:#fff1f2;border-radius:6px;font-size:11px;color:#e11d48;font-weight:600">⚫ Signal lost ${fmtAgo(sec)}</div>` : ""}
            </div>`;

          infoWindowRef.current.setContent(buildContent("<span style='color:#94a3b8'>Resolving address…</span>"));
          infoWindowRef.current.open(map, marker);
          map.panTo(marker.getPosition());
          if (map.getZoom() < 17) map.setZoom(17);

          try {
            const r = await fetch(`${API_URL}/geocode?lat=${e.lat}&lng=${e.lng}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const d = await r.json();
            infoWindowRef.current.setContent(
              buildContent(d?.address ?? "<span style='color:#d97706'>Unknown location</span>")
            );
          } catch {
            infoWindowRef.current.setContent(buildContent("<span style='color:#ef4444'>Failed to load address</span>"));
          }
        });

        markers.set(emp.employeeId, marker);

        // Create geofence circle for new employee
        if (emp.schedule?.workLocation?.lat && emp.schedule?.geofenceMeters) {
          const circle = new window.google.maps.Circle({
            map,
            center: { lat: emp.schedule.workLocation.lat, lng: emp.schedule.workLocation.lng },
            radius: emp.schedule.geofenceMeters,
            fillColor: "#6366f1", fillOpacity: 0.06,
            strokeColor: "#6366f1", strokeWeight: 1.5, strokeOpacity: 0.4,
            clickable: false,
          });
          geofenceRef.current.set(emp.employeeId, circle);
        }
      }
    });

    // ── Remove markers for employees no longer tracked ──────────────────────
    markers.forEach((marker, id) => {
      if (!employees.has(id)) {
        cancelAnimRef.current.get(id)?.();
        cancelAnimRef.current.delete(id);
        prevPosRef.current.delete(id);
        marker.setMap(null);
        markers.delete(id);
        trailRef.current.get(id)?.setMap(null);
        trailRef.current.delete(id);
        trailPointsRef.current.delete(id);
        geofenceRef.current.get(id)?.setMap(null);
        geofenceRef.current.delete(id);
      }
    });
  }, [employees, staleSet, mapReady, accessToken]);

  // ── Map type sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    mapInstanceRef.current.setMapTypeId(mapType);
  }, [mapType, mapReady]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const onlineCount  = Array.from(employees.values()).filter((e) => e.online && !staleSet.has(e.employeeId)).length;
  const staleCount   = staleSet.size;
  const movingCount  = Array.from(employees.values()).filter((e) => e.speed != null && e.speed > 0.8).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {onlineCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "#16a34a" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "livePulse 2s infinite" }} />
              {onlineCount} live
            </span>
          )}
          {movingCount > 0 && (
            <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>
              🚶 {movingCount} moving
            </span>
          )}
          {staleCount > 0 && (
            <span style={{ fontSize: 13, color: "#94a3b8" }}>⚫ {staleCount} no signal</span>
          )}
          <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            {employees.size} tracked today
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={fitAllMarkers}
            style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", cursor: "pointer", fontWeight: 600 }}>
            Fit All
          </button>
          <button type="button" onClick={loadSnapshot}
            style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", cursor: "pointer" }}>
            Refresh
          </button>
        </div>
      </div>

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* ── Map container ──────────────────────────────────────────────────── */}
      <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", height: 480 }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Map type switcher */}
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, display: "flex", gap: 2, background: "rgba(255,255,255,0.95)", borderRadius: 10, padding: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", backdropFilter: "blur(8px)" }}>
          {(["roadmap", "satellite", "hybrid", "terrain"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setMapType(t)}
              style={{ padding: "5px 11px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: mapType === t ? "#6366f1" : "transparent",
                color: mapType === t ? "#fff" : "#444",
                transition: "all 0.15s" }}>
              {t === "roadmap" ? "🗺 Map" : t === "satellite" ? "🛰 Sat" : t === "hybrid" ? "🔀 Hybrid" : "🏔 Terrain"}
            </button>
          ))}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(4px)", pointerEvents: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", animation: "spin 0.7s linear infinite" }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && employees.size === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.2 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            <p style={{ margin: 0, fontSize: 15, color: "var(--muted-foreground)", fontWeight: 600 }}>No employees tracked yet</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", opacity: 0.6 }}>Employees appear here once they check in and share location</p>
          </div>
        )}
      </div>

      {/* ── Employee roster ─────────────────────────────────────────────────── */}
      {employees.size > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Array.from(employees.values())
            .sort((a, b) => {
              // Live first, then by last update
              if (a.online !== b.online) return a.online ? -1 : 1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
            .map((emp) => {
              const sec     = secAgo(emp.updatedAt);
              const isStale = staleSet.has(emp.employeeId);
              const isMoving = emp.speed != null && emp.speed > 0.8;
              const isSelected = selectedId === emp.employeeId;
              const color   = isStale ? "#94a3b8" : emp.online ? "#22c55e" : "#6366f1";

              return (
                <div key={emp.employeeId}
                  onClick={() => setSelectedId(isSelected ? null : emp.employeeId)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12,
                    border: `1px solid ${isSelected ? "#6366f1" : "var(--border)"}`,
                    background: isSelected ? "rgba(99,102,241,0.05)" : "var(--card)",
                    cursor: "pointer", transition: "all 0.15s" }}>

                  {/* Avatar with live dot */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: 14 }}>
                      {emp.name[0].toUpperCase()}
                    </div>
                    {emp.online && !isStale && (
                      <span style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11,
                        borderRadius: "50%", background: "#22c55e", border: "2px solid var(--card)",
                        animation: "livePulse 2s infinite" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{emp.name}</p>
                      {isMoving && <span style={{ fontSize: 10, background: "rgba(99,102,241,0.1)", color: "#6366f1", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>MOVING</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                      {isStale ? `⚫ No signal · ${fmtAgo(sec)}`
                        : emp.online ? `● Live · ${fmtAgo(sec)} · ${fmtSpeed(emp.speed)}`
                        : `○ Offline · ${fmtAgo(sec)}`}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--muted-foreground)", opacity: 0.7, fontFamily: "monospace" }}>
                      DIGI-{encodeDigiPin(emp.lat, emp.lng)} · {emp.lat.toFixed(5)}, {emp.lng.toFixed(5)}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 600, flexShrink: 0,
                    background: isStale ? "rgba(148,163,184,0.1)" : emp.online ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)",
                    color: isStale ? "#94a3b8" : emp.online ? "#16a34a" : "#6366f1" }}>
                    {isStale ? "No signal" : emp.online ? "● Live" : "Offline"}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
