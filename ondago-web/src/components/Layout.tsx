import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { colors, radius } from "../theme";

export interface NavItem {
  label: string;
  icon: string;
  /** Route to navigate to; when set the item is a link and auto-highlights. */
  to?: string;
  active?: boolean;
  disabled?: boolean;
}

export default function Layout({
  area,
  nav,
  children,
}: {
  area: "Platform" | "Company";
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <div style={s.logo}>🚌</div>
          <div>
            <div style={s.brandName}>Sabako</div>
            <div style={s.brandArea}>{area} Console</div>
          </div>
        </div>

        <nav style={s.nav}>
          {nav.map((item) => {
            const isActive = item.active ?? (item.to ? location.pathname === item.to : false);
            const inner = (
              <>
                <span style={{ width: 20 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.disabled && <span style={s.soon}>soon</span>}
              </>
            );
            const style = {
              ...s.navItem,
              ...(isActive ? s.navItemActive : {}),
              opacity: item.disabled ? 0.45 : 1,
              textDecoration: "none",
              cursor: item.disabled ? "default" : item.to ? "pointer" : "default",
            };
            if (item.to && !item.disabled) {
              return (
                <Link key={item.label} to={item.to} style={style}>
                  {inner}
                </Link>
              );
            }
            return (
              <div key={item.label} style={style}>
                {inner}
              </div>
            );
          })}
        </nav>
      </aside>

      <div style={s.main}>
        <header style={s.header}>
          <div>
            <span style={s.roleBadge(area === "Platform")}>
              {area === "Platform" ? "SUPER ADMIN" : "COMPANY ADMIN"}
            </span>
          </div>
          <div style={s.headerRight}>
            <span style={s.email}>{user?.email}</span>
            <button style={s.logout} onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>
        <div style={s.content}>{children}</div>
      </div>
    </div>
  );
}

const s: any = {
  shell: { display: "flex", minHeight: "100vh", background: colors.bg },
  sidebar: {
    width: 248,
    background: colors.surface,
    borderRight: `1px solid ${colors.border}`,
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  logo: { width: 42, height: 42, borderRadius: 12, background: colors.primary, display: "grid", placeItems: "center", fontSize: 22 },
  brandName: { fontSize: 18, fontWeight: 800, color: colors.text, lineHeight: 1 },
  brandArea: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  nav: { display: "flex", flexDirection: "column", gap: 4 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 12px",
    borderRadius: radius.md,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: 600,
  },
  navItemActive: { background: colors.primarySoft, color: colors.primary },
  soon: { marginLeft: "auto", fontSize: 10, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "1px 6px" },
  main: { flex: 1, display: "flex", flexDirection: "column" },
  header: {
    height: 64,
    borderBottom: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
  },
  roleBadge: (isSuper: boolean) => ({
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.5,
    color: isSuper ? colors.primary : colors.accent,
    background: colors.primarySoft,
    padding: "5px 10px",
    borderRadius: radius.pill,
  }),
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  email: { fontSize: 13, color: colors.textMuted },
  logout: {
    background: colors.surfaceAlt,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
  },
  content: { padding: 28, overflow: "auto" },
};
