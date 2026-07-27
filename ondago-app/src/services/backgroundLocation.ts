import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as SecureStore from "expo-secure-store";
import { updateVehicleStatus } from "./vehicleApi";
import { palettes } from "../theme";

/**
 * Background driver-location broadcasting.
 *
 * A driver "on duty" broadcasts GPS via an OS-managed location task that keeps
 * running when the app is backgrounded or the screen is locked — on Android it
 * is backed by a foreground service with a persistent notification. This is the
 * difference between a real tracking system and one that only works while the
 * driver stares at the screen.
 *
 * The task runs outside React, so the data it needs (which PUV, current
 * passenger count) is stashed in secure storage and read on each location tick.
 */

export const DRIVER_LOCATION_TASK = "ondago-driver-location";
const DUTY_KEY = "ondago.duty";

interface DutyState {
  puvNo: string;
  passengerCount: number;
}

async function readDuty(): Promise<DutyState | null> {
  const raw = await SecureStore.getItemAsync(DUTY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DutyState;
  } catch {
    return null;
  }
}

async function writeDuty(state: DutyState | null): Promise<void> {
  if (state) await SecureStore.setItemAsync(DUTY_KEY, JSON.stringify(state));
  else await SecureStore.deleteItemAsync(DUTY_KEY);
}

// Registered once at module load (import for side effects in App.tsx) so the OS
// can invoke it even after the app process is restarted in the background.
TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  const loc = locations?.[locations.length - 1];
  if (!loc) return;

  const duty = await readDuty();
  if (!duty) return; // No longer on duty — nothing to broadcast.

  try {
    await updateVehicleStatus(duty.puvNo, {
      passengerCount: duty.passengerCount,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
  } catch {
    // Transient failure; the next location tick retries.
  }
});

export interface StartTrackingResult {
  /** Foreground granted (required). Always true if this resolves without throwing. */
  foregroundGranted: true;
  /** Background "Always" granted. If false, tracking still works while the app is open. */
  backgroundGranted: boolean;
}

export async function startDriverTracking(
  puvNo: string,
  passengerCount: number
): Promise<StartTrackingResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    throw new Error("foreground-denied");
  }
  // Persist duty state before starting so the first tick has something to send.
  await writeDuty({ puvNo, passengerCount });

  const bg = await Location.requestBackgroundPermissionsAsync();

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(
    () => false
  );
  if (!alreadyRunning) {
    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 10,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Sabako — On duty",
        notificationBody: "Broadcasting your PUV location to commuters.",
        notificationColor: palettes.light.primary,
      },
    });
  }

  return { foregroundGranted: true, backgroundGranted: bg.status === "granted" };
}

export async function stopDriverTracking(): Promise<void> {
  await writeDuty(null);
  const running = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(
    () => false
  );
  if (running) {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  }
}

/** Keep the passenger count the background task broadcasts in sync with the UI. */
export async function syncDutyPassengerCount(passengerCount: number): Promise<void> {
  const duty = await readDuty();
  if (duty) await writeDuty({ ...duty, passengerCount });
}

/** Whether the OS location task is currently running (survives screen remounts). */
export async function isDriverTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => false);
}
