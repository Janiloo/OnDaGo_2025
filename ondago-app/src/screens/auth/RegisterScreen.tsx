import React, { useState } from "react";
import { Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen, Field, Button, Title, Subtitle } from "../../components/UI";
import { registerCommuter } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing fields", "Name, email, and password are required.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await registerCommuter({
        name: name.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.trim(),
      });
      Alert.alert("Account created", "You can now sign in.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      Alert.alert("Registration failed", errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Create account</Title>
      <Subtitle>Ride with ParaPo as a commuter.</Subtitle>
      <Field label="Full Name" icon="person-outline" value={name} onChangeText={setName} placeholder="Juan Dela Cruz" />
      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Field
        label="Phone Number"
        icon="call-outline"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholder="09XXXXXXXXX"
      />
      <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry />
      <Field label="Confirm Password" icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} secureTextEntry />
      <Button title="Create Account" icon="person-add-outline" onPress={handleRegister} loading={loading} />
    </Screen>
  );
}
