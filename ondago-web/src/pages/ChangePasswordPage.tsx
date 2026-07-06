import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { api, errorMessage } from "../api/client";
import { colors, radius } from "../theme";

/**
 * Forced first-login flow for a company admin created (or reset) by a SuperAdmin.
 * Verifies the temporary password, sets a permanent one, and swaps in the fresh
 * token the server returns (which no longer carries must_change_password).
 */
export default function ChangePasswordPage() {
  const { user, applyToken, signOut } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("New password and confirmation don't match.");

    setLoading(true);
    try {
      const { data } = await api.post("/api/Users/change-temp-password", {
        currentPassword: current,
        newPassword: next,
      });
      const token: string = data.token ?? data.Token;
      const u = applyToken(token);
      navigate(u.kind === "super" ? "/platform" : "/company", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const forced = !!user?.mustChangePassword;

  return (
    <div style={s.page}>
      <form onSubmit={submit} style={s.card}>
        <div style={s.brand}>
          <div style={s.logo}>🔐</div>
          <div>
            <div style={s.title}>{forced ? "Set your password" : "Change password"}</div>
            <div style={s.subtitle}>{user?.email}</div>
          </div>
        </div>

        {forced && (
          <div style={s.notice}>
            Your account is on a temporary password. Choose a permanent one to continue.
          </div>
        )}

        <label style={s.label}>{forced ? "Temporary password" : "Current password"}</label>
        <input name="current" style={s.input} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />

        <label style={s.label}>New password</label>
        <input name="next" style={s.input} type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" />

        <label style={s.label}>Confirm new password</label>
        <input name="confirm" style={s.input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        {error && <div style={s.error}>{error}</div>}

        <button type="submit" disabled={loading} style={{ ...s.button, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Saving…" : "Save password"}
        </button>

        <button type="button" style={s.signout} onClick={signOut}>
          Sign out
        </button>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: colors.bg, padding: 24 },
  card: { width: 400, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 28, display: "flex", flexDirection: "column" },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  logo: { width: 52, height: 52, borderRadius: 14, background: colors.primary, display: "grid", placeItems: "center", fontSize: 24 },
  title: { fontSize: 22, fontWeight: 800, color: colors.text, lineHeight: 1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  notice: { background: colors.primarySoft, color: colors.accent, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13, lineHeight: 1.5, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: 600, color: colors.textMuted, marginBottom: 6, marginTop: 12 },
  input: { background: colors.surfaceAlt, border: "1.5px solid transparent", borderRadius: radius.md, padding: "12px 14px", color: colors.text, fontSize: 15, outline: "none" },
  error: { marginTop: 14, background: "#3B1A1A", color: colors.danger, borderRadius: radius.sm, padding: "10px 12px", fontSize: 13 },
  button: { marginTop: 20, background: colors.primary, color: colors.onPrimary, border: "none", borderRadius: radius.md, padding: "13px 16px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  signout: { marginTop: 12, background: "transparent", color: colors.textMuted, border: "none", fontSize: 13, cursor: "pointer" },
};
