import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Thin, crash-proof wrapper over expo-haptics. Every call is best-effort:
 * no-ops on web and swallows the "unsupported" rejection on devices without
 * a taptic engine, so callers never need to guard.
 *
 * Usage guide (keep it subtle — feedback, not noise):
 *  - selection: discrete value changes (counter ±, tab switch, segment toggle)
 *  - light:     standard button / row taps
 *  - success/warning/error: outcome of an action (paired with a toast)
 */
const enabled = Platform.OS === "ios" || Platform.OS === "android";

function run(fn: () => Promise<unknown>) {
  if (!enabled) return;
  // try/catch guards a *synchronous* throw when the native module is missing
  // (e.g. a dev build made before expo-haptics was added); .catch handles the
  // async rejection. Either way, haptics silently degrade to nothing.
  try {
    fn().catch(() => {});
  } catch {
    /* no haptics available */
  }
}

export const haptics = {
  selection: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
