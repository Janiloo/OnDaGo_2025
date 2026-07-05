import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { elevation, motion, radius, spacing, type } from "../theme";
import { useTheme } from "../store/ThemeContext";
import { haptics } from "../services/haptics";
import { IconName } from "./UI";

type ToastType = "success" | "error" | "info";

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastApi {
  show: (options: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

interface ActiveToast extends Required<Omit<ToastOptions, "duration">> {
  id: number;
  duration: number;
}

/**
 * Non-blocking snackbar system — the modern replacement for Alert.alert on
 * success/informational feedback (confirmations that need a decision stay as
 * dialogs). Slides up from the bottom, auto-dismisses, tap or swipe to close.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 120, duration: motion.duration.base, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: motion.duration.base, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (options: ToastOptions) => {
      const next: ActiveToast = {
        id: ++counter.current,
        message: options.message,
        type: options.type ?? "info",
        duration: options.duration ?? 2800,
      };
      if (next.type === "success") haptics.success();
      else if (next.type === "error") haptics.error();

      setToast(next);
      translateY.setValue(120);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...motion.spring.snappy }),
        Animated.timing(opacity, { toValue: 1, duration: motion.duration.fast, useNativeDriver: true }),
      ]).start();

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(hide, next.duration);
    },
    [hide, opacity, translateY]
  );

  const api = useRef<ToastApi>({
    show,
    success: (message: string) => show({ message, type: "success" }),
    error: (message: string) => show({ message, type: "error" }),
    info: (message: string) => show({ message, type: "info" }),
  });
  // Keep closures fresh (show is stable via useCallback, but be safe).
  api.current.show = show;
  api.current.success = (m) => show({ message: m, type: "success" });
  api.current.error = (m) => show({ message: m, type: "error" });
  api.current.info = (m) => show({ message: m, type: "info" });

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      {toast && <ToastView toast={toast} translateY={translateY} opacity={opacity} onDismiss={hide} />}
    </ToastContext.Provider>
  );
}

function ToastView({
  toast,
  translateY,
  opacity,
  onDismiss,
}: {
  toast: ActiveToast;
  translateY: Animated.Value;
  opacity: Animated.Value;
  onDismiss: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const config: Record<ToastType, { icon: IconName; color: string }> = {
    success: { icon: "checkmark-circle", color: palette.success },
    error: { icon: "alert-circle", color: palette.danger },
    info: { icon: "information-circle", color: palette.primary },
  };
  const { icon, color } = config[toast.type];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 78, opacity, transform: [{ translateY }] }]}
    >
      <Pressable
        onPress={onDismiss}
        style={[
          styles.toast,
          { backgroundColor: palette.surface, borderColor: palette.border },
          elevation(3, palette.shadow),
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: color + "22" }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[type.body, { color: palette.text, flex: 1, fontWeight: "600" }]} numberOfLines={2}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.md, right: spacing.md },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
