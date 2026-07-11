import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field, IconName, Screen, SectionHeader, Subtitle, Title } from "../../components/UI";
import { PickerField, PickerOption } from "../../components/PickerField";
import { createReport } from "../../services/reportApi";
import { getCompanies, getCompanyVehicles } from "../../services/discoveryApi";
import { errorMessage } from "../../services/client";
import { useAuth } from "../../store/AuthContext";
import { useToast } from "../../components/Toast";
import { radius, spacing, type } from "../../theme";
import { useTheme } from "../../store/ThemeContext";

/** Report categories offered to commuters (Subject). "Other" reveals a free-text field. */
const CATEGORIES: { key: string; icon: IconName }[] = [
  { key: "Harassment", icon: "hand-left-outline" },
  { key: "Reckless Driving", icon: "warning-outline" },
  { key: "Overcharging", icon: "cash-outline" },
  { key: "Vehicle Issue", icon: "construct-outline" },
  { key: "Other", icon: "ellipsis-horizontal-outline" },
];

export default function ReportScreen() {
  const { user } = useAuth();
  return user?.role === "Driver" ? <DriverReportForm /> : <CommuterReportForm />;
}

/* -------------------------- Driver: minimal form --------------------------- */
// The server auto-associates the report with the driver's account, company, and
// assigned vehicle — so the driver only writes what happened.
function DriverReportForm() {
  const { user } = useAuth();
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!subject.trim()) next.subject = "A subject is required.";
    if (!description.trim()) next.description = "Please describe the issue.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await createReport({ userId: user?.id || null, subject: subject.trim(), description: description.trim() });
      setSubject("");
      setDescription("");
      toast.success("Report sent to your company admin.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Report an issue</Title>
      <Subtitle>Sent to your company admin, tagged with your vehicle{user?.plateNumber ? ` (${user.plateNumber})` : ""}.</Subtitle>
      <Field
        label="Subject"
        icon="alert-circle-outline"
        value={subject}
        onChangeText={(t) => { setSubject(t); if (errors.subject) setErrors((e) => ({ ...e, subject: undefined })); }}
        placeholder="e.g. Terminal congestion at Cubao"
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

/* ------------------------- Commuter: full form ----------------------------- */
function CommuterReportForm() {
  const { user } = useAuth();
  const toast = useToast();
  const { palette } = useTheme();

  const [category, setCategory] = useState<string>("");
  const [customSubject, setCustomSubject] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [plate, setPlate] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [incidentAt, setIncidentAt] = useState<Date | null>(null);
  const [location, setLocation] = useState("");

  const [companies, setCompanies] = useState<PickerOption[]>([]);
  const [plates, setPlates] = useState<PickerOption[]>([]);
  const [platesLoading, setPlatesLoading] = useState(false);
  const [errors, setErrors] = useState<{ category?: string; company?: string; description?: string; custom?: string }>({});
  const [loading, setLoading] = useState(false);
  const [pickerStage, setPickerStage] = useState<"none" | "date" | "time">("none");

  // Bus companies from the discovery layer (existing system data, not free text).
  useEffect(() => {
    getCompanies()
      .then((list) => setCompanies(list.map((c) => ({ key: c.id, label: c.name }))))
      .catch(() => {});
  }, []);

  // Plates for the chosen company (optional picker); reset when company changes.
  useEffect(() => {
    setPlate(null);
    setPlates([]);
    if (!companyId) return;
    setPlatesLoading(true);
    getCompanyVehicles(companyId)
      .then((list) => setPlates(list.map((v) => ({ key: v.puvNo, label: v.puvNo }))))
      .catch(() => {})
      .finally(() => setPlatesLoading(false));
  }, [companyId]);

  const subject = category === "Other" ? customSubject.trim() : category;

  const submit = async () => {
    const next: typeof errors = {};
    if (!category) next.category = "Choose a category.";
    if (category === "Other" && !customSubject.trim()) next.custom = "Describe the subject.";
    if (!companyId) next.company = "Select the bus company.";
    if (!description.trim()) next.description = "Please describe what happened.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await createReport({
        userId: user?.id || null,
        subject,
        description: description.trim(),
        companyId,
        plateNumber: plate, // optional
        incidentAt: incidentAt ? incidentAt.toISOString() : null,
        incidentLocation: location.trim() || null,
      });
      // Reset
      setCategory("");
      setCustomSubject("");
      setCompanyId(null);
      setPlate(null);
      setDescription("");
      setIncidentAt(null);
      setLocation("");
      toast.success("Report sent — the bus company's admin will review it.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Android picks date then time in two steps; iOS shows a combined spinner.
  const onPickerChange = (event: any, picked?: Date) => {
    if (event?.type === "dismissed" || !picked) {
      setPickerStage("none");
      return;
    }
    if (Platform.OS === "android" && pickerStage === "date") {
      // Keep the date, advance to the time step.
      const base = incidentAt ?? new Date();
      const merged = new Date(picked);
      merged.setHours(base.getHours(), base.getMinutes());
      setIncidentAt(merged);
      setPickerStage("time");
      return;
    }
    setIncidentAt(picked);
    setPickerStage("none");
  };

  const incidentLabel = incidentAt
    ? incidentAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Add date & time (optional)";

  return (
    <Screen>
      <Title>Report an issue</Title>
      <Subtitle>Tell us what happened. Only the bus company and a description are required.</Subtitle>

      <SectionHeader title="Category" icon="pricetag-outline" />
      <View style={styles.chips}>
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => { setCategory(c.key); setErrors((e) => ({ ...e, category: undefined })); }}
              style={[
                styles.chip,
                { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? palette.primarySoft : palette.surfaceAlt },
              ]}
            >
              <Ionicons name={c.icon} size={15} color={active ? palette.primary : palette.textMuted} />
              <Text style={[type.caption, { color: active ? palette.primary : palette.text, fontWeight: "700" }]}>{c.key}</Text>
            </Pressable>
          );
        })}
      </View>
      {!!errors.category && <Text style={[type.caption, { color: palette.danger, marginBottom: spacing.sm }]}>{errors.category}</Text>}

      {category === "Other" && (
        <Field
          label="Subject"
          icon="create-outline"
          value={customSubject}
          onChangeText={(t) => { setCustomSubject(t); if (errors.custom) setErrors((e) => ({ ...e, custom: undefined })); }}
          placeholder="Short summary"
          error={errors.custom}
        />
      )}

      <View style={{ height: spacing.sm }} />
      <PickerField
        label="Bus Company *"
        icon="business-outline"
        placeholder="Select the operator"
        value={companyId}
        options={companies}
        onSelect={(k) => { setCompanyId(k); setErrors((e) => ({ ...e, company: undefined })); }}
        error={errors.company}
        emptyText="No companies published yet."
      />

      <PickerField
        label="Plate / PUV Number (optional)"
        icon="bus-outline"
        placeholder={!companyId ? "Choose a company first" : platesLoading ? "Loading…" : plates.length ? "Select a plate" : "No plates listed"}
        value={plate}
        options={plates}
        onSelect={(k) => setPlate(k)}
        disabled={!companyId || platesLoading}
        emptyText="This company has no plates listed."
      />

      <Field
        label="Description *"
        icon="document-text-outline"
        value={description}
        onChangeText={(t) => { setDescription(t); if (errors.description) setErrors((e) => ({ ...e, description: undefined })); }}
        placeholder="What happened?"
        multiline
        numberOfLines={6}
        style={{ height: 130, textAlignVertical: "top" }}
        error={errors.description}
      />

      <SectionHeader title="Incident details (optional)" icon="time-outline" />
      <Pressable
        onPress={() => setPickerStage(Platform.OS === "android" ? "date" : "time")}
        style={[styles.dateField, { backgroundColor: palette.surfaceAlt }]}
      >
        <Ionicons name="calendar-outline" size={18} color={palette.textMuted} style={{ marginRight: spacing.sm }} />
        <Text style={{ flex: 1, fontSize: 15, color: incidentAt ? palette.text : palette.textMuted }}>{incidentLabel}</Text>
        {incidentAt && (
          <Pressable onPress={() => setIncidentAt(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </Pressable>
        )}
      </Pressable>
      {pickerStage !== "none" && (
        <DateTimePicker
          value={incidentAt ?? new Date()}
          mode={pickerStage === "time" ? "time" : "date"}
          maximumDate={new Date()}
          onChange={onPickerChange}
        />
      )}

      <Field
        label="Location (optional)"
        icon="location-outline"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. near Cubao terminal"
      />

      <Button title="Submit Report" icon="send-outline" onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    marginBottom: spacing.md,
  },
});
