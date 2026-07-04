import React, { useState } from "react";
import { Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen, Field, Button, Title, Subtitle } from "../../components/UI";
import { changePassword } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !token.trim() || !newPassword) {
      Alert.alert("Missing fields", "Email, token, and new password are required.");
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await changePassword(email.trim(), token.trim(), newPassword);
      Alert.alert("Password changed", "Sign in with your new password.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      Alert.alert("Reset failed", errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Reset password</Title>
      <Subtitle>Enter the token from your email and choose a new password.</Subtitle>
      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field
        label="Reset Token"
        icon="key-outline"
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        placeholder="6-digit token"
        maxLength={6}
      />
      <Field label="New Password" icon="lock-closed-outline" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <Field label="Confirm New Password" icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} secureTextEntry />
      <Button title="Change Password" icon="checkmark-circle-outline" onPress={handleReset} loading={loading} />
    </Screen>
  );
}
