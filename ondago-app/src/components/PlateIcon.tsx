import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius } from "../theme";
import { useTheme } from "../store/ThemeContext";

/**
 * The square badge shown to the LEFT of a PUV plate (commuter vehicle sheet +
 * driver duty card). It carries the operator's branding: when the company has
 * uploaded a logo it shows that image; otherwise it falls back to the default
 * bus glyph. Keeping it in one component keeps the two surfaces in sync.
 */
export function PlateIcon({
  logo,
  stale = false,
  size = 44,
}: {
  /** Operator logo as a data/URL string, or null/undefined for the default. */
  logo?: string | null;
  /** Dim to the "last seen" look when the vehicle's signal is stale (no logo). */
  stale?: boolean;
  size?: number;
}) {
  const { palette } = useTheme();

  if (logo) {
    return (
      <View style={[styles.box, { width: size, height: size, backgroundColor: palette.surfaceAlt }]}>
        <Image
          source={{ uri: logo }}
          style={{ width: size, height: size, borderRadius: radius.md }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, backgroundColor: stale ? palette.surfaceAlt : palette.primarySoft },
      ]}
    >
      <Ionicons
        name={stale ? "bus-outline" : "bus"}
        size={Math.round(size / 2)}
        color={stale ? palette.textMuted : palette.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
