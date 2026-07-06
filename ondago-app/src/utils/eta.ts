import { distanceMeters } from "./geo";
import { PUV_AVG_SPEED_KMH } from "../config";

export interface StopEta {
  terminalId: string;
  name: string;
  distanceM: number;
  etaMinutes: number;
}

/**
 * Rough arrival estimates from a vehicle to a set of stops: straight-line
 * (haversine) distance ÷ an assumed average PUV speed. Deliberately simple and
 * surfaced as an estimate — a road-following / traffic-aware ETA needs route
 * geometry we don't populate yet (the reserved Route.Path). Sorted nearest-first
 * so the closest/approaching stop leads.
 */
export function estimateStopEtas(
  vehicle: { currentLat: number; currentLong: number },
  stops: { id: string; name: string; latitude: number; longitude: number }[],
  speedKmh: number = PUV_AVG_SPEED_KMH
): StopEta[] {
  const speedMps = Math.max(1, (speedKmh * 1000) / 3600);
  return stops
    .map((s) => {
      const distanceM = distanceMeters(vehicle.currentLat, vehicle.currentLong, s.latitude, s.longitude);
      return {
        terminalId: s.id,
        name: s.name,
        distanceM,
        etaMinutes: Math.max(1, Math.round(distanceM / speedMps / 60)),
      };
    })
    .sort((a, b) => a.distanceM - b.distanceM);
}

/** Compact distance label: "240 m" under ~1km, else "1.4 km". */
export function formatDistance(m: number): string {
  return m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}
