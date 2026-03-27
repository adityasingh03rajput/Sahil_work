/**
 * useLocationTracker — employee GPS sender with smart throttling
 *
 * Uses watchPosition() instead of polling + only sends if:
 *   - moved > 10m  OR  > 5 seconds have elapsed since last send
 *   - speed < 150 km/h (fake location guard)
 *
 * Also buffers the last 5 positions offline and flushes on reconnect.
 */

import { useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const MIN_DISTANCE_M = 10;      // send if moved more than 10m
const MIN_INTERVAL_MS = 5000;   // or if 5s have passed
const MAX_SPEED_KMH = 150;      // reject obviously spoofed locations

function haversineM(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Point { lat: number; lng: number; ts: number }

export function useLocationTracker() {
  const socketRef   = useRef<Socket | null>(null);
  const watchIdRef  = useRef<number | null>(null);
  const prevRef     = useRef<Point | null>(null);
  const bufferRef   = useRef<Point[]>([]);   // offline buffer, max 5
  const activeRef   = useRef(false);

  const flush = useCallback((socket: Socket) => {
    if (!bufferRef.current.length) return;
    const pending = bufferRef.current.splice(0);
    for (const pt of pending) {
      socket.emit("employee-location", pt);
    }
  }, []);

  const start = useCallback((
    employeeId: string,
    ownerUserId: string,
    name: string,
    socketUrl: string,
  ) => {
    if (activeRef.current) return;
    activeRef.current = true;

    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("employee-join", { employeeId, ownerUserId });
      flush(socket);          // flush buffered positions on reconnect
    });

    if (!navigator.geolocation) return;

    const send = (lat: number, lng: number, speed: number | null) => {
      const now = Date.now();
      const prev = prevRef.current;
      const pt: Point = { lat, lng, ts: now };

      // ── Speed guard: reject obvious fake/teleport locations ──────────────
      if (speed !== null && speed * 3.6 > MAX_SPEED_KMH) return;

      // ── Throttle: only send if moved enough OR enough time passed ────────
      if (prev) {
        const dist = haversineM(prev.lat, prev.lng, lat, lng);
        const elapsed = now - prev.ts;
        if (dist < MIN_DISTANCE_M && elapsed < MIN_INTERVAL_MS) return;
      }

      prevRef.current = pt;

      const payload = { employeeId, ownerUserId, name, lat, lng, updatedAt: new Date(now).toISOString() };

      if (socket.connected) {
        socket.emit("employee-location", payload);
      } else {
        // Buffer last 5 positions for reconnect flush
        bufferRef.current = [...bufferRef.current.slice(-4), payload as any];
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        send(pos.coords.latitude, pos.coords.longitude, pos.coords.speed);
      },
      (err) => console.warn("[location-tracker]", err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    ) as unknown as number;
  }, [flush]);

  const stop = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    activeRef.current = false;
    prevRef.current   = null;
    bufferRef.current = [];
  }, []);

  const isActive = () => activeRef.current;
  const socket   = () => socketRef.current;

  return { start, stop, isActive, socket };
}
