import React, { useState } from "react";
import { Button, Field, Screen, Subtitle, Title } from "../../components/UI";
import { createReport } from "../../services/reportApi";
import { errorMessage } from "../../services/client";
import { useAuth } from "../../store/AuthContext";
import { useToast } from "../../components/Toast";

/** Report submission for commuters and drivers. */
export default function ReportScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const nextErrors: { subject?: string; description?: string } = {};
    if (!subject.trim()) nextErrors.subject = "A subject is required.";
    if (!description.trim()) nextErrors.description = "Please describe the issue.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await createReport({
        userId: user?.id || null,
        subject: subject.trim(),
        description: description.trim(),
      });
      setSubject("");
      setDescription("");
      toast.success("Report sent — an admin will review it.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Report an issue</Title>
      <Subtitle>Describe the problem and we'll route it to an admin.</Subtitle>
      <Field
        label="Subject"
        icon="alert-circle-outline"
        value={subject}
        onChangeText={(t) => { setSubject(t); if (errors.subject) setErrors((e) => ({ ...e, subject: undefined })); }}
        placeholder="e.g. Overcharging on fare"
        error={errors.subject}
      />
      <Field
        label="Description"
        icon="document-text-outline"
        value={description}
        onChangeText={(t) => { setDescription(t); if (errors.description) setErrors((e) => ({ ...e, description: undefined })); }}
        placeholder="What happened?"
        multiline
        numberOfLines={6}
        style={{ height: 140, textAlignVertical: "top" }}
        error={errors.description}
      />
      <Button title="Submit Report" icon="send-outline" onPress={submit} loading={loading} />
    </Screen>
  );
}
