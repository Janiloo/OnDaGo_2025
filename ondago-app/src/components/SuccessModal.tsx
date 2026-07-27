import React, { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./UI";
import { useTheme } from "../store/ThemeContext";
import { radius, spacing, type } from "../theme";

/**
 * Centered confirmation modal with an animated check: a success ring springs in,
 * then the checkmark pops, then a soft halo pulses out. Used for one-shot
 * "it worked" moments (e.g. a support message was sent).
 */
export function SuccessModal({
  visible,
  title,
  message,
  actionLabel = "Done",
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  actionLabel?: string;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const ring = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      ring.setValue(0);
      check.setValue(0);
      halo.setValue(0);
      Animated.sequence([
        Animated.spring(ring, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }),
        Animated.parallel([
          Animated.spring(check, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
          Animated.timing(halo, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.badgeWrap}>
            {/* Expanding halo */}
            <Animated.View
              style={[
                styles.halo,
                {
                  backgroundColor: palette.success,
                  opacity: halo.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.35, 0.12, 0] }),
                  transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }) }],
                },
              ]}
            />
            {/* Success disc — solid green with a bold white check for contrast */}
            <Animated.View
              style={[
                styles.ring,
                {
                  backgroundColor: palette.success,
                  borderColor: palette.success,
                  transform: [{ scale: ring }],
                },
              ]}
            >
              <Animated.View style={{ transform: [{ scale: check }], opacity: check }}>
                <Ionicons name="checkmark-sharp" size={48} color="#FFFFFF" />
              </Animated.View>
            </Animated.View>
          </View>

          <Text style={[type.title, { color: palette.text, textAlign: "center", marginTop: spacing.lg }]}>{title}</Text>
          <Text style={[type.body, { color: palette.textMuted, textAlign: "center", marginTop: spacing.xs, lineHeight: 21 }]}>
            {message}
          </Text>

          <View style={{ marginTop: spacing.lg, alignSelf: "stretch" }}>
            <Button title={actionLabel} icon="checkmark" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(6,8,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    alignItems: "center",
  },
  badgeWrap: { width: 108, height: 108, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 108, height: 108, borderRadius: 54 },
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
