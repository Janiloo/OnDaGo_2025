import { client, normalizeId } from "./client";
import { FareMatrixItem } from "../types";

export async function getFareMatrix(): Promise<FareMatrixItem[]> {
  const { data } = await client.get("/api/FareMatrix");
  if (!Array.isArray(data)) return [];
  return data.map((f: any) => ({
    id: normalizeId(f.id ?? f.Id),
    origin: f.origin ?? f.Origin ?? "",
    destination: f.destination ?? f.Destination ?? "",
    fare: Number(f.fare ?? f.Fare ?? 0),
    discountedFare: Number(f.discountedFare ?? f.DiscountedFare ?? 0),
  }));
}

export async function updateFare(
  id: string,
  update: { fare?: number; discountedFare?: number }
): Promise<void> {
  await client.patch(`/api/FareMatrix/${id}`, update);
}

export async function createFare(fare: {
  origin: string;
  destination: string;
  fare: number;
  discountedFare: number;
}): Promise<void> {
  await client.post("/api/FareMatrix", fare);
}

export async function deleteFare(id: string): Promise<void> {
  await client.delete(`/api/FareMatrix/${id}`);
}
