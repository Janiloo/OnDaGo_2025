import { Vehicle } from "../types";
import { VEHICLE_STALE_MS } from "../config";

/** Every PUV seats 18; occupancy tiers/labels are keyed to that. */
export const MAX_CAPACITY = 18;

/**
 * Occupancy status color by absolute passenger count (max 18). Fixed,
 * theme-independent status palette so the meaning is consistent everywhere:
 *   0–5 green · 6–10 yellow · 11–15 orange · 16–17 red · 18 dark red.
 */
export function occupancyColor(count: number): string {
  if (count >= 18) return "#7F1D1D"; // full
  if (count >= 16) return "#DC2626"; // nearly full
  if (count >= 11) return "#F97316"; // high
  if (count >= 6) return "#EAB308"; // moderate
  return "#16A34A"; // low
}

/** Short status word for the current occupancy tier. */
export function occupancyLabel(count: number): string {
  if (count >= 18) return "FULL";
  if (count >= 16) return "Nearly full";
  if (count >= 11) return "High";
  if (count >= 6) return "Moderate";
  return "Available";
}

/** Parsed epoch-ms of a vehicle's last broadcast, or null if unknown/unparseable. */
export function vehicleTimestamp(vehicle: Vehicle): number | null {
  if (!vehicle.lastUpdated) return null;
  const t = Date.parse(vehicle.lastUpdated);
  return Number.isNaN(t) ? null : t;
}

/**
 * A vehicle is stale when its last broadcast is older than VEHICLE_STALE_MS,
 * or when it carries no timestamp at all (legacy record / never broadcast a
 * real fix). Live vehicles refresh their timestamp every few seconds, so the
 * unknown-timestamp window for a genuinely live PUV is tiny.
 */
export function isVehicleStale(vehicle: Vehicle, now: number = Date.now()): boolean {
  const t = vehicleTimestamp(vehicle);
  if (t == null) return true;
  return now - t > VEHICLE_STALE_MS;
}

/** True once a vehicle has broadcast a real (non-zero) position. */
export function hasRealPosition(vehicle: Vehicle): boolean {
  return vehicle.currentLat !== 0 || vehicle.currentLong !== 0;
}

/** Human "last seen" label, e.g. "just now", "4 min ago", "offline". */
export function lastSeenLabel(vehicle: Vehicle, now: number = Date.now()): string {
  const t = vehicleTimestamp(vehicle);
  if (t == null) return "offline";
  const secs = Math.max(0, Math.round((now - t) / 1000));
  if (secs < 15) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr ago`;
}
