import React from "react";
import { View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../store/ThemeContext";
import { radius } from "../theme";

/**
 * SunMark — the Sabako logomark. The eight-ray sun of the Philippine flag
 * cradling a jeepney/bus glyph. This replaces the generic "bus icon in an
 * orange rounded square", which was the app's biggest AI-template tell.
 *
 * Built from primitives (rotated bars + a disc) so it needs no SVG dependency
 * and scales cleanly. Rays are marigold; the disc is enamel vermillion.
 */
export function SunMark({ size = 96 }: { size?: number }) {
  const { palette } = useTheme();
  const rayCount = 8;
  const rayLen = size * 0.15;
  const rayW = size * 0.055;
  const discSize = size * 0.62;
  const orbit = size / 2 - rayLen / 2; // distance of each ray from center

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: rayCount }, (_, i) => i * (360 / rayCount)).map((deg) => (
        <View
          key={deg}
          style={{
            position: "absolute",
            width: rayW,
            height: rayLen,
            borderRadius: rayW,
            backgroundColor: palette.accent,
            transform: [{ rotate: `${deg}deg` }, { translateY: -orbit }],
          }}
        />
      ))}
      <LinearGradient
        colors={["#F25F2D", palette.primary, "#C94214"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          width: discSize,
          height: discSize,
          borderRadius: discSize / 2,
          alignItems: "center",
          justifyContent: "center",
          // Painted-metal rim.
          borderWidth: size * 0.02,
          borderColor: "rgba(0,0,0,0.18)",
        }}
      >
        <Ionicons name="bus" size={discSize * 0.5} color="#FFF6EF" />
      </LinearGradient>
    </View>
  );
}

/**
 * Pinstripe — the two-tone rule painted along a jeepney's flank (vermillion into
 * marigold). The brand's signature accent; use it under a wordmark or heading.
 */
export function Pinstripe({ width = 56, style }: { width?: number; style?: ViewStyle }) {
  const { palette } = useTheme();
  return (
    <LinearGradient
      colors={[palette.primary, palette.primary, palette.accent, palette.accent]}
      locations={[0, 0.58, 0.58, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[{ width, height: 4, borderRadius: radius.pill }, style]}
    />
  );
}
