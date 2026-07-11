import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { occupancyColor } from "../utils/vehicles";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../store/ThemeContext";

/**
 * Tiny tappable legend explaining the marker color code. Collapsed to a single
 * chip by default so it never crowds the map; tap to expand the full scale.
 * Tiers are fill percentages — seat capacity varies per vehicle, so absolute
 * counts would only be true for one size of PUV.
 */
const TIERS: { label: string; sample: number }[] = [
  { label: "Available", sample: 0 },
  { label: "Moderate", sample: 30 },
  { label: "High", sample: 60 },
  { label: "Nearly full", sample: 85 },
  { label: "Full", sample: 100 },
];

export function OccupancyLegend({ top }: { top: number }) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Pressable
      onPress={() => setOpen((o) => !o)}
      style={[styles.wrap, { top, backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      {open ? (
        <View>
          <View style={styles.headerRow}>
            <Text style={[type.caption, { color: palette.textMuted, fontWeight: "700" }]}>How full</Text>
            <Ionicons name="chevron-up" size={13} color={palette.textMuted} />
          </View>
          {TIERS.map((t) => (
            <View key={t.label} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: occupancyColor(t.sample, 100) }]} />
              <Text style={[type.caption, { color: palette.text }]}>{t.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.chip}>
          {TIERS.map((t) => (
            <View key={t.label} style={[styles.dot, { backgroundColor: occupancyColor(t.sample, 100), marginRight: 2 }]} />
          ))}
          <Text style={[type.caption, { color: palette.textMuted, marginLeft: 4, fontWeight: "700" }]}>Seats</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    elevation: 3,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  chip: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
