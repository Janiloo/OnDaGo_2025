import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useVehicles } from "../../hooks/useVehicles";
import { useDiscovery } from "../../hooks/useDiscovery";
import { useVehicleSpeeds } from "../../hooks/useVehicleSpeeds";
import { VehicleMarker } from "../../components/VehicleMarker";
import { VehicleDetailSheet } from "../../components/VehicleDetailSheet";
import { TerminalDetailSheet } from "../../components/TerminalDetailSheet";
import { OccupancyLegend } from "../../components/OccupancyLegend";
import { RouteFilterModal } from "../../components/RouteFilterModal";
import { hasRealPosition, isVehicleStale } from "../../utils/vehicles";
import { DEFAULT_MAP_REGION, ROUTE_STOPS } from "../../config";
import { darkMapStyle, radius, spacing, type } from "../../theme";
import { useTheme } from "../../store/ThemeContext";

/**
 * Commuter home: map-first, low-cognitive-load view of live PUVs. Terminals and
 * routes come from the backend discovery layer (not hardcoded), so riders can
 * filter the map to a single route — its stops and its PUVs. Vehicle positions
 * arrive as SignalR pushes (useVehicles), with polling only as a fallback.
 */
export default function CommuterHomeScreen() {
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const { vehicles: allVehicles, offline, now } = useVehicles(selectedRouteId);
  const { terminals, routes, companyById } = useDiscovery();
  const [showStops, setShowStops] = useState(true);
  const [selectedPuv, setSelectedPuv] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Terminal mode (Tier 2): browse the terminal network without vehicle noise.
  const [terminalMode, setTerminalMode] = useState(false);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null);
  const speedByPuv = useVehicleSpeeds(allVehicles);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  const terminalById = useMemo(() => new Map(terminals.map((t) => [t.id, t])), [terminals]);
  const selectedRoute = selectedRouteId ? routes.find((r) => r.id === selectedRouteId) ?? null : null;

  // Stops to draw: the selected route's terminals in order, else every terminal;
  // if discovery returned nothing (offline/unseeded), fall back to config stops.
  const stops = useMemo(() => {
    const source = selectedRoute
      ? selectedRoute.terminalIds.map((id) => terminalById.get(id)).filter(Boolean)
      : terminals;
    if (source.length > 0) {
      return (source as { id: string; name: string; latitude: number; longitude: number }[]).map((t) => ({
        key: t.id,
        name: t.name,
        latitude: t.latitude,
        longitude: t.longitude,
      }));
    }
    return ROUTE_STOPS.map((sp) => ({ key: sp.name, name: sp.name, latitude: sp.latitude, longitude: sp.longitude }));
  }, [selectedRoute, terminals, terminalById]);

  // Ignore vehicles without a real position; then apply the route filter.
  const vehicles = allVehicles
    .filter(hasRealPosition)
    .filter((v) => !selectedRouteId || v.routeId === selectedRouteId);
  const liveVehicles = vehicles.filter((v) => !isVehicleStale(v, now));
  const selectedVehicle = selectedPuv ? vehicles.find((v) => v.puvNo === selectedPuv) ?? null : null;
  const availableSeats = liveVehicles.reduce(
    (sum, v) => sum + Math.max(0, v.maxPassengerCount - v.passengerCount),
    0
  );

  // Live PUV count per route (for the picker) — from the unfiltered fleet.
  const liveCountByRoute = useMemo(() => {
    const m: Record<string, number> = {};
    allVehicles.forEach((v) => {
      if (!hasRealPosition(v) || isVehicleStale(v, now) || !v.routeId) return;
      m[v.routeId] = (m[v.routeId] ?? 0) + 1;
    });
    return m;
  }, [allVehicles, now]);

  const fitToVehicles = () => {
    const coords = vehicles.map((v) => ({ latitude: v.currentLat, longitude: v.currentLong }));
    // With no PUVs to fit, frame the selected route's stops instead.
    const fallback = stops.map((sp) => ({ latitude: sp.latitude, longitude: sp.longitude }));
    const target = coords.length > 0 ? coords : fallback;
    if (target.length === 0) return;
    mapRef.current?.fitToCoordinates(target, {
      edgePadding: { top: 120, bottom: 200, left: 60, right: 60 },
      animated: true,
    });
  };

  const routeTitle = selectedRoute ? selectedRoute.name : "All routes";

  // Stops to estimate arrival for in the detail sheet: the tapped vehicle's own
  // route terminals (ordered), or every terminal if it isn't on a route.
  const sheetStops = useMemo(() => {
    if (!selectedVehicle) return [];
    const vehicleRoute = selectedVehicle.routeId ? routes.find((r) => r.id === selectedVehicle.routeId) : null;
    const source = vehicleRoute
      ? vehicleRoute.terminalIds.map((id) => terminalById.get(id)).filter(Boolean)
      : terminals;
    return (source as { id: string; name: string; latitude: number; longitude: number }[]).map((t) => ({
      id: t.id,
      name: t.name,
      latitude: t.latitude,
      longitude: t.longitude,
    }));
  }, [selectedVehicle, routes, terminals, terminalById]);

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
        onPress={() => setSelectedPuv(null)}
      >
        {(showStops || terminalMode) &&
          stops.map((stop) => (
            <Marker
              key={`${stop.key}-${terminalMode ? "tm" : "map"}`}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              title={stop.name}
              description={terminalMode ? "Tap for routes & PUVs" : "Route stop"}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={(e) => {
                // In terminal mode the marker opens the detail sheet instead of
                // the default callout (only for real discovery terminals — the
                // hardcoded fallback stops have no id to look up).
                if (terminalMode && terminalById.has(stop.key)) {
                  e.stopPropagation();
                  setSelectedTerminalId(stop.key);
                }
              }}
            >
              <View
                style={[
                  styles.stopDot,
                  terminalMode && styles.stopDotBig,
                  { backgroundColor: palette.surface, borderColor: palette.accent },
                ]}
              />
            </Marker>
          ))}
        {!terminalMode && vehicles.map((vehicle) => {
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

      {/* Top status pill */}
      <View style={[styles.topPill, { top: insets.top + spacing.sm, backgroundColor: palette.overlay }]}>
        <View style={[styles.liveDot, { backgroundColor: offline ? "#F87171" : "#34D399" }]} />
        <Text style={styles.topPillText}>
          {offline
            ? "Reconnecting…"
            : terminalMode
              ? `${stops.length} terminal${stops.length === 1 ? "" : "s"}`
              : `${liveVehicles.length} PUV${liveVehicles.length === 1 ? "" : "s"} live`}
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
          onPress={() => setShowStops((sv) => !sv)}
          style={[styles.fab, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name={showStops ? "flag" : "flag-outline"} size={20} color={palette.accent} />
        </Pressable>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[
            styles.fab,
            {
              backgroundColor: selectedRoute ? palette.primary : palette.surface,
              borderColor: selectedRoute ? palette.primary : palette.border,
            },
          ]}
        >
          <Ionicons name="git-branch" size={20} color={selectedRoute ? palette.onPrimary : palette.primary} />
        </Pressable>
        <Pressable
          onPress={() => {
            setTerminalMode((m) => {
              // Whichever sheet belongs to the mode we're leaving closes with it.
              if (!m) setSelectedPuv(null);
              else setSelectedTerminalId(null);
              return !m;
            });
          }}
          style={[
            styles.fab,
            {
              backgroundColor: terminalMode ? palette.primary : palette.surface,
              borderColor: terminalMode ? palette.primary : palette.border,
            },
          ]}
        >
          <Ionicons name="business" size={20} color={terminalMode ? palette.onPrimary : palette.primary} />
        </Pressable>
      </View>

      {/* Occupancy color legend (top-left, below the status pill) */}
      <OccupancyLegend top={insets.top + 52} />

      {/* Terminal-mode hint card */}
      {terminalMode && !selectedTerminalId && (
        <View
          style={[
            styles.bottomCard,
            { backgroundColor: palette.surface, borderColor: palette.border, shadowColor: palette.shadow },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View style={[styles.bottomIcon, { backgroundColor: palette.primarySoft }]}>
              <Ionicons name="business" size={20} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.heading, { color: palette.text }]}>Terminal view</Text>
              <Text style={[type.caption, { color: palette.textMuted }]}>
                Tap a terminal for its routes and the nearest PUVs
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Bottom summary card — tap to filter by route (hidden while a vehicle sheet is open) */}
      {!terminalMode && !selectedVehicle && (
        <Pressable
          onPress={() => setPickerOpen(true)}
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
              <Ionicons name={selectedRoute ? "git-branch" : "bus"} size={20} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[type.heading, { color: palette.text }]} numberOfLines={1}>
                  {routeTitle}
                </Text>
                {selectedRoute && (
                  <View style={[styles.filterTag, { backgroundColor: palette.primarySoft }]}>
                    <Text style={[type.caption, { color: palette.primary, fontWeight: "700" }]}>filtered</Text>
                  </View>
                )}
              </View>
              <Text style={[type.caption, { color: palette.textMuted }]}>
                {liveVehicles.length === 0
                  ? selectedRoute
                    ? "No PUVs on this route right now — tap to change"
                    : "No PUVs broadcasting right now"
                  : `${availableSeats} seat${availableSeats === 1 ? "" : "s"} across ${liveVehicles.length} live PUV${liveVehicles.length === 1 ? "" : "s"} · tap to filter`}
              </Text>
            </View>
            <Ionicons name="options" size={18} color={palette.textMuted} />
          </View>
        </Pressable>
      )}

      {selectedVehicle && !terminalMode && (
        <VehicleDetailSheet
          vehicle={selectedVehicle}
          now={now}
          stops={sheetStops}
          speedKmh={speedByPuv[selectedVehicle.puvNo]}
          operator={(() => {
            // Branding: the vehicle's own operator, else its route's operator.
            const companyId =
              selectedVehicle.companyId ??
              (selectedVehicle.routeId ? routes.find((r) => r.id === selectedVehicle.routeId)?.companyId : null);
            const company = companyId ? companyById.get(companyId) : null;
            return company ? { name: company.name, logo: company.logo } : null;
          })()}
          onClose={() => setSelectedPuv(null)}
        />
      )}

      {terminalMode && selectedTerminalId && terminalById.has(selectedTerminalId) && (
        <TerminalDetailSheet
          terminal={terminalById.get(selectedTerminalId)!}
          routes={routes}
          liveCountByRoute={liveCountByRoute}
          liveVehicles={allVehicles.filter((v) => hasRealPosition(v) && !isVehicleStale(v, now))}
          speedByPuv={speedByPuv}
          onSelectRoute={(routeId) => {
            // Jump back to the live map, filtered to the chosen route.
            setSelectedRouteId(routeId);
            setSelectedTerminalId(null);
            setTerminalMode(false);
          }}
          onClose={() => setSelectedTerminalId(null)}
        />
      )}

      <RouteFilterModal
        visible={pickerOpen}
        routes={routes}
        terminals={terminals}
        companyById={companyById}
        selectedRouteId={selectedRouteId}
        liveCountByRoute={liveCountByRoute}
        onSelect={setSelectedRouteId}
        onClose={() => setPickerOpen(false)}
      />
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
  // Terminal mode makes the terminals the protagonists — bigger tap targets.
  stopDotBig: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
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
  filterTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
