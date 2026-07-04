import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import { getProfile } from "../../services/authApi";
import { getVehicles, updateVehicleStatus } from "../../services/vehicleApi";
import { Vehicle } from "../../types";
import { Badge, Button, Card, Field, Screen } from "../../components/UI";
import { DRIVER_LOCATION_UPDATE_MS } from "../../config";
import { Palette, radius, spacing, type } from "../../theme";

/**
 * Driver dashboard: operational, real-time, minimal distraction.
 * - Finds the driver's vehicle by plate number (from profile).
 * - Broadcasts GPS position every few seconds via PATCH /api/Vehicle/{puvNo}/status.
 * - Big-target passenger counter for one-handed use while boarding.
 */
export default function DriverHomeScreen() {
  const { user } = useAuth();
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [count, setCount] = useState(0);
  const [editValue, setEditValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [loading, setLoading] = useState(true);

  const countRef = useRef(0);
  const positionRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const vehicleRef = useRef<Vehicle | null>(null);

  useEffect(() => {
    countRef.current = count;
  }, [count]);
  useEffect(() => {
    vehicleRef.current = vehicle;
  }, [vehicle]);

  // Load the vehicle assigned to this driver's plate number.
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
        const mine = vehicles.find((v) => v.puvNo === plate) ?? {
          puvNo: plate,
          currentLat: 0,
          currentLong: 0,
          passengerCount: 0,
          maxPassengerCount: 18,
        };
        setVehicle(mine);
        setCount(mine.passengerCount);
      } catch {
        Alert.alert("Error", "Could not load your vehicle. Reopen this screen to retry.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.plateNumber]);

  const pushStatus = useCallback(async () => {
    const v = vehicleRef.current;
    const pos = positionRef.current;
    if (!v || !pos) return;
    try {
      await updateVehicleStatus(v.puvNo, {
        passengerCount: countRef.current,
        latitude: pos.latitude,
        longitude: pos.longitude,
      });
    } catch {
      // Transient network failures are fine; next tick retries.
    }
  }, []);

  // GPS broadcast loop.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location required",
          "Location permission is needed to broadcast your PUV's position to commuters."
        );
        return;
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          positionRef.current = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setBroadcasting(true);
        }
      );
      timer = setInterval(pushStatus, DRIVER_LOCATION_UPDATE_MS);
    })();
    return () => {
      if (timer) clearInterval(timer);
      subscription?.remove();
    };
  }, [pushStatus]);

  const changeCount = async (delta: number) => {
    if (!vehicle) return;
    const next = Math.max(0, Math.min(vehicle.maxPassengerCount, count + delta));
    if (next === count) return;
    setCount(next);
    countRef.current = next;
    await pushStatus();
  };

  const applyEdit = async () => {
    if (!vehicle) return;
    const next = parseInt(editValue, 10);
    if (Number.isNaN(next) || next < 0 || next > vehicle.maxPassengerCount) {
      Alert.alert("Invalid count", `Enter a value between 0 and ${vehicle.maxPassengerCount}.`);
      return;
    }
    setCount(next);
    countRef.current = next;
    setEditing(false);
    setEditValue("");
    await pushStatus();
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
    <Screen>
      {/* Vehicle status header */}
      <Card>
        <View style={styles.headerRow}>
          <View style={[styles.plateIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="bus" size={24} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.caption, { color: palette.textMuted }]}>PUV No.</Text>
            <Text style={[type.title, { color: palette.text }]}>{vehicle?.puvNo ?? "—"}</Text>
          </View>
          <Badge
            label={broadcasting ? "LIVE" : "NO GPS"}
            tone={broadcasting ? "success" : "danger"}
            icon={broadcasting ? "radio" : "radio-outline"}
          />
        </View>
      </Card>

      {/* Passenger counter — the primary control */}
      <Card style={{ alignItems: "center", paddingVertical: spacing.lg }}>
        <Text style={[type.label, { color: palette.textMuted, textTransform: "uppercase", letterSpacing: 1 }]}>
          Passengers on board
        </Text>
        <View style={styles.counterRow}>
          <Pressable
            onPress={() => changeCount(-1)}
            style={({ pressed }) => [
              styles.counterButton,
              { backgroundColor: palette.surfaceAlt, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="remove" size={30} color={palette.text} />
          </Pressable>

          <View style={{ alignItems: "center", minWidth: 120 }}>
            <Text style={[styles.counterValue, { color: full ? palette.danger : palette.text }]}>{count}</Text>
            <Text style={[type.body, { color: palette.textMuted }]}>of {max} seats</Text>
          </View>

          <Pressable
            onPress={() => changeCount(1)}
            disabled={full}
            style={({ pressed }) => [
              styles.counterButton,
              { backgroundColor: palette.primary, opacity: full ? 0.4 : pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="add" size={30} color={palette.onPrimary} />
          </Pressable>
        </View>

        {/* Capacity bar */}
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
        {full && (
          <Badge label="VEHICLE FULL" tone="danger" icon="alert-circle" />
        )}
      </Card>

      {editing ? (
        <Card>
          <Field
            label={`Set exact count (0–${max})`}
            icon="create-outline"
            value={editValue}
            onChangeText={setEditValue}
            keyboardType="number-pad"
            placeholder={`0–${max}`}
          />
          <Button title="Save Count" icon="checkmark" onPress={applyEdit} />
          <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
        </Card>
      ) : (
        <Button title="Edit Count Manually" variant="outline" icon="create-outline" onPress={() => setEditing(true)} />
      )}
    </Screen>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    plateIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    counterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.lg,
      marginVertical: spacing.md,
    },
    counterButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    counterValue: { fontSize: 56, fontWeight: "900", lineHeight: 60 },
    capacityTrack: {
      width: "100%",
      height: 8,
      borderRadius: radius.pill,
      overflow: "hidden",
      marginBottom: spacing.sm,
    },
    capacityFill: { height: "100%", borderRadius: radius.pill },
  });
