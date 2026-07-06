import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api/client";
import { COMPANY_NAV, Driver, dutyPresentation, RouteInfo, Vehicle } from "../companyNav";
import { colors, radius } from "../theme";

const TONE_COLOR: Record<string, string> = {
  success: colors.success,
  warn: colors.accent,
  muted: colors.textMuted,
};

/**
 * Company console — Vehicles (Tier 1): create vehicles, assign routes and
 * drivers, and activate/deactivate. A deactivated vehicle disappears from
 * commuter maps and rejects driver broadcasts.
 */
export default function CompanyVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPuv, setBusyPuv] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [newPuv, setNewPuv] = useState("");
  const [newCapacity, setNewCapacity] = useState("18");
  const [saving, setSaving] = useState(false);

  const activeRoutes = useMemo(() => routes.filter((r) => r.status === "Active"), [routes]);
  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);
  const driverByPuv = useMemo(
    () => new Map(drivers.filter((d) => d.puvNo).map((d) => [d.puvNo as string, d])),
    [drivers]
  );

  const load = async () => {
    setError(null);
    try {
      const [v, r, d] = await Promise.all([
        api.get<Vehicle[]>("/api/admin/vehicles"),
        api.get<RouteInfo[]>("/api/admin/routes"),
        api.get<Driver[]>("/api/admin/drivers"),
      ]);
      setVehicles(v.data);
      setRoutes(r.data);
      setDrivers(d.data);
    } catch (err) {
      setError(errorMessage(err, "Could not load vehicles."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/admin/vehicles", {
        puvNo: newPuv.trim(),
        maxPassengerCount: Number(newCapacity) || 18,
      });
      setNewPuv("");
      setNewCapacity("18");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not create the vehicle."));
    } finally {
      setSaving(false);
    }
  };

  const assignRoute = async (v: Vehicle, routeId: string) => {
    setBusyPuv(v.puvNo);
    setError(null);
    try {
      await api.put(`/api/admin/vehicles/${encodeURIComponent(v.puvNo)}/route`, {
        routeId: routeId || null,
      });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not assign route."));
    } finally {
      setBusyPuv(null);
    }
  };

  /** Re-point a driver at this vehicle (or clear the current driver). Goes
   * through the drivers surface — the driver's PlateNumber IS the link. */
  const assignDriver = async (v: Vehicle, driverId: string) => {
    setBusyPuv(v.puvNo);
    setError(null);
    try {
      const current = driverByPuv.get(v.puvNo);
      if (!driverId) {
        if (current) await api.put(`/api/admin/drivers/${current.id}/vehicle`, { puvNo: null });
      } else {
        // The backend rejects a vehicle already held by someone else, so free it first.
        if (current && current.id !== driverId)
          await api.put(`/api/admin/drivers/${current.id}/vehicle`, { puvNo: null });
        await api.put(`/api/admin/drivers/${driverId}/vehicle`, { puvNo: v.puvNo });
      }
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not assign driver."));
    } finally {
      setBusyPuv(null);
    }
  };

  const toggleStatus = async (v: Vehicle) => {
    const inactive = v.status === "Inactive";
    const next = inactive ? "Active" : "Inactive";
    if (
      !inactive &&
      !window.confirm(`Deactivate ${v.puvNo}? It will disappear from commuter maps and reject driver broadcasts.`)
    ) {
      return;
    }
    setBusyPuv(v.puvNo);
    setError(null);
    try {
      await api.post(`/api/admin/vehicles/${encodeURIComponent(v.puvNo)}/status`, { status: next });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not update the vehicle's status."));
    } finally {
      setBusyPuv(null);
    }
  };

  return (
    <Layout area="Company" nav={COMPANY_NAV}>
      <div style={s.headRow}>
        <div>
          <h1 style={s.h1}>Vehicles</h1>
          <p style={s.sub}>
            Your fleet: route and driver assignments, live status, and activation. Commuters can filter the live map
            by the routes you assign here.
          </p>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New vehicle"}
        </button>
      </div>

      {showForm && (
        <form style={s.formCard} onSubmit={create}>
          <div style={s.formGrid}>
            <label style={s.field}>
              <span style={s.fieldLabel}>PUV number / plate *</span>
              <input
                style={s.input}
                value={newPuv}
                onChange={(e) => setNewPuv(e.target.value)}
                required
                maxLength={32}
                placeholder="e.g. DRC-1415"
              />
            </label>
            <label style={s.field}>
              <span style={s.fieldLabel}>Seating capacity</span>
              <input
                style={s.input}
                type="number"
                min={1}
                max={200}
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
              />
            </label>
          </div>
          <button style={{ ...s.primaryBtn, marginTop: 12 }} type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create vehicle"}
          </button>
        </form>
      )}

      {activeRoutes.length === 0 && !loading && (
        <div style={s.notice}>
          No active routes to assign yet — create one on the{" "}
          <Link to="/company/routes" style={s.inlineLink}>
            Routes page
          </Link>
          .
        </div>
      )}

      {error && <div style={s.error}>{error}</div>}

      <div style={s.card}>
        {loading ? (
          <div style={s.muted}>Loading…</div>
        ) : vehicles.length === 0 ? (
          <div style={s.muted}>No vehicles yet. Create one above.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>PUV No.</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Duty</th>
                <th style={s.th}>Occupancy</th>
                <th style={s.th}>Assigned route</th>
                <th style={s.th}>Driver</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const busy = busyPuv === v.puvNo;
                const inactive = v.status === "Inactive";
                const duty = dutyPresentation(v.dutyStatus, v.lastUpdated);
                const assigned = v.routeId ? routeById.get(v.routeId) : null;
                const driver = driverByPuv.get(v.puvNo);
                return (
                  <tr key={v.puvNo} style={{ opacity: busy ? 0.55 : inactive ? 0.65 : 1 }}>
                    <td style={s.td}>
                      <div style={s.name}>{v.puvNo}</div>
                    </td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.pill,
                          color: inactive ? colors.danger : colors.success,
                          borderColor: inactive ? colors.danger : colors.success,
                        }}
                      >
                        {inactive ? "inactive" : "active"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.pill, color: TONE_COLOR[duty.tone], borderColor: TONE_COLOR[duty.tone] }}>
                        {duty.label}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={s.occ}>
                        {v.passengerCount}/{v.maxPassengerCount}
                      </span>
                    </td>
                    <td style={s.td}>
                      <select
                        style={s.select}
                        disabled={busy}
                        value={v.routeId ?? ""}
                        onChange={(e) => assignRoute(v, e.target.value)}
                      >
                        <option value="">— unassigned —</option>
                        {activeRoutes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                            {r.code ? ` (${r.code})` : ""}
                          </option>
                        ))}
                        {/* Keep a retired-but-still-assigned route visible so the value isn't lost silently. */}
                        {assigned && assigned.status !== "Active" && (
                          <option value={assigned.id}>{assigned.name} (retired)</option>
                        )}
                      </select>
                    </td>
                    <td style={s.td}>
                      <select
                        style={s.select}
                        disabled={busy}
                        value={driver?.id ?? ""}
                        onChange={(e) => assignDriver(v, e.target.value)}
                      >
                        <option value="">— no driver —</option>
                        {drivers
                          .filter((d) => !d.puvNo || d.puvNo === v.puvNo)
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                              {d.status === "Disabled" ? " (disabled)" : ""}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td style={s.td}>
                      <button
                        style={{ ...s.smallBtn, color: inactive ? colors.success : colors.danger }}
                        disabled={busy}
                        onClick={() => toggleStatus(v)}
                      >
                        {inactive ? "Activate" : "Deactivate"}
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
  headRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  h1: { fontSize: 26, fontWeight: 800, color: colors.text, margin: "0 0 6px" },
  sub: { color: colors.textMuted, fontSize: 14, margin: 0, maxWidth: 560, lineHeight: 1.5 },
  inlineLink: { color: colors.primary, fontWeight: 700, textDecoration: "none" },
  primaryBtn: {
    background: colors.primary,
    color: "#0B0F14",
    border: "none",
    borderRadius: radius.md,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  formCard: {
    marginTop: 16,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    padding: 16,
  },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: 700 },
  input: {
    background: colors.surfaceAlt,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: "9px 10px",
    fontSize: 14,
  },
  notice: { marginTop: 16, background: colors.primarySoft, color: colors.accent, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13, lineHeight: 1.5 },
  card: { marginTop: 20, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 8 },
  muted: { color: colors.textMuted, fontSize: 14, padding: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 14px", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${colors.border}` },
  td: { padding: "14px 14px", color: colors.text, borderBottom: `1px solid ${colors.border}`, verticalAlign: "middle" },
  name: { fontWeight: 700, fontFamily: "monospace", fontSize: 15 },
  occ: { fontFamily: "monospace", fontSize: 14 },
  pill: { fontSize: 12, fontWeight: 700, border: "1px solid", borderRadius: radius.pill, padding: "3px 10px", whiteSpace: "nowrap" },
  select: { background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "8px 10px", fontSize: 13, minWidth: 170 },
  smallBtn: {
    background: "transparent",
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  error: { marginTop: 16, background: "#3B1A1A", color: colors.danger, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13 },
};
