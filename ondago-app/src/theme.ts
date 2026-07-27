/**
 * Sabako design tokens. Single source of truth for color, spacing, radius, and
 * type. Components read the active palette via useTheme()
 * (src/store/ThemeContext.tsx) — never import a palette directly.
 *
 * Identity: "jeepney at dusk" — hand-painted enamel vermillion and the
 * marigold sun of the flag over a deep indigo night. Deliberately NOT the stock
 * Tailwind orange/green/red; the console (web) shares this palette so the two
 * halves of Sabako read as one product.
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
  /** Two-stop background gradient for hero/auth surfaces (dusk sky). */
  heroGradient: [string, string];
}

export const palettes: { light: Palette; dark: Palette } = {
  // Daylight: warm paper, not the usual cold blue-grey.
  light: {
    bg: "#F5F3EE",
    surface: "#FFFFFF",
    surfaceAlt: "#EDEAE1",
    text: "#171310",
    textMuted: "#6A6355",
    border: "#E3DFD3",
    primary: "#E24E1B", // enamel vermillion
    onPrimary: "#1B0E07", // dark ink on vermillion — signage, not generic white
    primarySoft: "#FBE3D6",
    accent: "#E0961A", // marigold, darkened for light surfaces
    accentSoft: "#FBEBCB",
    success: "#1E9E63",
    successSoft: "#D8F0E2",
    danger: "#D34632",
    dangerSoft: "#F8DED8",
    warning: "#B4761A",
    warningSoft: "#FaebCE",
    overlay: "rgba(23, 19, 16, 0.82)",
    tabBar: "#FFFFFF",
    shadow: "rgba(60, 40, 20, 0.12)",
    heroGradient: ["#FBEEE4", "#F5F3EE"],
  },
  // Dusk: deep indigo night.
  dark: {
    bg: "#0B0E1A",
    surface: "#141827",
    surfaceAlt: "#1D2233",
    text: "#EEF1F8",
    textMuted: "#9AA3B8",
    border: "#2A3145",
    primary: "#E24E1B", // enamel vermillion (same hue as web for brand unity)
    onPrimary: "#1B0E07", // dark ink on vermillion (4.9:1 AA, painted-signage look)
    primarySoft: "#3A1B10",
    accent: "#F2B233", // marigold, the sun of the flag
    accentSoft: "#3A2C10",
    success: "#3FBF7F",
    successSoft: "#0F2E20",
    danger: "#F2624F",
    dangerSoft: "#3A1714",
    warning: "#E8A020",
    warningSoft: "#382A0F",
    overlay: "rgba(11, 14, 26, 0.88)",
    tabBar: "#0E1220",
    shadow: "rgba(0, 0, 0, 0.5)",
    heroGradient: ["#241B33", "#0B0E1A"], // warm-tinted indigo fading to night
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

/**
 * Archivo family names, as registered with expo-font in App.tsx. Archivo is a
 * grotesque with the heavy, slightly condensed cuts that echo hand-painted
 * jeepney signboards — the display voice of the brand.
 *
 * With custom fonts the weight lives in the FILE, not in `fontWeight` (Android
 * ignores fontWeight on a specific-weight family). Always pick the family for
 * the weight you want.
 */
export const fonts = {
  medium: "Archivo_500Medium",
  semibold: "Archivo_600SemiBold",
  bold: "Archivo_700Bold",
  extrabold: "Archivo_800ExtraBold",
  black: "Archivo_900Black",
} as const;

/**
 * Type scale with intentional weight + size contrast (the previous scale was
 * near-uniform, which read as "template"). Display/title use the black &
 * extrabold cuts; body/caption sit in medium so headings truly pop.
 */
export const type = {
  // No fixed lineHeight on display/title: screens sometimes override fontSize,
  // and a smaller inherited lineHeight would clip tall Archivo Black glyphs.
  // letterSpacing kept modest — large negative values can clip trailing glyphs
  // of custom fonts on Android.
  display: { fontSize: 30, fontFamily: fonts.black, letterSpacing: -0.5 },
  title: { fontSize: 21, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
  heading: { fontSize: 16, fontFamily: fonts.bold, letterSpacing: -0.1 },
  body: { fontSize: 15, fontFamily: fonts.medium, lineHeight: 21 },
  label: { fontSize: 13, fontFamily: fonts.semibold },
  caption: { fontSize: 12, fontFamily: fonts.medium },
} as const;

/** Every Archivo weight, keyed for expo-font's useFonts(). */
export const archivoFontMap = {
  Archivo_500Medium: require("@expo-google-fonts/archivo/500Medium/Archivo_500Medium.ttf"),
  Archivo_600SemiBold: require("@expo-google-fonts/archivo/600SemiBold/Archivo_600SemiBold.ttf"),
  Archivo_700Bold: require("@expo-google-fonts/archivo/700Bold/Archivo_700Bold.ttf"),
  Archivo_800ExtraBold: require("@expo-google-fonts/archivo/800ExtraBold/Archivo_800ExtraBold.ttf"),
  Archivo_900Black: require("@expo-google-fonts/archivo/900Black/Archivo_900Black.ttf"),
} as const;

/**
 * Shared animation timing. Keep transitions in the 150–320ms band — long
 * enough to read as motion, short enough to never feel sluggish. Spring
 * presets are spread straight into Animated.spring configs.
 */
export const motion = {
  duration: { fast: 150, base: 220, slow: 320 },
  spring: {
    snappy: { speed: 18, bounciness: 6 },
    gentle: { speed: 12, bounciness: 4 },
  },
} as const;

/** Consistent, theme-aware elevation. Level scales shadow blur/offset together. */
export function elevation(level: 1 | 2 | 3, shadowColor: string) {
  const m = { 1: { r: 8, y: 2, e: 2 }, 2: { r: 14, y: 6, e: 5 }, 3: { r: 24, y: 12, e: 12 } }[level];
  return {
    shadowColor,
    shadowOpacity: 1,
    shadowRadius: m.r,
    shadowOffset: { width: 0, height: m.y },
    elevation: m.e,
  };
}

/** Brand background used by the native + animated splash (theme-independent). */
export const BRAND_BG = "#0B1220";

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
