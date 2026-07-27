import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import { getProfile } from "../../services/authApi";
import { getVehicles, goOffline, updateVehicleStatus } from "../../services/vehicleApi";
import { getCompanies } from "../../services/discoveryApi";
import {
  isDriverTrackingActive,
  startDriverTracking,
  stopDriverTracking,
  syncDutyPassengerCount,
} from "../../services/backgroundLocation";
import { Vehicle } from "../../types";
import { Badge } from "../../components/UI";
import { PlateIcon } from "../../components/PlateIcon";
import { BottomSheet } from "../../components/BottomSheet";
import { useToast } from "../../components/Toast";
import { haptics } from "../../services/haptics";
import { DEFAULT_MAP_REGION, DRIVER_LOCATION_UPDATE_MS } from "../../config";
import { bearingDegrees, distanceMeters } from "../../utils/geo";
import { darkMapStyle, Palette, radius, spacing, type } from "../../theme";

// Angled navigation camera (Waze/Google-nav style): tilt the map so the driver
// sees the road ahead instead of a top-down view, zoomed to street level.
const NAV_PITCH = 55; // degrees of camera tilt
const NAV_ZOOM = 17; // street-level follow zoom
// Must match the BottomSheet height below; used as bottom map padding so the
// vehicle sits above the sheet rather than behind it.
const SHEET_HEIGHT = 258;

/**
 * Driver home = live map + a passenger bottom sheet on the same screen.
 * - Map centers on the driver's own location so they can see where they are.
 * - Going "On Duty" starts OS-managed background location broadcasting
 *   (keeps running when the screen locks / app backgrounds).
 * - The bottom sheet holds the passenger counter and duty controls.
 */
