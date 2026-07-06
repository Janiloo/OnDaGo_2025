import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  ILogger,
  LogLevel,
} from "@microsoft/signalr";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config";
import { TOKEN_KEY } from "./client";
import { normalizeVehicle } from "./vehicleApi";
import { Vehicle } from "../types";

/**
 * SignalR connection to the backend's /hubs/vehicles.
 * The server pushes "VehicleUpdated" whenever any driver PATCHes status,
 * replacing the 3-second full-fleet polling. The JWT rides the query string
 * (websockets can't send an Authorization header); the hub is anonymous today
 * but this keeps it working when it becomes [Authorize].
 */

/** Firehose group — every vehicle update (matches VehicleHub.AllGroup). */
export const ALL_GROUP = "vehicles:all";
/** One route's updates only (matches VehicleHub.RouteGroup). */
export const routeGroup = (routeId: string) => `vehicles:route:${routeId}`;

export interface VehicleHubHandle {
  stop: () => Promise<void>;
  /**
   * Switch which fan-out group this connection receives. Pass ALL_GROUP for the
   * firehose (admin / "All routes") or routeGroup(id) to receive just one route.
   * Safe to call before the socket is connected — it applies on (re)connect.
   */
  setGroup: (group: string) => void;
}

/**
 * SignalR's default logger writes disconnects via console.error, which React
 * Native's dev LogBox renders as a full-screen red error — for an event we
 * fully handle (auto-reconnect + polling fallback). Route everything to
 * console.log instead so dev stays informative but calm.
 */
const quietLogger: ILogger = {
  log(logLevel: LogLevel, message: string) {
    if (logLevel >= LogLevel.Warning) {
      console.log(`[signalr] ${message}`);
    }
  },
};

export function connectVehicleHub(handlers: {
  onVehicle: (vehicle: Vehicle) => void;
  onOffline: (puvNo: string) => void;
  onStateChange: (connected: boolean) => void;
}): VehicleHubHandle {
  const connection: HubConnection = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/vehicles`, {
      accessTokenFactory: async () => (await SecureStore.getItemAsync(TOKEN_KEY)) ?? "",
    })
    // Retry quickly at first, then back off; then keep trying every 30s forever
    // (a transport app should reconnect on its own after long tunnels/dead zones).
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        const schedule = [0, 2000, 5000, 10000];
        return schedule[retryContext.previousRetryCount] ?? 30000;
      },
    })
    .configureLogging(quietLogger)
    .build();

  // Be tolerant of dev-mode stalls (backgrounding, Metro rebundles) and shaky
  // mobile networks: allow 60s without a server message before declaring the
  // connection dead (server pings every ~15s), and ping the server every 15s.
  connection.serverTimeoutInMilliseconds = 60000;
  connection.keepAliveIntervalInMilliseconds = 15000;

  connection.on("VehicleUpdated", (raw: unknown) => {
    try {
      handlers.onVehicle(normalizeVehicle(raw));
    } catch {
      // Malformed payload — ignore; the reconciliation poll will catch up.
    }
  });

  connection.on("VehicleOffline", (puvNo: unknown) => {
    if (typeof puvNo === "string") handlers.onOffline(puvNo);
  });

  let stopped = false;

  // Group membership: `desiredGroup` is what we want; `joinedGroup` is what the
  // server currently has us in. On reconnect the server forgets our groups, so
  // we reset `joinedGroup` and re-subscribe.
  let desiredGroup = ALL_GROUP;
  let joinedGroup: string | null = null;

  const ensureSubscription = async () => {
    if (stopped || connection.state !== HubConnectionState.Connected) return;
    if (joinedGroup === desiredGroup) return;
    const previous = joinedGroup;
    const target = desiredGroup;
    joinedGroup = target; // optimistic; reset on failure so we retry
    try {
      if (previous) await connection.invoke("Unsubscribe", previous);
      await connection.invoke("Subscribe", target);
    } catch {
      joinedGroup = null; // a later call (or reconnect) will retry
    }
  };

  connection.onreconnecting(() => handlers.onStateChange(false));
  connection.onreconnected(() => {
    joinedGroup = null; // groups are dropped on the server across a reconnect
    handlers.onStateChange(true);
    ensureSubscription();
  });
  connection.onclose(() => handlers.onStateChange(false));

  // Initial connect with its own retry loop (withAutomaticReconnect only
  // covers drops after a successful start).
  const start = async () => {
    while (!stopped) {
      try {
        await connection.start();
        handlers.onStateChange(true);
        await ensureSubscription();
        return;
      } catch {
        handlers.onStateChange(false);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  };
  start();

  return {
    stop: async () => {
      stopped = true;
      if (connection.state !== HubConnectionState.Disconnected) {
        await connection.stop().catch(() => {});
      }
    },
    setGroup: (group: string) => {
      if (!group || group === desiredGroup) return;
      desiredGroup = group;
      ensureSubscription();
    },
  };
}
