import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Card, ListRow, Screen, SectionHeader } from "../../components/UI";
import { Pinstripe } from "../../components/Brand";
import { getProfile } from "../../services/authApi";
import { useAuth } from "../../store/AuthContext";
import { ThemeMode, useTheme } from "../../store/ThemeContext";
import { UserProfile } from "../../types";
import { fonts, radius, spacing, type } from "../../theme";

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
  const role = user?.role ?? "User";
  const roleIcon = role === "Admin" ? "shield-checkmark" : role === "Driver" ? "bus" : "person";

  const confirmLogout = () => {
    Alert.alert("Sign out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const appearanceOptions: { key: ThemeMode; label: string; icon: "phone-portrait-outline" | "sunny-outline" | "moon-outline" }[] = [
    { key: "system", label: "System", icon: "phone-portrait-outline" },
    { key: "light", label: "Light", icon: "sunny-outline" },
    { key: "dark", label: "Dark", icon: "moon-outline" },
  ];

  return (
    <Screen>
      {/* Identity banner — dusk gradient + painted avatar. */}
      <LinearGradient
        colors={palette.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.banner, { borderColor: palette.border }]}
      >
        <LinearGradient
          colors={["#F25F2D", palette.primary, "#C94214"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.avatar}
        >
          <Text style={{ color: "#FFF6EF", fontSize: 32, fontFamily: fonts.black }}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.title, { color: palette.text }]} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.roleRow}>
            <Ionicons name={roleIcon as any} size={13} color={palette.accent} />
            <Text style={{ color: palette.accent, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.4 }}>
              {role.toUpperCase()}
              {plate ? ` · ${plate}` : ""}
            </Text>
          </View>
          <Pinstripe width={44} style={{ marginTop: spacing.sm }} />
        </View>
      </LinearGradient>

      <SectionHeader title="Account" icon="person-circle-outline" />
      <Card>
        <ListRow icon="mail-outline" label="Email" value={email} />
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <ListRow icon="call-outline" label="Phone" value={phone} />
        {!!plate && <View style={[styles.divider, { backgroundColor: palette.border }]} />}
        {!!plate && <ListRow icon="bus-outline" label="Plate number" value={plate} />}
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <ListRow
          icon="create-outline"
          label="Edit profile"
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
                  paddingVertical: 10,
                  borderRadius: radius.sm,
                  backgroundColor: active ? palette.primary : "transparent",
                }}
              >
                <Ionicons name={option.icon} size={15} color={active ? palette.onPrimary : palette.textMuted} />
                <Text
                  style={{
                    color: active ? palette.onPrimary : palette.textMuted,
                    fontFamily: active ? fonts.bold : fonts.semibold,
                    fontSize: 13,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Session" icon="log-out-outline" />
      <Card>
        <ListRow icon="log-out-outline" label="Sign out" onPress={confirmLogout} />
      </Card>

      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.18)",
  },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 42 },
});
