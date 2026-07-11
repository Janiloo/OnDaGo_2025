import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { IconName } from "./UI";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../store/ThemeContext";

export interface PickerOption {
  key: string;
  label: string;
  sublabel?: string;
}

/**
 * A tap-to-open select backed by a bottom sheet. Used where a form must draw
 * from existing system data (bus companies, plate numbers) rather than free
 * text. Mirrors the Field look so it sits naturally in a form.
 */
export function PickerField({
  label,
  icon,
  placeholder,
  value,
  options,
  onSelect,
  error,
  disabled,
  emptyText = "Nothing to choose from.",
}: {
  label: string;
  icon?: IconName;
  placeholder: string;
  /** Currently selected option key, or null. */
  value: string | null;
  options: PickerOption[];
  onSelect: (key: string) => void;
  error?: string;
  disabled?: boolean;
  emptyText?: string;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value) ?? null;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[type.label, { color: error ? palette.danger : palette.textMuted, marginBottom: 6 }]}>{label}</Text>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: palette.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error ? palette.danger : "transparent",
          paddingHorizontal: spacing.md,
          paddingVertical: 13,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon && <Ionicons name={icon} size={18} color={palette.textMuted} style={{ marginRight: spacing.sm }} />}
        <Text style={{ flex: 1, fontSize: 15, color: selected ? palette.text : palette.textMuted }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={palette.textMuted} />
      </Pressable>
      {!!error && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
          <Ionicons name="alert-circle" size={13} color={palette.danger} />
          <Text style={[type.caption, { color: palette.danger }]}>{error}</Text>
        </View>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: palette.surface, borderColor: palette.border, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <View style={styles.header}>
            <Text style={[type.heading, { color: palette.text }]}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {options.length === 0 ? (
              <Text style={[type.caption, { color: palette.textMuted, padding: spacing.md }]}>{emptyText}</Text>
            ) : (
              options.map((o) => {
                const active = o.key === value;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => {
                      onSelect(o.key);
                      setOpen(false);
                    }}
                    style={[
                      styles.row,
                      { borderColor: palette.border },
                      active && { backgroundColor: palette.primarySoft, borderColor: palette.primary },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { color: palette.text, fontWeight: "700" }]}>{o.label}</Text>
                      {o.sublabel && <Text style={[type.caption, { color: palette.textMuted }]}>{o.sublabel}</Text>}
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={palette.primary} />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
});
