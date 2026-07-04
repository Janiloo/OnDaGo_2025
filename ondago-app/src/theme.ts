/**
 * OnDaGO design tokens. Single source of truth for color, spacing,
 * radius, and type. Components read the active palette via useTheme()
 * (src/store/ThemeContext.tsx) — never import a palette directly.
 */

export interface Palette {
  /** Screen background */
  bg: string;
  /** Cards, sheets, headers */
  surface: string;
  /** Nested/secondary surfaces (input fields, stat tiles) */
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  /** Text/icons rendered on top of primary */
  onPrimary: string;
  /** Soft tint of primary for chips/selected states */
  primarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  /** Map overlay pill background */
  overlay: string;
  tabBar: string;
  shadow: string;
}

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    bg: "#F4F6FA",
    surface: "#FFFFFF",
    surfaceAlt: "#EDF1F7",
    text: "#0E1524",
    textMuted: "#5C6B82",
    border: "#E1E7F0",
    primary: "#2563EB",
    onPrimary: "#FFFFFF",
    primarySoft: "#E4EDFF",
    accent: "#F59E0B",
    accentSoft: "#FEF1D6",
    success: "#16A34A",
    successSoft: "#DCF5E5",
    danger: "#DC2626",
    dangerSoft: "#FCE3E3",
    warning: "#B45309",
    warningSoft: "#FDEDD3",
    overlay: "rgba(14, 21, 36, 0.82)",
    tabBar: "#FFFFFF",
    shadow: "rgba(15, 32, 68, 0.10)",
  },
  dark: {
    bg: "#0B1220",
    surface: "#141D30",
    surfaceAlt: "#1C2740",
    text: "#E8EDF7",
    textMuted: "#93A1B8",
    border: "#26324B",
    primary: "#5B8DFF",
    onPrimary: "#0B1220",
    primarySoft: "#1D2C4F",
    accent: "#FBBF24",
    accentSoft: "#3A2E12",
    success: "#34D399",
    successSoft: "#123527",
    danger: "#F87171",
    dangerSoft: "#3B1A1A",
    warning: "#FBBF24",
    warningSoft: "#3A2E12",
    overlay: "rgba(11, 18, 32, 0.88)",
    tabBar: "#101828",
    shadow: "rgba(0, 0, 0, 0.45)",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 16, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
} as const;

/** Subtle Google Maps dark styling used when the app is in dark mode. */
export const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];
