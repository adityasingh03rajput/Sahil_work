import { useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { App } from "@capacitor/app";
import { Motion } from "@capacitor/motion";
import { Geolocation, Position } from "@capacitor/geolocation";
import { registerPlugin } from "@capacitor/core";
import { toast } from "sonner";
import { haversineM } from "../utils/markerAnimation";

const TrackingService = registerPlugin<any>("TrackingService");

// ── Tracking constants ────────────────────────────────────────────────────────
// MIN_DISTANCE_M: minimum real movement before we emit a ping.
//   20m = filters GPS drift/jitter indoors while capturing walking movement.
const MIN_DISTANCE_M = 20;

// MIN_INTERVAL_MS: hard floor between pings regardless of movement.
//   10s prevents socket flooding when employee is moving fast.
const MIN_INTERVAL_MS = 10_000;

// FORCE_INTERVAL_MS: emit a heartbeat even if stationary, so the owner map
//   knows the employee is still alive (not just signal-lost).
const FORCE_INTERVAL_MS = 30_000;

// MAX_SPEED_KMH: discard GPS teleports (satellite glitch, tunnel exit).
const MAX_SPEED_KMH = 200;

// MAX_ACCURACY_M: discard low-quality fixes (indoors, bad signal).
//   150m is generous — tighter values cause too many dropped pings in India.
const MAX_ACCURACY_M = 150;

// STILLNESS_THRESHOLD: accelerometer magnitude below which device is considered still.
const STILLNESS_THRESHOLD = 0.3;
const STILLNESS_GRACE_MS = 45_000; // 45s of stillness before suppressing pings

// OFFLINE_BUFFER_MAX: max points to buffer in localStorage when socket is down.
const OFFLINE_BUFFER_MAX = 100;

interface LocationPayload {
  name: string;
  lat: number;
  lng: number;
  speed: number | null;   // m/s
  heading: number | null; // degrees 0-360
  accuracy: number | null;
  updatedAt: string;
}

interface BufferedPoint extends LocationPayload {
  employeeId: string;
  ownerUserId: string;
  ts: number;
}

export function useLocationTracker() {
  const socketRef        = useRef<Socket | null>(null);
  const watchIdRef       = useRef<string | number | null>(null);
  const appListenerRef   = useRef<any>(null);
  const motionListenerRef = useRef<any>(null);
  const activeRef        = useRef(false);

  // Employee identity — stored in refs so reconnect handlers always have fresh values
  const employeeIdRef  = useRef<string>("");
  const ownerUserIdRef = useRef<string>("");
  const nameRef        = useRef<string>("");

  // Last accepted GPS point — for distance/interval gating
  const prevRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  // Last emitted timestamp — for force-heartbeat logic
  const lastEmitTs = useRef<number>(0);

  // Offline buffer
  const bufferRef = useRef<BufferedPoint[]>([]);

  // Motion sensor state
  const lastMotionTs  = useRef(Date.now());
  const isMoving      = useRef(true);

  // ── Flush offline buffer to socket ─────────────────────────────────────────
  const flush = useCallback((socket: Socket) => {
    const saved = localStorage.getItem("bp_offline_sync");
    let stored: BufferedPoint[] = [];
    if (saved) {
      try { stored = JSON.parse(saved); } catch { stored = []; }
      localStorage.removeItem("bp_offline_sync");
    }
    const combined = [...stored, ...bufferRef.current.splice(0)];
    if (!combined.length) return;

    if (socket.connected) {
      for (const pt of combined) {
        socket.emit("employee-location", {
          name: pt.name, lat: pt.lat, lng: pt.lng,
          speed: pt.speed, heading: pt.heading, accuracy: pt.accuracy,
          updatedAt: pt.updatedAt,
        });
      }
    } else {
      // Still offline — keep the most recent points
      const merged = [...stored, ...combined].slice(-OFFLINE_BUFFER_MAX);
      localStorage.setItem("bp_offline_sync", JSON.stringify(merged));
    }
  }, []);

  const start = useCallback(async (
    employeeId: string,
    ownerUserId: string,
    name: string,
    socketUrl: string,
  ): Promise<Socket> => {
    if (activeRef.current && socketRef.current) return socketRef.current;
    activeRef.current = true;

    employeeIdRef.current  = employeeId;
    ownerUserIdRef.current = ownerUserId;
    nameRef.current        = name;

    // ── Socket connection ───────────────────────────────────────────────────
    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      auth: { token: localStorage.getItem("accessToken") || "" },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[tracker] connected — joining room");
      socket.emit("employee-join", { name: nameRef.current });
      flush(socket);
    });

    socket.on("connect_error", (err) => {
      console.warn("[tracker] connect error:", err.message);
    });

    // ── Accelerometer — stillness detection ────────────────────────────────
    try {
      if (motionListenerRef.current) motionListenerRef.current.remove();
      motionListenerRef.current = await Motion.addListener("accel", (event) => {
        const { x, y, z } = event.acceleration;
        if (x == null || y == null || z == null) return;
        const mag = Math.sqrt(x * x + y * y + z * z);
        if (mag > STILLNESS_THRESHOLD) {
          lastMotionTs.current = Date.now();
          isMoving.current = true;
        } else if (Date.now() - lastMotionTs.current > STILLNESS_GRACE_MS) {
          isMoving.current = false;
        }
      });
    } catch {
      isMoving.current = true; // assume moving if sensor unavailable
    }

    // ── Core GPS send function ──────────────────────────────────────────────
    const sendData = (
      lat: number,
      lng: number,
      speed: number | null,
      heading: number | null,
      accuracy: number | null,
    ) => {
      const now = Date.now();
      const prev = prevRef.current;

      // 1. Accuracy gate — discard poor fixes
      if (accuracy != null && accuracy > MAX_ACCURACY_M) return;

      // 2. Speed gate — discard GPS teleports
      if (speed != null && speed * 3.6 > MAX_SPEED_KMH) return;

      // 3. Distance + interval gate
      const sinceLastEmit = now - lastEmitTs.current;
      if (prev) {
        const dist = haversineM({ lat: prev.lat, lng: prev.lng }, { lat, lng });
        const elapsed = now - prev.ts;

        // Suppress if: not enough movement AND not enough time AND not a forced heartbeat
        const isForced = sinceLastEmit >= FORCE_INTERVAL_MS;
        if (dist < MIN_DISTANCE_M && elapsed < MIN_INTERVAL_MS && !isForced) return;

        // Suppress stationary pings (accelerometer says still, < 5m movement)
        if (!isMoving.current && dist < 5 && !isForced) return;
      }

      prevRef.current = { lat, lng, ts: now };
      lastEmitTs.current = now;

      const payload: LocationPayload = {
        name: nameRef.current,
        lat, lng,
        speed,
        heading,
        accuracy,
        updatedAt: new Date(now).toISOString(),
      };

      if (socket.connected) {
        socket.emit("employee-location", payload);
      } else {
        // Buffer for when connection restores
        const buffered: BufferedPoint = {
          ...payload,
          employeeId: employeeIdRef.current,
          ownerUserId: ownerUserIdRef.current,
          ts: now,
        };
        bufferRef.current = [...bufferRef.current.slice(-(OFFLINE_BUFFER_MAX - 1)), buffered];
        localStorage.setItem("bp_offline_sync", JSON.stringify(bufferRef.current));
      }
    };

    // ── GPS watcher — web/PWA path (native uses TrackingService below) ──────
    const isNativeAndroid =
      !!(window as any).Capacitor?.isNativePlatform?.() &&
      (window as any).Capacitor?.getPlatform?.() === "android";

    if (!isNativeAndroid) {
      try {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") {
          toast.error("Location permission denied — tracking disabled.");
        }

        watchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
          (position: Position | null, err: any) => {
            if (err) {
              if (err.message?.includes("denied")) {
                toast.error("Set location to 'Allow all the time' in Settings.");
              }
              return;
            }
            if (!position) return;
            const { latitude, longitude, speed, heading, accuracy } = position.coords;
            sendData(latitude, longitude, speed ?? null, heading ?? null, accuracy ?? null);
          },
        );
      } catch {
        // Web browser fallback
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, speed, heading, accuracy } = pos.coords;
            sendData(latitude, longitude, speed ?? null, heading ?? null, accuracy ?? null);
          },
          (err) => console.warn("[tracker] GPS error:", err.message),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
        );
      }
    }

    // ── Native foreground service — keeps GPS alive when screen is off ──────
    try {
      await TrackingService.start({
        employeeId,
        ownerUserId,
        name,
        backendUrl: socketUrl.replace(/\/$/, ""),
      });
    } catch {
      // Web environment — expected
    }

    // ── App state bridge — reconnect on foreground return ───────────────────
    if (appListenerRef.current) appListenerRef.current.remove();
    appListenerRef.current = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        // Returning to foreground — immediate re-sync
        if (socketRef.current) {
          if (!socketRef.current.connected) {
            socketRef.current.connect();
          } else {
            flush(socketRef.current);
          }
        }
      } else {
        // App backgrounded — send a final high-priority heartbeat if we have a recent point
        if (socketRef.current?.connected && prevRef.current) {
           const now = Date.now();
           socketRef.current.emit("employee-location", {
             name: nameRef.current,
             lat: prevRef.current.lat,
             lng: prevRef.current.lng,
             speed: 0, 
             heading: 0,
             accuracy: 10,
             updatedAt: new Date(now).toISOString(),
           });
        }
      }
    });

    return socket;
  }, [flush]);

  const stop = useCallback(() => {
    try { TrackingService.stop(); } catch { /* web env */ }

    if (watchIdRef.current != null) {
      if (typeof watchIdRef.current === "string") {
        Geolocation.clearWatch({ id: watchIdRef.current as string });
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current as number);
      }
      watchIdRef.current = null;
    }

    motionListenerRef.current?.remove();
    motionListenerRef.current = null;

    appListenerRef.current?.remove();
    appListenerRef.current = null;

    socketRef.current?.disconnect();
    socketRef.current = null;

    activeRef.current     = false;
    prevRef.current       = null;
    lastEmitTs.current    = 0;
    bufferRef.current     = [];
    employeeIdRef.current = "";
    ownerUserIdRef.current = "";
    nameRef.current       = "";
  }, []);

  return {
    start,
    stop,
    isActive: () => activeRef.current,
    socket:   () => socketRef.current,
  };
}
