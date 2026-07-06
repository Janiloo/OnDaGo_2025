import { NavItem } from "./components/Layout";

/** Sidebar for every Company-console page (single source of truth). */
export const COMPANY_NAV: NavItem[] = [
  { label: "Overview", icon: "📊", to: "/company" },
  { label: "Terminals", icon: "🚏", to: "/company/terminals" },
  { label: "Routes", icon: "🛣️", to: "/company/routes" },
  { label: "Vehicles", icon: "🚐", to: "/company/vehicles" },
  { label: "Drivers", icon: "🧑‍✈️", to: "/company/drivers" },
  { label: "Branding", icon: "🎨", to: "/company/branding" },
  { label: "Fares", icon: "💵", disabled: true },
  { label: "Reports", icon: "📋", disabled: true },
  { label: "Change password", icon: "🔐", to: "/change-password" },
];

// ---- API shapes (camelCase over the wire) ----

export interface Terminal {
  id: string;
  companyId: string | null;
  name: string;
  code: string | null;
  latitude: number;
  longitude: number;
  status: "Active" | "Retired";
  createdAt: string;
}

export interface RouteInfo {
  id: string;
  companyId: string | null;
  name: string;
  code: string | null;
  terminalIds: string[];
  status: "Active" | "Retired";
  createdAt: string;
}

export interface Vehicle {
  id: string;
  puvNo: string;
  passengerCount: number;
  maxPassengerCount: number;
  routeId: string | null;
  lastUpdated: string | null;
  /** "Active" | "Inactive" — null/undefined (legacy) means Active. */
  status?: string | null;
  /** "OnDuty" | "OffDuty" — recorded shift intent; null/undefined (legacy) means OffDuty. */
  dutyStatus?: string | null;
  dutyStartedAt?: string | null;
  dutyEndedAt?: string | null;
  /** "driver" | "timeout" — how the last shift ended. */
  dutyEndReason?: string | null;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: "Active" | "Disabled";
  /** Assigned vehicle (PlateNumber ↔ PuvNo), or null. */
  puvNo: string | null;
  createdAt: string;
  /** Recorded shift intent of the assigned vehicle. */
  dutyStatus: "OnDuty" | "OffDuty";
  dutyStartedAt: string | null;
  /** Last broadcast of the assigned vehicle — connection health, not intent. */
  vehicleLastUpdated: string | null;
}

/** A broadcast is "fresh" within this window (same staleness window as the maps). */
export const DUTY_STALE_MS = 25_000;

export interface DutyPresentation {
  label: string;
  /** Maps onto theme colors: success / accent (warn) / textMuted. */
  tone: "success" | "warn" | "muted";
}

/**
 * The honest operational tri-state: duty (recorded intent) crossed with the
 * broadcast timestamp (connection health). "On duty · no signal" is the state
 * timestamps alone could not express — the driver is working but unreachable.
 */
export function dutyPresentation(
  dutyStatus: string | null | undefined,
  lastUpdated: string | null | undefined,
  now: number = Date.now()
): DutyPresentation {
  if (dutyStatus !== "OnDuty") return { label: "○ off duty", tone: "muted" };
  const age = lastUpdated ? now - new Date(lastUpdated).getTime() : null;
  if (age !== null && age < DUTY_STALE_MS) return { label: "● on duty · live", tone: "success" };
  const mins = age !== null ? Math.max(1, Math.round(age / 60_000)) : null;
  return { label: mins !== null ? `● on duty · no signal ${mins}m` : "● on duty · no signal", tone: "warn" };
}
