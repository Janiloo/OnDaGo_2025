import React, { useState } from "react";
import { Alert } from "react-native";
import { Button, Field, Screen, Subtitle, Title } from "../../components/UI";
import { createReport } from "../../services/reportApi";
import { errorMessage } from "../../services/client";
import { useAuth } from "../../store/AuthContext";

/** Report submission for commuters and drivers. */
export default function ReportScreen() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert("Missing fields", "Please provide a subject and a description.");
      return;
    }
    setLoading(true);
    try {
      await createReport({
        userId: user?.id || null,
        subject: subject.trim(),
        description: description.trim(),
      });
      setSubject("");
      setDescription("");
      Alert.alert("Report sent", "Thank you — an admin will review your report.");
    } catch (error) {
      Alert.alert("Failed to send", errorMessage(error));
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
        onChangeText={setSubject}
        placeholder="e.g. Overcharging on fare"
      />
      <Field
        label="Description"
        icon="document-text-outline"
        value={description}
        onChangeText={setDescription}
        placeholder="What happened?"
        multiline
        numberOfLines={6}
        style={{ height: 140, textAlignVertical: "top" }}
      />
      <Button title="Submit Report" icon="send-outline" onPress={submit} loading={loading} />
    </Screen>
  );
}
