import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api/client";
import { COMPANY_NAV, RouteInfo, Terminal } from "../companyNav";
import { colors, radius } from "../theme";

/**
 * Company console — Routes (Phase 3 management surface).
 * A route is an ORDERED chain of the company's own terminals
 * (origin → destination), built by picking active terminals in sequence.
 */
export default function CompanyRoutesPage() {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RouteInfo | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const terminalById = useMemo(() => new Map(terminals.map((t) => [t.id, t])), [terminals]);

  const load = async () => {
    setError(null);
    try {
      const [r, t] = await Promise.all([
        api.get<RouteInfo[]>("/api/admin/routes"),
        api.get<Terminal[]>("/api/admin/terminals"),
      ]);
      setRoutes(r.data);
      setTerminals(t.data);
    } catch (err) {
      setError(errorMessage(err, "Could not load routes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const retire = async (r: RouteInfo) => {
    setBusyId(r.id);
    setError(null);
    try {
      await api.delete(`/api/admin/routes/${r.id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not retire route."));
    } finally {
      setBusyId(null);
    }
  };

  const activeTerminals = terminals.filter((t) => t.status === "Active");
  const canCreate = activeTerminals.length >= 2;

  return (
    <Layout area="Company" nav={COMPANY_NAV}>
      <div style={s.headRow}>
        <div>
          <h1 style={s.h1}>Routes</h1>
          <p style={s.sub}>
            Ordered terminal chains (origin → destination). Assign vehicles to a route on the{" "}
            <Link to="/company/vehicles" style={s.inlineLink}>
              Vehicles page
            </Link>
            .
          </p>
        </div>
        <button
          id="btn-new-route"
          style={{ ...s.primaryBtn, opacity: canCreate ? 1 : 0.5 }}
          disabled={!canCreate}
          title={canCreate ? undefined : "You need at least two active terminals first"}
          onClick={() => setEditing(editing === "new" ? null : "new")}
        >
          {editing === "new" ? "Close" : "+ New route"}
        </button>
      </div>

      {!canCreate && !loading && (
        <div style={s.notice}>
          Routes need at least <b>two active terminals</b>. Create them on the{" "}
          <Link to="/company/terminals" style={s.inlineLink}>
            Terminals page
          </Link>{" "}
          first.
        </div>
      )}

      {error && <div style={s.error}>{error}</div>}

      {editing && (
        <RouteForm
          route={editing === "new" ? null : editing}
          terminals={activeTerminals}
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
        ) : routes.length === 0 ? (
          <div style={s.muted}>No routes yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Route</th>
                <th style={s.th}>Stops (in order)</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => {
                const busy = busyId === r.id;
                const isRetired = r.status !== "Active";
                return (
                  <tr key={r.id} style={{ opacity: busy ? 0.55 : isRetired ? 0.5 : 1 }}>
                    <td style={s.td}>
                      <div style={s.name}>{r.name}</div>
                      {r.code && <code style={s.code}>{r.code}</code>}
                    </td>
                    <td style={s.td}>
                      <div style={s.chainCell}>
                        {r.terminalIds.map((tid, i) => (
                          <React.Fragment key={tid}>
                            {i > 0 && <span style={s.arrow}>→</span>}
                            <span style={s.stop}>{terminalById.get(tid)?.name ?? "(deleted)"}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                    <td style={s.td}>
                      <Pill value={r.status} />
                    </td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        <button style={s.actBtn} disabled={busy || isRetired} onClick={() => setEditing(r)}>
                          Edit
                        </button>
                        <button style={s.dangerBtn} disabled={busy || isRetired} onClick={() => retire(r)}>
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

function RouteForm({
  route,
  terminals,
  onCancel,
  onSaved,
}: {
  route: RouteInfo | null;
  terminals: Terminal[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(route?.name ?? "");
  const [code, setCode] = useState(route?.code ?? "");
  // Seed the chain from the route being edited, dropping any terminal that no
  // longer exists/has been retired (it can't be re-selected anyway).
  const [chain, setChain] = useState<string[]>(
    () => route?.terminalIds.filter((id) => terminals.some((t) => t.id === id)) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const byId = useMemo(() => new Map(terminals.map((t) => [t.id, t])), [terminals]);
  const available = terminals.filter((t) => !chain.includes(t.id));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= chain.length) return;
    const next = [...chain];
    [next[i], next[j]] = [next[j], next[i]];
    setChain(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Name is required.");
    if (chain.length < 2) return setErr("Pick at least two stops (origin and destination).");

    setSaving(true);
    try {
      const body = { name: name.trim(), code: code.trim() || null, terminalIds: chain };
      if (route) await api.put(`/api/admin/routes/${route.id}`, body);
      else await api.post("/api/admin/routes", body);
      onSaved();
    } catch (error) {
      setErr(errorMessage(error, "Could not save route."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={s.formCard}>
      <div style={s.formTitle}>{route ? `Edit — ${route.name}` : "New route"}</div>

      <div style={s.formGrid2}>
        <label style={s.fieldWrap}>
          <span style={s.fieldLabel}>Name *</span>
          <input
            name="routeName"
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Montalban–Cubao"
            autoFocus
          />
        </label>
        <label style={s.fieldWrap}>
          <span style={s.fieldLabel}>Code</span>
          <input name="routeCode" style={s.input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="MTL-CUB" />
        </label>
      </div>

      <div style={s.builder}>
        <div style={s.builderCol}>
          <div style={s.builderTitle}>Available terminals</div>
          {available.length === 0 ? (
            <div style={s.builderEmpty}>All terminals are in the chain.</div>
          ) : (
            available.map((t) => (
              <button key={t.id} type="button" data-pick={t.name} style={s.pickBtn} onClick={() => setChain([...chain, t.id])}>
                + {t.name}
              </button>
            ))
          )}
        </div>

        <div style={s.builderCol}>
          <div style={s.builderTitle}>Route chain ({chain.length} stops, origin → destination)</div>
          {chain.length === 0 ? (
            <div style={s.builderEmpty}>Click terminals on the left to add stops in order.</div>
          ) : (
            chain.map((tid, i) => (
              <div key={tid} style={s.chainRow}>
                <span style={s.chainIndex}>{i + 1}</span>
                <span style={s.chainName}>{byId.get(tid)?.name ?? tid}</span>
                <span style={s.chainBtns}>
                  <button type="button" style={s.miniBtn} disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button type="button" style={s.miniBtn} disabled={i === chain.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </button>
                  <button type="button" style={s.miniDanger} onClick={() => setChain(chain.filter((x) => x !== tid))}>
                    ✕
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {err && <div style={s.error}>{err}</div>}
      <div style={s.formActions}>
        <button type="button" style={s.ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} disabled={saving}>
          {saving ? "Saving…" : route ? "Save changes" : "Create route"}
        </button>
      </div>
    </form>
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
  inlineLink: { color: colors.primary, fontWeight: 700, textDecoration: "none" },
  notice: { marginTop: 16, background: colors.primarySoft, color: colors.accent, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13, lineHeight: 1.5 },
  card: { marginTop: 20, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 8 },
  muted: { color: colors.textMuted, fontSize: 14, padding: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 14px", color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${colors.border}` },
  td: { padding: "14px 14px", color: colors.text, borderBottom: `1px solid ${colors.border}`, verticalAlign: "top" },
  name: { fontWeight: 700 },
  code: { fontFamily: "monospace", fontSize: 12, background: colors.surfaceAlt, padding: "2px 8px", borderRadius: 6, display: "inline-block", marginTop: 4 },
  chainCell: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 },
  stop: { background: colors.surfaceAlt, borderRadius: radius.pill, padding: "3px 10px", fontSize: 13 },
  arrow: { color: colors.primary, fontWeight: 800 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: { fontSize: 12, fontWeight: 700, border: "1px solid", borderRadius: radius.pill, padding: "3px 10px" },
  primaryBtn: { background: colors.primary, color: colors.onPrimary, border: "none", borderRadius: radius.md, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  ghostBtn: { background: "transparent", color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  actBtn: { background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: "6px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  dangerBtn: { background: "transparent", color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: radius.sm, padding: "6px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  error: { marginTop: 16, background: "#3B1A1A", color: colors.danger, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13 },
  formCard: { marginTop: 18, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20 },
  formTitle: { fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 14 },
  formGrid2: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, maxWidth: 560 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: colors.textMuted },
  input: { background: colors.surfaceAlt, border: "1.5px solid transparent", borderRadius: radius.md, padding: "10px 12px", color: colors.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  builder: { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginTop: 16 },
  builderCol: { background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: 12, minHeight: 140 },
  builderTitle: { fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  builderEmpty: { fontSize: 13, color: colors.textMuted, lineHeight: 1.5 },
  pickBtn: { display: "block", width: "100%", textAlign: "left", background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: "8px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 6 },
  chainRow: { display: "flex", alignItems: "center", gap: 10, background: colors.surfaceAlt, borderRadius: radius.sm, padding: "7px 10px", marginBottom: 6 },
  chainIndex: { width: 22, height: 22, borderRadius: 11, background: colors.primary, color: colors.onPrimary, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 },
  chainName: { flex: 1, fontSize: 13, fontWeight: 600, color: colors.text },
  chainBtns: { display: "flex", gap: 4 },
  miniBtn: { background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, width: 26, height: 26, fontSize: 12, cursor: "pointer" },
  miniDanger: { background: "transparent", color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: 6, width: 26, height: 26, fontSize: 12, cursor: "pointer" },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 },
};
