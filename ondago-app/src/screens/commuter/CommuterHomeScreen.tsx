import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useVehicles } from "../../hooks/useVehicles";
import { useDiscovery } from "../../hooks/useDiscovery";
import { useVehicleSpeeds } from "../../hooks/useVehicleSpeeds";
import { VehicleMarker } from "../../components/VehicleMarker";
import { StopMarker } from "../../components/StopMarker";
import { IconName } from "../../components/UI";
import { VehicleDetailSheet } from "../../components/VehicleDetailSheet";
import { TerminalDetailSheet } from "../../components/TerminalDetailSheet";
import { OccupancyLegend } from "../../components/OccupancyLegend";
import { RouteFilterModal } from "../../components/RouteFilterModal";
import { hasRealPosition, isVehicleStale } from "../../utils/vehicles";
import { DEFAULT_MAP_REGION, ROUTE_STOPS } from "../../config";
import { darkMapStyle, fonts, radius, spacing, type } from "../../theme";
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
  // Map layers: "standard" = Street, "hybrid" = Satellite (with road labels).
  // Traffic overlays live road-speed colours (red/orange/green).
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");
  const [traffic, setTraffic] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);

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
        mapType={mapType}
        showsTraffic={traffic}
        // Custom (dark) styling only applies to the street map, not satellite.
        customMapStyle={isDark && mapType === "standard" ? darkMapStyle : []}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => {
          setSelectedPuv(null);
          setMapMenuOpen(false);
        }}
      >
        {(showStops || terminalMode) &&
          stops.map((stop) => (
            <StopMarker
              key={stop.key}
              stop={stop}
              terminalMode={terminalMode}
              onOpenTerminal={
                terminalById.has(stop.key) ? () => setSelectedTerminalId(stop.key) : undefined
              }
            />
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

      {/* Floating actions (top → bottom): find your ride · stops · routes ·
          terminal view · map layers. Every button highlights on press, and the
          toggles stay highlighted while active — consistent in light & dark. */}
      <View style={[styles.fabColumn, { top: insets.top + spacing.sm }]}>
        <MapFab icon="locate" onPress={fitToVehicles} />
        <MapFab
          icon={showStops ? "flag" : "flag-outline"}
          tint="accent"
          active={showStops}
          onPress={() => setShowStops((sv) => !sv)}
        />
        <MapFab icon="git-branch" active={!!selectedRoute} onPress={() => setPickerOpen(true)} />
        <MapFab
          icon="business"
          active={terminalMode}
          onPress={() => {
            setTerminalMode((m) => {
              // Whichever sheet belongs to the mode we're leaving closes with it.
              if (!m) {
                setSelectedPuv(null);
                // Frame the terminal network — that's what this mode is about.
                const coords = stops.map((sp) => ({ latitude: sp.latitude, longitude: sp.longitude }));
                if (coords.length > 0) {
                  mapRef.current?.fitToCoordinates(coords, {
                    edgePadding: { top: 160, bottom: 260, left: 100, right: 140 },
                    animated: true,
                  });
                }
              } else {
                setSelectedTerminalId(null);
              }
              return !m;
            });
          }}
        />
        {/* Map layers — sits under the terminal button. */}
        <MapFab icon="layers-outline" active={mapMenuOpen} onPress={() => setMapMenuOpen((o) => !o)} />
      </View>

      {/* Map layers menu (Street/Satellite + traffic), anchored under the FABs */}
      {mapMenuOpen && (
        <View
          style={[
            styles.mapMenu,
            { top: insets.top + spacing.sm + 252, backgroundColor: palette.surface, borderColor: palette.border, shadowColor: palette.shadow },
          ]}
        >
          <Text style={[styles.menuLabel, { color: palette.textMuted }]}>MAP TYPE</Text>
          <View style={[styles.segment, { backgroundColor: palette.surfaceAlt }]}>
            {(["standard", "hybrid"] as const).map((t) => {
              const active = mapType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setMapType(t)}
                  style={[styles.segmentBtn, active && { backgroundColor: palette.primary }]}
                >
                  <Ionicons
                    name={t === "standard" ? "map-outline" : "globe-outline"}
                    size={14}
                    color={active ? palette.onPrimary : palette.textMuted}
                  />
                  <Text style={{ color: active ? palette.onPrimary : palette.text, fontFamily: fonts.semibold, fontSize: 12 }}>
                    {t === "standard" ? "Street" : "Satellite"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.menuLabel, { color: palette.textMuted, marginTop: spacing.md }]}>MAP DETAILS</Text>
          <View style={styles.detailRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1 }}>
              <Ionicons name="car-outline" size={16} color={palette.textMuted} />
              <Text style={{ color: palette.text, fontSize: 13, fontFamily: fonts.medium }}>Traffic</Text>
            </View>
            <Switch
              value={traffic}
              onValueChange={setTraffic}
              trackColor={{ true: palette.primary, false: palette.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      )}

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

/**
 * A round map control button. Highlights (fills with its tint + inverts the
 * icon) while pressed OR while `active` — so momentary actions flash on tap and
 * toggles stay lit. `tint` picks the accent colour; both read correctly on the
 * light and dark surfaces.
 */
function MapFab({
  icon,
  onPress,
  active = false,
  tint = "primary",
}: {
  icon: IconName;
  onPress: () => void;
  active?: boolean;
  tint?: "primary" | "accent";
}) {
  const { palette } = useTheme();
  const color = tint === "accent" ? palette.accent : palette.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: active || pressed ? color : palette.surface,
          borderColor: active || pressed ? color : palette.border,
        },
      ]}
    >
      {({ pressed }) => (
        <Ionicons name={icon} size={20} color={active || pressed ? palette.onPrimary : color} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  mapMenu: {
    position: "absolute",
    right: spacing.md,
    width: 208,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  segment: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
});