export default function DriverHomeScreen() {
  const { user } = useAuth();
  const { palette, isDark } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(palette);
  const mapRef = useRef<MapView>(null);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  // The driver's own operator logo (branding), shown on the plate badge. Null
  // until resolved, or when the company hasn't uploaded one.
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [onDuty, setOnDuty] = useState(false);
  const [hasFix, setHasFix] = useState(false);
  // Driver's own position; `moving` toggles the marker between a bus icon
  // (parked) and a directional arrow (in motion).
  const [self, setSelf] = useState<{
    latitude: number;
    longitude: number;
    heading: number;
    moving: boolean;
  } | null>(null);
  // Pulses tracksViewChanges so the marker re-rasterizes when it swaps
  // bus↔arrow or the theme changes — then stays off for performance.
  const [selfTracks, setSelfTracks] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const countRef = useRef(0);
  const positionRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const onDutyRef = useRef(false);
  // Last good travel bearing — keeps the map oriented to the direction of
  // travel; retained while stopped (GPS heading is unreliable at low speed).
  const headingRef = useRef(0);
  // Previous fix, for deriving movement + heading from position deltas.
  const lastFixRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const lastMoveRef = useRef(0); // timestamp of last significant movement
  const movingRef = useRef(false);

  useEffect(() => {
    countRef.current = count;
  }, [count]);
  useEffect(() => {
    onDutyRef.current = onDuty;
  }, [onDuty]);

  // Resolve the driver's operator logo for the plate badge. Uses the commuter
  // discovery layer (Verified companies) matched to the driver's own company;
  // falls back to the default bus glyph when there's no logo.
  useEffect(() => {
    let mounted = true;
    const companyId = vehicle?.companyId ?? null;
    if (!companyId) {
      setCompanyLogo(null);
      return;
    }
    getCompanies()
      .then((companies) => {
        if (!mounted) return;
        setCompanyLogo(companies.find((c) => c.id === companyId)?.logo ?? null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [vehicle?.companyId]);

  // Load the vehicle assigned to this driver's plate number, and restore duty
  // state if a background task is already running from a previous screen visit.
  useEffect(() => {
    (async () => {
      try {
        let plate = user?.plateNumber;
        if (!plate) {
          const profile = await getProfile();
          plate = profile.plateNumber ?? undefined;
        }
        if (!plate) {
          Alert.alert("No vehicle", "No plate number is linked to this driver account.");
          return;
        }
        const vehicles = await getVehicles();
        const mine =
          vehicles.find((v) => v.puvNo === plate) ?? {
            puvNo: plate,
            currentLat: 0,
            currentLong: 0,
            passengerCount: 0,
            maxPassengerCount: 18,
          };
        setVehicle(mine);
        setCount(mine.passengerCount);
        setOnDuty(await isDriverTrackingActive());
      } catch {
        Alert.alert("Error", "Could not load your vehicle. Reopen this screen to retry.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.plateNumber]);

  // Foreground watch drives the tilted follow-camera + the arrow marker, and
  // gives us an immediate position for snappy pushes on count changes.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    const applyFix = (loc: Location.LocationObject, animate: boolean) => {
      if (cancelled) return;
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      positionRef.current = coords;

      // Derive movement + heading from the change in position. This is more
      // robust than coords.speed/heading, which are jittery at low speed and
      // often 0/-1 on emulators. GPS-reported heading is used only as a fallback.
      const now = Date.now();
      const prev = lastFixRef.current;
      let moving = movingRef.current; // keep last state unless we decide otherwise
      if (prev) {
        const moved = distanceMeters(prev.lat, prev.lng, coords.latitude, coords.longitude);
        if (moved > 4) {
          moving = true;
          headingRef.current = bearingDegrees(prev.lat, prev.lng, coords.latitude, coords.longitude);
          lastMoveRef.current = now;
        } else if (now - lastMoveRef.current > 6000) {
          // No significant movement for a while (measured from the last MOVE,
          // not the last fix) → parked; revert the arrow to the bus icon.
          moving = false;
        }
      }
      // Fallback: trust GPS heading only when it's valid and we're moving.
      const gpsHeading = loc.coords.heading;
      if (!moving && gpsHeading != null && gpsHeading >= 0 && (loc.coords.speed ?? 0) > 0.7) {
        headingRef.current = gpsHeading;
        moving = true;
        lastMoveRef.current = now;
      }
      movingRef.current = moving;
      lastFixRef.current = { lat: coords.latitude, lng: coords.longitude, t: now };

      setHasFix(true);
      setSelf({ ...coords, heading: headingRef.current, moving });
      // Tilted, heading-up follow — the driver sees the road ahead.
      mapRef.current?.animateCamera(
        { center: coords, pitch: NAV_PITCH, heading: headingRef.current, zoom: NAV_ZOOM },
        { duration: animate ? 600 : 0 }
      );
    };

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      // Seed immediately so the arrow + follow appear even while stationary
      // (a parked device/emulator never trips a distance-based update).
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) applyFix(last, false);
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        applyFix(current, true);
      } catch {
        // No fix yet — the watch below will deliver one.
      }

      // Time-based updates (no distanceInterval) so it keeps refreshing even
      // when the vehicle is stopped at a terminal or in traffic.
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000 },
        (loc) => applyFix(loc, true)
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  // Re-rasterize the marker only when its look changes (bus↔arrow, theme).
  useEffect(() => {
    setSelfTracks(true);
    const t = setTimeout(() => setSelfTracks(false), 800);
    return () => clearTimeout(t);
  }, [self?.moving, isDark]);

  const pushNow = useCallback(async () => {
    const pos = positionRef.current;
    if (!vehicle || !pos) return;
    try {
      await updateVehicleStatus(vehicle.puvNo, {
        passengerCount: countRef.current,
        latitude: pos.latitude,
        longitude: pos.longitude,
      });
    } catch {
      // next tick retries
    }
  }, [vehicle]);

  // Foreground broadcast: while on duty and this screen is open, push position
  // on a timer. The background task covers screen-locked/backgrounded cases on
  // dev builds; this ensures live broadcasting whenever the app is in the
  // foreground — including Expo Go, where background tasks don't run.
  useEffect(() => {
    if (!onDuty) return;
    const timer = setInterval(() => pushNow(), DRIVER_LOCATION_UPDATE_MS);
    return () => clearInterval(timer);
  }, [onDuty, pushNow]);

  const toggleDuty = async () => {
    if (!vehicle || busy) return;
    setBusy(true);
    try {
      if (onDuty) {
        await stopDriverTracking();
        setOnDuty(false);
        haptics.warning();
        toast.info("Shift ended — you're now offline.");
        // Tell the backend + commuters immediately so the PUV drops off their
        // maps now, instead of aging out via the staleness timeout.
        goOffline(vehicle.puvNo).catch(() => {});
      } else {
        const result = await startDriverTracking(vehicle.puvNo, countRef.current);
        setOnDuty(true);
        haptics.success();
        toast.success("You're on duty — broadcasting live.");
        if (!result.backgroundGranted) {
          Alert.alert(
            "Background location off",
            'Tracking works now, but will pause when the app is closed. For reliable tracking, set location permission to "Allow all the time" in Settings.'
          );
        }
        await pushNow();
      }
    } catch (e: any) {
      if (e?.message === "foreground-denied") {
        Alert.alert("Location required", "Location permission is needed to broadcast your PUV position.");
      } else {
        Alert.alert("Error", "Could not change duty status. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const applyCount = async (next: number) => {
    if (!vehicle) return;
    const clamped = Math.max(0, Math.min(vehicle.maxPassengerCount, next));
    if (clamped !== countRef.current) haptics.selection();
    setCount(clamped);
    countRef.current = clamped;
    await syncDutyPassengerCount(clamped);
    if (onDutyRef.current) await pushNow();
  };

  const saveEdit = async () => {
    if (!vehicle) return;
    const next = parseInt(editValue, 10);
    if (Number.isNaN(next) || next < 0 || next > vehicle.maxPassengerCount) {
      Alert.alert("Invalid count", `Enter a value between 0 and ${vehicle.maxPassengerCount}.`);
      return;
    }
    setEditing(false);
    setEditValue("");
    await applyCount(next);
  };

  const recenter = () => {
    const pos = positionRef.current;
    if (pos) {
      mapRef.current?.animateCamera(
        { center: pos, pitch: NAV_PITCH, heading: headingRef.current, zoom: NAV_ZOOM },
        { duration: 500 }
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  const max = vehicle?.maxPassengerCount ?? 0;
  const full = max > 0 && count >= max;
  const loadRatio = max > 0 ? count / max : 0;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialCamera={{
          center: { latitude: DEFAULT_MAP_REGION.latitude, longitude: DEFAULT_MAP_REGION.longitude },
          pitch: NAV_PITCH,
          heading: 0,
          zoom: 13,
          altitude: 0,
        }}
        // Small bottom padding keeps the vehicle LOW on screen (just above the
        // sheet), maximizing the road ahead visible above it. Larger bottom
        // padding would raise the vehicle toward center — the opposite of a
        // nav view. Tuned to clear the ~258px sheet with headroom.
        mapPadding={{ top: insets.top + 8, right: 0, bottom: 72, left: 0 }}
        customMapStyle={isDark ? darkMapStyle : []}
        // Replaced by our own directional arrow marker below.
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        pitchEnabled
        toolbarEnabled={false}
      >
        {self && (
          <Marker
            coordinate={{ latitude: self.latitude, longitude: self.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={selfTracks}
          >
            {/* Billboarded puck: always visible, upright. The map is heading-up,
                so an upward arrow reads as "forward". Parked → bus icon. */}
            <View style={styles.selfHalo}>
              <View style={styles.selfDisc}>
                {self.moving ? (
                  <View style={styles.selfArrow} />
                ) : (
                  <Ionicons name="bus" size={15} color={palette.primary} />
                )}
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Duty status pill */}
      <View style={[styles.topPill, { top: insets.top + spacing.sm, backgroundColor: palette.overlay }]}>
        <View style={[styles.dot, { backgroundColor: onDuty ? "#34D399" : "#94A3B8" }]} />
        <Text style={styles.pillText}>
          {onDuty ? (hasFix ? "On duty · broadcasting" : "On duty · getting GPS…") : "Off duty"}
        </Text>
      </View>

      {/* Recenter */}
      <Pressable
        onPress={recenter}
        style={[styles.recenter, { top: insets.top + spacing.sm, backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Ionicons name="locate" size={20} color={palette.primary} />
      </Pressable>

      {/* Compact fixed sheet: plate + LIVE, duty toggle, passenger counter.
          Height ≈ content so there is no dead space; peek == height keeps it
          from expanding taller. */}
      <BottomSheet height={SHEET_HEIGHT} peekHeight={SHEET_HEIGHT}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.sm }}>
          {/* Header: plate + duty toggle. The plate badge shows the driver's
              company logo when one is set, else the default bus glyph. */}
          <View style={styles.headerRow}>
            <PlateIcon logo={companyLogo} />
            <View style={{ flex: 1 }}>
              <Text style={[type.caption, { color: palette.textMuted }]}>PUV No.</Text>
              <Text style={[type.title, { color: palette.text }]}>{vehicle?.puvNo ?? "—"}</Text>
            </View>
            <Badge
              label={onDuty ? "LIVE" : "OFFLINE"}
              tone={onDuty ? "success" : "neutral"}
              icon={onDuty ? "radio" : "radio-outline"}
            />
          </View>

          <Pressable
            onPress={toggleDuty}
            disabled={busy}
            style={({ pressed }) => [
              styles.dutyButton,
              {
                backgroundColor: onDuty ? palette.dangerSoft : palette.primary,
                opacity: pressed || busy ? 0.8 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={onDuty ? palette.danger : palette.onPrimary} />
            ) : (
              <>
                <Ionicons
                  name={onDuty ? "stop-circle-outline" : "play-circle-outline"}
                  size={20}
                  color={onDuty ? palette.danger : palette.onPrimary}
                />
                <Text style={[styles.dutyText, { color: onDuty ? palette.danger : palette.onPrimary }]}>
                  {onDuty ? "End Shift" : "Go On Duty"}
                </Text>
              </>
            )}
          </Pressable>

          {/* Passenger counter */}
          <View style={styles.counterRow}>
            <Pressable
              onPress={() => applyCount(count - 1)}
              style={({ pressed }) => [styles.counterBtn, { backgroundColor: palette.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="remove" size={28} color={palette.text} />
            </Pressable>
            <Pressable style={{ alignItems: "center", minWidth: 120 }} onPress={() => { setEditValue(String(count)); setEditing(true); }}>
              <Text style={[styles.counterValue, { color: full ? palette.danger : palette.text }]}>{count}</Text>
              <Text style={[type.caption, { color: palette.textMuted }]}>of {max} seats · tap to edit</Text>
            </Pressable>
            <Pressable
              onPress={() => applyCount(count + 1)}
              disabled={full}
              style={({ pressed }) => [styles.counterBtn, { backgroundColor: palette.primary, opacity: full ? 0.4 : pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="add" size={28} color={palette.onPrimary} />
            </Pressable>
          </View>

          <View style={[styles.capacityTrack, { backgroundColor: palette.surfaceAlt }]}>
            <View
              style={[
                styles.capacityFill,
                {
                  width: `${Math.min(100, loadRatio * 100)}%`,
                  backgroundColor: full ? palette.danger : loadRatio > 0.8 ? palette.accent : palette.success,
                },
              ]}
            />
          </View>
          {full && <Badge label="VEHICLE FULL" tone="danger" icon="alert-circle" />}

          {editing && (
            <View style={styles.editRow}>
              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="number-pad"
                placeholder={`0–${max}`}
                placeholderTextColor={palette.textMuted}
                style={[styles.editInput, { color: palette.text, backgroundColor: palette.surfaceAlt }]}
                autoFocus
              />
              <Pressable onPress={saveEdit} style={[styles.editSave, { backgroundColor: palette.primary }]}>
                <Ionicons name="checkmark" size={20} color={palette.onPrimary} />
              </Pressable>
              <Pressable onPress={() => setEditing(false)} style={[styles.editSave, { backgroundColor: palette.surfaceAlt }]}>
                <Ionicons name="close" size={20} color={palette.text} />
              </Pressable>
            </View>
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    // Directional "you are here" arrow (rotates with heading).
    selfHalo: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: p.primary + "26", // faint accuracy halo
      alignItems: "center",
      justifyContent: "center",
    },
    selfDisc: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 4,
    },
    selfArrow: {
      width: 0,
      height: 0,
      marginTop: -2, // optical centering of the triangle
      borderLeftWidth: 7,
      borderRightWidth: 7,
      borderBottomWidth: 13,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderBottomColor: p.primary,
    },
    topPill: {
      position: "absolute",
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
    },
    pillText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    recenter: {
      position: "absolute",
      right: spacing.md,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      elevation: 3,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    dutyButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: radius.md,
      paddingVertical: 14,
      marginBottom: spacing.md,
    },
    dutyText: { fontWeight: "800", fontSize: 16 },
    counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg },
    counterBtn: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
    counterValue: { fontSize: 48, fontWeight: "900", lineHeight: 52 },
    capacityTrack: { width: "100%", height: 8, borderRadius: radius.pill, overflow: "hidden", marginTop: spacing.md, marginBottom: spacing.sm },
    capacityFill: { height: "100%", borderRadius: radius.pill },
    editRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
    editInput: { flex: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 16 },
    editSave: { width: 46, height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  });
