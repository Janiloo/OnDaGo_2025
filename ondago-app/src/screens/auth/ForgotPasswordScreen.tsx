import React, { useState } from "react";
import { Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen, Field, Button, Title, Subtitle } from "../../components/UI";
import { forgotPassword } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your account email.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      Alert.alert("Token sent", "Check your email for the reset token.", [
        { text: "OK", onPress: () => navigation.navigate("ResetPassword", { email: email.trim() }) },
      ]);
    } catch (error) {
      Alert.alert("Request failed", errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Forgot password</Title>
      <Subtitle>We'll email you a 6-digit reset token.</Subtitle>
      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Button title="Send Reset Token" icon="paper-plane-outline" onPress={handleSend} loading={loading} />
      <Button
        title="I already have a token"
        variant="ghost"
        onPress={() => navigation.navigate("ResetPassword", { email: email.trim() })}
      />
    </Screen>
  );
}
