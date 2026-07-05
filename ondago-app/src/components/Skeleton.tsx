import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { radius, spacing } from "../theme";
import { useTheme } from "../store/ThemeContext";

/**
 * Shimmer placeholder. A single shared driver animates a soft highlight bar
 * sweeping across every skeleton on screen, so N skeletons cost one animation.
 * Prefer these over spinners for list/detail loads — the layout appears
 * instantly and content fades in, which reads as fast.
 */

// One module-wide loop drives all skeletons.
const sweep = new Animated.Value(0);
let started = false;
function ensureSweep() {
  if (started) return;
  started = true;
  Animated.loop(
    Animated.timing(sweep, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    })
  ).start();
}

export function SkeletonBlock({
  width = "100%",
  height = 16,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
}) {
  const { palette, isDark } = useTheme();
  const containerWidth = useRef(0);

  useEffect(ensureSweep, []);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 400],
  });

  return (
    <View
      onLayout={(e) => (containerWidth.current = e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius.sm,
          backgroundColor: palette.surfaceAlt,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX }],
        }}
      >
        <View
          style={{
            width: 120,
            height: "100%",
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)",
          }}
        />
      </Animated.View>
    </View>
  );
}

/** A card-shaped skeleton row matching the app's list items. */
export function SkeletonListItem() {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        padding: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      <SkeletonBlock width={40} height={40} style={{ borderRadius: radius.md }} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="45%" height={11} />
      </View>
      <SkeletonBlock width={52} height={18} />
    </View>
  );
}

/** N skeleton rows — the standard list loading state. */
export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={{ padding: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
}
