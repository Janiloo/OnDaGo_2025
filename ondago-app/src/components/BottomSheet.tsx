import React, { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing } from "../theme";
import { useTheme } from "../store/ThemeContext";

/**
 * Lightweight two-snap bottom sheet built on core RN Animated + PanResponder
 * (no extra native gesture deps). The drag handle is the only draggable region,
 * so buttons and scrolling inside `children` keep working normally.
 *
 * Snaps between a collapsed "peek" (shows `peekHeight` of content) and fully
 * expanded (`height`). Tap the handle to toggle; drag it to snap by position.
 * With `onDismiss`, the sheet slides in on mount and can be swiped away
 * (drag well past the peek, or fling down while peeking).
 */
export function BottomSheet({
  children,
  height = 340,
  peekHeight = 132,
  initiallyExpanded = true,
  animateOnMount = false,
  onDismiss,
}: {
  children: React.ReactNode;
  height?: number;
  peekHeight?: number;
  initiallyExpanded?: boolean;
  animateOnMount?: boolean;
  onDismiss?: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const collapsedOffset = height - peekHeight; // translateY when collapsed
  const restingOffset = initiallyExpanded ? 0 : collapsedOffset;
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const translateY = useRef(
    new Animated.Value(animateOnMount ? height : restingOffset)
  ).current;
  const dragStart = useRef(0);
  const firstRender = useRef(true);

  // Live refs so the (created-once) PanResponder never closes over stale values.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const collapsedOffsetRef = useRef(collapsedOffset);
  collapsedOffsetRef.current = collapsedOffset;

  const snapTo = (toExpanded: boolean) => {
    setExpanded(toExpanded);
    Animated.spring(translateY, {
      toValue: toExpanded ? 0 : collapsedOffsetRef.current,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  };
  const snapToRef = useRef(snapTo);
  snapToRef.current = snapTo;

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: height + insets.bottom + 20,
      duration: 180,
      useNativeDriver: true,
    }).start(() => dismissRef.current?.());
  };
  const dismissAnimRef = useRef(dismiss);
  dismissAnimRef.current = dismiss;

  // Slide in on mount when requested.
  useEffect(() => {
    if (animateOnMount) {
      Animated.spring(translateY, {
        toValue: restingOffset,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the resting position correct if the sheet height changes later
  // (skip the first render so it doesn't cancel the mount animation).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    translateY.setValue(expanded ? 0 : collapsedOffset);
  }, [collapsedOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          dragStart.current = value;
        });
      },
      onPanResponderMove: (_evt, g) => {
        const max = dismissRef.current
          ? collapsedOffsetRef.current + 120
          : collapsedOffsetRef.current;
        const next = Math.min(max, Math.max(0, dragStart.current + g.dy));
        translateY.setValue(next);
      },
      onPanResponderRelease: (_evt, g) => {
        const collapsed = collapsedOffsetRef.current;
        const settled = dragStart.current + g.dy;
        const startedNearPeek = dragStart.current > collapsed - 10;

        if (dismissRef.current && (settled > collapsed + 48 || (g.vy > 0.5 && startedNearPeek))) {
          dismissAnimRef.current();
          return;
        }
        // Snap by velocity first, else by nearest position.
        if (g.vy > 0.5) snapToRef.current(false);
        else if (g.vy < -0.5) snapToRef.current(true);
        else snapToRef.current(settled < collapsed / 2);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: height + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: palette.surface,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          transform: [{ translateY }],
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handleZone}>
        <Pressable onPress={() => snapTo(!expanded)} hitSlop={12} style={styles.handleHit}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
        </Pressable>
      </View>
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  handleZone: { alignItems: "center", paddingTop: spacing.sm },
  handleHit: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xl },
  handle: { width: 44, height: 5, borderRadius: radius.pill },
  content: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
});
