import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getVehicles } from "../services/vehicleApi";
import { connectVehicleHub } from "../services/vehicleHub";
import { Vehicle } from "../types";
import { VEHICLE_REFRESH_MS, VEHICLE_RECONCILE_MS } from "../config";

/**
 * Live vehicle state, push-first:
 * - Seeds with GET /api/Vehicle, then applies SignalR "VehicleUpdated" pushes.
 * - While the socket is down, falls back to the old 3s polling so the map
 *   never gets worse than the pre-SignalR behavior.
 * - Even while connected, reconciles with a full GET every 30s to pick up
 *   deletions/new vehicles and self-heal any missed events.
 * - `now` ticks so staleness (isVehicleStale) advances even when no pushes
 *   arrive — a silent fleet must go grey, not freeze as "live".
 */
export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [connected, setConnected] = useState(false);
  const [offline, setOffline] = useState(false); // REST unreachable (fallback path failing too)
  const [now, setNow] = useState(Date.now());

  const connectedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const refresh = async () => {
      try {
        const list = await getVehicles();
        if (mountedRef.current) {
          setVehicles(list);
          setOffline(false);
        }
      } catch {
        if (mountedRef.current) setOffline(true);
      }
    };

    // Seed immediately.
    refresh();

    // Real-time pushes: merge one vehicle into the list by plate number.
    const hub = connectVehicleHub({
      onVehicle: (vehicle) => {
        if (!mountedRef.current || !vehicle.puvNo) return;
        setVehicles((previous) => {
          const index = previous.findIndex((v) => v.puvNo === vehicle.puvNo);
          if (index === -1) return [...previous, vehicle];
          const next = previous.slice();
          next[index] = vehicle;
          return next;
        });
        setNow(Date.now());
      },
      onOffline: (puvNo) => {
        if (!mountedRef.current) return;
        // Driver ended their shift → mark stale immediately (clear timestamp)
        // so it greys out now instead of waiting for the staleness timeout.
        setVehicles((previous) =>
          previous.map((v) => (v.puvNo === puvNo ? { ...v, lastUpdated: null } : v))
        );
        setNow(Date.now());
      },
      onStateChange: (isConnected) => {
        connectedRef.current = isConnected;
        if (mountedRef.current) setConnected(isConnected);
        // On (re)connect, reconcile at once — we may have missed events.
        if (isConnected) refresh();
      },
    });

    // Timers pause while the app is backgrounded, so catch up the moment it
    // becomes active again instead of waiting for the next tick/reconnect.
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(Date.now());
        refresh();
      }
    });

    // One ticker drives everything: staleness clock every tick, polling only
    // while the socket is down, slow reconciliation while it's up.
    let ticks = 0;
    const reconcileEvery = Math.max(1, Math.round(VEHICLE_RECONCILE_MS / VEHICLE_REFRESH_MS));
    const timer = setInterval(() => {
      if (!mountedRef.current) return;
      setNow(Date.now());
      ticks += 1;
      if (!connectedRef.current || ticks % reconcileEvery === 0) {
        refresh();
      }
    }, VEHICLE_REFRESH_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
      appStateSub.remove();
      hub.stop();
    };
  }, []);

  return { vehicles, connected, offline, now };
}
