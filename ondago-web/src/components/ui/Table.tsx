import React from "react";
import s from "./Table.module.css";

/**
 * Table primitives. Replace the `table` / `th` / `td` style objects that were
 * each redefined on 7 pages.
 *
 * Always wrap in <Table> — it provides the horizontal scroll container so wide
 * fleet/report tables never force the page itself to scroll sideways.
 */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.scroll}>
      <table className={s.table}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className={s.tbody}>{children}</tbody>;
}

export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr className={s.tr} onClick={onClick}>
      {children}
    </tr>
  );
}

export function TH({
  children,
  numeric = false,
  colSpan,
}: {
  children?: React.ReactNode;
  numeric?: boolean;
  colSpan?: number;
}) {
  return (
    <th className={[s.th, numeric ? s.num : ""].filter(Boolean).join(" ")} colSpan={colSpan}>
      {children}
    </th>
  );
}

export function TD({
  children,
  numeric = false,
  colSpan,
}: {
  children?: React.ReactNode;
  numeric?: boolean;
  colSpan?: number;
}) {
  return (
    <td className={[s.td, numeric ? s.num : ""].filter(Boolean).join(" ")} colSpan={colSpan}>
      {children}
    </td>
  );
}

/** Muted second line inside a cell — e.g. a route under a plate number. */
export function CellSub({ children }: { children: React.ReactNode }) {
  return <span className={s.sub}>{children}</span>;
}

/** Right-aligned action cluster; fades in on row hover (always shown on touch). */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className={s.actions}>{children}</div>;
}
