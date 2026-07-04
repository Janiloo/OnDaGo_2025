import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { createFare, getFareMatrix, updateFare } from "../../services/fareApi";
import { FareMatrixItem } from "../../types";
import { Button, EmptyState, Field } from "../../components/UI";
import { errorMessage } from "../../services/client";
import { useTheme } from "../../store/ThemeContext";
import { radius, spacing, type } from "../../theme";

/** Admin fare management: inline edit + create. */
export default function EditFaresScreen() {
  const { palette } = useTheme();
  const [fares, setFares] = useState<FareMatrixItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fareValue, setFareValue] = useState("");
  const [discountValue, setDiscountValue] = useState("");

  // Create state
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setFares(await getFareMatrix());
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

  const startEdit = (item: FareMatrixItem) => {
    setCreating(false);
    setEditingId(item.id);
    setFareValue(String(item.fare));
    setDiscountValue(String(item.discountedFare));
  };

  const saveEdit = async () => {
    const fare = parseFloat(fareValue);
    const discountedFare = parseFloat(discountValue);
    if (Number.isNaN(fare) || Number.isNaN(discountedFare) || fare < 0 || discountedFare < 0) {
      Alert.alert("Invalid amounts", "Enter valid fare amounts.");
      return;
    }
    try {
      await updateFare(editingId!, { fare, discountedFare });
      setEditingId(null);
      await load();
    } catch (error) {
      Alert.alert("Update failed", errorMessage(error));
    }
  };

  const saveNew = async () => {
    const fare = parseFloat(fareValue);
    const discountedFare = parseFloat(discountValue);
    if (!origin.trim() || !destination.trim() || Number.isNaN(fare) || Number.isNaN(discountedFare)) {
      Alert.alert("Missing fields", "Origin, destination, and both fare amounts are required.");
      return;
    }
    try {
      await createFare({ origin: origin.trim(), destination: destination.trim(), fare, discountedFare });
      setCreating(false);
      setOrigin("");
      setDestination("");
      setFareValue("");
      setDiscountValue("");
      await load();
    } catch (error) {
      Alert.alert("Create failed", errorMessage(error));
    }
  };

  const renderEditor = (isNew: boolean) => (
    <View style={{ marginTop: isNew ? 0 : spacing.md }}>
      {isNew && (
        <>
          <Field label="Origin" icon="location-outline" value={origin} onChangeText={setOrigin} placeholder="e.g. Montalban" />
          <Field label="Destination" icon="flag-outline" value={destination} onChangeText={setDestination} placeholder="e.g. Cubao" />
        </>
      )}
      <Field label="Fare (₱)" icon="cash-outline" value={fareValue} onChangeText={setFareValue} keyboardType="decimal-pad" />
      <Field
        label="Discounted Fare (₱)"
        icon="pricetag-outline"
        value={discountValue}
        onChangeText={setDiscountValue}
        keyboardType="decimal-pad"
      />
      <Button title={isNew ? "Create Fare" : "Save Changes"} icon="checkmark" onPress={isNew ? saveNew : saveEdit} />
      <Button
        title="Cancel"
        variant="ghost"
        onPress={() => {
          setEditingId(null);
          setCreating(false);
        }}
      />
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      data={fares}
      keyExtractor={(item, index) => item.id || String(index)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={palette.primary} />
      }
      ListHeaderComponent={
        creating ? (
          <View
            style={{
              backgroundColor: palette.surface,
              borderRadius: radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: palette.border,
              padding: spacing.md,
              marginBottom: spacing.sm,
            }}
          >
            <Text style={[type.heading, { color: palette.text, marginBottom: spacing.sm }]}>New fare</Text>
            {renderEditor(true)}
          </View>
        ) : (
          <View style={{ marginBottom: spacing.sm }}>
            <Button
              title="Add Fare"
              icon="add"
              onPress={() => {
                setEditingId(null);
                setFareValue("");
                setDiscountValue("");
                setCreating(true);
              }}
            />
          </View>
        )
      }
      ListEmptyComponent={loaded ? <EmptyState icon="cash-outline" message="No fares yet — add the first one." /> : null}
      renderItem={({ item }) => (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: editingId === item.id ? palette.primary : palette.border,
            padding: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <Pressable onPress={() => startEdit(item)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.heading, { color: palette.text }]} numberOfLines={1}>
                {item.origin} → {item.destination}
              </Text>
              <Text style={[type.caption, { color: palette.textMuted }]}>
                ₱{item.fare.toFixed(2)} · discounted ₱{item.discountedFare.toFixed(2)}
              </Text>
            </View>
            <Ionicons name="create-outline" size={18} color={palette.textMuted} />
          </Pressable>
          {editingId === item.id && renderEditor(false)}
        </View>
      )}
    />
  );
}
