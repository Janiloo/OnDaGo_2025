import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
import { useTheme } from "../store/ThemeContext";

/**
 * Terminal/stop map dot. Same bitmap discipline as VehicleMarker: Android only
 * reliably captures a custom marker view while `tracksViewChanges` is on, but
 * leaving it on permanently risks maps-SDK instability — so it pulses on for a
 * beat whenever the appearance changes (mode toggle, theme), then freezes.
 * In terminal mode the dot grows into a proper tap target and taps open the
 * app's terminal sheet instead of the map callout.
 */
export function StopMarker({
  stop,
  terminalMode,
  onOpenTerminal,
}: {
  stop: { key: string; name: string; latitude: number; longitude: number };
  terminalMode: boolean;
  /** Set only for real discovery terminals — fallback config stops have no id. */
  onOpenTerminal?: () => void;
}) {
  const { palette } = useTheme();

  const signature = `${terminalMode ? "tm" : "map"}-${palette.accent}`;
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const timeout = setTimeout(() => setTracks(false), 800);
    return () => clearTimeout(timeout);
  }, [signature]);

  return (
    <Marker
      coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
      title={stop.name}
      description={terminalMode ? "Tap for routes & PUVs" : "Route stop"}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      onPress={
        terminalMode && onOpenTerminal
          ? (event) => {
              event.stopPropagation();
              onOpenTerminal();
            }
          : undefined
      }
    >
      <View
        style={[
          terminalMode ? styles.dotBig : styles.dot,
          { backgroundColor: palette.surface, borderColor: palette.accent },
        ]}
      />
    </Marker>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  // Terminal mode makes terminals the protagonists — bigger tap targets.
  dotBig: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 5,
  },
});
