/**
 * Sabako web design tokens (JS mirror of src/styles/tokens.css).
 *
 * PREFER CSS MODULES for new work — they can express :hover, :focus-visible,
 * transitions and media queries, which inline style objects cannot. This module
 * exists for the JS-side call sites (and the pages not yet migrated).
 * When you edit a value here, edit tokens.css too.
 *
 * Direction: "jeepney at dusk" — enamel vermillion + the flag's marigold sun
 * over deep indigo, replacing the previous stock-Tailwind palette.
 */

export const colors = {
  // Surfaces
  bg: "#0B0E1A",
  surface: "#141827",
  surfaceAlt: "#1D2233",
  surfaceHover: "#232941",
  border: "#2A3145",
  borderStrong: "#3A4460",

  // Text
  text: "#EEF1F8",
  textMuted: "#9AA3B8",
  textFaint: "#6B7590",

  // Brand — dark text on vermillion (4.9:1 AA, reads like painted signage)
  primary: "#E24E1B",
  primaryHover: "#F25F2D",
  primaryActive: "#C94214",
  primarySoft: "#3A1B10",
  onPrimary: "#0B0E1A",

  // Accent — marigold, the sun of the flag
  accent: "#F2B233",
  accentSoft: "#3A2C10",
  onAccent: "#0B0E1A",

  // Status
  success: "#3FBF7F",
  successSoft: "#0F2E20",
  danger: "#F2624F",
  dangerSoft: "#3A1714",
  warning: "#E8A020",
  warningSoft: "#382A0F",
  info: "#3D7BE0", // flag blue
  infoSoft: "#12233F",

  // Scrims
  overlay: "rgba(11, 14, 26, 0.88)",
} as const;

/** 4px base scale. Use these instead of ad-hoc padding numbers. */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const font = {
  display: '"Archivo Black", "Archivo", system-ui, -apple-system, "Segoe UI", sans-serif',
  sans: '"Archivo", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace',
} as const;

/** Type scale in px — pair sizes with the intended family. */
export const type = {
  display: 30,
  h1: 24,
  h2: 18,
  body: 14,
  sm: 13,
  xs: 11,
} as const;

/** One elevation scale, so shadows stop being invented per component. */
export const elevation = {
  1: "0 1px 2px rgba(0,0,0,0.30)",
  2: "0 4px 12px rgba(0,0,0,0.35)",
  3: "0 12px 32px rgba(0,0,0,0.45)",
} as const;

export const motion = {
  fast: "120ms",
  base: "180ms",
  slow: "240ms",
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;
