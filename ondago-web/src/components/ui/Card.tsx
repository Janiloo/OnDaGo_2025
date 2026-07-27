import React from "react";
import { Link } from "react-router-dom";
import s from "./Card.module.css";

/** A surface. Replaces the `card` style object that was redefined on 12 pages. */
export function Card({
  padded = true,
  interactive = false,
  children,
  style,
  onClick,
}: {
  padded?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      className={[s.card, padded ? s.padded : "", interactive ? s.interactive : ""].filter(Boolean).join(" ")}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/** Titled bar for the top of an unpadded Card. */
export function CardHeader({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className={s.cardHeader}>
      <h2 className={s.cardTitle}>{title}</h2>
      {actions}
    </div>
  );
}

/**
 * Standard page title block: heading, brand pinstripe, optional description and
 * right-aligned actions. Replaces the per-page `h1` + `sub` pairs.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className={s.pageHeader}>
      <div className={s.pageHeaderTop}>
        <div>
          <h1 className={s.h1}>{title}</h1>
          <div className={s.pinstripe} aria-hidden="true" />
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </div>
      {description && <p className={s.sub}>{description}</p>}
    </header>
  );
}

/** Small uppercase label that groups content within a page. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className={s.sectionTitle}>{children}</h2>;
}

/**
 * A single KPI. Value uses tabular numerals so live updates don't shift width.
 * Pass `to` to make it a link to its detail page (adds a hover affordance).
 */
export function StatCard({
  label,
  value,
  hint,
  to,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  to?: string;
}) {
  const inner = (
    <>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
      {hint && <span className={s.statHint}>{hint}</span>}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={[s.stat, s.statLink].join(" ")}>
        {inner}
      </Link>
    );
  }
  return <div className={s.stat}>{inner}</div>;
}
