import React from "react";
import s from "./Feedback.module.css";

export type Tone = "neutral" | "brand" | "success" | "danger" | "warning" | "info";

/** Status pill. Replaces the `pill` style redefined on 7 pages. */
export function Badge({
  tone = "neutral",
  dot = false,
  pulse = false,
  children,
}: {
  tone?: Tone;
  /** Leading dot — use for live/offline style states. */
  dot?: boolean;
  /** Animate the dot (only meaningful with `dot`). */
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={[s.badge, s[tone]].join(" ")}>
      {dot && <span className={[s.dot, pulse ? s.pulse : ""].filter(Boolean).join(" ")} aria-hidden="true" />}
      {children}
    </span>
  );
}

const alertTone = {
  error: s.alertError,
  success: s.alertSuccess,
  info: s.alertInfo,
  warning: s.alertWarning,
} as const;

/**
 * Inline message block. Replaces the hand-rolled `error` / `saved` boxes (and
 * their hardcoded `#3B1A1A` / `#12281B` backgrounds) that appeared on 10 pages.
 */
export function Alert({
  tone = "error",
  children,
}: {
  tone?: keyof typeof alertTone;
  children: React.ReactNode;
}) {
  return (
    <div className={[s.alert, alertTone[tone]].join(" ")} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

/**
 * The eight-ray sun of the Philippine flag, used as the console's empty-state
 * mark — a brand-rooted motif instead of a generic icon.
 */
function SunMark({ size = 56 }: { size?: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="9" stroke="currentColor" strokeWidth="2.5" />
      {rays.map((deg) => (
        <line
          key={deg}
          x1="32"
          y1="17"
          x2="32"
          y2="7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${deg} 32 32)`}
        />
      ))}
    </svg>
  );
}

/** Shown when a list or table has nothing in it yet. */
export function EmptyState({
  title,
  description,
  action,
  mark,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Override the default sun mark. */
  mark?: React.ReactNode;
}) {
  return (
    <div className={s.empty}>
      <span className={s.emptyMark}>{mark ?? <SunMark />}</span>
      <span className={s.emptyTitle}>{title}</span>
      {description && <p className={s.emptyBody}>{description}</p>}
      {action && <div className={s.emptyActions}>{action}</div>}
    </div>
  );
}

/** Shimmer placeholder — prefer this over a spinner for content that has shape. */
export function Skeleton({
  width = "100%",
  height = 14,
  radius,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={s.skeleton}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}
