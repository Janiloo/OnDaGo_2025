import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVehicles } from "../../hooks/useVehicles";
import { VehicleMarker } from "../../components/VehicleMarker";
import { VehicleDetailSheet } from "../../components/VehicleDetailSheet";
import { OccupancyLegend } from "../../components/OccupancyLegend";
import { DEFAULT_MAP_REGION, ROUTE_STOPS } from "../../config";
import { hasRealPosition, isVehicleStale } from "../../utils/vehicles";
import { darkMapStyle, radius, spacing, type } from "../../theme";
import { useTheme } from "../../store/ThemeContext";

/**
 * Admin live-fleet map: every PUV that has broadcast a position, live ones
 * highlighted and stale/offline ones greyed. Positions arrive as SignalR
 * pushes (useVehicles), with polling only as a fallback.
 */
export default function AdminMapScreen() {
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { vehicles: allVehicles, offline, now } = useVehicles();
  const [selectedPuv, setSelectedPuv] = useState<string | null>(null);

  const vehicles = allVehicles.filter(hasRealPosition);
  const live = vehicles.filter((v) => !isVehicleStale(v, now));
  // Looked up from the live list so pushes keep the open sheet current.
  const selectedVehicle = selectedPuv ? vehicles.find((v) => v.puvNo === selectedPuv) ?? null : null;
  const stale = vehicles.length - live.length;

  const fitAll = () => {
    if (vehicles.length === 0) return;
    mapRef.current?.fitToCoordinates(
      vehicles.map((v) => ({ latitude: v.currentLat, longitude: v.currentLong })),
      { edgePadding: { top: 120, bottom: 160, left: 60, right: 60 }, animated: true }
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_MAP_REGION}
        customMapStyle={isDark ? darkMapStyle : []}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setSelectedPuv(null)}
      >
        {ROUTE_STOPS.map((stop) => (
          <Marker
            key={stop.name}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={stop.name}
            description="Route stop"
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={[styles.stopDot, { backgroundColor: palette.surface, borderColor: palette.accent }]} />
          </Marker>
        ))}
        {vehicles.map((vehicle) => {
          const vStale = isVehicleStale(vehicle, now);
          return (
            <VehicleMarker
              // Remount on label/state change so the marker bitmap is
              // re-sized correctly (RN-maps Android clips resized markers).
              key={`${vehicle.puvNo}-${vehicle.passengerCount}-${vStale ? 1 : 0}`}
              vehicle={vehicle}
              stale={vStale}
              onPress={() => setSelectedPuv(vehicle.puvNo)}
            />
          );
        })}
      </MapView>

      {/* Fleet summary */}
      <View style={[styles.summary, { top: insets.top + spacing.sm, backgroundColor: palette.overlay }]}>
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: "#34D399" }]} />
          <Text style={styles.summaryText}>{live.length} live</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <View style={[styles.dot, { backgroundColor: "#94A3B8" }]} />
          <Text style={styles.summaryText}>{stale} offline</Text>
        </View>
        {offline && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.summaryText, { color: "#F87171" }]}>reconnecting…</Text>
          </>
        )}
      </View>

      <Pressable
        onPress={fitAll}
        style={[styles.fab, { top: insets.top + spacing.sm, backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Ionicons name="scan-outline" size={20} color={palette.primary} />
      </Pressable>

      <OccupancyLegend top={insets.top + 52} />

      {vehicles.length === 0 && (
        <View style={[styles.emptyPill, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="bus-outline" size={16} color={palette.textMuted} />
          <Text style={[type.caption, { color: palette.textMuted }]}>No PUVs have reported a position yet</Text>
        </View>
      )}

      {selectedVehicle && (
        <VehicleDetailSheet vehicle={selectedVehicle} now={now} onClose={() => setSelectedPuv(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stopDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  summary: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  divider: { width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.3)" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  fab: {
    position: "absolute",
    right: spacing.md,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
  emptyPill: {
    position: "absolute",
    bottom: spacing.lg,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
