import { useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { App } from "@capacitor/app";
import { Motion } from "@capacitor/motion";
import { Geolocation, Position } from "@capacitor/geolocation";
import { registerPlugin } from "@capacitor/core";
import { toast } from "sonner";

const TrackingService = registerPlugin<any>('TrackingService');

/**
 * useLocationTracker — High-Reliability Background Tracking Hook
 *
 * ROOT CAUSES FIXED:
 * 1. Race condition: start() is async; socket() was called before socket was assigned.
 *    Fixed by returning the socket from start() and storing employee identity in ref.
 * 2. employee-join was never re-emitted after a reconnect, so the server never relayed
 *    location to the owner room after a background/screen-off cycle.
 *    Fixed by calling employee-join inside socket.on("connect", ...).
 * 3. Stale socket object: the appStateChange handler was calling .connect() on the old
 *    socket reference without re-joining. Fixed with stored employee identity refs.
 */

const MIN_DISTANCE_M = 15;
const MIN_INTERVAL_MS = 10000;
const MAX_SPEED_KMH = 150;
const MAX_ACCURACY_M = 100;
const STILLNESS_THRESHOLD = 0.22;
const STILLNESS_GRACE_MS = 30000;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Point {
  employeeId: string; ownerUserId: string; name: string;
  lat: number; lng: number; updatedAt: string; ts: number;
}

export function useLocationTracker() {
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<string | number | null>(null);
  const appListenerRef = useRef<any>(null);
  const motionListenerRef = useRef<any>(null);

  const prevRef = useRef<Point | null>(null);
  const bufferRef = useRef<Point[]>([]);
  const activeRef = useRef(false);

  // Store employee identity so it can be re-used on socket reconnect
  const employeeIdRef = useRef<string>("");
  const ownerUserIdRef = useRef<string>("");
  const nameRef = useRef<string>("");

  const lastMotionTs = useRef(Date.now());
  const isMoving = useRef(true);

  const flush = useCallback((socket: Socket) => {
    const saved = localStorage.getItem('bp_offline_sync');
    let points: Point[] = [];
    if (saved) {
      try { points = JSON.parse(saved); } catch { points = []; }
      localStorage.removeItem('bp_offline_sync');
    }

    const combined = [...points, ...bufferRef.current.splice(0)];
    if (!combined.length) return;

    if (socket.connected) {
      for (const pt of combined) {
        socket.emit("employee-location", pt);
      }
    } else {
      localStorage.setItem('bp_offline_sync', JSON.stringify(combined.slice(-100)));
    }
  }, []);

  const start = useCallback(async (employeeId: string, ownerUserId: string, name: string, socketUrl: string): Promise<Socket> => {
    if (activeRef.current && socketRef.current) return socketRef.current;
    activeRef.current = true;

    // Store identity for reuse on reconnect
    employeeIdRef.current = employeeId;
    ownerUserIdRef.current = ownerUserId;
    nameRef.current = name;

    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnection: true,
      timeout: 10000,
    });
    socketRef.current = socket;

    // FIX #2: always re-emit employee-join on every connect / reconnect
    // This means the server always knows which owner room to relay to,
    // even after a background socket drop.
    socket.on("connect", () => {
      console.log("[tracker] socket connected — re-joining room");
      socket.emit("employee-join", {
        employeeId: employeeIdRef.current,
        ownerUserId: ownerUserIdRef.current,
      });
      flush(socket);
    });

    socket.on("connect_error", (err) => {
      console.error("[tracker] socket error", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.warn("[tracker] socket disconnected:", reason);
      // socket.io will auto-reconnect; employee-join will be re-emitted on connect
    });

    // 1. Hardware Sensor Fusion — accelerometer for stillness detection
    try {
      if (motionListenerRef.current) motionListenerRef.current.remove();
      motionListenerRef.current = await Motion.addListener('accel', (event) => {
        const { x, y, z } = event.acceleration;
        if (!x || !y || !z) return;
        const mag = Math.sqrt(x * x + y * y + z * z);
        if (mag > STILLNESS_THRESHOLD) {
          lastMotionTs.current = Date.now();
          isMoving.current = true;
        } else if (Date.now() - lastMotionTs.current > STILLNESS_GRACE_MS) {
          isMoving.current = false;
        }
      });
    } catch (e) {
      console.warn("Motion sensor unavailable", e);
      isMoving.current = true;
    }

    const sendData = (lat: number, lng: number, speed: number | null, accuracy?: number) => {
      const now = Date.now();
      const prev = prevRef.current;

      if (!isMoving.current && prev) {
        const jump = haversineM(prev.lat, prev.lng, lat, lng);
        if (jump < 30) return;
      }

      if (accuracy && accuracy > MAX_ACCURACY_M) {
        console.warn("[tracker] discarded low accuracy ping:", accuracy);
        return;
      }

      if (speed !== null && speed * 3.6 > MAX_SPEED_KMH) return;

      if (prev) {
        const dist = haversineM(prev.lat, prev.lng, lat, lng);
        const elapsed = now - prev.ts;
        if (dist < MIN_DISTANCE_M && elapsed < MIN_INTERVAL_MS) return;
      }

      const payload: Point = {
        employeeId: employeeIdRef.current,
        ownerUserId: ownerUserIdRef.current,
        name: nameRef.current,
        lat, lng,
        updatedAt: new Date(now).toISOString(),
        ts: now,
      };

      prevRef.current = payload;

      if (socket.connected) {
        socket.emit("employee-location", payload);
      } else {
        console.log("[tracker] socket offline — buffering to localStorage");
        bufferRef.current = [...bufferRef.current.slice(-20), payload];
        localStorage.setItem('bp_offline_sync', JSON.stringify(bufferRef.current));
      }
    };

    // 2. Native Geolocation Watcher
    try {
      const check = await Geolocation.requestPermissions();
      if (check.location !== 'granted') {
        toast.error("Location Permission Denied. Tracking will NOT work in background.");
      }

      watchIdRef.current = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        (position: Position | null, err: any) => {
          if (err) {
            console.error("[tracker] GPS error:", err.message || err);
            if (err.message?.includes("denied")) {
              toast.error("CRITICAL: Set location to 'Allow all the time' in Settings.");
            }
            return;
          }
          if (position) {
            sendData(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.speed,
              position.coords.accuracy
            );
          }
        }
      );
    } catch (e) {
      console.error("[tracker] Geolocation watcher failed:", e);
      // Web fallback
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => sendData(pos.coords.latitude, pos.coords.longitude, pos.coords.speed, pos.coords.accuracy),
        (err) => console.warn("[tracker] web GPS error:", err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }

    // 3. Start the native Foreground Service (keeps process alive during screen-off)
    // The service does its OWN GPS polling via FusedLocationProviderClient + WakeLock,
    // completely independent of the WebView. This is the real fix for screen-off death.
    try {
      // Extract the base URL (strip path) from the socketUrl
      const baseUrl = socketUrl.replace(/\/$/, '');
      await TrackingService.start({
        employeeId,
        ownerUserId,
        name,
        backendUrl: baseUrl,
      });
    } catch (e) {
      console.warn("[tracker] native foreground service unavailable (web env):", e);
    }

    // 4. App State Bridge — reconnect and re-join on foreground return
    if (appListenerRef.current) appListenerRef.current.remove();
    appListenerRef.current = await App.addListener("appStateChange", ({ isActive }) => {
      console.log("[tracker] appStateChange isActive:", isActive);
      if (isActive && socketRef.current) {
        const s = socketRef.current;
        if (!s.connected) {
          console.log("[tracker] reconnecting socket after foreground restore");
          s.connect();
          // employee-join will be re-emitted by the "connect" handler above
        } else {
          // Already connected, but flush any offline buffer
          flush(s);
        }
      }
    });

    return socket;
  }, [flush]);

  const stop = useCallback(() => {
    try { TrackingService.stop(); } catch (e) {}

    if (watchIdRef.current != null) {
      if (typeof watchIdRef.current === "string") {
        Geolocation.clearWatch({ id: watchIdRef.current });
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current as number);
      }
      watchIdRef.current = null;
    }

    if (motionListenerRef.current) {
      motionListenerRef.current.remove();
      motionListenerRef.current = null;
    }

    if (appListenerRef.current) {
      appListenerRef.current.remove();
      appListenerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    activeRef.current = false;
    prevRef.current = null;
    bufferRef.current = [];
    employeeIdRef.current = "";
    ownerUserIdRef.current = "";
    nameRef.current = "";
    toast.info("Live Tracking Stopped.");
  }, []);

  const isActive = () => activeRef.current;
  const socket = () => socketRef.current;

  return { start, stop, isActive, socket };
}
