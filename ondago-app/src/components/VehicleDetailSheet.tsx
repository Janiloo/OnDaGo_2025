import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { Badge, EmptyState } from "./UI";
import { FareMatrixItem, Vehicle } from "../types";
import { getFareMatrix } from "../services/fareApi";
import { isVehicleStale, lastSeenLabel, occupancyColor, occupancyLabel } from "../utils/vehicles";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../store/ThemeContext";

/**
 * Slides up when a PUV marker is tapped (commuter + admin maps): plate,
 * occupancy, and the fare matrix. Height is sized to the content (capped so a
 * long matrix scrolls) so a short matrix doesn't leave dead space below.
 * The vehicle prop stays live — pushes keep the occupancy current while open.
 */
const FARE_ROW_HEIGHT = 48;
export function VehicleDetailSheet({
  vehicle,
  now,
  onClose,
}: {
  vehicle: Vehicle;
  now: number;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const [fares, setFares] = useState<FareMatrixItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    getFareMatrix()
      .then((list) => {
        if (mounted) setFares(list);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stale = isVehicleStale(vehicle, now);
  const max = vehicle.maxPassengerCount;
  const full = max > 0 && vehicle.passengerCount >= max;
  const ratio = max > 0 ? vehicle.passengerCount / max : 0;
  const occ = stale ? palette.textMuted : occupancyColor(vehicle.passengerCount);

  // Height fits the content: fixed header/occupancy block + the fare section,
  // capped so a long matrix scrolls instead of overflowing the screen.
  const sheetHeight = useMemo(() => {
    const base = 184; // handle + header + occupancy + capacity bar + fare label
    let section: number;
    if (fares === null && !failed) section = 64; // spinner
    else if (failed || (fares && fares.length === 0)) section = 128; // empty state
    else section = Math.min(fares!.length, 5) * FARE_ROW_HEIGHT + spacing.sm;
    return Math.min(520, base + section);
  }, [fares, failed]);

  return (
    <BottomSheet height={sheetHeight} peekHeight={sheetHeight} animateOnMount onDismiss={onClose}>
      {/* Header: plate + status + close */}
      <View style={styles.headerRow}>
        <View style={[styles.plateIcon, { backgroundColor: stale ? palette.surfaceAlt : palette.primarySoft }]}>
          <Ionicons name={stale ? "bus-outline" : "bus"} size={22} color={stale ? palette.textMuted : palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.caption, { color: palette.textMuted }]}>PUV No.</Text>
          <Text style={[type.title, { color: palette.text }]}>{vehicle.puvNo}</Text>
        </View>
        <Badge
          label={stale ? `Last seen ${lastSeenLabel(vehicle, now)}` : "LIVE"}
          tone={stale ? "neutral" : "success"}
          icon={stale ? "time-outline" : "radio"}
        />
        <Pressable onPress={onClose} hitSlop={8} style={[styles.closeButton, { backgroundColor: palette.surfaceAlt }]}>
          <Ionicons name="close" size={18} color={palette.textMuted} />
        </Pressable>
      </View>

      {/* Occupancy — same tier color language as the map markers. */}
      <View style={styles.occupancyRow}>
        <Text style={[type.heading, { color: occ }]}>
          {vehicle.passengerCount} / {max || "?"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: occ }} />
          <Text style={[type.caption, { color: palette.textMuted }]}>
            {full
              ? "FULL — no seats available"
              : `${occupancyLabel(vehicle.passengerCount)} · ${Math.max(0, max - vehicle.passengerCount)} seat${max - vehicle.passengerCount === 1 ? "" : "s"} free`}
          </Text>
        </View>
      </View>
      <View style={[styles.capacityTrack, { backgroundColor: palette.surfaceAlt }]}>
        <View
          style={[
            styles.capacityFill,
            {
              width: `${Math.min(100, ratio * 100)}%`,
              backgroundColor: occ,
            },
          ]}
        />
      </View>

      {/* Fare matrix */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs }}>
        <Ionicons name="cash-outline" size={14} color={palette.textMuted} />
        <Text style={[type.label, { color: palette.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }]}>
          Fare Matrix
        </Text>
      </View>
      {fares === null && !failed ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: spacing.md }} />
      ) : failed ? (
        <EmptyState icon="cloud-offline-outline" message="Couldn't load fares. Check your connection." />
      ) : fares!.length === 0 ? (
        <EmptyState icon="cash-outline" message="No fares published yet." />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={fares}
          keyExtractor={(item, index) => item.id || String(index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.md }}
          renderItem={({ item }) => (
            <View style={[styles.fareRow, { borderBottomColor: palette.border }]}>
              <Text style={[type.body, { color: palette.text, flex: 1 }]} numberOfLines={1}>
                {item.origin} → {item.destination}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: palette.primary, fontWeight: "800", fontSize: 15 }}>
                  ₱{item.fare.toFixed(2)}
                </Text>
                <Text style={[type.caption, { color: palette.textMuted }]}>
                  ₱{item.discountedFare.toFixed(2)} discounted
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  plateIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  closeButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  occupancyRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  capacityTrack: {
    width: "100%",
    height: 8,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  capacityFill: { height: "100%", borderRadius: radius.pill },
  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
