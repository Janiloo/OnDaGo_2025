import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Card, ListRow, Screen, SectionHeader } from "../../components/UI";
import { deleteAccount, getProfile } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { useAuth } from "../../store/AuthContext";
import { ThemeMode, useTheme } from "../../store/ThemeContext";
import { UserProfile } from "../../types";
import { radius, spacing, type } from "../../theme";

/** Profile + settings, including the appearance (light/dark) preference. */
export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { palette, mode, setMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then(setProfile)
        .catch(() => {
          // Fall back to cached user info below.
        });
    }, [])
  );

  const name = profile?.name ?? user?.name ?? "—";
  const email = profile?.email ?? user?.email ?? "—";
  const phone = profile?.phoneNumber || "Not set";
  const plate = profile?.plateNumber ?? user?.plateNumber;

  const confirmLogout = () => {
    Alert.alert("Sign out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your ParaPo account. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              await signOut();
            } catch (error) {
              Alert.alert("Error", errorMessage(error));
            }
          },
        },
      ]
    );
  };

  const appearanceOptions: { key: ThemeMode; label: string; icon: "phone-portrait-outline" | "sunny-outline" | "moon-outline" }[] = [
    { key: "system", label: "System", icon: "phone-portrait-outline" },
    { key: "light", label: "Light", icon: "sunny-outline" },
    { key: "dark", label: "Dark", icon: "moon-outline" },
  ];

  return (
    <Screen>
      {/* Identity header */}
      <View style={{ alignItems: "center", marginVertical: spacing.lg }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: palette.primary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ color: palette.onPrimary, fontSize: 34, fontWeight: "900" }}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[type.title, { color: palette.text }]}>{name}</Text>
        <View style={{ marginTop: spacing.xs }}>
          <Badge
            label={user?.role ?? "User"}
            tone="primary"
            icon={user?.role === "Admin" ? "shield-outline" : user?.role === "Driver" ? "bus-outline" : "person-outline"}
          />
        </View>
      </View>

      <SectionHeader title="Account" icon="person-circle-outline" />
      <Card>
        <ListRow icon="mail-outline" label="Email" value={email} />
        <ListRow icon="call-outline" label="Phone" value={phone} />
        {!!plate && <ListRow icon="bus-outline" label="Plate Number" value={plate} />}
        <ListRow
          icon="create-outline"
          label="Edit Profile"
          onPress={() => navigation.navigate("EditProfile", { name, phoneNumber: profile?.phoneNumber ?? "" })}
        />
      </Card>

      <SectionHeader title="Appearance" icon="color-palette-outline" />
      <Card>
        <View style={{ flexDirection: "row", backgroundColor: palette.surfaceAlt, borderRadius: radius.md, padding: 4 }}>
          {appearanceOptions.map((option) => {
            const active = mode === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setMode(option.key)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 9,
                  borderRadius: radius.sm,
                  backgroundColor: active ? palette.surface : "transparent",
                  borderWidth: active ? StyleSheet.hairlineWidth : 0,
                  borderColor: palette.border,
                }}
              >
                <Ionicons name={option.icon} size={15} color={active ? palette.primary : palette.textMuted} />
                <Text style={[type.label, { color: active ? palette.text : palette.textMuted }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Session" icon="log-out-outline" />
      <Card>
        <ListRow icon="log-out-outline" label="Sign Out" onPress={confirmLogout} />
        <ListRow icon="trash-outline" label="Delete Account" destructive onPress={confirmDelete} />
      </Card>
    </Screen>
  );
}
