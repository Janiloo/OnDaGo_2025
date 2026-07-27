import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../components/UI";
import { SunMark, Pinstripe } from "../../components/Brand";
import { useTheme } from "../../store/ThemeContext";
import { fonts, radius, spacing, type } from "../../theme";
import { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/**
 * A scattered field of faint "stops" — evokes a transit map at dusk (city
 * lights / terminals) as the branded backdrop, in place of a stock photo.
 * Generated once from a fixed seed so it never reshuffles between renders.
 */
const DOTS = (() => {
  let s = 20240727; // deterministic seed
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length: 46 }, () => ({
    x: rand() * SCREEN_W,
    y: rand() * SCREEN_H * 0.72,
    r: 1.5 + rand() * 3.5,
    o: 0.06 + rand() * 0.22,
  }));
})();

export default function WelcomeScreen({ navigation }: Props) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {/* Dusk sky */}
      <LinearGradient colors={palette.heroGradient} style={StyleSheet.absoluteFill} />

      {/* Transit-stop field + a couple of faint "routes" */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {DOTS.map((d, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: d.r,
              height: d.r,
              borderRadius: d.r,
              backgroundColor: i % 5 === 0 ? palette.primary : palette.accent,
              opacity: d.o,
            }}
          />
        ))}
        <View style={[styles.route, { top: SCREEN_H * 0.2, transform: [{ rotate: "-24deg" }], backgroundColor: palette.accent }]} />
        <View style={[styles.route, { top: SCREEN_H * 0.5, transform: [{ rotate: "18deg" }], backgroundColor: palette.primary }]} />
      </View>

      {/* Warm glow behind the mark */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          alignSelf: "center",
          top: SCREEN_H * 0.16,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: palette.primary,
          opacity: 0.14,
        }}
      />

      {/* Brand lockup */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: SCREEN_H * 0.18 }}>
        <SunMark size={116} />
        <Text style={[type.display, { color: palette.text, fontSize: 46, marginTop: spacing.lg }]}>Sabako</Text>
        <Pinstripe width={72} style={{ marginTop: spacing.sm }} />
        <Text style={[type.body, { color: palette.textMuted, marginTop: spacing.md }]}>
          Real-time PUV tracking, <Text style={{ fontFamily: fonts.bold, color: palette.accent }}>para sa bayan</Text>
        </Text>
      </View>

      {/* Bottom sheet */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            paddingBottom: insets.bottom + spacing.lg,
            shadowColor: "#000",
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: palette.border }]} />
        <Text style={[type.label, { color: palette.textMuted, letterSpacing: 1, textAlign: "center" }]}>WELCOME, KABAYAN</Text>
        <Text style={[type.title, { color: palette.text, textAlign: "center", marginTop: 4, marginBottom: spacing.md }]}>
          Let's get you moving
        </Text>
        <Button title="LOG IN" icon="log-in-outline" onPress={() => navigation.navigate("Login")} />
        <Button title="SIGN UP" icon="person-add-outline" variant="outline" onPress={() => navigation.navigate("Register")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  route: {
    position: "absolute",
    left: -40,
    width: SCREEN_W + 80,
    height: 1.5,
    opacity: 0.12,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl + 6,
    borderTopRightRadius: radius.xl + 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
});
