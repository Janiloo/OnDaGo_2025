import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Field, Button } from "../../components/UI";
import { AuthScaffold } from "../../components/AuthScaffold";
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import { useToast } from "../../components/Toast";
import { errorMessage } from "../../services/client";
import { fonts, spacing, type } from "../../theme";
import { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { palette } = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "Enter your email.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} tagline brandSize={88}>
      <Text style={[type.title, { color: palette.text, marginBottom: spacing.lg }]}>Welcome back</Text>

      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        error={errors.email}
      />
      <Field
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        secureTextEntry
        placeholder="••••••••"
        error={errors.password}
      />

      <View style={{ alignItems: "flex-end", marginBottom: spacing.sm }}>
        <Pressable onPress={() => navigation.navigate("ForgotPassword")} hitSlop={8}>
          <Text style={[type.label, { color: palette.textMuted }]}>Forgot password?</Text>
        </Pressable>
      </View>

      <Button title="Sign In" icon="arrow-forward" onPress={handleLogin} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.md }}>
        <Text style={[type.body, { color: palette.textMuted }]}>New here? </Text>
        <Pressable onPress={() => navigation.navigate("Register")} hitSlop={8}>
          <Text style={[type.body, { color: palette.primary, fontFamily: fonts.bold }]}>Create an account</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
