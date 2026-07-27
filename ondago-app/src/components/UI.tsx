import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, motion, Palette, radius, spacing, type } from "../theme";
import { useTheme } from "../store/ThemeContext";
import { haptics } from "../services/haptics";

export type IconName = keyof typeof Ionicons.glyphMap;

/* ---------------------------------- layout --------------------------------- */

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const { palette } = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          shadowOpacity: 1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ---------------------------------- text ----------------------------------- */

export function Title({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  return <Text style={[type.display, { color: palette.text, marginBottom: spacing.xs }]}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  return <Text style={[type.body, { color: palette.textMuted, marginBottom: spacing.lg }]}>{children}</Text>;
}

export function SectionHeader({ title, icon }: { title: string; icon?: IconName }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: spacing.sm }}>
      {icon && <Ionicons name={icon} size={15} color={palette.textMuted} />}
      <Text style={[type.label, { color: palette.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }]}>
        {title}
      </Text>
    </View>
  );
}

/* ---------------------------------- inputs --------------------------------- */

interface FieldProps extends TextInputProps {
  label: string;
  icon?: IconName;
  /** Inline validation message; turns the field red and shows below it. */
  error?: string;
}

export function Field({ label, icon, error, style, secureTextEntry, ...props }: FieldProps) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const borderColor = error ? palette.danger : focused ? palette.primary : "transparent";
  const accent = error ? palette.danger : focused ? palette.primary : palette.textMuted;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[type.label, { color: error ? palette.danger : palette.textMuted, marginBottom: 6 }]}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: palette.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor,
          paddingHorizontal: spacing.md,
        }}
      >
        {icon && <Ionicons name={icon} size={18} color={accent} style={{ marginRight: spacing.sm }} />}
        <TextInput
          style={[{ flex: 1, paddingVertical: 14, fontSize: 15, fontFamily: fonts.medium, color: palette.text }, style]}
          placeholderTextColor={palette.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          {...props}
        />
        {secureTextEntry && (
          <Pressable onPress={() => { haptics.selection(); setHidden((h) => !h); }} hitSlop={8}>
            <Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={18} color={palette.textMuted} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
          <Ionicons name="alert-circle" size={13} color={palette.danger} />
          <Text style={[type.caption, { color: palette.danger }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

/* ---------------------------------- buttons -------------------------------- */

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger" | "ghost";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  /** Fire a light haptic on press. Default true. */
  haptic?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  compact,
  haptic = true,
}: ButtonProps) {
  const { palette } = useTheme();
  const styles = useMemo(() => buttonStyles(palette), [palette]);
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, ...motion.spring.snappy }).start();

  const container =
    variant === "primary"
      ? styles.primary
      : variant === "danger"
      ? styles.danger
      : variant === "outline"
      ? styles.outline
      : styles.ghost;
  const textColor =
    variant === "primary"
      ? palette.onPrimary
      : variant === "danger"
      ? "#FFFFFF"
      : variant === "outline"
      ? palette.primary
      : palette.textMuted;

  return (
    <Animated.View style={{ transform: [{ scale }], marginTop: compact ? 0 : spacing.sm }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (haptic && !disabled && !loading) haptics.light();
          spring(0.97);
        }}
        onPressOut={() => spring(1)}
        disabled={disabled || loading}
        style={[
          styles.base,
          compact && styles.compact,
          container,
          { opacity: disabled || loading ? 0.55 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {icon && <Ionicons name={icon} size={17} color={textColor} />}
            <Text style={{ color: textColor, fontFamily: fonts.extrabold, letterSpacing: 0.2, fontSize: compact ? 14 : 16 }}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const buttonStyles = (p: Palette) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    compact: { paddingVertical: 10 },
    primary: { backgroundColor: p.primary },
    danger: { backgroundColor: p.danger },
    outline: { borderWidth: 1.5, borderColor: p.primary, backgroundColor: "transparent" },
    ghost: { backgroundColor: p.surfaceAlt },
  });

/* --------------------------------- badges ---------------------------------- */

export function Badge({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "primary" | "success" | "danger" | "warning" | "accent";
  icon?: IconName;
}) {
  const { palette } = useTheme();
  const map = {
    neutral: { bg: palette.surfaceAlt, fg: palette.textMuted },
    primary: { bg: palette.primarySoft, fg: palette.primary },
    success: { bg: palette.successSoft, fg: palette.success },
    danger: { bg: palette.dangerSoft, fg: palette.danger },
    warning: { bg: palette.warningSoft, fg: palette.warning },
    accent: { bg: palette.accentSoft, fg: palette.accent },
  }[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: map.bg,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
      }}
    >
      {icon && <Ionicons name={icon} size={12} color={map.fg} />}
      <Text style={{ color: map.fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

/* -------------------------------- stat card -------------------------------- */

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: IconName;
  tone?: "primary" | "success" | "danger" | "warning" | "accent";
}) {
  const { palette } = useTheme();
  const fg = {
    primary: palette.primary,
    success: palette.success,
    danger: palette.danger,
    warning: palette.warning,
    accent: palette.accent,
  }[tone];
  const bg = {
    primary: palette.primarySoft,
    success: palette.successSoft,
    danger: palette.dangerSoft,
    warning: palette.warningSoft,
    accent: palette.accentSoft,
  }[tone];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm,
        }}
      >
        <Ionicons name={icon} size={17} color={fg} />
      </View>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: "800" }}>{value}</Text>
      <Text style={[type.caption, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

/* -------------------------------- list row --------------------------------- */

export function ListRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const { palette } = useTheme();
  const fg = destructive ? palette.danger : palette.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        gap: spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: radius.sm,
          backgroundColor: destructive ? palette.dangerSoft : palette.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={16} color={destructive ? palette.danger : palette.textMuted} />
      </View>
      <Text style={[type.body, { color: fg, fontWeight: "600", flex: 1 }]}>{label}</Text>
      {value && (
        <Text style={[type.body, { color: palette.textMuted, flexShrink: 1, textAlign: "right" }]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {onPress && <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />}
    </Pressable>
  );
}

/* -------------------------------- empty state ------------------------------ */

export function EmptyState({
  message,
  icon = "file-tray-outline",
  title,
  actionLabel,
  onAction,
}: {
  message: string;
  icon?: IconName;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: "center", gap: spacing.sm }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: palette.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.xs,
        }}
      >
        <Ionicons name={icon} size={30} color={palette.textMuted} />
      </View>
      {!!title && <Text style={[type.heading, { color: palette.text, textAlign: "center" }]}>{title}</Text>}
      <Text style={[type.body, { color: palette.textMuted, textAlign: "center" }]}>{message}</Text>
      {!!actionLabel && !!onAction && (
        <View style={{ marginTop: spacing.sm, minWidth: 180 }}>
          <Button title={actionLabel} onPress={onAction} compact />
        </View>
      )}
    </View>
  );
}
