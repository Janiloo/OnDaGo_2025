import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api/client";
import { COMPANY_NAV, ReportInfo } from "../companyNav";
import { colors, radius } from "../theme";

const STATUSES = ["Pending", "InProgress", "Completed"];

/**
 * Company console — Reports: incident reports filed by commuters and drivers
 * about THIS company. The list is tenant-scoped server-side (GET /api/Reports
 * only ever returns the caller company's reports), so a company admin can never
 * see another operator's reports.
 */
export default function CompanyReportsPage() {
  const [reports, setReports] = useState<ReportInfo[]>([]);
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"All" | "Commuter" | "Driver">("All");

  const load = async () => {
    setError(null);
    try {
      const [r, c] = await Promise.all([
        api.get<ReportInfo[]>("/api/Reports"),
        api.get<{ name: string }>("/api/admin/company").catch(() => ({ data: { name: "" } })),
      ]);
      setReports([...r.data].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      setCompanyName(c.data.name);
    } catch (err) {
      setError(errorMessage(err, "Could not load reports."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(
    () => reports.filter((r) => sourceFilter === "All" || r.reporterRole === sourceFilter),
    [reports, sourceFilter]
  );

  const counts = useMemo(
    () => ({
      All: reports.length,
      Commuter: reports.filter((r) => r.reporterRole === "Commuter").length,
      Driver: reports.filter((r) => r.reporterRole === "Driver").length,
    }),
    [reports]
  );

  const setStatus = async (r: ReportInfo, status: string) => {
    setBusyId(r.id);
    setError(null);
    try {
      await api.patch(`/api/Reports/${r.id}/status`, { status });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not update the report status."));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r: ReportInfo) => {
    if (!window.confirm(`Delete this report? "${r.subject}" — this hides it from the list.`)) return;
    setBusyId(r.id);
    setError(null);
    try {
      await api.delete(`/api/Reports/${r.id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not delete the report."));
    } finally {
      setBusyId(null);
    }
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <Layout area="Company" nav={COMPANY_NAV}>
      <h1 style={s.h1}>Reports</h1>
      <p style={s.sub}>
        Incident reports filed by commuters and drivers about your company. Only your company's reports appear here.
      </p>

      <div style={s.tabs}>
        {(["All", "Commuter", "Driver"] as const).map((t) => (
          <button
            key={t}
            style={{ ...s.tab, ...(sourceFilter === t ? s.tabActive : {}) }}
            onClick={() => setSourceFilter(t)}
          >
            {t} <span style={s.tabCount}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.card}>
        {loading ? (
          <div style={s.muted}>Loading…</div>
        ) : shown.length === 0 ? (
          <div style={s.muted}>No reports {sourceFilter !== "All" ? `from ${sourceFilter.toLowerCase()}s ` : ""}yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Source</th>
                <th style={s.th}>Company</th>
                <th style={s.th}>Plate / PUV</th>
                <th style={s.th}>Subject</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Incident</th>
                <th style={s.th}>Submitted</th>
                <th style={s.th}>Status</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const busy = busyId === r.id;
                const isDriver = r.reporterRole === "Driver";
                return (
                  <tr key={r.id} style={{ opacity: busy ? 0.55 : 1 }}>
                    <td style={s.td}>
                      <span style={{ ...s.pill, color: isDriver ? colors.primary : colors.accent, borderColor: isDriver ? colors.primary : colors.accent }}>
                        {r.reporterRole ?? "—"}
                      </span>
                      {r.reporterName && <div style={s.mutedSmall}>{r.reporterName}</div>}
                    </td>
                    <td style={s.td}>{companyName || "—"}</td>
                    <td style={s.td}>
                      {r.plateNumber ? (
                        <span style={s.mono}>
                          {r.plateNumber}
                          {r.vehicleId ? " ✓" : ""}
                        </span>
                      ) : (
                        <span style={s.mutedSmall}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <div style={s.subject}>{r.subject}</div>
                    </td>
                    <td style={{ ...s.td, maxWidth: 280 }}>
                      <div style={s.desc}>{r.description}</div>
                    </td>
                    <td style={s.td}>
                      {r.incidentAt || r.incidentLocation ? (
                        <div style={s.mutedSmall}>
                          {r.incidentAt && <div>{fmt(r.incidentAt)}</div>}
                          {r.incidentLocation && <div>📍 {r.incidentLocation}</div>}
                        </div>
                      ) : (
                        <span style={s.mutedSmall}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <div style={s.mutedSmall}>{fmt(r.createdAt)}</div>
                    </td>
                    <td style={s.td}>
                      <select
                        style={s.select}
                        disabled={busy}
                        value={STATUSES.includes(r.status) ? r.status : "Pending"}
                        onChange={(e) => setStatus(r, e.target.value)}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={s.td}>
                      <button style={{ ...s.smallBtn, color: colors.danger }} disabled={busy} onClick={() => remove(r)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

const s: any = {
  h1: { fontSize: 26, fontWeight: 800, color: colors.text, margin: "0 0 6px" },
  sub: { color: colors.textMuted, fontSize: 14, margin: 0, maxWidth: 560, lineHeight: 1.5 },
  tabs: { display: "flex", gap: 8, marginTop: 18 },
  tab: {
    background: colors.surface,
    color: colors.textMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.pill,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  tabActive: { background: colors.primarySoft, color: colors.primary, borderColor: colors.primary },
  tabCount: { opacity: 0.7, marginLeft: 4 },
  card: { marginTop: 16, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 8 },
  muted: { color: colors.textMuted, fontSize: 14, padding: 16 },
  mutedSmall: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 14px", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${colors.border}` },
  td: { padding: "14px 14px", color: colors.text, borderBottom: `1px solid ${colors.border}`, verticalAlign: "top" },
  pill: { fontSize: 12, fontWeight: 700, border: "1px solid", borderRadius: radius.pill, padding: "3px 10px", whiteSpace: "nowrap" },
  mono: { fontFamily: "monospace", fontSize: 14, fontWeight: 700 },
  subject: { fontWeight: 700 },
  desc: { color: colors.text, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  select: { background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "7px 10px", fontSize: 13 },
  smallBtn: { background: "transparent", border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  error: { marginTop: 16, background: "#3B1A1A", color: colors.danger, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13 },
};
