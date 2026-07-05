import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFareMatrix } from "../../services/fareApi";
import { FareMatrixItem } from "../../types";
import { EmptyState } from "../../components/UI";
import { SkeletonList } from "../../components/Skeleton";
import { useTheme } from "../../store/ThemeContext";
import { radius, spacing, type } from "../../theme";

/** Read-only fare matrix for commuters. */
export default function FareMatrixScreen() {
  const { palette } = useTheme();
  const [fares, setFares] = useState<FareMatrixItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setFares(await getFareMatrix());
    } catch {
      // Pull-to-refresh retries; keep last known data.
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Shimmer skeletons on the very first load instead of a blank screen.
  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <SkeletonList count={7} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      data={fares}
      keyExtractor={(item, index) => item.id || String(index)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={palette.primary} />
      }
      ListEmptyComponent={
        <EmptyState
          icon="cash-outline"
          title="No fares yet"
          message="Fares set by the operator will appear here. Pull down to refresh."
        />
      }
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: palette.border,
            padding: spacing.md,
            marginBottom: spacing.sm,
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.sm,
              backgroundColor: palette.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="swap-horizontal" size={18} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.heading, { color: palette.text }]} numberOfLines={1}>
              {item.origin} → {item.destination}
            </Text>
            <Text style={[type.caption, { color: palette.textMuted }]}>
              Discounted ₱{item.discountedFare.toFixed(2)}
            </Text>
          </View>
          <Text style={{ color: palette.primary, fontWeight: "800", fontSize: 17 }}>
            ₱{item.fare.toFixed(2)}
          </Text>
        </View>
      )}
    />
  );
}
