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

/**
 * SignalR connection to /hubs/reports (admin-only). The server pushes
 * "ReportUpdated"/"ReportDeleted" whenever a report changes; since reports are
 * low-frequency, we just signal onChange and let the screen refetch — simpler
 * and self-healing versus merging individual payloads. The JWT rides the query
 * string (the hub is [Authorize(Roles="Admin")]).
 */
export interface ReportHubHandle {
  stop: () => Promise<void>;
}

const quietLogger: ILogger = {
  log(logLevel: LogLevel, message: string) {
    if (logLevel >= LogLevel.Warning) console.log(`[signalr:reports] ${message}`);
  },
};

export function connectReportHub(handlers: { onChange: () => void }): ReportHubHandle {
  const connection: HubConnection = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/reports`, {
      accessTokenFactory: async () => (await SecureStore.getItemAsync(TOKEN_KEY)) ?? "",
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (ctx) =>
        [0, 2000, 5000, 10000][ctx.previousRetryCount] ?? 30000,
    })
    .configureLogging(quietLogger)
    .build();

  connection.serverTimeoutInMilliseconds = 60000;
  connection.keepAliveIntervalInMilliseconds = 15000;

  connection.on("ReportUpdated", () => handlers.onChange());
  connection.on("ReportDeleted", () => handlers.onChange());

  let stopped = false;
  (async function start() {
    while (!stopped) {
      try {
        await connection.start();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();

  return {
    stop: async () => {
      stopped = true;
      if (connection.state !== HubConnectionState.Disconnected) {
        await connection.stop().catch(() => {});
      }
    },
  };
}
