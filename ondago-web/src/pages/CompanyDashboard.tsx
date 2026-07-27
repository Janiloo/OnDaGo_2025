import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import { api } from "../api/client";
import { COMPANY_NAV, RouteInfo, Terminal, Vehicle } from "../companyNav";
import { Card, PageHeader, SectionTitle, StatCard } from "../components/ui";
import { colors, spacing } from "../theme";

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
      <PageHeader
        title="Company overview"
        description="You're signed in as a company admin. This is the system of record for your cooperative's terminals, routes, vehicles, drivers, fares, and reports."
      />

      <div style={grid}>
        <StatCard label="Terminals" value={count(terminals)} hint="active boarding hubs" to="/company/terminals" />
        <StatCard label="Routes" value={count(routes)} hint="active chains" to="/company/routes" />
        <StatCard
          label="Vehicles"
          value={vehicles === null ? "…" : String(vehicles.length)}
          hint={`${assigned} on a route`}
          to="/company/vehicles"
        />
      </div>

      <div style={{ maxWidth: 680 }}>
        <Card>
          <SectionTitle>Set up your network</SectionTitle>
          <ol style={list}>
            <li>
              <Link to="/company/terminals" style={link}>
                Create terminals
              </Link>{" "}
              — your boarding hubs (name + coordinates)
            </li>
            <li>
              <Link to="/company/routes" style={link}>
                Chain them into routes
              </Link>{" "}
              — origin → destination
            </li>
            <li>
              <Link to="/company/vehicles" style={link}>
                Assign vehicles to routes
              </Link>{" "}
              — so commuters can filter the live map
            </li>
          </ol>
        </Card>
      </div>

      <div style={debug}>
        session · role=<b>{user?.role}</b> · platformAdmin=<b>{String(user?.isPlatformAdmin)}</b> · companyId=
        <b>{user?.companyId ?? "—"}</b>
      </div>
    </Layout>
  );
}

// Page-specific layout only — all surfaces/typography now come from the UI kit.
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: spacing[4],
  margin: `0 0 ${spacing[6]}px`,
};
const list: React.CSSProperties = { margin: 0, paddingLeft: spacing[5], color: colors.text, lineHeight: 2, fontSize: 14 };
const link: React.CSSProperties = { color: colors.primary, fontWeight: 700, textDecoration: "none" };
const debug: React.CSSProperties = { marginTop: spacing[6], fontSize: 12, color: colors.textFaint, fontFamily: "monospace" };
