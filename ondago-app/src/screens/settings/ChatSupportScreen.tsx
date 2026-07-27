import React, { useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field, Screen } from "../../components/UI";
import { Pinstripe } from "../../components/Brand";
import { SuccessModal } from "../../components/SuccessModal";
import { sendSupportMessage } from "../../services/supportApi";
import { errorMessage } from "../../services/client";
import { useToast } from "../../components/Toast";
import { useTheme } from "../../store/ThemeContext";
import { radius, spacing, type } from "../../theme";

/** Chat with Support: a subject + message form that emails the Sabako support
 *  inbox (via the backend), then confirms with an animated success modal. */
export default function ChatSupportScreen({ navigation }: any) {
  const { palette } = useTheme();
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const next: typeof errors = {};
    if (!subject.trim()) next.subject = "Add a subject.";
    if (!message.trim()) next.message = "Write your message.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await sendSupportMessage(subject.trim(), message.trim());
      setSent(true);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
        <Text style={[type.display, { color: palette.text, fontSize: 28 }]}>Chat with support</Text>
        <Pinstripe width={64} style={{ marginTop: spacing.sm }} />
        <Text style={[type.body, { color: palette.textMuted, marginTop: spacing.md }]}>
          Send us a message and the Sabako team will get back to you by email.
        </Text>
      </View>

      {/* Reassurance chip */}
      <View style={[styles.notice, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name="mail-outline" size={16} color={palette.primary} />
        <Text style={[type.caption, { color: palette.text, flex: 1 }]}>
          We reply to the email on your account.
        </Text>
      </View>

      <Field
        label="Subject"
        icon="pricetag-outline"
        value={subject}
        onChangeText={(t) => {
          setSubject(t);
          if (errors.subject) setErrors((e) => ({ ...e, subject: undefined }));
        }}
        placeholder="e.g. I can't see my bus company"
        error={errors.subject}
      />
      <Field
        label="Message"
        icon="chatbubble-ellipses-outline"
        value={message}
        onChangeText={(t) => {
          setMessage(t);
          if (errors.message) setErrors((e) => ({ ...e, message: undefined }));
        }}
        placeholder="How can we help?"
        multiline
        numberOfLines={7}
        style={{ height: 160, textAlignVertical: "top" }}
        error={errors.message}
      />

      <Button title="Send Message" icon="send" onPress={send} loading={loading} />

      <SuccessModal
        visible={sent}
        title="Message sent"
        message="Your support request was sent successfully. We'll reply to your email soon."
        actionLabel="Done"
        onClose={() => {
          setSent(false);
          setSubject("");
          setMessage("");
          navigation.goBack();
        }}
      />
    </Screen>
  );
}

const styles = {
  notice: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
};
