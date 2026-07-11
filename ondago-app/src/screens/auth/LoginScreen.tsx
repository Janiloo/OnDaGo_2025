import React, { useState } from "react";
import { Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Field, Button } from "../../components/UI";
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import { useToast } from "../../components/Toast";
import { errorMessage } from "../../services/client";
import { radius, spacing, type } from "../../theme";
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
      // Role-based routing happens automatically in RootNavigator
      // based on the role returned by the backend.
      await signIn(email.trim(), password);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: spacing.xl * 2, marginBottom: spacing.xl }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: radius.xl,
            backgroundColor: palette.primary,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.md,
          }}
        >
          <Ionicons name="bus" size={40} color={palette.onPrimary} />
        </View>
        <Text style={[type.display, { color: palette.text }]}>ParaPo</Text>
        <Text style={[type.body, { color: palette.textMuted, marginTop: spacing.xs }]}>
          Montalban–Cubao PUV tracker
        </Text>
      </View>

      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        error={errors.email}
      />
      <Field
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
        secureTextEntry
        placeholder="••••••••"
        error={errors.password}
      />
      <Button title="Sign In" icon="log-in-outline" onPress={handleLogin} loading={loading} />
      <Button title="Forgot password?" variant="ghost" onPress={() => navigation.navigate("ForgotPassword")} />

      <Text style={[type.body, { textAlign: "center", marginTop: spacing.lg, color: palette.textMuted }]}>
        New here?{" "}
        <Text style={{ color: palette.primary, fontWeight: "700" }} onPress={() => navigation.navigate("Register")}>
          Create a commuter account
        </Text>
      </Text>
    </Screen>
  );
}
