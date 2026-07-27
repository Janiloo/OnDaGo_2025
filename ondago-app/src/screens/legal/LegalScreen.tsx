import React from "react";
import { ScrollView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pinstripe } from "../../components/Brand";
import { COMBINED, PRIVACY, LegalDoc } from "../../content/legal";
import { useTheme } from "../../store/ThemeContext";
import { fonts, spacing, type } from "../../theme";
import { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Legal">;

// The "terms" link opens the combined Terms + Privacy agreement; the separate
// "privacy" link opens the standalone Privacy Policy.
const DOCS: Record<string, LegalDoc> = { terms: COMBINED, privacy: PRIVACY };

/** Renders a legal document (combined Terms+Privacy, or Privacy) by route param. */
export default function LegalScreen({ route }: Props) {
  const { palette } = useTheme();
  const doc = DOCS[route.params?.doc ?? "terms"] ?? COMBINED;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[type.display, { color: palette.text, fontSize: 28 }]}>{doc.title}</Text>
      <Pinstripe width={64} style={{ marginTop: spacing.sm }} />
      <Text style={[type.caption, { color: palette.textMuted, marginTop: spacing.sm }]}>{doc.updated}</Text>

      {doc.intro.map((para, i) => (
        <Text key={`intro-${i}`} style={[type.body, { color: palette.textMuted, marginTop: spacing.md, lineHeight: 22 }]}>
          {para}
        </Text>
      ))}

      {doc.sections.map((section, si) => (
        <View key={si} style={{ marginTop: spacing.xl }}>
          <Text style={{ color: palette.text, fontFamily: fonts.bold, fontSize: 16, marginBottom: spacing.sm }}>
            {section.h}
          </Text>
          {section.p.map((para, pi) => (
            <Text
              key={pi}
              style={[
                type.body,
                { color: palette.textMuted, lineHeight: 22, marginBottom: spacing.sm, paddingLeft: para.startsWith("•") ? spacing.sm : 0 },
              ]}
            >
              {para}
            </Text>
          ))}
        </View>
      ))}

      <View style={{ height: spacing.xl, borderTopWidth: 1, borderTopColor: palette.border, marginTop: spacing.xl, paddingTop: spacing.md }}>
        <Text style={[type.caption, { color: palette.textMuted, lineHeight: 18 }]}>
          This document is provided in good faith for a public-transport information service and is not legal advice. Have it reviewed by counsel before relying on it.
        </Text>
      </View>
    </ScrollView>
  );
}
