import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../config/api";
import { useAuth } from "../contexts/AuthContext";

interface LiveEmployee {
  employeeId: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: string;
  online: boolean;
}

declare global {
  interface Window {
    google: any;
    _gmapResolvers?: Array<() => void>;
    _gmapLoading?: boolean;
  }
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps) return resolve();

    // Queue resolvers so multiple callers don't inject the script twice
    if (!window._gmapResolvers) window._gmapResolvers = [];
    window._gmapResolvers.push(resolve);

    if (window._gmapLoading) return; // script already injecting
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

export function EmployeeTrackingMap({ profileId }: { profileId?: string | null }) {
  const { accessToken, user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  const [employees, setEmployees] = useState<Map<string, LiveEmployee>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");

  // ── Load last-known locations from REST (initial snapshot) ───────────────
  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const params = profileId ? `?profileId=${profileId}` : "";
      const res = await fetch(`${API_URL}/attendance/live${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees((prev) => {
          const next = new Map(prev);
          for (const r of data) {
            if (!r.lastLocation?.lat) continue;
            const id = String(r.employeeId._id ?? r.employeeId);
            next.set(id, {
              employeeId: id,
              name: r.employeeId?.name ?? "Employee",
              lat: r.lastLocation.lat,
              lng: r.lastLocation.lng,
              updatedAt: r.lastLocation.updatedAt,
              online: next.get(id)?.online ?? false,
            });
          }
          return next;
        });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [accessToken, profileId]);

  // ── Init Google Maps ─────────────────────────────────────────────────────
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

  // ── Socket.io: join owner room, listen for real-time events ─────────────
  useEffect(() => {
    if (!user?.id) return;

    const socket = io(API_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-owner", user.id);
    });

    // Real-time location update from an employee
    socket.on("employee-location", (data: { employeeId: string; name: string; lat: number; lng: number; updatedAt: string }) => {
      setEmployees((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.employeeId);
        next.set(data.employeeId, {
          employeeId: data.employeeId,
          name: data.name || existing?.name || "Employee",
          lat: data.lat,
          lng: data.lng,
          updatedAt: data.updatedAt,
          online: true,
        });
        return next;
      });
    });

    // Employee connected / disconnected
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

  // Load snapshot once
  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  // ── Sync Google Maps markers with employees state ────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const markers = markersRef.current;

    employees.forEach((emp) => {
      const pos = { lat: emp.lat, lng: emp.lng };
      const color = emp.online ? "#22c55e" : "#6366f1";

      if (markers.has(emp.employeeId)) {
        const m = markers.get(emp.employeeId);
        m.setPosition(pos);
        m.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2.5,
        });
      } else {
        const marker = new window.google.maps.Marker({
          map,
          position: pos,
          title: emp.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2.5,
          },
          label: {
            text: emp.name[0].toUpperCase(),
            color: "#fff",
            fontWeight: "bold",
            fontSize: "12px",
          },
        });

        marker.addListener("click", () => {
          const emp2 = employees.get(emp.employeeId)!;
          const t = emp2.updatedAt
            ? new Date(emp2.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
            : "—";
          infoWindowRef.current.setContent(
            `<div style="font-family:system-ui;padding:4px 2px;min-width:160px">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <div style="width:8px;height:8px;border-radius:50%;background:${emp2.online ? "#22c55e" : "#94a3b8"}"></div>
                <strong style="font-size:14px">${emp2.name}</strong>
              </div>
              <div style="font-size:12px;color:#555">Last seen: ${t}</div>
              <div style="font-size:11px;color:#888;margin-top:2px">${emp2.lat.toFixed(5)}, ${emp2.lng.toFixed(5)}</div>
            </div>`
          );
          infoWindowRef.current.open(map, marker);
        });

        markers.set(emp.employeeId, marker);
      }
    });

    // Remove stale markers
    markers.forEach((marker, id) => {
      if (!employees.has(id)) { marker.setMap(null); markers.delete(id); }
    });

    // Fit bounds
    if (employees.size > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      employees.forEach((e) => bounds.extend({ lat: e.lat, lng: e.lng }));
      map.fitBounds(bounds);
      if (employees.size === 1) map.setZoom(15);
    }
  }, [employees, mapReady]);

  // ── Apply map type changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    mapInstanceRef.current.setMapTypeId(mapType);
  }, [mapType, mapReady]);

  const onlineCount = Array.from(employees.values()).filter((e) => e.online).length;

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
          <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            {employees.size} employee{employees.size !== 1 ? "s" : ""} tracked today
          </span>
        </div>
        <button
          type="button"
          onClick={loadSnapshot}
          style={{ fontSize: 12, padding: "4px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--foreground)" }}
        >
          Refresh
        </button>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

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
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading…</span>
          </div>
        )}

        {!loading && employees.size === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
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
            const t = emp.updatedAt
              ? new Date(emp.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
              : "—";
            return (
              <div key={emp.employeeId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: emp.online ? "#22c55e" : "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                    {emp.name[0].toUpperCase()}
                  </div>
                  {emp.online && (
                    <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--card)", animation: "pulse 1.5s infinite" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{emp.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                    {emp.online ? "Live" : `Last: ${t}`} · {emp.lat.toFixed(4)}, {emp.lng.toFixed(4)}
                  </p>
                </div>
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: emp.online ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)", color: emp.online ? "#16a34a" : "var(--muted-foreground)", fontWeight: 600, flexShrink: 0 }}>
                  {emp.online ? "● Live" : "Offline"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
