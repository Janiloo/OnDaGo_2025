import React, { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SunMark, Pinstripe } from "./Brand";
import { useTheme } from "../store/ThemeContext";
import { fonts, radius, spacing, type } from "../theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/**
 * Branded auth backdrop: dusk gradient + a scattered field of transit "stops"
 * and faint routes + a warm glow. Shared by the Welcome landing and the
 * bottom-sheet auth screens so they read as one flow.
 */
const DOTS = (() => {
  let s = 20240727;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length: 46 }, () => ({
    x: rand() * SCREEN_W,
    y: rand() * SCREEN_H * 0.7,
    r: 1.5 + rand() * 3.5,
    o: 0.06 + rand() * 0.22,
  }));
})();

export function AuthBackdrop() {
  const { palette } = useTheme();
  return (
    <>
      <LinearGradient colors={palette.heroGradient} style={StyleSheet.absoluteFill} />
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
        <View style={[styles.route, { top: SCREEN_H * 0.18, transform: [{ rotate: "-24deg" }], backgroundColor: palette.accent }]} />
        <View style={[styles.route, { top: SCREEN_H * 0.46, transform: [{ rotate: "16deg" }], backgroundColor: palette.primary }]} />
      </View>
    </>
  );
}

/**
 * Bottom-sheet auth shell: branded backdrop with the brand lockup floating above
 * a rounded sheet that holds the form (`children`).
 *
 * Keyboard handling is manual (KeyboardAvoidingView proved unreliable for a
 * bottom-anchored sheet in Expo Go): we track the keyboard height, collapse the
 * brand lockup while typing, and pin the sheet just above the keyboard with a
 * spacer — deterministic on both platforms.
 */
export function AuthScaffold({
  children,
  onBack,
  tagline = false,
  brandSize = 72,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  tagline?: boolean;
  brandSize?: number;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [kb, setKb] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => setKb(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const kbOpen = kb > 0;
  const sheetMaxHeight = kbOpen ? SCREEN_H - kb - insets.top - spacing.xl : SCREEN_H * 0.66;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <AuthBackdrop />

      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={{
            position: "absolute",
            top: insets.top + spacing.sm,
            left: spacing.lg,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.08)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
      )}

      {/* Brand lockup fills the space above the sheet, and collapses while the
          keyboard is open so the sheet can rise. */}
      {kbOpen ? (
        <View style={{ flex: 1 }} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: insets.top }}>
          <SunMark size={brandSize} />
          <Text style={[type.display, { color: palette.text, fontSize: brandSize * 0.42, marginTop: spacing.md }]}>Sabako</Text>
          <Pinstripe width={56} style={{ marginTop: spacing.sm }} />
          {tagline && (
            <Text style={[type.body, { color: palette.textMuted, marginTop: spacing.md }]}>
              Real-time PUV tracking, <Text style={{ fontFamily: fonts.bold, color: palette.accent }}>para sa bayan</Text>
            </Text>
          )}
        </View>
      )}

      {/* Bottom sheet */}
      <View
        style={[
          styles.sheet,
          { backgroundColor: palette.surface, borderColor: palette.border, paddingBottom: kbOpen ? spacing.md : insets.bottom + spacing.lg },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: palette.border }]} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: sheetMaxHeight }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.md }}
        >
          {children}
        </ScrollView>
      </View>

      {/* Reserve the keyboard's space so the sheet is pinned above it. */}
      {kbOpen && <View style={{ height: kb }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  route: { position: "absolute", left: -40, width: SCREEN_W + 80, height: 1.5, opacity: 0.12 },
  sheet: {
    borderTopLeftRadius: radius.xl + 6,
    borderTopRightRadius: radius.xl + 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.md },
});
