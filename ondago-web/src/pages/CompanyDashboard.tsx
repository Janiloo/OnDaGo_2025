import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import { api } from "../api/client";
import { COMPANY_NAV, RouteInfo, Terminal, Vehicle } from "../companyNav";
import { colors, radius } from "../theme";

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [terminals, setTerminals] = useState<Terminal[] | null>(null);
  const [routes, setRoutes] = useState<RouteInfo[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);

  useEffect(() => {
    api.get<Terminal[]>("/api/admin/terminals").then(({ data }) => setTerminals(data)).catch(() => setTerminals([]));
    api.get<RouteInfo[]>("/api/admin/routes").then(({ data }) => setRoutes(data)).catch(() => setRoutes([]));
    api.get<Vehicle[]>("/api/Vehicle").then(({ data }) => setVehicles(data)).catch(() => setVehicles([]));
  }, []);

  const count = (list: { status?: string }[] | null, activeOnly = true) =>
    list === null ? "…" : String(activeOnly ? list.filter((x) => x.status === "Active").length : list.length);

  const assigned = vehicles === null ? "…" : String(vehicles.filter((v) => v.routeId).length);

  return (
    <Layout area="Company" nav={COMPANY_NAV}>
      <h1 style={s.h1}>Company overview</h1>
      <p style={s.sub}>
        You're signed in as a <b>company admin</b>. This is the system of record for your cooperative's
        terminals, routes, vehicles, drivers, fares, and reports.
      </p>

      <div style={s.grid}>
        <Stat label="Terminals" value={count(terminals)} hint="active boarding hubs" to="/company/terminals" />
        <Stat label="Routes" value={count(routes)} hint="active chains" to="/company/routes" />
        <Stat label="Vehicles" value={vehicles === null ? "…" : String(vehicles.length)} hint={`${assigned} on a route`} to="/company/vehicles" />
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Set up your network</div>
        <ol style={s.list}>
          <li>
            <Link to="/company/terminals" style={s.link}>Create terminals</Link> — your boarding hubs (name + coordinates)
          </li>
          <li>
            <Link to="/company/routes" style={s.link}>Chain them into routes</Link> — origin → destination
          </li>
          <li>
            <Link to="/company/vehicles" style={s.link}>Assign vehicles to routes</Link> — so commuters can filter the live map
          </li>
        </ol>
      </div>

      <div style={s.debug}>
        session · role=<b>{user?.role}</b> · platformAdmin=<b>{String(user?.isPlatformAdmin)}</b> · companyId=
        <b>{user?.companyId ?? "—"}</b>
      </div>
    </Layout>
  );
}

function Stat({ label, value, hint, to }: { label: string; value: string; hint: string; to: string }) {
  return (
    <Link to={to} style={s.stat}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statHint}>{hint}</div>
    </Link>
  );
}

const s: any = {
  h1: { fontSize: 26, fontWeight: 800, color: colors.text, margin: "0 0 8px" },
  sub: { color: colors.textMuted, fontSize: 15, maxWidth: 680, lineHeight: 1.6, marginTop: 0 },
  grid: { display: "flex", gap: 16, margin: "24px 0", flexWrap: "wrap" },
  stat: { flex: 1, minWidth: 150, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20, textDecoration: "none", cursor: "pointer" },
  statValue: { fontSize: 30, fontWeight: 800, color: colors.primary },
  statLabel: { fontSize: 14, fontWeight: 700, color: colors.text, marginTop: 4 },
  statHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  card: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20, maxWidth: 680 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 },
  list: { margin: 0, paddingLeft: 18, color: colors.text, lineHeight: 2, fontSize: 14 },
  link: { color: colors.primary, fontWeight: 700, textDecoration: "none" },
  debug: { marginTop: 24, fontSize: 12, color: colors.textMuted, fontFamily: "monospace" },
};
