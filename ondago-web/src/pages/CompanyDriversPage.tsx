import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api/client";
import { COMPANY_NAV, Driver, dutyPresentation, Vehicle } from "../companyNav";
import { colors, radius } from "../theme";

const TONE_COLOR: Record<string, string> = {
  success: colors.success,
  warn: colors.accent,
  muted: colors.textMuted,
};

interface Credentials {
  email: string;
  temporaryPassword: string;
  context: string; // "created" | "reset for <name>"
}

/**
 * Company console — Drivers (Tier 1): the roster, create-with-temp-password,
 * enable/disable, reset password, and vehicle assignment. Drivers sign in on
 * the mobile app with these credentials; the vehicle link is what their app
 * broadcasts under.
 */
export default function CompanyDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creds, setCreds] = useState<Credentials | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formPuv, setFormPuv] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [d, v] = await Promise.all([
        api.get<Driver[]>("/api/admin/drivers"),
        api.get<Vehicle[]>("/api/admin/vehicles"),
      ]);
      setDrivers(d.data);
      setVehicles(v.data);
    } catch (err) {
      setError(errorMessage(err, "Could not load drivers."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const takenPuvs = useMemo(
    () => new Set(drivers.map((d) => d.puvNo).filter(Boolean) as string[]),
    [drivers]
  );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.post("/api/admin/drivers", {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phone.trim() || null,
        puvNo: formPuv || null,
      });
      setCreds({
        email: res.data.driver.email,
        temporaryPassword: res.data.temporaryPassword,
        context: `Driver "${res.data.driver.name}" created`,
      });
      setName("");
      setEmail("");
      setPhone("");
      setFormPuv("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not create the driver."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (d: Driver) => {
    const next = d.status === "Disabled" ? "Active" : "Disabled";
    if (
      next === "Disabled" &&
      !window.confirm(`Disable ${d.name}? They will be signed out of new logins and their broadcasts rejected.`)
    ) {
      return;
    }
    setBusyId(d.id);
    setError(null);
    try {
      await api.post(`/api/admin/drivers/${d.id}/status`, { status: next });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not update the driver's status."));
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (d: Driver) => {
    if (!window.confirm(`Issue a new temporary password for ${d.name}? Their current password stops working.`)) {
      return;
    }
    setBusyId(d.id);
    setError(null);
    try {
      const res = await api.post(`/api/admin/drivers/${d.id}/reset-password`);
      setCreds({
        email: res.data.email,
        temporaryPassword: res.data.temporaryPassword,
        context: `Password reset for "${d.name}"`,
      });
    } catch (err) {
      setError(errorMessage(err, "Could not reset the password."));
    } finally {
      setBusyId(null);
    }
  };

  const assignVehicle = async (d: Driver, puvNo: string) => {
    setBusyId(d.id);
    setError(null);
    try {
      await api.put(`/api/admin/drivers/${d.id}/vehicle`, { puvNo: puvNo || null });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not assign the vehicle."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout area="Company" nav={COMPANY_NAV}>
      <div style={s.headRow}>
        <div>
          <h1 style={s.h1}>Drivers</h1>
          <p style={s.sub}>
            Your driver roster. Drivers sign in on the mobile app with the credentials you hand them and broadcast
            under their assigned vehicle.
          </p>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New driver"}
        </button>
      </div>

      {creds && (
        <div style={s.credsBanner}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{creds.context} — hand these to the driver now.</div>
          <div style={s.credsRow}>
            <span style={s.credsLabel}>Email</span>
            <code style={s.credsValue}>{creds.email}</code>
          </div>
          <div style={s.credsRow}>
            <span style={s.credsLabel}>Temporary password</span>
            <code style={s.credsValue}>{creds.temporaryPassword}</code>
          </div>
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>
            Shown once — it is not stored readable and cannot be retrieved later (only reset).
          </div>
          <button style={s.credsDismiss} onClick={() => setCreds(null)}>
            I've saved it — dismiss
          </button>
        </div>
      )}

      {showForm && (
        <form style={s.formCard} onSubmit={create}>
          <div style={s.formGrid}>
            <label style={s.field}>
              <span style={s.fieldLabel}>Full name *</span>
              <input style={s.input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
            </label>
            <label style={s.field}>
              <span style={s.fieldLabel}>Email *</span>
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label style={s.field}>
              <span style={s.fieldLabel}>Phone</span>
              <input style={s.input} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} />
            </label>
            <label style={s.field}>
              <span style={s.fieldLabel}>Vehicle (optional)</span>
              <select style={s.input} value={formPuv} onChange={(e) => setFormPuv(e.target.value)}>
                <option value="">— assign later —</option>
                {vehicles
                  .filter((v) => !takenPuvs.has(v.puvNo))
                  .map((v) => (
                    <option key={v.puvNo} value={v.puvNo}>
                      {v.puvNo}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 10 }}>
            A temporary password is generated by the system and shown once after creation.
          </div>
          <button style={{ ...s.primaryBtn, marginTop: 12 }} type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create driver"}
          </button>
        </form>
      )}

      {error && <div style={s.error}>{error}</div>}

      <div style={s.card}>
        {loading ? (
          <div style={s.muted}>Loading…</div>
        ) : drivers.length === 0 ? (
          <div style={s.muted}>
            No drivers yet. Create one above — if you need a vehicle for them first, add it on the{" "}
            <Link to="/company/vehicles" style={s.inlineLink}>
              Vehicles page
            </Link>
            .
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Driver</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Duty</th>
                <th style={s.th}>Vehicle</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const busy = busyId === d.id;
                const disabled = d.status === "Disabled";
                const duty = dutyPresentation(d.dutyStatus, d.vehicleLastUpdated);
                return (
                  <tr key={d.id} style={{ opacity: busy ? 0.55 : 1 }}>
                    <td style={s.td}>
                      <div style={s.name}>{d.name}</div>
                      <div style={s.mutedSmall}>{d.email}</div>
                      {d.phoneNumber && <div style={s.mutedSmall}>{d.phoneNumber}</div>}
                    </td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.pill,
                          color: disabled ? colors.danger : colors.success,
                          borderColor: disabled ? colors.danger : colors.success,
                        }}
                      >
                        {disabled ? "disabled" : "active"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.pill,
                          color: TONE_COLOR[duty.tone],
                          borderColor: TONE_COLOR[duty.tone],
                        }}
                      >
                        {duty.label}
                      </span>
                    </td>
                    <td style={s.td}>
                      <select
                        style={s.select}
                        disabled={busy}
                        value={d.puvNo ?? ""}
                        onChange={(e) => assignVehicle(d, e.target.value)}
                      >
                        <option value="">— unassigned —</option>
                        {vehicles
                          .filter((v) => !takenPuvs.has(v.puvNo) || v.puvNo === d.puvNo)
                          .map((v) => (
                            <option key={v.puvNo} value={v.puvNo}>
                              {v.puvNo}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={s.smallBtn} disabled={busy} onClick={() => resetPassword(d)}>
                          Reset password
                        </button>
                        <button
                          style={{ ...s.smallBtn, color: disabled ? colors.success : colors.danger }}
                          disabled={busy}
                          onClick={() => toggleStatus(d)}
                        >
                          {disabled ? "Enable" : "Disable"}
                        </button>
                      </div>
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
  credsBanner: {
    marginTop: 16,
    background: "#12281B",
    border: `1px solid ${colors.success}`,
    color: colors.text,
    borderRadius: radius.md,
    padding: "14px 16px",
    fontSize: 14,
  },
  credsRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 4 },
  credsLabel: { color: colors.textMuted, fontSize: 12, width: 150 },
  credsValue: {
    background: "#0B0F14",
    padding: "4px 10px",
    borderRadius: radius.sm,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  credsDismiss: {
    marginTop: 10,
    background: "transparent",
    color: colors.success,
    border: `1px solid ${colors.success}`,
    borderRadius: radius.md,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
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
  card: { marginTop: 20, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 8 },
  muted: { color: colors.textMuted, fontSize: 14, padding: 16 },
  mutedSmall: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 14px", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${colors.border}` },
  td: { padding: "14px 14px", color: colors.text, borderBottom: `1px solid ${colors.border}`, verticalAlign: "middle" },
  name: { fontWeight: 700 },
  pill: { fontSize: 12, fontWeight: 700, border: "1px solid", borderRadius: radius.pill, padding: "3px 10px", whiteSpace: "nowrap" },
  select: { background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "8px 10px", fontSize: 13, minWidth: 160 },
  smallBtn: {
    background: "transparent",
    color: colors.text,
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
