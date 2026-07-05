import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  deleteReport,
  getReports,
  markReportCompleted,
  setReportImportant,
  updateReportStatus,
} from "../../services/reportApi";
import { connectReportHub } from "../../services/reportHub";
import { ReportItem } from "../../types";
import { Badge, EmptyState, StatCard } from "../../components/UI";
import { errorMessage } from "../../services/client";
import { useTheme } from "../../store/ThemeContext";
import { radius, spacing, type } from "../../theme";

type Filter = "all" | "pending" | "important" | "completed";

/** Admin operations dashboard: report stats + triage list. */
export default function AdminReportsScreen() {
  const { palette } = useTheme();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await getReports();
      // Important reports first, then newest.
      list.sort((a, b) => {
        if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
      setReports(list);
    } catch (error) {
      Alert.alert("Error", errorMessage(error));
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Real-time: refetch whenever any report changes on the server.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const hub = connectReportHub({ onChange: () => loadRef.current() });
    return () => {
      hub.stop();
    };
  }, []);

  const stats = useMemo(
    () => ({
      pending: reports.filter((r) => r.status !== "Completed").length,
      important: reports.filter((r) => r.isImportant).length,
      completed: reports.filter((r) => r.status === "Completed").length,
    }),
    [reports]
  );

  const visible = useMemo(() => {
    switch (filter) {
      case "pending":
        return reports.filter((r) => r.status !== "Completed");
      case "important":
        return reports.filter((r) => r.isImportant);
      case "completed":
        return reports.filter((r) => r.status === "Completed");
      default:
        return reports;
    }
  }, [reports, filter]);

  const act = async (action: () => Promise<void>) => {
    try {
      await action();
      await load();
    } catch (error) {
      Alert.alert("Error", errorMessage(error));
    }
  };

  const showActions = (report: ReportItem) => {
    Alert.alert(report.subject, report.description, [
      {
        text: report.status === "Completed" ? "Reopen (In Progress)" : "Mark Completed",
        onPress: () =>
          act(() =>
            report.status === "Completed"
              ? updateReportStatus(report.id, "InProgress")
              : markReportCompleted(report.id)
          ),
      },
      {
        text: report.isImportant ? "Unmark Important" : "Mark Important",
        onPress: () => act(() => setReportImportant(report.id, !report.isImportant)),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete report?", "This hides the report from the list.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => act(() => deleteReport(report.id)) },
          ]),
      },
      { text: "Close", style: "cancel" },
    ]);
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "important", label: "Important" },
    { key: "completed", label: "Done" },
  ];

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      data={visible}
      keyExtractor={(item, index) => item.id || String(index)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={palette.primary} />
      }
      ListHeaderComponent={
        <>
          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
            <StatCard label="Pending" value={stats.pending} icon="time-outline" tone="warning" />
            <StatCard label="Important" value={stats.important} icon="star-outline" tone="accent" />
            <StatCard label="Completed" value={stats.completed} icon="checkmark-done-outline" tone="success" />
          </View>

          {/* Filter chips */}
          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: radius.pill,
                    backgroundColor: active ? palette.primary : palette.surface,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: active ? palette.primary : palette.border,
                  }}
                >
                  <Text
                    style={{
                      color: active ? palette.onPrimary : palette.textMuted,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      }
      ListEmptyComponent={
        loaded ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="All clear"
            message={filter === "all" ? "No reports yet. Pull to refresh." : `No ${filter} reports.`}
          />
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => showActions(item)}
          style={({ pressed }) => ({
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: palette.border,
            padding: spacing.md,
            marginBottom: spacing.sm,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            {item.isImportant && <Ionicons name="star" size={15} color={palette.accent} />}
            <Text style={[type.heading, { color: palette.text, flex: 1 }]} numberOfLines={1}>
              {item.subject}
            </Text>
            <Badge
              label={item.status}
              tone={item.status === "Completed" ? "success" : item.status === "InProgress" ? "primary" : "warning"}
            />
          </View>
          <Text style={[type.body, { color: palette.textMuted, marginTop: 4 }]} numberOfLines={2}>
            {item.description}
          </Text>
          {!!item.createdAt && (
            <Text style={[type.caption, { color: palette.textMuted, marginTop: spacing.xs }]}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          )}
        </Pressable>
      )}
    />
  );
}
