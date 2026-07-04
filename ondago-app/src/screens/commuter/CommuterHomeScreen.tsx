import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { getVehicles } from "../../services/vehicleApi";
import { Vehicle } from "../../types";
import { DEFAULT_MAP_REGION, ROUTE_STOPS, VEHICLE_REFRESH_MS } from "../../config";
import { darkMapStyle, radius, spacing, type } from "../../theme";
import { useTheme } from "../../store/ThemeContext";

/**
 * Commuter home: map-first, low-cognitive-load view of live PUVs on the
 * Montalban–Cubao route. Fixed stop pins + vehicle markers refreshed on a
 * timer from GET /api/Vehicle.
 */
export default function CommuterHomeScreen() {
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [offline, setOffline] = useState(false);
  const [showStops, setShowStops] = useState(true);
  const mounted = useRef(true);

  const refreshVehicles = useCallback(async () => {
    try {
      const list = await getVehicles();
      if (mounted.current) {
        // Ignore vehicles that haven't broadcast a real position yet (0,0).
        setVehicles(list.filter((v) => v.currentLat !== 0 || v.currentLong !== 0));
        setOffline(false);
      }
    } catch {
      if (mounted.current) setOffline(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    Location.requestForegroundPermissionsAsync().catch(() => {});
    refreshVehicles();
    const timer = setInterval(refreshVehicles, VEHICLE_REFRESH_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refreshVehicles]);

  const availableSeats = vehicles.reduce(
    (sum, v) => sum + Math.max(0, v.maxPassengerCount - v.passengerCount),
    0
  );

  const fitToVehicles = () => {
    const coords = vehicles.map((v) => ({ latitude: v.currentLat, longitude: v.currentLong }));
    if (coords.length === 0) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 120, bottom: 160, left: 60, right: 60 },
      animated: true,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_MAP_REGION}
        customMapStyle={isDark ? darkMapStyle : []}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {showStops &&
          ROUTE_STOPS.map((stop) => (
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
          const full = vehicle.passengerCount >= vehicle.maxPassengerCount;
          return (
            <Marker
              key={vehicle.puvNo}
              coordinate={{ latitude: vehicle.currentLat, longitude: vehicle.currentLong }}
              title={`PUV ${vehicle.puvNo}`}
              description={full ? "FULL" : `${vehicle.passengerCount}/${vehicle.maxPassengerCount} passengers`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.busMarker, { backgroundColor: full ? palette.danger : palette.primary }]}>
                <Ionicons name="bus" size={16} color="#fff" />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top status pill */}
      <View style={[styles.topPill, { top: insets.top + spacing.sm, backgroundColor: palette.overlay }]}>
        <View
          style={[
            styles.liveDot,
            { backgroundColor: offline ? "#F87171" : "#34D399" },
          ]}
        />
        <Text style={styles.topPillText}>
          {offline ? "Reconnecting…" : `${vehicles.length} PUV${vehicles.length === 1 ? "" : "s"} live`}
        </Text>
      </View>

      {/* Floating actions */}
      <View style={[styles.fabColumn, { top: insets.top + spacing.sm }]}>
        <Pressable
          onPress={fitToVehicles}
          style={[styles.fab, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name="locate" size={20} color={palette.primary} />
        </Pressable>
        <Pressable
          onPress={() => setShowStops((s) => !s)}
          style={[styles.fab, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name={showStops ? "flag" : "flag-outline"} size={20} color={palette.accent} />
        </Pressable>
      </View>

      {/* Bottom summary card */}
      <View
        style={[
          styles.bottomCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            paddingBottom: spacing.md,
            shadowColor: palette.shadow,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={[styles.bottomIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="bus" size={20} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.heading, { color: palette.text }]}>Montalban → Cubao</Text>
            <Text style={[type.caption, { color: palette.textMuted }]}>
              {vehicles.length === 0
                ? "No PUVs broadcasting right now"
                : `${availableSeats} seat${availableSeats === 1 ? "" : "s"} available across the route`}
            </Text>
          </View>
          <Ionicons name="chevron-up" size={18} color={palette.textMuted} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stopDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  busMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
  },
  topPill: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  topPillText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  fabColumn: { position: "absolute", right: spacing.md, gap: spacing.sm },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
  bottomCard: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bottomIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
