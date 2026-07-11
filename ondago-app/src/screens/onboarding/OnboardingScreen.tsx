import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, IconName } from "../../components/UI";
import { useTheme } from "../../store/ThemeContext";
import { Palette, radius, spacing, type } from "../../theme";
import { haptics } from "../../services/haptics";

type BadgeTone = "primary" | "success" | "accent" | "danger";
interface Badge {
  icon: IconName;
  tone: BadgeTone;
  style: object;
}
interface Slide {
  key: string;
  icon: IconName;
  badges: Badge[];
  title: string;
  desc: string;
}

/**
 * First-launch intro. Illustrations are composed from our own Ionicons + soft
 * theme-colored shapes (not the reference assets). Everything is driven off the
 * palette, so it inherits the orange brand + dark mode automatically.
 */
const SLIDES: Slide[] = [
  {
    key: "welcome",
    icon: "bus",
    badges: [
      { icon: "sparkles", tone: "accent", style: { top: 6, right: 18 } },
      { icon: "location", tone: "primary", style: { bottom: 14, left: 6 } },
    ],
    title: "Welcome to ParaPo",
    desc: "Your real-time companion for PUVs on the Montalban–Cubao route.",
  },
  {
    key: "track",
    icon: "map",
    badges: [
      { icon: "navigate", tone: "primary", style: { top: 10, left: 8 } },
      { icon: "radio", tone: "success", style: { bottom: 10, right: 12 } },
    ],
    title: "Track rides live",
    desc: "Watch jeepneys and buses move on the map in real time as they travel.",
  },
  {
    key: "seats",
    icon: "people",
    badges: [
      { icon: "checkmark-circle", tone: "success", style: { top: 8, right: 10 } },
      { icon: "alert-circle", tone: "danger", style: { bottom: 12, left: 10 } },
    ],
    title: "Know before you board",
    desc: "Color-coded markers show each PUV's seats — green means space, red means full.",
  },
  {
    key: "fares",
    icon: "cash",
    badges: [
      { icon: "pricetag", tone: "accent", style: { top: 12, left: 12 } },
      { icon: "receipt", tone: "primary", style: { bottom: 8, right: 8 } },
    ],
    title: "Fares up front",
    desc: "Browse the official fare matrix so the price is never a surprise.",
  },
];

function toneColor(tone: BadgeTone, palette: Palette): string {
  return {
    primary: palette.primary,
    success: palette.success,
    accent: palette.accent,
    danger: palette.danger,
  }[tone];
}

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    haptics.selection();
    if (isLast) {
      onDone();
      return;
    }
    listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
  };

  const skip = () => {
    haptics.light();
    onDone();
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {/* Skip (hidden on the last slide) */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        {!isLast ? (
          <Pressable onPress={skip} hitSlop={10} style={[styles.skip, { backgroundColor: palette.surfaceAlt }]}>
            <Text style={[type.label, { color: palette.textMuted }]}>Skip</Text>
          </Pressable>
        ) : (
          <View style={{ height: 34 }} />
        )}
      </View>

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: (e: any) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / width);
              setIndex((cur) => (cur !== next ? next : cur));
            },
          }
        )}
        renderItem={({ item, index: i }) => (
          <SlideView item={item} i={i} width={width} scrollX={scrollX} palette={palette} />
        )}
      />

      {/* Footer: page dots + primary action */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const scale = scrollX.interpolate({ inputRange, outputRange: [1, 1.5, 1], extrapolate: "clamp" });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: "clamp" });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { backgroundColor: palette.primary, opacity, transform: [{ scale }] }]}
              />
            );
          })}
        </View>
        <Button
          title={isLast ? "Get Started" : "Next"}
          icon={isLast ? "arrow-forward" : undefined}
          onPress={goNext}
        />
      </View>
    </View>
  );
}

function SlideView({
  item,
  i,
  width,
  scrollX,
  palette,
}: {
  item: Slide;
  i: number;
  width: number;
  scrollX: Animated.Value;
  palette: Palette;
}) {
  const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
  const heroScale = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: "clamp" });
  const heroOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" });
  const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" });
  const textShift = scrollX.interpolate({ inputRange, outputRange: [30, 0, 30], extrapolate: "clamp" });

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={{ opacity: heroOpacity, transform: [{ scale: heroScale }] }}>
        <View style={styles.hero}>
          <View style={[styles.heroCircle, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name={item.icon} size={96} color={palette.primary} />
          </View>
          {item.badges.map((b, bi) => (
            <View
              key={bi}
              style={[
                styles.badge,
                b.style,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Ionicons name={b.icon} size={20} color={toneColor(b.tone, palette)} />
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textShift }], alignItems: "center" }}>
        <Text style={[type.display, styles.title, { color: palette.text }]}>{item.title}</Text>
        <Text style={[type.body, styles.desc, { color: palette.textMuted }]}>{item.desc}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.md, alignItems: "flex-end" },
  skip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  hero: { width: 236, height: 236, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  heroCircle: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  title: { textAlign: "center" },
  desc: { textAlign: "center", marginTop: spacing.sm, lineHeight: 22, paddingHorizontal: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, gap: spacing.md },
  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 20, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
