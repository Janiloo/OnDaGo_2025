import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { DiscoveryCompany, DiscoveryRoute, DiscoveryTerminal } from "../services/discoveryApi";
import { routesBetween } from "../utils/trips";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../store/ThemeContext";

/**
 * Bottom-anchored ride finder. Two ways in:
 *  - Trip planner (Tier 2): pick origin + destination terminals → only routes
 *    that connect them are offered.
 *  - Route list: browse every published route directly.
 * Either way the selection filters the map to that route's PUVs and stops;
 * "All routes" clears the filter. Live PUV counts per route let a rider choose
 * the one that's actually running.
 */
export function RouteFilterModal({
  visible,
  routes,
  terminals,
  companyById,
  selectedRouteId,
  liveCountByRoute,
  onSelect,
  onClose,
}: {
  visible: boolean;
  routes: DiscoveryRoute[];
  terminals: DiscoveryTerminal[];
  /** Operator branding — shows "· OperatorName" on each route row. */
  companyById?: Map<string, DiscoveryCompany>;
  selectedRouteId: string | null;
  liveCountByRoute: Record<string, number>;
  onSelect: (routeId: string | null) => void;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [originId, setOriginId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [picking, setPicking] = useState<"origin" | "destination" | null>(null);

  const terminalById = useMemo(() => new Map(terminals.map((t) => [t.id, t])), [terminals]);
  const tripActive = !!originId && !!destinationId;
  const matches = useMemo(
    () => (tripActive ? routesBetween(routes, originId!, destinationId!) : []),
    [tripActive, routes, originId, destinationId]
  );

  const pickTerminal = (id: string) => {
    if (picking === "origin") {
      setOriginId(id);
      // Auto-advance to the destination if it still needs picking.
      setPicking(destinationId ? null : "destination");
    } else if (picking === "destination") {
      setDestinationId(id);
      setPicking(null);
    }
  };

  const clearTrip = () => {
    setOriginId(null);
    setDestinationId(null);
    setPicking(null);
  };

  const Row = ({
    id,
    title,
    subtitle,
    live,
    note,
  }: {
    id: string | null;
    title: string;
    subtitle: string;
    live?: number;
    note?: string;
  }) => {
    const selected = selectedRouteId === id;
    return (
      <Pressable
        onPress={() => {
          onSelect(id);
          onClose();
        }}
        style={[
          styles.row,
          { borderColor: palette.border },
          selected && { backgroundColor: palette.primarySoft, borderColor: palette.primary },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[type.body, { color: palette.text, fontWeight: "700" }]}>{title}</Text>
          <Text style={[type.caption, { color: palette.textMuted }]}>{subtitle}</Text>
          {note && <Text style={[type.caption, { color: palette.accent }]}>{note}</Text>}
        </View>
        {typeof live === "number" && (
          <View style={[styles.countPill, { backgroundColor: live > 0 ? palette.primarySoft : palette.surfaceAlt }]}>
            <View style={[styles.dot, { backgroundColor: live > 0 ? "#34D399" : palette.textMuted }]} />
            <Text style={[type.caption, { color: live > 0 ? palette.primary : palette.textMuted, fontWeight: "700" }]}>
              {live} live
            </Text>
          </View>
        )}
        {selected && <Ionicons name="checkmark-circle" size={20} color={palette.primary} style={{ marginLeft: spacing.sm }} />}
      </Pressable>
    );
  };

  const TripField = ({
    label,
    terminalId,
    slot,
  }: {
    label: string;
    terminalId: string | null;
    slot: "origin" | "destination";
  }) => {
    const active = picking === slot;
    const terminal = terminalId ? terminalById.get(terminalId) : null;
    return (
      <Pressable
        onPress={() => setPicking(active ? null : slot)}
        style={[
          styles.tripField,
          { borderColor: active ? palette.primary : palette.border, backgroundColor: palette.surfaceAlt },
        ]}
      >
        <Text style={[type.caption, { color: palette.textMuted }]}>{label}</Text>
        <Text
          style={[type.body, { color: terminal ? palette.text : palette.textMuted, fontWeight: terminal ? "700" : "400" }]}
          numberOfLines={1}
        >
          {terminal ? terminal.name : "Choose terminal"}
        </Text>
      </Pressable>
    );
  };

  const routeSubtitle = (r: DiscoveryRoute) => {
    const operator = r.companyId ? companyById?.get(r.companyId)?.name : null;
    return `${r.code ? r.code + " · " : ""}${r.terminalIds.length} stops${operator ? ` · ${operator}` : ""}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[type.heading, { color: palette.text }]}>Find your ride</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={palette.textMuted} />
          </Pressable>
        </View>

        {/* Trip planner — only meaningful once terminals are published. */}
        {terminals.length > 0 && (
          <View style={styles.tripRow}>
            <TripField label="From" terminalId={originId} slot="origin" />
            <Ionicons name="arrow-forward" size={16} color={palette.textMuted} />
            <TripField label="To" terminalId={destinationId} slot="destination" />
            {(originId || destinationId) && (
              <Pressable onPress={clearTrip} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={palette.textMuted} />
              </Pressable>
            )}
          </View>
        )}

        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
          {picking ? (
            <>
              <Text style={[type.caption, { color: palette.textMuted, marginBottom: spacing.sm }]}>
                {picking === "origin" ? "Where are you now?" : "Where are you headed?"}
              </Text>
              {terminals
                .filter((t) => t.id !== (picking === "origin" ? destinationId : originId))
                .map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => pickTerminal(t.id)}
                    style={[styles.row, { borderColor: palette.border }]}
                  >
                    <Ionicons name="location" size={18} color={palette.accent} style={{ marginRight: spacing.sm }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { color: palette.text, fontWeight: "700" }]}>{t.name}</Text>
                      {t.code && <Text style={[type.caption, { color: palette.textMuted }]}>{t.code}</Text>}
                    </View>
                  </Pressable>
                ))}
            </>
          ) : tripActive ? (
            <>
              <Text style={[type.caption, { color: palette.textMuted, marginBottom: spacing.sm }]}>
                {matches.length === 0
                  ? "No route connects these terminals yet."
                  : `${matches.length} route${matches.length === 1 ? "" : "s"} connect${matches.length === 1 ? "s" : ""} your stops`}
              </Text>
              {matches.map(({ route, sameDirection }) => (
                <Row
                  key={route.id}
                  id={route.id}
                  title={route.name}
                  subtitle={routeSubtitle(route)}
                  live={liveCountByRoute[route.id] ?? 0}
                  note={sameDirection ? undefined : "runs this pair in reverse order — same road, both ways"}
                />
              ))}
              <Row id={null} title="All routes" subtitle="Clear the filter and show every PUV" />
            </>
          ) : (
            <>
              <Row id={null} title="All routes" subtitle="Show every PUV on the map" />
              {routes.map((r) => (
                <Row
                  key={r.id}
                  id={r.id}
                  title={r.name}
                  subtitle={routeSubtitle(r)}
                  live={liveCountByRoute[r.id] ?? 0}
                />
              ))}
              {routes.length === 0 && (
                <Text style={[type.caption, { color: palette.textMuted, padding: spacing.md }]}>
                  No routes published yet.
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tripField: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
