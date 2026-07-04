import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field, Screen, Subtitle, Title } from "../../components/UI";
import { registerAdmin, registerDriver } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { useTheme } from "../../store/ThemeContext";
import { radius, spacing, type } from "../../theme";

type Mode = "driver" | "admin";

/** Admin account creation: drivers (PUVs) and other admins. */
export default function ManageUsersScreen() {
  const { palette } = useTheme();
  const [mode, setMode] = useState<Mode>("driver");
  const [loading, setLoading] = useState(false);

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Driver fields
  const [username, setUsername] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  // Admin fields
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const reset = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setPlateNumber("");
    setName("");
    setPhoneNumber("");
  };

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "driver") {
        if (!username.trim() || !email.trim() || !password || !plateNumber.trim()) {
          Alert.alert("Missing fields", "Username, email, password, and plate number are required.");
          return;
        }
        await registerDriver({
          username: username.trim(),
          email: email.trim(),
          password,
          plateNumber: plateNumber.trim().toUpperCase(),
        });
        Alert.alert(
          "Driver created",
          `A vehicle record for ${plateNumber.trim().toUpperCase()} was created automatically.`
        );
      } else {
        if (!name.trim() || !email.trim() || !password) {
          Alert.alert("Missing fields", "Name, email, and password are required.");
          return;
        }
        await registerAdmin({ name: name.trim(), email: email.trim(), password, phoneNumber: phoneNumber.trim() });
        Alert.alert("Admin created", `${name.trim()} can now sign in as an admin.`);
      }
      reset();
    } catch (error) {
      Alert.alert("Creation failed", errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const segments: { key: Mode; label: string; icon: "bus-outline" | "shield-outline" }[] = [
    { key: "driver", label: "Driver / PUV", icon: "bus-outline" },
    { key: "admin", label: "Admin", icon: "shield-outline" },
  ];

  return (
    <Screen>
      <Title>Create accounts</Title>
      <Subtitle>Register new drivers (PUVs) or admins.</Subtitle>

      {/* Segmented control */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: palette.surfaceAlt,
          borderRadius: radius.md,
          padding: 4,
          marginBottom: spacing.lg,
        }}
      >
        {segments.map((segment) => {
          const active = mode === segment.key;
          return (
            <Pressable
              key={segment.key}
              onPress={() => setMode(segment.key)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: radius.sm,
                backgroundColor: active ? palette.surface : "transparent",
                borderWidth: active ? StyleSheet.hairlineWidth : 0,
                borderColor: palette.border,
              }}
            >
              <Ionicons name={segment.icon} size={16} color={active ? palette.primary : palette.textMuted} />
              <Text style={[type.label, { color: active ? palette.text : palette.textMuted }]}>{segment.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === "driver" ? (
        <>
          <Field label="Driver Username" icon="person-outline" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Field
            label="Plate Number"
            icon="bus-outline"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
            placeholder="ABC-1234"
          />
        </>
      ) : (
        <>
          <Field label="Full Name" icon="person-outline" value={name} onChangeText={setName} />
          <Field label="Phone Number" icon="call-outline" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        </>
      )}
      <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry />

      <Button
        title={mode === "driver" ? "Create Driver" : "Create Admin"}
        icon="person-add-outline"
        onPress={submit}
        loading={loading}
      />
      <Text style={[type.caption, { color: palette.textMuted, marginTop: spacing.md, textAlign: "center" }]}>
        Creating a driver automatically provisions a vehicle record for their plate number.
      </Text>
    </Screen>
  );
}
