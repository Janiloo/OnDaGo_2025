import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Vehicle } from "../types";
import { MAX_CAPACITY, occupancyColor } from "../utils/vehicles";
import { useTheme } from "../store/ThemeContext";

/** Fixed dark pin fill (theme-independent) so white content always reads. */
const PIN_FILL = "#101B2E";

/**
 * PUV map marker: a compact pin — live passenger count over a bus glyph, on a
 * dark fill ringed in the occupancy tier color (green→dark red), with a small
 * pointer tail.
 *
 * Sizing matters: react-native-maps on Android/Fabric clips a custom marker's
 * bitmap when the view is much larger than its content. So this pin hugs its
 * content with minimal padding (no big fixed circle) — nothing to clip. The
 * "/18" and status word live in the legend + the tap-through detail sheet.
 *
 * Performance: `tracksViewChanges` pulses on only when the appearance changes
 * (count, tier color), then off — so position refreshes just reposition.
 */
export function VehicleMarker({
  vehicle,
  stale,
  onPress,
}: {
  vehicle: Vehicle;
  stale: boolean;
  /** Kept for API compatibility; occupancy coloring applies to all vehicles. */
  self?: boolean;
  /** When set, tapping opens the app's own detail UI instead of the map callout. */
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  const count = vehicle.passengerCount;
  const max = vehicle.maxPassengerCount || MAX_CAPACITY;
  const color = stale ? palette.textMuted : occupancyColor(count);

  const signature = `${count}-${color}`;
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const timeout = setTimeout(() => setTracks(false), 800);
    return () => clearTimeout(timeout);
  }, [signature]);

  return (
    <Marker
      coordinate={{ latitude: vehicle.currentLat, longitude: vehicle.currentLong }}
      title={onPress ? undefined : `PUV ${vehicle.puvNo}`}
      description={onPress ? undefined : `${count}/${max} passengers`}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
      opacity={stale ? 0.6 : 1}
      onPress={
        onPress
          ? (event) => {
              event.stopPropagation();
              onPress();
            }
          : undefined
      }
    >
      <View style={styles.wrap}>
        {/* Body hugs its content — count over bus glyph. */}
        <View style={[styles.body, { borderColor: color }]}>
          <Text allowFontScaling={false} numberOfLines={1} style={styles.count}>
            {count}
          </Text>
          <Ionicons name="bus" size={11} color="#FFFFFF" />
        </View>
        {/* Pointer tail (tier color). */}
        <View style={[styles.tail, { borderTopColor: color }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  body: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 1,
    paddingBottom: 2,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: PIN_FILL,
  },
  count: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 11,
    includeFontPadding: false,
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
