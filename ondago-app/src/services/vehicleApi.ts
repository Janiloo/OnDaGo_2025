import { client } from "./client";
import { Vehicle } from "../types";

export async function getVehicles(): Promise<Vehicle[]> {
  const { data } = await client.get("/api/Vehicle");
  if (!Array.isArray(data)) return [];
  return data.map((v: any) => ({
    id: v.id ?? v.Id ?? null,
    puvNo: v.puvNo ?? v.puv_no ?? v.PuvNo ?? "",
    currentLat: Number(v.currentLat ?? v.CurrentLat ?? 0),
    currentLong: Number(v.currentLong ?? v.CurrentLong ?? 0),
    passengerCount: Number(v.passengerCount ?? v.PassengerCount ?? 0),
    maxPassengerCount: Number(v.maxPassengerCount ?? v.MaxPassengerCount ?? 0),
  }));
}

export async function updateVehicleStatus(
  puvNo: string,
  status: { passengerCount: number; latitude: number; longitude: number }
): Promise<void> {
  await client.patch(`/api/Vehicle/${encodeURIComponent(puvNo)}/status`, status);
}
