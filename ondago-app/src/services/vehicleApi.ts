import { client } from "./client";
import { Vehicle } from "../types";

/** Normalizes a raw API/SignalR vehicle payload (handles both JSON casings). */
export function normalizeVehicle(v: any): Vehicle {
  return {
    id: v.id ?? v.Id ?? null,
    puvNo: v.puvNo ?? v.puv_no ?? v.PuvNo ?? "",
    currentLat: Number(v.currentLat ?? v.CurrentLat ?? 0),
    currentLong: Number(v.currentLong ?? v.CurrentLong ?? 0),
    passengerCount: Number(v.passengerCount ?? v.PassengerCount ?? 0),
    maxPassengerCount: Number(v.maxPassengerCount ?? v.MaxPassengerCount ?? 0),
    lastUpdated: v.lastUpdated ?? v.LastUpdated ?? null,
    routeId: v.routeId ?? v.RouteId ?? null,
    companyId: v.companyId ?? v.CompanyId ?? null,
  };
}

export async function getVehicles(): Promise<Vehicle[]> {
  const { data } = await client.get("/api/Vehicle");
  if (!Array.isArray(data)) return [];
  return data.map(normalizeVehicle);
}

/** Vehicles within radiusM of a point — served by the backend's 2dsphere index. */
export async function getVehiclesNear(lat: number, lng: number, radiusM = 5000): Promise<Vehicle[]> {
  const { data } = await client.get("/api/Vehicle/near", { params: { lat, lng, radiusM } });
  if (!Array.isArray(data)) return [];
  return data.map(normalizeVehicle);
}

export async function updateVehicleStatus(
  puvNo: string,
  status: { passengerCount: number; latitude: number; longitude: number }
): Promise<void> {
  await client.patch(`/api/Vehicle/${encodeURIComponent(puvNo)}/status`, status);
}

/** Driver ended their shift — marks the vehicle offline + notifies commuters. */
export async function goOffline(puvNo: string): Promise<void> {
  await client.post(`/api/Vehicle/${encodeURIComponent(puvNo)}/offline`);
}
