import { Vehicle } from "../types";
import { VEHICLE_STALE_MS } from "../config";

/** Fallback capacity for legacy records that never carried one. Seat capacity
 * is per-vehicle (set by the company admin) — never assume it. */
export const MAX_CAPACITY = 18;

/** How full a vehicle is, as a 0..1+ ratio of ITS OWN capacity. */
function occupancyRatio(count: number, max?: number): number {
  const capacity = max && max > 0 ? max : MAX_CAPACITY;
  return count / capacity;
}

/**
 * Occupancy status color by fill ratio. Fixed, theme-independent status
 * palette so the meaning is consistent everywhere. The thresholds reproduce
 * the historical 18-seat tiers exactly (6/18, 11/18, 16/18, 18/18) while
 * scaling honestly to any capacity:
 *   <30% green · <60% yellow · <85% orange · <100% red · full dark red.
 */
export function occupancyColor(count: number, max?: number): string {
  const r = occupancyRatio(count, max);
  if (r >= 1) return "#7F1D1D"; // full
  if (r >= 0.85) return "#DC2626"; // nearly full
  if (r >= 0.6) return "#F97316"; // high
  if (r >= 0.3) return "#EAB308"; // moderate
  return "#16A34A"; // low
}

/** Short status word for the current occupancy tier. */
export function occupancyLabel(count: number, max?: number): string {
  const r = occupancyRatio(count, max);
  if (r >= 1) return "FULL";
  if (r >= 0.85) return "Nearly full";
  if (r >= 0.6) return "High";
  if (r >= 0.3) return "Moderate";
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
