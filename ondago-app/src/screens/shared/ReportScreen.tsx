import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field, IconName, Screen, SectionHeader } from "../../components/UI";
import { Pinstripe } from "../../components/Brand";
import { PickerField, PickerOption } from "../../components/PickerField";
import { createReport } from "../../services/reportApi";
import { getCompanies, getCompanyVehicles } from "../../services/discoveryApi";
import { errorMessage } from "../../services/client";
import { useAuth } from "../../store/AuthContext";
import { useToast } from "../../components/Toast";
import { fonts, radius, spacing, type } from "../../theme";
import { useTheme } from "../../store/ThemeContext";

/** Report categories offered to commuters (Subject). "Other" reveals a free-text field. */
const CATEGORIES: { key: string; icon: IconName }[] = [
  { key: "Harassment", icon: "hand-left-outline" },
  { key: "Reckless Driving", icon: "warning-outline" },
  { key: "Overcharging", icon: "cash-outline" },
  { key: "Vehicle Issue", icon: "construct-outline" },
  { key: "Other", icon: "ellipsis-horizontal-outline" },
];

/** Shared page header: display title + pinstripe + subtitle. */
function ReportHeader({ subtitle }: { subtitle: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
      <Text style={[type.display, { color: palette.text, fontSize: 30 }]}>Report an issue</Text>
      <Pinstripe width={64} style={{ marginTop: spacing.sm }} />
      <Text style={[type.body, { color: palette.textMuted, marginTop: spacing.md }]}>{subtitle}</Text>
    </View>
  );
}

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
  const { palette } = useTheme();
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
      <ReportHeader subtitle="Straight to your company admin — no need to pick a company." />

      {/* Auto-attach notice */}
      <View style={[styles.notice, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name="bus" size={16} color={palette.primary} />
        <Text style={[type.caption, { color: palette.text, flex: 1 }]}>
          Tagged automatically with your vehicle
          {user?.plateNumber ? (
            <Text style={{ fontFamily: fonts.bold, color: palette.primary }}> {user.plateNumber}</Text>
          ) : (
            ""
          )}
          .
        </Text>
      </View>

      <Field
        label="Subject"
        icon="alert-circle-outline"
        value={subject}
        onChangeText={(t) => {
          setSubject(t);
          if (errors.subject) setErrors((e) => ({ ...e, subject: undefined }));
        }}
        placeholder="e.g. Terminal congestion at Cubao"
        error={errors.subject}
      />
      <Field
        label="Description"
        icon="document-text-outline"
        value={description}
        onChangeText={(t) => {
          setDescription(t);
          if (errors.description) setErrors((e) => ({ ...e, description: undefined }));
        }}
        placeholder="What happened?"
        multiline
        numberOfLines={6}
        style={{ height: 140, textAlignVertical: "top" }}
        error={errors.description}
      />
      <Button title="Submit Report" icon="send" onPress={submit} loading={loading} />
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
      <ReportHeader subtitle="Tell us what happened. Only the bus company and a description are required." />

      <SectionHeader title="What kind of issue?" icon="pricetag-outline" />
      <View style={styles.chips}>
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => {
                setCategory(c.key);
                setErrors((e) => ({ ...e, category: undefined }));
              }}
              style={[
                styles.chip,
                {
                  borderColor: active ? palette.primary : palette.border,
                  backgroundColor: active ? palette.primary : palette.surfaceAlt,
                },
              ]}
            >
              <Ionicons name={c.icon} size={15} color={active ? palette.onPrimary : palette.textMuted} />
              <Text
                style={{
                  color: active ? palette.onPrimary : palette.text,
                  fontFamily: active ? fonts.bold : fonts.semibold,
                  fontSize: 13,
                }}
              >
                {c.key}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!!errors.category && (
        <Text style={[type.caption, { color: palette.danger, marginBottom: spacing.sm }]}>{errors.category}</Text>
      )}

      {category === "Other" && (
        <Field
          label="Subject"
          icon="create-outline"
          value={customSubject}
          onChangeText={(t) => {
            setCustomSubject(t);
            if (errors.custom) setErrors((e) => ({ ...e, custom: undefined }));
          }}
          placeholder="Short summary"
          error={errors.custom}
        />
      )}

      <SectionHeader title="Which operator?" icon="business-outline" />
      <PickerField
        label="Bus company *"
        icon="business-outline"
        placeholder="Select the operator"
        value={companyId}
        options={companies}
        onSelect={(k) => {
          setCompanyId(k);
          setErrors((e) => ({ ...e, company: undefined }));
        }}
        error={errors.company}
        emptyText="No companies published yet."
      />
      <PickerField
        label="Plate / PUV number (optional)"
        icon="bus-outline"
        placeholder={!companyId ? "Choose a company first" : platesLoading ? "Loading…" : plates.length ? "Select a plate" : "No plates listed"}
        value={plate}
        options={plates}
        onSelect={(k) => setPlate(k)}
        disabled={!companyId || platesLoading}
        emptyText="This company has no plates listed."
      />

      <SectionHeader title="What happened?" icon="document-text-outline" />
      <Field
        label="Description *"
        icon="document-text-outline"
        value={description}
        onChangeText={(t) => {
          setDescription(t);
          if (errors.description) setErrors((e) => ({ ...e, description: undefined }));
        }}
        placeholder="Describe the incident in a few sentences."
        multiline
        numberOfLines={6}
        style={{ height: 130, textAlignVertical: "top" }}
        error={errors.description}
      />

      <SectionHeader title="Incident details (optional)" icon="time-outline" />
      <Pressable
        onPress={() => setPickerStage(Platform.OS === "android" ? "date" : "time")}
        style={[styles.dateField, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}
      >
        <Ionicons name="calendar-outline" size={18} color={palette.textMuted} style={{ marginRight: spacing.sm }} />
        <Text style={{ flex: 1, fontSize: 15, fontFamily: fonts.medium, color: incidentAt ? palette.text : palette.textMuted }}>
          {incidentLabel}
        </Text>
        {incidentAt && (
          <Pressable onPress={() => setIncidentAt(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </Pressable>
        )}
      </Pressable>
      {pickerStage !== "none" && (
        <DateTimePicker value={incidentAt ?? new Date()} mode={pickerStage === "time" ? "time" : "date"} maximumDate={new Date()} onChange={onPickerChange} />
      )}

      <Field label="Location (optional)" icon="location-outline" value={location} onChangeText={setLocation} placeholder="e.g. near Cubao terminal" />

      <View style={{ height: spacing.xs }} />
      <Button title="Submit Report" icon="send" onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
  },
});
