import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Vehicle } from "../types";
import { MAX_CAPACITY, occupancyColor } from "../utils/vehicles";
import { useTheme } from "../store/ThemeContext";

/** Dark navy used as the pin fill in light mode (with white content), and as
 *  the number/icon color in dark mode (on a white fill). */
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
  const { palette, isDark } = useTheme();
  const count = vehicle.passengerCount;
  const max = vehicle.maxPassengerCount || MAX_CAPACITY;
  const color = stale ? palette.textMuted : occupancyColor(count, max);

  // Invert the pin by theme so it always contrasts the map: a dark pin with
  // white content on the light map, a white pin with dark content on the dark
  // map (where a dark fill would blend into the terrain).
  const fill = isDark ? "#FFFFFF" : PIN_FILL;
  const content = isDark ? PIN_FILL : "#FFFFFF";

  const signature = `${count}-${color}-${isDark}`;
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
        <View style={styles.bodyWrap}>
          {/* Drop shadow baked into the marker bitmap: native elevation/shadow
              props draw outside the captured bitmap on Android and vanish. RN
              can't blur, so we fake a soft falloff by stacking layers that grow
              larger and fainter outward — the edges fade like a real shadow. */}
          <View style={[styles.shadow, styles.shadow1]} pointerEvents="none" />
          <View style={[styles.shadow, styles.shadow2]} pointerEvents="none" />
          <View style={[styles.shadow, styles.shadow3]} pointerEvents="none" />
          <View style={[styles.body, { borderColor: color, backgroundColor: fill }]}>
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.count, { color: content }]}>
              {count}
            </Text>
            <Ionicons name="bus" size={11} color={content} />
          </View>
        </View>
        {/* Pointer tail (tier color). */}
        <View style={[styles.tail, { borderTopColor: color }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  // Padding gives the layered drop shadow room to render inside the marker
  // bitmap (react-native-maps clips a marker tight to its content otherwise).
  wrap: { alignItems: "center", paddingHorizontal: 7, paddingTop: 4, paddingBottom: 5 },
  bodyWrap: { position: "relative" },
  // Soft baked drop shadow: three stacked layers, each larger and fainter, so
  // the edges fade out instead of forming a hard block. Offset slightly down.
  shadow: { position: "absolute" },
  shadow1: { top: 4, left: -4, right: -4, bottom: -5, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.05)" },
  shadow2: { top: 3.5, left: -2.5, right: -2.5, bottom: -3.5, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.07)" },
  shadow3: { top: 3, left: -1, right: -1, bottom: -2, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.1)" },
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
