import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api/client";
import { COMPANY_NAV, Terminal } from "../companyNav";
import { colors, radius } from "../theme";

/**
 * Company console — Terminals (Phase 2 management surface).
 * List, create, edit, retire the company's boarding hubs. Coordinates are
 * plain lat/lng inputs for now; a map picker can come later.
 */
export default function CompanyTerminalsPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Terminal | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const { data } = await api.get<Terminal[]>("/api/admin/terminals");
      setTerminals(data);
    } catch (err) {
      setError(errorMessage(err, "Could not load terminals."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const retire = async (t: Terminal) => {
    setBusyId(t.id);
    setError(null);
    try {
      await api.delete(`/api/admin/terminals/${t.id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not retire terminal."));
    } finally {
      setBusyId(null);
    }
  };

  const active = terminals.filter((t) => t.status === "Active");
  const retired = terminals.filter((t) => t.status !== "Active");

  return (
    <Layout area="Company" nav={COMPANY_NAV}>
      <div style={s.headRow}>
        <div>
          <h1 style={s.h1}>Terminals</h1>
          <p style={s.sub}>
            Your boarding hubs. Routes chain these in order, and commuters discover them on the map.
          </p>
        </div>
        <button
          id="btn-new-terminal"
          style={s.primaryBtn}
          onClick={() => setEditing(editing === "new" ? null : "new")}
        >
          {editing === "new" ? "Close" : "+ New terminal"}
        </button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {editing && (
        <TerminalForm
          terminal={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <div style={s.card}>
        {loading ? (
          <div style={s.muted}>Loading…</div>
        ) : terminals.length === 0 ? (
          <div style={s.muted}>
            No terminals yet. Create your first one — routes can't exist without at least two terminals.
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Terminal</th>
                <th style={s.th}>Code</th>
                <th style={s.th}>Location</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...active, ...retired].map((t) => {
                const busy = busyId === t.id;
                const isRetired = t.status !== "Active";
                return (
                  <tr key={t.id} style={{ opacity: busy ? 0.55 : isRetired ? 0.5 : 1 }}>
                    <td style={s.td}>
                      <div style={s.name}>{t.name}</div>
                    </td>
                    <td style={s.td}>
                      {t.code ? <code style={s.code}>{t.code}</code> : <span style={s.muted}>—</span>}
                    </td>
                    <td style={s.td}>
                      <span style={s.coords}>
                        {t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}
                      </span>
                    </td>
                    <td style={s.td}>
                      <Pill value={t.status} />
                    </td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        <button style={s.actBtn} disabled={busy || isRetired} onClick={() => setEditing(t)}>
                          Edit
                        </button>
                        <button style={s.dangerBtn} disabled={busy || isRetired} onClick={() => retire(t)}>
                          Retire
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

function TerminalForm({
  terminal,
  onCancel,
  onSaved,
}: {
  terminal: Terminal | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: terminal?.name ?? "",
    code: terminal?.code ?? "",
    latitude: terminal ? String(terminal.latitude) : "",
    longitude: terminal ? String(terminal.longitude) : "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const lat = Number(f.latitude);
    const lng = Number(f.longitude);
    if (!f.name.trim()) return setErr("Name is required.");
    if (!isFinite(lat) || lat < -90 || lat > 90) return setErr("Latitude must be a number between -90 and 90.");
    if (!isFinite(lng) || lng < -180 || lng > 180) return setErr("Longitude must be a number between -180 and 180.");

    setSaving(true);
    try {
      const body = { name: f.name.trim(), code: f.code.trim() || null, latitude: lat, longitude: lng };
      if (terminal) await api.put(`/api/admin/terminals/${terminal.id}`, body);
      else await api.post("/api/admin/terminals", body);
      onSaved();
    } catch (error) {
      setErr(errorMessage(error, "Could not save terminal."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={s.formCard}>
      <div style={s.formTitle}>{terminal ? `Edit — ${terminal.name}` : "New terminal"}</div>
      <div style={s.formGrid}>
        <Field name="name" label="Name *" value={f.name} onChange={set("name")} placeholder="Montalban Terminal" autoFocus />
        <Field name="code" label="Code" value={f.code} onChange={set("code")} placeholder="MTL-1" />
        <Field name="latitude" label="Latitude *" value={f.latitude} onChange={set("latitude")} placeholder="14.7288" />
        <Field name="longitude" label="Longitude *" value={f.longitude} onChange={set("longitude")} placeholder="121.1441" />
      </div>
      {err && <div style={s.error}>{err}</div>}
      <div style={s.formActions}>
        <button type="button" style={s.ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} disabled={saving}>
          {saving ? "Saving…" : terminal ? "Save changes" : "Create terminal"}
        </button>
      </div>
      <div style={s.hint}>
        Tip: right-click a spot in Google Maps and copy the coordinates — first number is latitude, second is
        longitude.
      </div>
    </form>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={s.fieldWrap}>
      <span style={s.fieldLabel}>{label}</span>
      <input style={s.input} {...rest} />
    </label>
  );
}

function Pill({ value }: { value: string }) {
  const c = value === "Active" ? colors.success : colors.textMuted;
  return <span style={{ ...s.pill, color: c, borderColor: c }}>{value}</span>;
}

const s: any = {
  headRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
  h1: { fontSize: 26, fontWeight: 800, color: colors.text, margin: "0 0 6px" },
  sub: { color: colors.textMuted, fontSize: 14, margin: 0, maxWidth: 560, lineHeight: 1.5 },
  card: { marginTop: 20, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 8 },
  muted: { color: colors.textMuted, fontSize: 14, padding: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 14px", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${colors.border}` },
  td: { padding: "14px 14px", color: colors.text, borderBottom: `1px solid ${colors.border}`, verticalAlign: "top" },
  name: { fontWeight: 700 },
  code: { fontFamily: "monospace", fontSize: 13, background: colors.surfaceAlt, padding: "2px 8px", borderRadius: 6 },
  coords: { fontFamily: "monospace", fontSize: 13, color: colors.textMuted },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: { fontSize: 12, fontWeight: 700, border: "1px solid", borderRadius: radius.pill, padding: "3px 10px" },
  primaryBtn: { background: colors.primary, color: colors.onPrimary, border: "none", borderRadius: radius.md, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  ghostBtn: { background: "transparent", color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  actBtn: { background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: "6px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  dangerBtn: { background: "transparent", color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: radius.sm, padding: "6px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  error: { marginTop: 16, background: "#3B1A1A", color: colors.danger, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13 },
  formCard: { marginTop: 18, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20 },
  formTitle: { fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 14 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: colors.textMuted },
  input: { background: colors.surfaceAlt, border: "1.5px solid transparent", borderRadius: radius.md, padding: "10px 12px", color: colors.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  hint: { marginTop: 12, fontSize: 12, color: colors.textMuted, lineHeight: 1.5 },
};
