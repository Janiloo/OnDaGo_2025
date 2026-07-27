import React from "react";
import s from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container width (forms, empty states). */
  block?: boolean;
  /** Shows a spinner and blocks interaction — use for in-flight requests. */
  loading?: boolean;
  /** Leading glyph/icon. */
  icon?: React.ReactNode;
}

/**
 * The console's only button. Replaces the six separate hand-rolled `primaryBtn`
 * / `smallBtn` definitions that had drifted across pages — and unlike inline
 * styles, this can express hover/active/focus/disabled states.
 */
export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  loading = false,
  icon,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[s.btn, s[variant], s[size], block ? s.block : ""].filter(Boolean).join(" ")}
    >
      {loading ? <span className={s.spinner} aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
