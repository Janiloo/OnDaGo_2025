import { Platform } from "react-native";

/**
 * API base URL resolution (first match wins):
 *   1. EXPO_PUBLIC_API_URL from .env — explicit override, no code changes needed.
 *   2. Local dev default (Android emulator reaches the host via 10.0.2.2).
 *   3. Production Azure URL (only when EXPO_PUBLIC_USE_PROD=true).
 *
 * The backend is the single source of truth: auth, roles, business logic,
 * database access, and all third-party API keys live there — never here.
 */
const PRODUCTION_API = "https://ondago-api-akfye0eahsamhrgt.southeastasia-01.azurewebsites.net";

/** Port from OnDaGo.API/Properties/launchSettings.json (`dotnet run` default). */
const LOCAL_API_PORT = 5147;

const LOCAL_API = Platform.select({
  android: `http://10.0.2.2:${LOCAL_API_PORT}`, // Android emulator loopback to host machine
  default: `http://localhost:${LOCAL_API_PORT}`,
});

const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const useProd = process.env.EXPO_PUBLIC_USE_PROD === "true";

export const API_BASE_URL = envUrl || (useProd ? PRODUCTION_API : LOCAL_API!);

/**
 * Fallback polling interval (ms) while the SignalR socket is down, and the
 * tick rate of the staleness clock. Live updates normally arrive as pushes
 * over /hubs/vehicles, not polls.
 */
export const VEHICLE_REFRESH_MS = 3000;

/** How often (ms) to reconcile with a full GET while the socket is healthy. */
export const VEHICLE_RECONCILE_MS = 30000;

/** How often (ms) a driver broadcasts location to the backend. */
export const DRIVER_LOCATION_UPDATE_MS = 3000;

/**
 * A vehicle whose last broadcast is older than this is treated as
 * stale/offline (greyed on the map, excluded from the "live" count).
 * Prevents phantom PUVs from misleading riders. Drivers broadcast every ~3s
 * while on duty, so 25s of silence reliably means offline. (Ending a shift
 * also pushes an immediate "offline" event, so this is just the safety net.)
 */
export const VEHICLE_STALE_MS = 25000;

/**
 * Assumed average PUV speed (km/h) for arrival estimates. Deliberately
 * conservative for mixed urban traffic on the Montalban–Cubao corridor; the ETA
 * is a straight-line estimate, so this is a coarse constant, not GPS speed.
 */
export const PUV_AVG_SPEED_KMH = 20;

/** Route stops shown as fixed pins on the commuter map (Montalban–Cubao route). */
export const ROUTE_STOPS = [
  { name: "Montalban Highway", latitude: 14.7288, longitude: 121.1441 },
  { name: "Maly", latitude: 14.7114, longitude: 121.1337 },
  { name: "San Mateo Bayan", latitude: 14.6967, longitude: 121.1205 },
  { name: "Nangka", latitude: 14.6737, longitude: 121.1094 },
  { name: "Concepcion", latitude: 14.6505, longitude: 121.1035 },
  { name: "Savemore Bayan", latitude: 14.6372, longitude: 121.0973 },
  { name: "Marikina Riverbanks", latitude: 14.6329, longitude: 121.0828 },
  { name: "Cubao", latitude: 14.62136, longitude: 121.055222 },
];

export const DEFAULT_MAP_REGION = {
  latitude: 14.6737,
  longitude: 121.1094,
  latitudeDelta: 0.18,
  longitudeDelta: 0.12,
};
