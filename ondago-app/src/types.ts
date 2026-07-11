export type Role = "User" | "Driver" | "Admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  role: Role;
  plateNumber?: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserProfile {
  name: string;
  email: string;
  phoneNumber?: string | null;
  plateNumber?: string | null;
}

export interface Vehicle {
  id?: string | null;
  puvNo: string;
  currentLat: number;
  currentLong: number;
  passengerCount: number;
  maxPassengerCount: number;
  /** ISO timestamp of the last status broadcast; null on legacy records. */
  lastUpdated?: string | null;
  /** Assigned route id (set by a company admin); null when unassigned. */
  routeId?: string | null;
  /** Owning operator — pairs with discovery branding for "Operated by X". */
  companyId?: string | null;
}

export interface FareMatrixItem {
  id: string;
  origin: string;
  destination: string;
  fare: number;
  discountedFare: number;
}

export interface ReportItem {
  id: string;
  userId?: string | null;
  companyId?: string | null;
  reporterRole?: string | null;
  reporterName?: string | null;
  plateNumber?: string | null;
  vehicleId?: string | null;
  subject: string;
  description: string;
  status: string;
  isImportant: boolean;
  incidentAt?: string | null;
  incidentLocation?: string | null;
  createdAt: string;
  completedAt?: string | null;
  deletedAt?: string | null;
}
