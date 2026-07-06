import React, { useEffect, useState } from "react";
import Layout, { NavItem } from "../components/Layout";
import { api, errorMessage } from "../api/client";
import { colors, radius } from "../theme";

const NAV: NavItem[] = [
  { label: "Overview", icon: "📊", to: "/platform" },
  { label: "Companies", icon: "🏢", to: "/platform/companies" },
  { label: "Platform Admins", icon: "🛡️", disabled: true },
  { label: "Settings", icon: "⚙️", disabled: true },
];

interface CompanyAdmin {
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  mustChangePassword: boolean;
}
interface Company {
  id: string;
  name: string;
  slug: string;
  status: string;
  verificationStatus: string;
  contactEmail?: string | null;
  phone?: string | null;
  createdAt: string;
  admins: CompanyAdmin[];
}

interface Credentials {
  title: string;
  email: string;
  password: string;
}

export default function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);

  const load = async () => {
    setError(null);
    try {
      const { data } = await api.get<Company[]>("/api/platform/companies");
      setCompanies(data);
    } catch (err) {
      setError(errorMessage(err, "Could not load companies."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, fn: () => Promise<any>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err, "Action failed."));
    } finally {
      setBusyId(null);
    }
  };

  const setVerification = (c: Company, status: string) =>
    act(c.id, () => api.post(`/api/platform/companies/${c.id}/verification`, { status }));

  const setStatus = (c: Company, status: string) =>
    act(c.id, () => api.post(`/api/platform/companies/${c.id}/status`, { status }));

  const resetAdmin = (c: Company, adminEmail: string) =>
    act(c.id, async () => {
      const { data } = await api.post(`/api/platform/companies/${c.id}/reset-admin-password`, { adminEmail });
      setCreds({ title: "Admin password reset", email: data.adminEmail, password: data.temporaryPassword });
    });

  return (
    <Layout area="Platform" nav={NAV}>
      <div style={s.headRow}>
        <div>
          <h1 style={s.h1}>Companies</h1>
          <p style={s.sub}>Register transport cooperatives, appoint their admin, and control verification & access.</p>
        </div>
        <button id="btn-create-company" style={s.primaryBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "+ Create company"}
        </button>
      </div>

      {creds && <CredentialsBanner creds={creds} onDismiss={() => setCreds(null)} />}
      {error && <div style={s.error}>{error}</div>}

      {showForm && (
        <CreateCompanyForm
          onCancel={() => setShowForm(false)}
          onCreated={(c) => {
            setShowForm(false);
            setCreds(c);
            load();
          }}
        />
      )}

      <div style={s.card}>
        {loading ? (
          <div style={s.muted}>Loading…</div>
        ) : companies.length === 0 ? (
          <div style={s.muted}>No companies yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Company</th>
                <th style={s.th}>Admin</th>
                <th style={s.th}>Verification</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const admin = c.admins.find((a) => !a.isPlatformAdmin) ?? c.admins[0];
                const canReset = !!admin && !admin.isPlatformAdmin;
                const busy = busyId === c.id;
                return (
                  <tr key={c.id} style={{ opacity: busy ? 0.55 : 1 }}>
                    <td style={s.td}>
                      <div style={s.coName}>{c.name}</div>
                      <div style={s.coSlug}>/{c.slug}</div>
                    </td>
                    <td style={s.td}>
                      {admin ? (
                        <>
                          <div>{admin.email}</div>
                          {admin.isPlatformAdmin && <span style={s.tinyTag}>platform</span>}
                          {admin.mustChangePassword && <span style={s.tinyTag}>temp pw</span>}
                        </>
                      ) : (
                        <span style={s.muted}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <Pill value={c.verificationStatus} />
                    </td>
                    <td style={s.td}>
                      <Pill value={c.status} />
                    </td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        {c.verificationStatus !== "Verified" ? (
                          <button style={s.actBtn} disabled={busy} onClick={() => setVerification(c, "Verified")}>
                            Verify
                          </button>
                        ) : (
                          <button style={s.actBtn} disabled={busy} onClick={() => setVerification(c, "Unverified")}>
                            Unverify
                          </button>
                        )}
                        {c.status === "Active" ? (
                          <button style={s.dangerBtn} disabled={busy} onClick={() => setStatus(c, "Suspended")}>
                            Suspend
                          </button>
                        ) : (
                          <button style={s.actBtn} disabled={busy} onClick={() => setStatus(c, "Active")}>
                            Activate
                          </button>
                        )}
                        <button
                          style={{ ...s.actBtn, opacity: canReset ? 1 : 0.4 }}
                          disabled={busy || !canReset}
                          title={canReset ? "Issue a new temporary password" : "No resettable company admin"}
                          onClick={() => admin && resetAdmin(c, admin.email)}
                        >
                          Reset pw
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

function CreateCompanyForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (creds: Credentials) => void;
}) {
  const [f, setF] = useState({ name: "", adminName: "", adminEmail: "", contactEmail: "", phone: "", adminPhone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const { data } = await api.post("/api/platform/companies", {
        name: f.name.trim(),
        adminName: f.adminName.trim(),
        adminEmail: f.adminEmail.trim(),
        contactEmail: f.contactEmail.trim() || null,
        phone: f.phone.trim() || null,
        adminPhone: f.adminPhone.trim() || null,
      });
      onCreated({ title: "Company created", email: data.adminEmail, password: data.temporaryPassword });
    } catch (error) {
      setErr(errorMessage(error, "Could not create company."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={s.formCard}>
      <div style={s.formTitle}>New company</div>
      <div style={s.formGrid}>
        <Field name="name" label="Company name *" value={f.name} onChange={set("name")} placeholder="Rodriguez Transport Co-op" autoFocus />
        <Field name="contactEmail" label="Contact email" value={f.contactEmail} onChange={set("contactEmail")} placeholder="ops@company.com" />
        <Field name="phone" label="Company phone" value={f.phone} onChange={set("phone")} placeholder="09xx xxx xxxx" />
        <div />
        <Field name="adminName" label="Admin name *" value={f.adminName} onChange={set("adminName")} placeholder="Juan Dela Cruz" />
        <Field name="adminEmail" label="Admin email *" value={f.adminEmail} onChange={set("adminEmail")} placeholder="admin@company.com" />
        <Field name="adminPhone" label="Admin phone" value={f.adminPhone} onChange={set("adminPhone")} placeholder="09xx xxx xxxx" />
      </div>
      {err && <div style={s.error}>{err}</div>}
      <div style={s.formActions}>
        <button type="button" style={s.ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} disabled={saving}>
          {saving ? "Creating…" : "Create company + admin"}
        </button>
      </div>
      <div style={s.hint}>
        A one-time temporary password is generated for the admin. They'll be forced to change it at first sign-in. New
        companies start <b>Unverified</b> — verify them once reviewed.
      </div>
    </form>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={s.fieldWrap}>
      <span style={s.fieldLabel}>{label}</span>
      <input style={s.input} {...rest} />
    </label>
  );
}

function CredentialsBanner({ creds, onDismiss }: { creds: Credentials; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(creds.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the value is visible anyway */
    }
  };
  return (
    <div style={s.credBanner}>
      <div style={s.credTitle}>✅ {creds.title} — share these once</div>
      <div style={s.credRow}>
        <span style={s.credKey}>Admin email</span>
        <code style={s.credVal}>{creds.email}</code>
      </div>
      <div style={s.credRow}>
        <span style={s.credKey}>Temp password</span>
        <code style={s.credVal}>{creds.password}</code>
        <button style={s.copyBtn} onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div style={s.credNote}>
        This password is shown only now — it isn't stored in readable form. The admin must change it at first login.
      </div>
      <button style={s.dismiss} onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

function Pill({ value }: { value: string }) {
  const map: Record<string, string> = {
    Verified: colors.success,
    Active: colors.success,
    Unverified: colors.textMuted,
    Suspended: colors.danger,
  };
  const c = map[value] ?? colors.textMuted;
  return (
    <span style={{ ...s.pill, color: c, borderColor: c }}>
      {value}
    </span>
  );
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
  coName: { fontWeight: 700 },
  coSlug: { color: colors.textMuted, fontSize: 12, fontFamily: "monospace", marginTop: 2 },
  tinyTag: { display: "inline-block", marginTop: 4, marginRight: 6, fontSize: 10, color: colors.accent, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "1px 6px" },
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
  credBanner: { marginTop: 16, background: colors.primarySoft, border: `1px solid ${colors.primary}`, borderRadius: radius.lg, padding: 16, position: "relative" },
  credTitle: { fontSize: 14, fontWeight: 800, color: colors.accent, marginBottom: 10 },
  credRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 6 },
  credKey: { width: 110, fontSize: 12, color: colors.textMuted },
  credVal: { fontFamily: "monospace", fontSize: 15, color: colors.text, background: colors.bg, padding: "4px 10px", borderRadius: radius.sm },
  copyBtn: { background: colors.primary, color: colors.onPrimary, border: "none", borderRadius: radius.sm, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  credNote: { marginTop: 8, fontSize: 12, color: colors.textMuted, lineHeight: 1.5 },
  dismiss: { position: "absolute", top: 12, right: 12, background: "transparent", color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: "4px 10px", fontSize: 12, cursor: "pointer" },
};
