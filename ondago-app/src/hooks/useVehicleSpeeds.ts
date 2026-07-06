import { useRef } from "react";
import { Vehicle } from "../types";
import { distanceMeters } from "../utils/geo";

interface Sample {
  lat: number;
  lng: number;
  t: number;
  speedKmh: number | null;
}

/**
 * Observed speed per PUV (km/h), derived from consecutive position broadcasts
 * and EMA-smoothed so one noisy fix doesn't whip the ETA around. Replaces the
 * fixed PUV_AVG_SPEED_KMH assumption when available (Tier 2 improved ETA).
 *
 * Guards:
 *  - jumps implying > 90 km/h are GPS teleports → ignored, last speed kept
 *  - speeds under 3 km/h (loading at a stop, parked) are withheld so ETA falls
 *    back to the fleet average instead of predicting "never arrives"
 *  - capped at 60 km/h so a lucky straight segment can't promise magic times
 */
export function useVehicleSpeeds(vehicles: Vehicle[]): Record<string, number> {
  const samples = useRef(new Map<string, Sample>());

  const speeds: Record<string, number> = {};
  vehicles.forEach((v) => {
    const t = v.lastUpdated ? new Date(v.lastUpdated).getTime() : null;
    if (t == null || !Number.isFinite(v.currentLat) || !Number.isFinite(v.currentLong)) return;

    const prev = samples.current.get(v.puvNo);
    if (!prev) {
      samples.current.set(v.puvNo, { lat: v.currentLat, lng: v.currentLong, t, speedKmh: null });
    } else if (t > prev.t) {
      const hours = (t - prev.t) / 3_600_000;
      const km = distanceMeters(prev.lat, prev.lng, v.currentLat, v.currentLong) / 1000;
      const raw = km / hours;
      const speedKmh = raw > 90 ? prev.speedKmh : prev.speedKmh == null ? raw : prev.speedKmh * 0.6 + raw * 0.4;
      samples.current.set(v.puvNo, { lat: v.currentLat, lng: v.currentLong, t, speedKmh });
    }

    const s = samples.current.get(v.puvNo)?.speedKmh;
    if (s != null && s >= 3) speeds[v.puvNo] = Math.min(60, s);
  });

  return speeds;
}
