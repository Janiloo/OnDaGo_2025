import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Field, Button } from "../../components/UI";
import { AuthScaffold } from "../../components/AuthScaffold";
import { registerCommuter } from "../../services/authApi";
import { errorMessage } from "../../services/client";
import { useToast } from "../../components/Toast";
import { useTheme } from "../../store/ThemeContext";
import { haptics } from "../../services/haptics";
import { fonts, radius, spacing, type } from "../../theme";
import { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const STEPS = ["name", "email", "phone", "password", "agree"] as const;
const TOTAL = STEPS.length;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }: Props) {
  const { palette } = useTheme();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const back = () => {
    setError(null);
    if (step > 0) {
      haptics.selection();
      setStep((s) => s - 1);
    } else {
      navigation.goBack();
    }
  };

  const validateCurrent = (): string | null => {
    switch (STEPS[step]) {
      case "name":
        return name.trim().length >= 2 ? null : "Please enter your full name.";
      case "email":
        return EMAIL_RE.test(email.trim()) ? null : "Enter a valid email address.";
      case "phone":
        // Optional, but if provided it should look like a number.
        return !phone.trim() || /^[0-9+\-\s]{7,}$/.test(phone.trim()) ? null : "Enter a valid phone number, or leave it blank.";
      case "password":
        if (password.length < 6) return "Password must be at least 6 characters.";
        if (password !== confirm) return "Passwords do not match.";
        return null;
      case "agree":
        if (!agreeTerms) return "Please accept the Terms & Conditions.";
        if (!agreePrivacy) return "Please accept the Privacy Policy.";
        return null;
    }
  };

  const next = async () => {
    const err = validateCurrent();
    if (err) {
      setError(err);
      haptics.warning();
      return;
    }
    setError(null);
    if (step < TOTAL - 1) {
      haptics.light();
      setStep((s) => s + 1);
      return;
    }
    // Final step — create the account.
    setLoading(true);
    try {
      await registerCommuter({ name: name.trim(), email: email.trim(), password, phoneNumber: phone.trim() });
      toast.success("Account created — you can sign in now.");
      Alert.alert("Welcome to Sabako", "Your account is ready. Sign in to get moving.", [
        { text: "Sign in", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const current = STEPS[step];
  const stepMeta: Record<(typeof STEPS)[number], { eyebrow: string; title: string; hint: string }> = {
    name: { eyebrow: "STEP 1", title: "What's your name?", hint: "This is how operators will see you on a report." },
    email: { eyebrow: "STEP 2", title: "Your email", hint: "You'll sign in with this and get account notices here." },
    phone: { eyebrow: "STEP 3", title: "Mobile number", hint: "Optional — helps an operator reach you about a report." },
    password: { eyebrow: "STEP 4", title: "Set a password", hint: "At least 6 characters. Keep it private." },
    agree: { eyebrow: "STEP 5", title: "Almost there", hint: "Review and accept to finish creating your account." },
  };
  const meta = stepMeta[current];

  return (
    <AuthScaffold onBack={back} brandSize={64}>
      {/* Progress */}
      <View style={{ flexDirection: "row", gap: 6, marginBottom: spacing.lg }}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= step ? palette.primary : palette.border,
            }}
          />
        ))}
      </View>

      <View>
        <Text style={[type.caption, { color: palette.accent, letterSpacing: 1.2, fontFamily: fonts.bold }]}>
          {meta.eyebrow} OF {TOTAL}
        </Text>
        <Text style={[type.title, { color: palette.text, marginTop: 4 }]}>{meta.title}</Text>
        <Text style={[type.body, { color: palette.textMuted, marginTop: 6, marginBottom: spacing.lg }]}>{meta.hint}</Text>

        {current === "name" && (
          <Field label="Full name" icon="person-outline" value={name} onChangeText={setName} placeholder="Juan Dela Cruz" autoFocus returnKeyType="next" onSubmitEditing={next} />
        )}
        {current === "email" && (
          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={next}
          />
        )}
        {current === "phone" && (
          <Field label="Mobile number" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="09XXXXXXXXX" autoFocus />
        )}
        {current === "password" && (
          <>
            <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" autoFocus />
            <Field label="Confirm password" icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Re-enter your password" />
          </>
        )}
        {current === "agree" && (
          <View>
            <View style={[styles.reviewCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
              <ReviewRow label="Name" value={name} />
              <ReviewRow label="Email" value={email} />
              {!!phone.trim() && <ReviewRow label="Phone" value={phone} />}
            </View>

            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <CheckRow checked={agreeTerms} onToggle={() => setAgreeTerms((v) => !v)}>
                I have read and agree to the{" "}
                <Text style={{ color: palette.primary, fontFamily: fonts.bold }} onPress={() => navigation.navigate("Legal", { doc: "terms" })}>
                  Terms &amp; Conditions
                </Text>
                .
              </CheckRow>
              <CheckRow checked={agreePrivacy} onToggle={() => setAgreePrivacy((v) => !v)}>
                I have read and agree to the{" "}
                <Text style={{ color: palette.primary, fontFamily: fonts.bold }} onPress={() => navigation.navigate("Legal", { doc: "privacy" })}>
                  Privacy Policy
                </Text>
                .
              </CheckRow>
            </View>
          </View>
        )}

        {!!error && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm }}>
            <Ionicons name="alert-circle" size={14} color={palette.danger} />
            <Text style={[type.caption, { color: palette.danger, flex: 1 }]}>{error}</Text>
          </View>
        )}
      </View>

      <View style={{ height: spacing.md }} />
      <Button
        title={step < TOTAL - 1 ? "Continue" : "Create Account"}
        icon={step < TOTAL - 1 ? "arrow-forward" : "checkmark"}
        onPress={next}
        loading={loading}
      />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.md }}>
        <Text style={[type.body, { color: palette.textMuted }]}>Already have an account? </Text>
        <Pressable onPress={() => navigation.navigate("Login")} hitSlop={8}>
          <Text style={[type.body, { color: palette.primary, fontFamily: fonts.bold }]}>Sign in</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

/** A read-only summary line on the final review step. */
function ReviewRow({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm }}>
      <Text style={[type.label, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[type.body, { color: palette.text, flexShrink: 1, textAlign: "right" }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** Checkbox + tappable rich label. Toggling the box is separate from the links. */
function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
      <Pressable
        onPress={() => {
          haptics.selection();
          onToggle();
        }}
        hitSlop={8}
        style={[
          styles.box,
          { borderColor: checked ? palette.primary : palette.border, backgroundColor: checked ? palette.primary : "transparent" },
        ]}
      >
        {checked && <Ionicons name="checkmark" size={15} color={palette.onPrimary} />}
      </Pressable>
      <Text style={[type.body, { color: palette.textMuted, flex: 1, lineHeight: 22 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  reviewCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
