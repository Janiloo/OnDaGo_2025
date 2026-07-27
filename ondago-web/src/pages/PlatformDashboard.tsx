import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout, { NavItem } from "../components/Layout";
import { useAuth } from "../store/AuthContext";
import { api } from "../api/client";
import { colors, radius } from "../theme";

const NAV: NavItem[] = [
  { label: "Overview", icon: "📊", to: "/platform" },
  { label: "Companies", icon: "🏢", to: "/platform/companies" },
  { label: "Platform Admins", icon: "🛡️", disabled: true },
  { label: "Settings", icon: "⚙️", disabled: true },
];

interface Company {
  id: string;
  status: string;
  verificationStatus: string;
}

export default function PlatformDashboard() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[] | null>(null);

  useEffect(() => {
    api
      .get<Company[]>("/api/platform/companies")
      .then(({ data }) => setCompanies(data))
      .catch(() => setCompanies([]));
  }, []);

  const total = companies?.length ?? "…";
  const verified = companies ? companies.filter((c) => c.verificationStatus === "Verified").length : "…";
  const suspended = companies ? companies.filter((c) => c.status === "Suspended").length : "…";

  return (
    <Layout area="Platform" nav={NAV}>
      <h1 style={s.h1}>Platform overview</h1>
      <p style={s.sub}>
        You're signed in as a Sabako <b>platform super admin</b>. From here you manage every transport company on
        the platform.
      </p>

      <div style={s.grid}>
        <Stat label="Companies" value={String(total)} hint="total registered" />
        <Stat label="Verified" value={String(verified)} hint="commuter-visible" />
        <Stat label="Suspended" value={String(suspended)} hint="access off" />
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Manage the platform</div>
        <p style={s.cardBody}>
          Register transport cooperatives, appoint their admin, and control verification & access from the Companies
          page.
        </p>
        <Link to="/platform/companies" style={s.cta}>
          Go to Companies →
        </Link>
      </div>

      <div style={s.debug}>
        session · role=<b>{user?.role}</b> · platformAdmin=<b>{String(user?.isPlatformAdmin)}</b> · companyId=
        <b>{user?.companyId ?? "—"}</b>
      </div>
    </Layout>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={s.stat}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statHint}>{hint}</div>
    </div>
  );
}

const s: any = {
  h1: { fontSize: 26, fontWeight: 800, color: colors.text, margin: "0 0 8px" },
  sub: { color: colors.textMuted, fontSize: 15, maxWidth: 640, lineHeight: 1.6, marginTop: 0 },
  grid: { display: "flex", gap: 16, margin: "24px 0" },
  stat: { flex: 1, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20 },
  statValue: { fontSize: 30, fontWeight: 800, color: colors.primary },
  statLabel: { fontSize: 14, fontWeight: 700, color: colors.text, marginTop: 4 },
  statHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  card: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20, maxWidth: 640 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 },
  cardBody: { margin: "0 0 14px", color: colors.text, lineHeight: 1.6, fontSize: 14 },
  cta: { color: colors.primary, fontWeight: 700, fontSize: 14, textDecoration: "none" },
  debug: { marginTop: 24, fontSize: 12, color: colors.textMuted, fontFamily: "monospace" },
};
