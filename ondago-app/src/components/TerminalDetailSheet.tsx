import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { DiscoveryRoute, DiscoveryTerminal } from "../services/discoveryApi";
import { Vehicle } from "../types";
import { estimateStopEtas, formatDistance } from "../utils/eta";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../store/ThemeContext";

const ROW_HEIGHT = 52;
const INBOUND_ROW_HEIGHT = 36;

/**
 * Terminal mode's detail card (Tier 2): tap a terminal → which routes serve it,
 * how many PUVs are live on each, and the nearest inbound PUVs with an ETA to
 * THIS terminal. Tapping a route jumps back to the live map filtered to it.
 */
export function TerminalDetailSheet({
  terminal,
  routes,
  liveCountByRoute,
  liveVehicles,
  speedByPuv,
  onSelectRoute,
  onClose,
}: {
  terminal: DiscoveryTerminal;
  routes: DiscoveryRoute[];
  liveCountByRoute: Record<string, number>;
  /** Live (non-stale, positioned) vehicles — the screen's filtered fleet. */
  liveVehicles: Vehicle[];
  /** Optional per-PUV observed speed (km/h) for better ETAs. */
  speedByPuv?: Record<string, number>;
  onSelectRoute: (routeId: string) => void;
  onClose: () => void;
}) {
  const { palette } = useTheme();

  const servingRoutes = useMemo(
    () => routes.filter((r) => r.terminalIds.includes(terminal.id)),
    [routes, terminal.id]
  );
  const servingRouteIds = useMemo(() => new Set(servingRoutes.map((r) => r.id)), [servingRoutes]);

  // Nearest live PUVs heading anywhere on a serving route, ranked by ETA here.
  const inbound = useMemo(() => {
    const stop = { id: terminal.id, name: terminal.name, latitude: terminal.latitude, longitude: terminal.longitude };
    return liveVehicles
      .filter((v) => v.routeId && servingRouteIds.has(v.routeId))
      .map((v) => ({ vehicle: v, eta: estimateStopEtas(v, [stop], speedByPuv?.[v.puvNo])[0] }))
      .filter((x) => !!x.eta)
      .sort((a, b) => a.eta.etaMinutes - b.eta.etaMinutes)
      .slice(0, 3);
  }, [liveVehicles, servingRouteIds, terminal, speedByPuv]);

  const height = Math.min(
    520,
    150 + // handle + header + section labels
      Math.max(1, servingRoutes.length) * ROW_HEIGHT +
      36 +
      Math.max(1, inbound.length) * INBOUND_ROW_HEIGHT +
      28
  );

  return (
    <BottomSheet height={height} peekHeight={height} animateOnMount onDismiss={onClose}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.icon, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="flag" size={20} color={palette.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.caption, { color: palette.textMuted }]}>Terminal{terminal.code ? ` · ${terminal.code}` : ""}</Text>
          <Text style={[type.title, { color: palette.text }]} numberOfLines={1}>
            {terminal.name}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8} style={[styles.closeButton, { backgroundColor: palette.surfaceAlt }]}>
          <Ionicons name="close" size={18} color={palette.textMuted} />
        </Pressable>
      </View>

      {/* Routes serving this terminal */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs }}>
        <Ionicons name="git-branch" size={14} color={palette.textMuted} />
        <Text style={[type.label, { color: palette.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }]}>
          Routes here
        </Text>
      </View>
      {servingRoutes.length === 0 ? (
        <Text style={[type.caption, { color: palette.textMuted, marginBottom: spacing.sm }]}>
          No published route stops here yet.
        </Text>
      ) : (
        servingRoutes.map((r) => {
          const live = liveCountByRoute[r.id] ?? 0;
          return (
            <Pressable
              key={r.id}
              onPress={() => onSelectRoute(r.id)}
              style={[styles.routeRow, { borderColor: palette.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: palette.text, fontWeight: "700" }]} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={[type.caption, { color: palette.textMuted }]}>
                  {r.code ? `${r.code} · ` : ""}
                  {r.terminalIds.length} stops
                </Text>
              </View>
              <View style={[styles.countPill, { backgroundColor: live > 0 ? palette.primarySoft : palette.surfaceAlt }]}>
                <View style={[styles.dot, { backgroundColor: live > 0 ? "#34D399" : palette.textMuted }]} />
                <Text style={[type.caption, { color: live > 0 ? palette.primary : palette.textMuted, fontWeight: "700" }]}>
                  {live} live
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.textMuted} style={{ marginLeft: 6 }} />
            </Pressable>
          );
        })
      )}

      {/* Nearest inbound PUVs */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm, marginBottom: spacing.xs }}>
        <Ionicons name="time-outline" size={14} color={palette.textMuted} />
        <Text style={[type.label, { color: palette.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }]}>
          Nearest PUVs
        </Text>
      </View>
      {inbound.length === 0 ? (
        <Text style={[type.caption, { color: palette.textMuted }]}>No live PUVs on these routes right now.</Text>
      ) : (
        inbound.map(({ vehicle, eta }, i) => (
          <View key={vehicle.puvNo} style={styles.inboundRow}>
            <View style={[styles.dot, { backgroundColor: i === 0 ? palette.primary : palette.border }]} />
            <Text style={[type.body, { color: palette.text, flex: 1, fontWeight: "700" }]} numberOfLines={1}>
              {vehicle.puvNo}
            </Text>
            <Text style={[type.caption, { color: palette.textMuted, marginRight: spacing.sm }]}>
              {formatDistance(eta.distanceM)}
            </Text>
            <Text style={{ color: palette.primary, fontWeight: "800", fontSize: 14 }}>~{eta.etaMinutes} min</Text>
          </View>
        ))
      )}
      <Text style={[type.caption, { color: palette.textMuted, marginTop: 4 }]}>
        Straight-line estimate · varies with traffic
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  closeButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: ROW_HEIGHT - 8,
    marginBottom: spacing.xs,
  },
  inboundRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: INBOUND_ROW_HEIGHT },
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
