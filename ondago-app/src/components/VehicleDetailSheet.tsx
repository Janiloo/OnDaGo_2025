import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { PlateIcon } from "./PlateIcon";
import { Badge } from "./UI";
import { Vehicle } from "../types";
import { estimateStopEtas, formatDistance } from "../utils/eta";
import { isVehicleStale, lastSeenLabel, occupancyColor, occupancyLabel } from "../utils/vehicles";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../store/ThemeContext";

/**
 * Slides up when a PUV marker is tapped (commuter + admin maps): plate,
 * occupancy, and arrival estimates. Height is sized to the content so there's no
 * dead space below. The vehicle prop stays live — pushes keep occupancy current.
 */
const ETA_ROW_HEIGHT = 34;
export function VehicleDetailSheet({
  vehicle,
  now,
  stops = [],
  speedKmh,
  operator,
  onClose,
}: {
  vehicle: Vehicle;
  now: number;
  /** Stops to estimate arrival for — the vehicle's route terminals (or all). */
  stops?: { id: string; name: string; latitude: number; longitude: number }[];
  /** Observed speed for this PUV (km/h); falls back to the fleet average. */
  speedKmh?: number;
  /** Operator branding (Tier 2): "Operated by X" with an optional logo. */
  operator?: { name: string; logo: string | null } | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const stale = isVehicleStale(vehicle, now);
  const max = vehicle.maxPassengerCount;
  const full = max > 0 && vehicle.passengerCount >= max;
  const ratio = max > 0 ? vehicle.passengerCount / max : 0;
  const occ = stale ? palette.textMuted : occupancyColor(vehicle.passengerCount, max);

  // Arrival estimates (only meaningful for a live vehicle with known stops).
  const etas = useMemo(() => {
    if (stale || stops.length === 0) return [];
    return estimateStopEtas(vehicle, stops, speedKmh).slice(0, 3);
  }, [stale, stops, vehicle.currentLat, vehicle.currentLong, speedKmh]);

  // Height fits the content: fixed header/occupancy block + optional operator
  // row + optional ETA block.
  const sheetHeight = useMemo(() => {
    const base = 176; // handle + header + occupancy + capacity bar + bottom padding
    const operatorBlock = operator ? 30 : 0;
    const etaBlock = etas.length > 0 ? 34 + etas.length * ETA_ROW_HEIGHT + 22 : 0; // label + rows + footnote
    return base + operatorBlock + etaBlock;
  }, [etas.length, operator]);

  return (
    <BottomSheet height={sheetHeight} peekHeight={sheetHeight} animateOnMount onDismiss={onClose}>
      {/* Header: plate + status + close. The plate badge carries the operator's
          logo when one is set, else the default bus glyph. */}
      <View style={styles.headerRow}>
        <PlateIcon logo={operator?.logo} stale={stale} />
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

      {/* Operator branding (Tier 2). The logo lives on the plate badge above; this
          row just names the operator with a neutral building icon. */}
      {operator && (
        <View style={styles.operatorRow}>
          <Ionicons name="business-outline" size={14} color={palette.textMuted} />
          <Text style={[type.caption, { color: palette.textMuted }]} numberOfLines={1}>
            Operated by <Text style={{ fontWeight: "700", color: palette.text }}>{operator.name}</Text>
          </Text>
        </View>
      )}

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
              : `${occupancyLabel(vehicle.passengerCount, max)} · ${Math.max(0, max - vehicle.passengerCount)} seat${max - vehicle.passengerCount === 1 ? "" : "s"} free`}
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

      {/* Arrival estimates — straight-line ETA to the nearest stops on the route. */}
      {etas.length > 0 && (
        <View style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs }}>
            <Ionicons name="time-outline" size={14} color={palette.textMuted} />
            <Text style={[type.label, { color: palette.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }]}>
              Arrival estimates
            </Text>
          </View>
          {etas.map((e, i) => (
            <View key={e.terminalId} style={styles.etaRow}>
              <View style={[styles.etaDot, { backgroundColor: i === 0 ? palette.primary : palette.border }]} />
              <Text style={[type.body, { color: palette.text, flex: 1 }]} numberOfLines={1}>
                {e.name}
              </Text>
              <Text style={[type.caption, { color: palette.textMuted, marginRight: spacing.sm }]}>
                {formatDistance(e.distanceM)}
              </Text>
              <Text style={{ color: palette.primary, fontWeight: "800", fontSize: 14 }}>~{e.etaMinutes} min</Text>
            </View>
          ))}
          <Text style={[type.caption, { color: palette.textMuted, marginTop: 4 }]}>
            {speedKmh != null
              ? `Based on this PUV's current pace (~${Math.round(speedKmh)} km/h) · straight-line`
              : "Straight-line estimate · varies with traffic"}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  operatorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
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
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: ETA_ROW_HEIGHT,
  },
  etaDot: { width: 8, height: 8, borderRadius: 4 },
});
