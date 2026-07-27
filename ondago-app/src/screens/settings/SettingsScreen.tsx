import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card, ListRow, Screen, SectionHeader } from "../../components/UI";
import { deleteAccount, getProfile } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import { UserProfile } from "../../types";
import { radius, spacing, type } from "../../theme";

/**
 * Settings hub: support (report + chat), the legal documents, account details
 * (with delete), and log out. Report an Issue and Delete Account moved here from
 * the tab bar and the Profile page respectively.
 */
export default function SettingsScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { palette } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile).catch(() => {});
    }, [])
  );

  const name = profile?.name ?? user?.name ?? "—";
  const email = profile?.email ?? user?.email ?? "—";
  const phone = profile?.phoneNumber || "Not set";

  const confirmLogout = () => {
    Alert.alert("Log out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert("Delete account?", "This permanently deletes your Sabako account. This cannot be undone.", [
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
    ]);
  };

  const divider = <View style={[styles.divider, { backgroundColor: palette.border }]} />;

  return (
    <Screen>
      <SectionHeader title="Support" icon="help-buoy-outline" />
      <Card>
        <ListRow icon="megaphone-outline" label="Report an Issue" onPress={() => navigation.navigate("Report")} />
        {divider}
        <ListRow icon="chatbubbles-outline" label="Chat with Support" onPress={() => navigation.navigate("ChatSupport")} />
      </Card>

      <SectionHeader title="About" icon="information-circle-outline" />
      <Card>
        <ListRow
          icon="document-text-outline"
          label="Terms & Conditions"
          onPress={() => navigation.navigate("Legal", { doc: "terms" })}
        />
        {divider}
        <ListRow
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() => navigation.navigate("Legal", { doc: "privacy" })}
        />
      </Card>

      <SectionHeader title="Account" icon="person-circle-outline" />
      <Card>
        <ListRow icon="person-outline" label="Name" value={name} />
        {divider}
        <ListRow icon="call-outline" label="Phone" value={phone} />
        {divider}
        <ListRow icon="mail-outline" label="Email" value={email} />
      </Card>

      {/* Danger zone — delete moved here from the Profile page. */}
      <SectionHeader title="Danger zone" icon="warning-outline" />
      <View style={[styles.danger, { borderColor: palette.dangerSoft, backgroundColor: palette.surface }]}>
        <ListRow icon="trash-outline" label="Delete Account" destructive onPress={confirmDelete} />
        <Text style={[type.caption, { color: palette.textMuted, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs }]}>
          Permanently removes your account and data. This cannot be undone.
        </Text>
      </View>

      <SectionHeader title="Session" icon="log-out-outline" />
      <Card>
        <ListRow icon="log-out-outline" label="Log Out" destructive onPress={confirmLogout} />
      </Card>

      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 42 },
  danger: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
