import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BRAND_BG, motion, radius } from "../theme";
import { palettes } from "../theme";

/**
 * Branded splash overlay shown over the app while the session is restored.
 * Its background matches app.json's native splash color, so the handoff
 * native-splash → this → app is seamless (no white flash). Fades itself out
 * once `ready` and a minimum on-screen time have both elapsed.
 */
const MIN_VISIBLE_MS = 1100;

export function BrandedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const mountedAt = useRef(Date.now());
  const finished = useRef(false);

  // Entrance.
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, ...motion.spring.gentle }),
        Animated.timing(logoOpacity, { toValue: 1, duration: motion.duration.base, useNativeDriver: true }),
      ]),
      Animated.timing(wordmarkOpacity, { toValue: 1, duration: motion.duration.base, useNativeDriver: true }),
    ]).start();

    // Gentle looping glow behind the mark.
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [logoOpacity, logoScale, pulse, wordmarkOpacity]);

  // Exit once ready + minimum visible time.
  useEffect(() => {
    if (!ready || finished.current) return;
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const t = setTimeout(() => {
      finished.current = true;
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: motion.duration.slow,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(onDone);
    }, wait);
    return () => clearTimeout(t);
  }, [ready, onDone, screenOpacity]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.08] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: screenOpacity }]}>
      <View style={styles.center}>
        <Animated.View
          style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
        />
        <Animated.View
          style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        >
          <Ionicons name="bus" size={44} color="#FFFFFF" />
        </Animated.View>
        <Animated.View style={{ opacity: wordmarkOpacity, alignItems: "center" }}>
          <Text style={styles.wordmark}>ParaPo</Text>
          <Text style={styles.tagline}>Track your ride, in real time</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: BRAND_BG, alignItems: "center", justifyContent: "center", zIndex: 1000 },
  center: { alignItems: "center", justifyContent: "center", gap: 20 },
  glow: {
    position: "absolute",
    top: -6,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palettes.dark.primary,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: palettes.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", letterSpacing: 0.5 },
  tagline: { color: "#93A1B8", fontSize: 13, fontWeight: "500", marginTop: 4 },
});
